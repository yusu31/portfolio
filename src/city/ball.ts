// `/city` の球の居場所と転がり。設計書 §2.2 / §3 / §5.5。
//
// **球は道を離れない。施設は「的」であって「通り道」ではない**(§2.2)。
// これが今回の設計の要になる判断で、1本道の必須要件・弾道ソルバー・ネット物理の3つが同時に生きる。
// 骨格(PR 1)の段階では見せ場のビートがまだ無いので、球はただ道の上を進む。
//
// カメラはここが返す `BallFrame` という契約だけを消費する(設計原則3)。
// ビート(dribble / kick / fall …)が入っても `camera.ts` は無変更で動く。

import * as THREE from 'three'
import { TOTAL_LENGTH, roadPoint, roadTangent } from './route'

/** 球の見た目半径(`icosahedronGeometry args=[1.5, 2]` と一致) */
export const BALL_RADIUS = 1.5

/**
 * 球の道の中心からの横位置。**0 = 道のど真ん中**。
 *
 * B の主役は人だったので歩道側へ 1.1 寄せていたが、球は道そのものを転がる主役なので
 * 中心に置く。施設は道の外(近サイドライン x=±9.0)にあり、球はそこへ「撃ち込む」だけで
 * 道を離れない(§2.2)
 */
export const BALL_LATERAL = 0

/**
 * チェイスカメラが球について知ってよい全て(② の `journey/ball/chase.ts` と同じ契約)。
 * - `anchor`: カメラ基準点 = **球の中心**(路面ではない)
 * - `heading`: **水平**進行方向の単位ベクトル(y=0 固定)
 *
 * ⚠ `anchor` が球中心であることは、カメラのオフセット値を読むときの前提そのもの。
 *   B の追従4値は**路面基準**で書かれているので、そのまま入れると構図が崩れる(`camera.ts` 参照)
 */
export interface BallFrame {
  anchor: THREE.Vector3
  heading: THREE.Vector3
}

/** 距離 `t` における球の中心。路面から半径ぶん浮く(= 路面に接して転がる) */
export function ballAnchorAt(t: number, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  const p = roadPoint(t, BALL_LATERAL)
  return out.set(p[0], p[1] + BALL_RADIUS, p[2])
}

/**
 * 距離 `t` における水平進行方向。
 * 道の接線から y を落として正規化する。**垂直成分を向きに混ぜない**のは、
 * 坂の勾配がカメラのヨーやピッチに漏れると絵が落ち着かないため(② の BallFrame と同じ理由)
 */
export function ballHeadingAt(t: number, out: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  const tan = roadTangent(t)
  const len = Math.hypot(tan[0], tan[2]) || 1
  return out.set(tan[0] / len, 0, tan[2] / len)
}

/**
 * 距離 `t` に対応するチェイスカム基準フレーム。
 *
 * ② は `getBallPose` を 2048 点でテーブル化して平滑化していたが、あれは
 * **ドリブルの垂直バウンドがカメラのヨーを毎バウンド振動させる**のを均すためだった。
 * 骨格の段階の球はバウンドしない(道の滑らかな関数)ので、平滑化は要らない。
 * **ビートが入る PR 8 で ② と同じテーブル化が必要になる**
 */
export function getCityBallFrame(t: number, out: BallFrame = { anchor: new THREE.Vector3(), heading: new THREE.Vector3() }): BallFrame {
  ballAnchorAt(t, out.anchor)
  ballHeadingAt(t, out.heading)
  return out
}

// --- 転がり ---------------------------------------------------------------
// ② の `journey/ball/roll.ts` と同じ「モジュール初期化時にテーブル化する」パターン。
// 転がりは本質的に経路の積分だが、経路が `t` の純粋関数なので、積分結果を `t` 軸で
// テーブル化すれば「同じ `t` は常に同じ向き / 逆スクロールで逆回転 / リロードで再現」の
// 3性質が保てる(フレーム間差分の逐次積分ではどれも保証できない)。

/** 累積回転テーブルの分割数。② と同値 */
const SAMPLES = 2048

/**
 * 転がり角のゲイン。1.0 = 物理的に正確な「滑らない転がり」。
 * 全長 368 / 半径 1.5 で約 39 回転になる。
 * 高速区間でストロボ的に見える場合は QA で下げる(② の `ROLL_GAIN` と同じ注意)
 */
export const ROLL_GAIN = 1.0

const UP = new THREE.Vector3(0, 1, 0)

const rollTable: THREE.Quaternion[] = new Array(SAMPLES + 1)

{
  const cumulative = new THREE.Quaternion()
  const cur = new THREE.Vector3()
  const prev = new THREE.Vector3()
  const step = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const dq = new THREE.Quaternion()

  ballAnchorAt(0, prev)
  rollTable[0] = cumulative.clone()

  for (let i = 1; i <= SAMPLES; i++) {
    ballAnchorAt((i / SAMPLES) * TOTAL_LENGTH, cur)
    step.subVectors(cur, prev)

    // 回す量は**路面に沿った移動距離そのもの**(y を捨てない)。
    // ② の roll.ts は `step.y = 0` としているが、あれはドリブルの垂直バウンドで
    // 回転させないための措置で、**下り坂を転がる球に同じ規則を当てると
    // 勾配のぶんだけ回転が足りなくなる**(§7.2 が「落下中だけ回転が止まる」真因として
    // 指摘したのと同じ罠。ここでは最初から踏まない)
    const dist = step.length()

    // 回転軸は UP × 水平進行方向。路面の法線ではなく UP を使うのは、
    // 勾配 0.18 でも軸の傾きは 10° 以下で絵に出ず、軸が水平に保たれるほうが
    // 「転がっている」と読みやすいため。軸は world 空間なので premultiply で累積する
    axis.set(step.x, 0, step.z)
    if (dist > 1e-9 && axis.lengthSq() > 1e-18) {
      axis.crossVectors(UP, axis).normalize()
      dq.setFromAxisAngle(axis, (dist / BALL_RADIUS) * ROLL_GAIN)
      cumulative.premultiply(dq)
    }
    rollTable[i] = cumulative.clone()
    prev.copy(cur)
  }
}

/**
 * 距離 `t` に対応する累積ローリング回転を返す純粋関数。
 * 毎フレーム呼び出し用に `target` を渡せばアロケーションなし
 */
export function getCityBallRollQuaternion(t: number, target = new THREE.Quaternion()): THREE.Quaternion {
  const x = THREE.MathUtils.clamp(t / TOTAL_LENGTH, 0, 1) * SAMPLES
  const i = Math.min(Math.floor(x), SAMPLES - 1)
  return target.copy(rollTable[i]).slerp(rollTable[i + 1], x - i)
}

/** テストが「回転が止まっていないこと」を測るための総回転角(ラジアン) */
export function totalRollAngle(): number {
  const q = new THREE.Quaternion()
  let acc = 0
  let prev = rollTable[0]
  for (let i = 1; i <= SAMPLES; i++) {
    q.copy(prev).invert().premultiply(rollTable[i])
    acc += 2 * Math.acos(THREE.MathUtils.clamp(Math.abs(q.w), -1, 1))
    prev = rollTable[i]
  }
  return acc
}
