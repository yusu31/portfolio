// 進行連動ローリング回転(Phase 5-5 PR1)の回帰テスト。ブラウザ不要の一次防衛線:
// ①offsetの純粋関数であること ②静止区間で回転しないこと ③転がり方向の物理的正しさ
// ④「滑らない転がり」の角度整合 ⑤ビート継ぎ目で回転が跳ねないこと
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getBallRollQuaternion, getHorizontalSpeed, BALL_RADIUS, ROLL_GAIN } from './roll'
import { getBallPose } from './ballPath'
import { HOME_HOLD_END, DRIBBLE_END, CATCH_START } from './beats'

/** q1→q2の相対回転(world空間) */
function relativeRotation(q1: THREE.Quaternion, q2: THREE.Quaternion): THREE.Quaternion {
  return q2.clone().multiply(q1.clone().invert())
}

describe('純粋関数性', () => {
  it('同じuを2回呼ぶと同一のquaternionが返る', () => {
    // angleTo(acos)は同一値同士でも浮動小数点ノイズが出るため、決定性はコンポーネントの完全一致で検証する
    const a = getBallRollQuaternion(0.5, new THREE.Quaternion())
    const b = getBallRollQuaternion(0.5, new THREE.Quaternion())
    expect(a.x).toBe(b.x)
    expect(a.y).toBe(b.y)
    expect(a.z).toBe(b.z)
    expect(a.w).toBe(b.w)
  })

  it('u<0とu>1はクランプされ端の値と一致する', () => {
    expect(getBallRollQuaternion(-0.5).equals(getBallRollQuaternion(0))).toBe(true)
    expect(getBallRollQuaternion(1.5).equals(getBallRollQuaternion(1))).toBe(true)
  })
})

describe('静止区間', () => {
  it('home hold(u=0〜HOME_HOLD_END)では回転が累積しない', () => {
    const q0 = getBallRollQuaternion(0, new THREE.Quaternion())
    const qMid = getBallRollQuaternion(HOME_HOLD_END / 2, new THREE.Quaternion())
    expect(q0.angleTo(qMid)).toBeLessThan(1e-3)
  })

  it('home holdの水平速度はほぼ0(アイドルスピンのゲートが開く)', () => {
    expect(getHorizontalSpeed(HOME_HOLD_END / 2)).toBeLessThan(1)
  })
})

describe('転がりの物理', () => {
  // pass区間(dribble出口→CATCH_POINT)は水平方向がほぼ直線の長距離移動で、
  // 転がり方向・角度の検証に最適なサンプル区間
  const passMid = (DRIBBLE_END + CATCH_START) / 2
  const du = 4 / 2048 // テーブル分割(2048)の整数倍にしてslerp補間誤差を避ける

  it('進行方向(ほぼ-z)に対して前転する(回転軸が-x方向)', () => {
    const q1 = getBallRollQuaternion(passMid - du, new THREE.Quaternion())
    const q2 = getBallRollQuaternion(passMid + du, new THREE.Quaternion())
    const rel = relativeRotation(q1, q2)
    // quaternion(x,y,z,w)の虚部は回転軸×sin(θ/2)。正規化して軸を取り出す
    const axis = new THREE.Vector3(rel.x, rel.y, rel.z).normalize()
    // 進行方向d(水平)に対する期待軸は UP×d。pass区間はほぼ-z進行なので軸はほぼ-x
    const p1 = getBallPose(passMid - du).position
    const p2 = getBallPose(passMid + du).position
    const dir = new THREE.Vector3().subVectors(p2, p1)
    dir.y = 0
    dir.normalize()
    const expectedAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize()
    expect(axis.dot(expectedAxis)).toBeGreaterThan(0.9)
    expect(axis.x).toBeLessThan(0) // 前転(-z進行→-x軸まわり)
  })

  it('回転角が「滑らない転がり」(水平距離/半径×ゲイン)と±10%で整合する', () => {
    const q1 = getBallRollQuaternion(passMid - du, new THREE.Quaternion())
    const q2 = getBallRollQuaternion(passMid + du, new THREE.Quaternion())
    const actualAngle = q1.angleTo(q2)
    // 水平距離はテーブル構築と同じ分解能で積算する(軌道の弧の丸め方を揃える)
    const N = 8
    let dist = 0
    let prev = getBallPose(passMid - du).position
    for (let i = 1; i <= N; i++) {
      const cur = getBallPose(passMid - du + ((2 * du) / N) * i).position
      const step = new THREE.Vector3().subVectors(cur, prev)
      step.y = 0
      dist += step.length()
      prev = cur
    }
    const expectedAngle = (dist / BALL_RADIUS) * ROLL_GAIN
    expect(actualAngle).toBeGreaterThan(expectedAngle * 0.9)
    expect(actualAngle).toBeLessThan(expectedAngle * 1.1)
  })
})

describe('連続性(ビート継ぎ目で回転が跳ねない)', () => {
  it('全区間サンプルで隣接する回転の角度差が異常に大きくならない', () => {
    const N = 1000
    let prev = getBallRollQuaternion(0, new THREE.Quaternion())
    let maxStep = 0
    let maxStepU = 0
    for (let i = 1; i <= N; i++) {
      const cur = getBallRollQuaternion(i / N, new THREE.Quaternion())
      const step = prev.angleTo(cur)
      if (step > maxStep) {
        maxStep = step
        maxStepU = i / N
      }
      prev = cur
    }
    // 最速区間(idle→dribble受け渡し)の水平ステップ実測≈0.92ユニット/(1/1000u)
    // → 回転角≈0.61 rad。実装バグ(軸取り違え・テーブル境界の飛び)は検出できるよう
    // 実測×1.6程度の余裕を持たせた上限とする
    expect(maxStep, `最大回転ステップ u=${maxStepU.toFixed(4)} で ${maxStep.toFixed(3)} rad`).toBeLessThan(1.0)
  })
})
