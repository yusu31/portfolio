// バスケットネットのu軸ベイクVerlet(純粋モジュール)。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §3.4
//
// **なぜ時間駆動のランタイム物理にしないのか**: `chase.ts` が明文化している
// 「offsetが唯一の真実(同一u→同一値・スクラブ逆再生対称・HMR再現)」原則と、
// ステートフルなVerlet積分は両立しない。u軸上でシミュレーションを1回だけ回して
// テーブル化すれば、実行時は純関数の補間になりこの原則が保たれる
// (`roll.ts`/`chase.ts` が既に2回使っている確立済みパターンの3例目)。
//
// この方式の副産物:
// - **トンネリングが原理的に起きない**。ベイク時はuを細かく刻むので、スクロールを
//   どれだけ速く回してもボールの1ステップ移動量は変わらない(スウィープ衝突が不要)
// - **フレームレート非依存**。固定タイムステップ蓄積器・delta clampがすべて不要
// - **単体テスト可能**。ベイク結果が純関数なので「ボール球面に侵入していない」
//   「静定テイル末尾で静止形状に戻る」をvitestで検証できる(ランタイム物理では不可能)
import * as THREE from 'three'
import { RING_CENTER, REAL_SCALE } from '../ball/anchors'
import { RING_U, SWISH_END } from '../ball/beats'
import { getBallPose } from '../ball/ballPath'
import { BALL_RADIUS } from '../ball/roll'
import {
  NET_COLUMNS,
  NET_CORD_RADIUS,
  NET_KNOT_TOTAL,
  NET_SIMULATED_COUNT,
  netCords,
  netRestPositions,
} from './basketNetGeometry'

/** ベイク窓の先頭。リング通過のわずか手前から始めて、通過の瞬間に静止形状であることを保証する */
export const BAKE_START_U = RING_U - 0.004
/**
 * スイッシュ終了後に静定させる尺。ボールが抜けたあともネットが揺れ続け、
 * 窓の末尾までに静止形状へ戻りきる必要がある(戻りきらないとベイク窓の外との継ぎ目で飛ぶ)
 */
export const BAKE_SETTLE_TAIL_U = 0.04
/** ベイク窓の末尾 */
export const BAKE_END_U = SWISH_END + BAKE_SETTLE_TAIL_U
/** サンプル数。設計書§3.4の256。Float32Array(256 × 60 × 3) = 184,320バイト(180KB) */
export const BAKE_SAMPLES = 256
/**
 * 1サンプルあたりの積分サブステップ数。設計書は8だが6に落とした。
 * 8だと実測102ms、6で96ms、ボール侵入量・静定ともに劣化しないため(実測)
 */
const SUBSTEPS = 6
/** サブステップあたりの拘束反復回数 */
const CONSTRAINT_ITERATIONS = 3

/**
 * u軸→秒の換算。スイッシュ(Δu=0.02)で5.8ユニット落ちるのは実物換算0.44mの自由落下=0.30秒
 * なので、0.02u ↔ 0.30秒 → 15秒/u。これでネットの揺れの速さが「実物のスイッシュ」と揃う。
 *
 * スクロール速度とは無関係な定数である点が重要: ベイクはu軸上で1回だけ回すので、
 * ユーザーが速くスクロールしてもゆっくりスクロールしても**同じ変形テーブルを読む**
 */
const SECONDS_PER_U = 15
/** 重力(ユニット/秒²)。実物9.8 m/s² をこの世界のスケール(REAL_SCALE≈13.12倍)へ換算 */
const GRAVITY = 9.8 * REAL_SCALE
/** Verletの速度減衰(1サブステップあたり)。低すぎると振動が残り、高すぎると布のように重くなる */
const DAMPING = 0.992
/**
 * 静止形状へ引き戻す弱いバネの強さ(1サブステップあたり)。
 *
 * **これが無いとネットは静止形状に戻らない。** 距離拘束だけでは静止形状(下へ絞れた円錐)は
 * 重力の平衡形ではないため: 段0(半径3.0)から吊った網は、同じコード長のまま
 * 「半径3のほぼ円筒形」にも垂れ下がれて、そのほうが重心が低い(実測: 段1が
 * y=-1.05の円錐 vs y=-1.10の円筒)。実際バネ無しでは下端半径が1.25→2.06のまま戻らず、
 * ベイク窓の外(静止形状)との継ぎ目でネットが飛ぶ。
 *
 * 実物のネットが形を保つのは紐の曲げ剛性と編み目の摩擦によるが、それをまともに
 * モデル化するのは過剰なので、静止形状への弱い復元でまとめて表現する。
 * 円周方向の拘束を張る案は設計書§3.1で却下済み(ネットが開けなくなる)。
 *
 * 復元はボール衝突の**前**に適用するので、ボールが当たっている間は開いたままになる
 * (各反復で衝突が最後に上書きするため)
 */
const SHAPE_RESTORE = 0.0029
/** ボールとの衝突半径。コードの太さぶん膨らませてコードがボールに埋まらないようにする */
const COLLISION_RADIUS = BALL_RADIUS + NET_CORD_RADIUS

/** ベイクテーブル(段1〜5の60粒子 × 3成分 × サンプル数)。遅延初期化 */
let table: Float32Array | null = null
/** ベイクにかかった実測ミリ秒(計測・ログ用) */
let bakeMillis = 0

/** 段0(リング上のピン留め)かどうか。粒子配列の先頭NET_COLUMNS個が段0 */
function isPinned(knot: number): boolean {
  return knot < NET_COLUMNS
}

/**
 * u軸上でVerletを1回だけ回してテーブルを作る。
 *
 * ボールとのカップリングは**片方向**: ネット粒子を球面の外へ押し出すだけで、
 * ボールの軌道には一切触れない(ボールは`getBallPose`が唯一の真実であり続ける)
 */
function bake(): Float32Array {
  const started = performance.now()
  const rest = netRestPositions()
  const cords = netCords()

  // 内側ループのために平坦化する。[a,b]のタプル配列のままだと毎回2段のプロパティ参照が入り、
  // 737k回の拘束解決では無視できない差になる(実測でベイクが172ms→大幅短縮)
  const cordA = new Int32Array(cords.length)
  const cordB = new Int32Array(cords.length)
  const lengths = new Float32Array(cords.length)
  const weightA = new Float32Array(cords.length)
  const weightB = new Float32Array(cords.length)
  for (let i = 0; i < cords.length; i++) {
    const [a, b] = cords[i]
    cordA[i] = a * 3
    cordB[i] = b * 3
    lengths[i] = rest[a].distanceTo(rest[b])
    // 片端がピン留めなら自由端だけを動かす(両端ピンは網の構造上発生しない)
    weightA[i] = isPinned(a) ? 0 : isPinned(b) ? 1 : 0.5
    weightB[i] = isPinned(b) ? 0 : isPinned(a) ? 1 : 0.5
  }

  // 位置Verlet: 全結び目(段0のピン留めを含む)を平坦配列で持つ
  const pos = new Float32Array(NET_KNOT_TOTAL * 3)
  const prev = new Float32Array(NET_KNOT_TOTAL * 3)
  const restFlat = new Float32Array(NET_KNOT_TOTAL * 3)
  for (let i = 0; i < NET_KNOT_TOTAL; i++) {
    pos[i * 3] = prev[i * 3] = restFlat[i * 3] = rest[i].x
    pos[i * 3 + 1] = prev[i * 3 + 1] = restFlat[i * 3 + 1] = rest[i].y
    pos[i * 3 + 2] = prev[i * 3 + 2] = restFlat[i * 3 + 2] = rest[i].z
  }

  const out = new Float32Array(BAKE_SAMPLES * NET_SIMULATED_COUNT * 3)
  const span = BAKE_END_U - BAKE_START_U
  const dt = ((span / (BAKE_SAMPLES - 1)) * SECONDS_PER_U) / SUBSTEPS
  const gravityStep = -GRAVITY * dt * dt

  const ballLocal = new THREE.Vector3()

  for (let s = 0; s < BAKE_SAMPLES; s++) {
    const u = BAKE_START_U + (span * s) / (BAKE_SAMPLES - 1)
    // ネットのローカル原点はリング中心。ボールをローカル系へ移す
    ballLocal.copy(getBallPose(u).position).sub(RING_CENTER)

    for (let step = 0; step < SUBSTEPS; step++) {
      // 積分(段1〜5のみ。段0はリングに固定なので動かさない)
      for (let i = NET_COLUMNS; i < NET_KNOT_TOTAL; i++) {
        const b = i * 3
        for (let c = 0; c < 3; c++) {
          const current = pos[b + c]
          const velocity = (current - prev[b + c]) * DAMPING
          prev[b + c] = current
          pos[b + c] = current + velocity + (c === 1 ? gravityStep : 0)
        }
      }

      for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
        // ①拘束(コード)を静止長へ引き戻す。Math.hypotはV8で顕著に遅いのでsqrtを使う
        for (let k = 0; k < cords.length; k++) {
          const ai = cordA[k]
          const bi = cordB[k]
          const dx = pos[bi] - pos[ai]
          const dy = pos[bi + 1] - pos[ai + 1]
          const dz = pos[bi + 2] - pos[ai + 2]
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
          const diff = (dist - lengths[k]) / dist
          const wa = weightA[k] * diff
          const wb = weightB[k] * diff
          pos[ai] += dx * wa
          pos[ai + 1] += dy * wa
          pos[ai + 2] += dz * wa
          pos[bi] -= dx * wb
          pos[bi + 1] -= dy * wb
          pos[bi + 2] -= dz * wb
        }

        // ②静止形状への弱い復元(SHAPE_RESTOREのコメント参照)。衝突より前に置くことで、
        //   ボールが当たっている間は③が上書きしてネットが開いたままになる
        for (let b = NET_COLUMNS * 3; b < NET_KNOT_TOTAL * 3; b++) {
          pos[b] += (restFlat[b] - pos[b]) * SHAPE_RESTORE
        }

        // ③ボールとの片方向衝突: 球面の内側に入った粒子を外へ押し出す。
        //   ボールの軌道には一切触れない(getBallPoseが唯一の真実であり続ける)
        for (let i = NET_COLUMNS; i < NET_KNOT_TOTAL; i++) {
          const b = i * 3
          const dx = pos[b] - ballLocal.x
          const dy = pos[b + 1] - ballLocal.y
          const dz = pos[b + 2] - ballLocal.z
          const distSq = dx * dx + dy * dy + dz * dz
          if (distSq >= COLLISION_RADIUS * COLLISION_RADIUS) continue
          const dist = Math.sqrt(distSq)
          // 中心に完全一致する退化ケースは半径方向が定義できないので真横へ逃がす
          if (dist < 1e-6) {
            pos[b] = ballLocal.x + COLLISION_RADIUS
            continue
          }
          const scale = COLLISION_RADIUS / dist
          pos[b] = ballLocal.x + dx * scale
          pos[b + 1] = ballLocal.y + dy * scale
          pos[b + 2] = ballLocal.z + dz * scale
        }
      }
    }

    // 段1〜5だけを書き出す(段0はピン留めで常に静止形状)
    const base = s * NET_SIMULATED_COUNT * 3
    for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
      const src = (NET_COLUMNS + i) * 3
      out[base + i * 3] = pos[src]
      out[base + i * 3 + 1] = pos[src + 1]
      out[base + i * 3 + 2] = pos[src + 2]
    }
  }

  bakeMillis = performance.now() - started
  return out
}

/**
 * テーブルを用意する(初回だけベイクを走らせる)。
 *
 * **呼び出し元(BasketNet.tsx)はマウント時に1回これを呼ぶ**。設計書は初期化コストを
 * 10〜20msと見積もっていたが実測は約96ms(V8はこの手のループを一度しか通らないと
 * 最適化しきれない)。スクロールが窓に差しかかった瞬間に遅延ベイクすると、
 * よりによって見せ場でフレームが落ちる。マウント時ならローダー
 * (`Loader.tsx`のz-index 9990オーバーレイ)が出ている間に済むので体感ゼロになる。
 *
 * それでもモジュール読み込み時の副作用にはしない: テストがこのモジュールを
 * importしただけで96ms払うのは無駄だし、ベイクを走らせるタイミングを
 * 呼び出し側が決められるほうが素直
 */
export function ensureNetBake(): Float32Array {
  if (!table) table = bake()
  return table
}

/** ベイクにかかった実測ミリ秒。0ならまだベイクしていない */
export function getBakeMillis(): number {
  return bakeMillis
}

/** ベイクテーブルのバイト数(パフォーマンス予算のテスト用) */
export const BAKE_TABLE_BYTES = BAKE_SAMPLES * NET_SIMULATED_COUNT * 3 * 4

/**
 * uにおける段1〜5の結び目位置を書き込む。ベイク窓の外では静止形状を返す。
 *
 * 窓の外を静止形状にできるのは、窓の先頭がリング通過の手前(ボールがまだ遠い)で、
 * 窓の末尾が静定テイルの終わり(揺れが収まっている)だから。テストで担保している
 */
export function sampleNetBake(u: number, out: THREE.Vector3[], rest: THREE.Vector3[]): THREE.Vector3[] {
  if (u <= BAKE_START_U || u >= BAKE_END_U) {
    for (let i = 0; i < NET_SIMULATED_COUNT; i++) out[i].copy(rest[NET_COLUMNS + i])
    return out
  }
  const data = ensureNetBake()
  const x = ((u - BAKE_START_U) / (BAKE_END_U - BAKE_START_U)) * (BAKE_SAMPLES - 1)
  const i = Math.min(Math.floor(x), BAKE_SAMPLES - 2)
  const t = x - i
  const a = i * NET_SIMULATED_COUNT * 3
  const b = (i + 1) * NET_SIMULATED_COUNT * 3
  for (let k = 0; k < NET_SIMULATED_COUNT; k++) {
    const ka = a + k * 3
    const kb = b + k * 3
    out[k].set(
      data[ka] + (data[kb] - data[ka]) * t,
      data[ka + 1] + (data[kb + 1] - data[ka + 1]) * t,
      data[ka + 2] + (data[kb + 2] - data[ka + 2]) * t
    )
  }
  return out
}

// ---- アイドルの風(設計書§3.5) ----
// ベイクテーブルから読んだ位置にCPU側で加算する。60粒子なのでコストは無視できる。
// サッカー/バレーがGPU(頂点シェーダー)なのに対しCPUなのは、こちらは元々インスタンス行列を
// 毎フレームCPUで組んでいるため(シェーダーへ持っていく利点がない)

/** 風の振幅。段番号に比例させ、段0(リング直下)は0・段5(下端)で最大にする */
const WIND_AMPLITUDE = 0.06

/**
 * 風のオフセットを加算する。段が下がるほど大きく揺れる。
 *
 * `time` は netWind.ts の風時計と共有する(QAの風固定スイッチが3種のネットすべてに効く)
 */
export function applyNetWind(knots: THREE.Vector3[], rest: THREE.Vector3[], time: number): void {
  for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
    const row = Math.floor(i / NET_COLUMNS) + 1
    const amp = WIND_AMPLITUDE * row
    const r = rest[NET_COLUMNS + i]
    knots[i].x += Math.sin(r.z * 1.7 + time * 1.9) * amp
    knots[i].z += Math.sin(r.x * 1.5 + time * 1.55 + 2.1) * amp
    knots[i].y += Math.sin(r.x * 1.1 + r.z * 0.9 + time * 2.3) * amp * 0.35
  }
}
