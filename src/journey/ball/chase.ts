// チェイスカムの基準フレーム(チェイスカム化 PR-1)。
// カメラはボール軌道の内部実装(ビート・sin波・将来の物理式)を知らず、この BallFrame という
// 契約だけを消費する。軌道が物理精度化されても getBallFrame のシグネチャは変えない。
// roll.ts と同じ「モジュール初期化時テーブル化」パターン: 平滑化(=近傍uの積分)が本質的に
// 必要な量だが、u軸上でテーブル化すれば「offsetが唯一の真実」原則(同一u→同一値、
// スクラブ逆再生対称、リロード/HMRで再現)を保てる。クエリ時有限差分は却下済み
// (dribbleのバウンド周期≈0.0089uで毎フレーム方向が振動しカメラがジッターする)。
import * as THREE from 'three'
import { getBallPose } from './ballPath'

/** テーブル分割数。roll.tsと同じ2048で線形補間誤差はカーネル幅よりはるかに小さい */
const SAMPLES = 2048

/**
 * heading平滑カーネルの片側幅(u)。実測(scratchpad 2026-07-19): dribble区間の隣接Δ角が
 * 生64.0°→5.35°に収束し、残差はウィーブの真の曲率(旋回方向フリップ3回=振動なし)。
 * 全域最大34.5°はidle→dribble受け渡しの単発コーナー(総旋回50.6°が0.02uに分散)で許容
 */
export const HEADING_KERNEL_U = 0.006
/** anchor XZの平滑カーネル片側幅(u)。弱め=ウィーブの蛇行形状を保つ(振幅保持率98.5%実測) */
export const ANCHOR_XZ_KERNEL_U = 0.002
/**
 * anchor Yの平滑カーネル片側幅(u)。強め=ドリブルのバウンド(振幅1.3)をリップル0.115まで
 * 減衰させる実測値。カメラが1バウンドごとに上下すると酔うため、yだけ強く均す
 */
export const ANCHOR_Y_KERNEL_U = 0.01

/**
 * 「移動している」とみなす窓内XZ変位の下限(ユニット)。窓幅≈0.012uに対して
 * 速度0.008ユニット/u未満=事実上の静止のみを弾く(旅程の典型速度は100ユニット/u超)
 */
const MIN_DISPLACEMENT = 1e-4

/** u=0のheadingシード。旅程は-z方向へ進み、初動(idle→dribble)との角度差は実測6.5°で飛びなし */
const HEADING_SEED = new THREE.Vector3(0, 0, -1)

/**
 * チェイスカメラがボールについて知ってよい全て。
 * - anchor: カメラ基準点。yを強めに平滑化しバウンドの縦揺れを除去した「ボールの重心的な居場所」
 * - heading: 水平進行方向の単位ベクトル(y=0固定)。XZのみから算出するのは、dribbleの
 *   垂直バウンドが向きに混入するとカメラのヨーが毎バウンド振動するため。垂直の動きは
 *   「向き」ではなく「高さ」であり、それはanchor.yが(平滑化された形で)担う
 */
export interface BallFrame {
  anchor: THREE.Vector3
  heading: THREE.Vector3
}

const anchorTable: THREE.Vector3[] = new Array(SAMPLES + 1)
const headingTable: THREE.Vector3[] = new Array(SAMPLES + 1)

{
  // getBallPoseは毎回新規Vector3を返す設計だが、将来の実装変更で共有参照が返っても
  // テーブルが壊れないようcloneして保持する(初期化時に一度きりのコスト)
  const pos: THREE.Vector3[] = new Array(SAMPLES + 1)
  for (let i = 0; i <= SAMPLES; i++) pos[i] = getBallPose(i / SAMPLES).position.clone()

  // heading: 窓±K内の変位ベクトルの和はテレスコープして pos[hi]-pos[lo] になる(O(1)/点)。
  // 変位が下限未満の区間(home hold・contact rest)は直前値をキャリーフォワードし、
  // normalize(0)の不定と「静止した瞬間に向きが跳ねる」事故を同時に防ぐ
  const K = Math.round(HEADING_KERNEL_U * SAMPLES)
  let heading = HEADING_SEED.clone()
  headingTable[0] = heading
  for (let i = 1; i <= SAMPLES; i++) {
    const hi = Math.min(i + K, SAMPLES)
    const lo = Math.max(i - K - 1, 0)
    const dx = pos[hi].x - pos[lo].x
    const dz = pos[hi].z - pos[lo].z
    const len = Math.hypot(dx, dz)
    if (len > MIN_DISPLACEMENT) heading = new THREE.Vector3(dx / len, 0, dz / len)
    headingTable[i] = heading // ホールド区間は同一インスタンスを共有(テーブルは読み取り専用)
  }

  // anchor: 成分ごとにクランプ窓の移動平均(prefix sumでO(1)/点)。端は実サンプル数で除算
  const prefX = new Array(SAMPLES + 2).fill(0)
  const prefY = new Array(SAMPLES + 2).fill(0)
  const prefZ = new Array(SAMPLES + 2).fill(0)
  for (let i = 0; i <= SAMPLES; i++) {
    prefX[i + 1] = prefX[i] + pos[i].x
    prefY[i + 1] = prefY[i] + pos[i].y
    prefZ[i + 1] = prefZ[i] + pos[i].z
  }
  const KXZ = Math.round(ANCHOR_XZ_KERNEL_U * SAMPLES)
  const KY = Math.round(ANCHOR_Y_KERNEL_U * SAMPLES)
  const boxAvg = (pref: number[], i: number, k: number) => {
    const lo = Math.max(i - k, 0)
    const hi = Math.min(i + k, SAMPLES)
    return (pref[hi + 1] - pref[lo]) / (hi - lo + 1)
  }
  for (let i = 0; i <= SAMPLES; i++) {
    anchorTable[i] = new THREE.Vector3(
      boxAvg(prefX, i, KXZ),
      boxAvg(prefY, i, KY),
      boxAvg(prefZ, i, KXZ)
    )
  }
}

/**
 * offset(u)に対応するチェイスカム基準フレームを返す純粋関数。
 * getBallRollQuaternionと同型: 線形補間クエリ、毎フレーム呼び出し用にoutを渡せばアロケーションなし。
 * headingは隣接サンプルの最大角差が実測34.5°(<90°)なのでnlerp(lerp+normalize)で縮退しない
 */
export function getBallFrame(
  u: number,
  out: BallFrame = { anchor: new THREE.Vector3(), heading: new THREE.Vector3() }
): BallFrame {
  const x = THREE.MathUtils.clamp(u, 0, 1) * SAMPLES
  const i = Math.min(Math.floor(x), SAMPLES - 1)
  const t = x - i
  out.anchor.copy(anchorTable[i]).lerp(anchorTable[i + 1], t)
  out.heading.copy(headingTable[i]).lerp(headingTable[i + 1], t).normalize()
  return out
}
