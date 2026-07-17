// クリスタル球の進行連動ローリング回転(Phase 5-5 PR1)。
// 転がりは本質的に「経路の積分」だが、経路(getBallPose)がoffsetの純粋関数なので、
// 積分結果もモジュール初期化時にテーブル化すれば「offsetが唯一の真実」原則を満たす:
// 同じuは常に同じ向きを返し、スクラブ逆再生では逆回転が自動成立、リロード/HMRでも向きが再現される。
// (フレーム間差分の逐次積分では、この3性質のどれも保証できない)
// 初期化時の事前計算はcurves.tsの「弧長キャッシュを温める」と同じパターン。
import * as THREE from 'three'
import { getBallPose } from './ballPath'

/** 累積回転テーブルの分割数。2048で回転の継ぎ目誤差はslerp補間以下になる */
const SAMPLES = 2048
/** 球の見た目半径(icosahedronGeometry args=[1.5, 2]と一致) */
export const BALL_RADIUS = 1.5
/**
 * 転がり角のゲイン。1.0=物理的に正確な「滑らない転がり」(全旅程で約27回転)。
 * 高速ビート(pass/spike)でストロボ的に見える場合はQAで0.6〜0.8へ下げる
 */
export const ROLL_GAIN = 1.0

const UP = new THREE.Vector3(0, 1, 0)

// 累積回転(world空間quaternion)と水平速度(ユニット/u)のテーブル
const rollTable: THREE.Quaternion[] = new Array(SAMPLES + 1)
const speedTable: number[] = new Array(SAMPLES + 1)

{
  const cumulative = new THREE.Quaternion()
  const step = new THREE.Vector3()
  const axis = new THREE.Vector3()
  const dq = new THREE.Quaternion()
  let prev = getBallPose(0).position
  rollTable[0] = cumulative.clone()
  for (let i = 1; i <= SAMPLES; i++) {
    const cur = getBallPose(i / SAMPLES).position
    // 転がりを生むのは水平移動のみ。垂直バウンドで回転しない=ドリブルの物理として正しい
    step.subVectors(cur, prev)
    step.y = 0
    const dist = step.length()
    speedTable[i] = dist * SAMPLES
    if (dist > 1e-9) {
      // 地面を滑らず転がる球の回転軸は UP × 進行方向。軸はworld空間なのでpremultiplyで累積する
      axis.crossVectors(UP, step).normalize()
      dq.setFromAxisAngle(axis, (dist / BALL_RADIUS) * ROLL_GAIN)
      cumulative.premultiply(dq)
    }
    rollTable[i] = cumulative.clone()
    prev = cur
  }
  speedTable[0] = speedTable[1]
}

/**
 * offset(u)に対応する累積ローリング回転を返す純粋関数。
 * 毎フレーム呼び出し用にtargetを渡せばアロケーションなし
 */
export function getBallRollQuaternion(u: number, target = new THREE.Quaternion()): THREE.Quaternion {
  const x = THREE.MathUtils.clamp(u, 0, 1) * SAMPLES
  const i = Math.min(Math.floor(x), SAMPLES - 1)
  return target.copy(rollTable[i]).slerp(rollTable[i + 1], x - i)
}

/**
 * offset(u)でのボールの水平速度(ユニット/u)。
 * CrystalBallが静止区間(home hold・contact rest)でアイドルスピンへフェードする判定に使う
 */
export function getHorizontalSpeed(u: number): number {
  const x = THREE.MathUtils.clamp(u, 0, 1) * SAMPLES
  return speedTable[Math.min(Math.round(x), SAMPLES)]
}
