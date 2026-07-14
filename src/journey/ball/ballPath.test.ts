// Phase 5-3 ボールリレー(前半)の回帰テスト。ブラウザ不要の一次防衛線:
// ①ビート継ぎ目で瞬間移動しないこと ②見せ場でボールがカメラのフレーム内に収まること
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getBallPose } from './ballPath'
import { HOME_HOLD_END, DRIBBLE_START, DRIBBLE_END, CATCH_START, CATCH_END, RING_U, SETTLE_END } from './beats'
import { CAMERA_PATH, LOOKAT_PATH } from '../path'

describe('ビート継ぎ目', () => {
  const boundaries: Array<[string, number]> = [
    ['HOME_HOLD_END', HOME_HOLD_END],
    ['DRIBBLE_START', DRIBBLE_START],
    ['DRIBBLE_END', DRIBBLE_END],
    ['CATCH_START', CATCH_START],
    ['CATCH_END', CATCH_END],
    ['RING_U', RING_U],
    ['SETTLE_END', SETTLE_END],
  ]

  for (const [name, u] of boundaries) {
    it(`${name}(u=${u.toFixed(4)})の前後でボール位置が連続している(瞬間移動しない)`, () => {
      const eps = 1e-5
      const before = getBallPose(Math.max(u - eps, 0)).position
      const after = getBallPose(Math.min(u + eps, 1)).position
      expect(before.distanceTo(after)).toBeLessThan(0.05)
    })
  }

  it('全区間(0〜1)を細かくサンプルしても隣接フレーム間の移動量が異常に大きくならない', () => {
    const N = 500
    let prev = getBallPose(0).position
    let maxStep = 0
    for (let i = 1; i <= N; i++) {
      const cur = getBallPose(i / N).position
      maxStep = Math.max(maxStep, prev.distanceTo(cur))
      prev = cur
    }
    // idle→dribbleの受け渡し(focusWeight=0の未注視区間)がHome〜ピッチ間を駆け抜ける、
    // このビート列で最も速い区間(実測ピーク約1.84)。それでも大幅に逸脱する実装バグ
    // (アンカー取り違え等)は検出できるよう、余裕を持たせた上限とする
    expect(maxStep).toBeLessThan(3.0)
  })
})

describe('見せ場でのフレーム内収まり(NDC)', () => {
  function projectAt(u: number): THREE.Vector3 {
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
    camera.position.copy(CAMERA_PATH.getPointAt(u))
    const target = LOOKAT_PATH.getPointAt(u)
    const { position: ballPos, focusWeight } = getBallPose(u)
    if (focusWeight > 0) target.lerp(ballPos, focusWeight)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    return ballPos.clone().project(camera)
  }

  const sampleUs: Array<[string, number]> = [
    ['dribble序盤', DRIBBLE_START + 0.01],
    ['dribble中間', (DRIBBLE_START + DRIBBLE_END) / 2],
    ['dribble終盤', DRIBBLE_END - 0.001],
    ['pass中間', (DRIBBLE_END + CATCH_START) / 2],
    ['catch直後', CATCH_START + 0.005],
    ['freeThrow中間', (CATCH_END + RING_U) / 2],
    ['freeThrow終盤(リング直前)', RING_U - 0.001],
  ]

  for (const [label, u] of sampleUs) {
    it(`${label}(u=${u.toFixed(4)})でボールがカメラのフレーム内(|x|<0.9, |y|<0.85)にある`, () => {
      const ndc = projectAt(u)
      expect(Math.abs(ndc.x)).toBeLessThan(0.9)
      expect(Math.abs(ndc.y)).toBeLessThan(0.85)
    })
  }
})
