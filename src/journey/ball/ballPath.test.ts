// ボールリレー全区間(Phase 5-3前半+Phase 5-4後半)の回帰テスト。ブラウザ不要の一次防衛線:
// ①ビート継ぎ目で瞬間移動しないこと ②見せ場でボールがカメラのフレーム内に収まること
// ③カメラ-ボール間距離が近接歪みの危険域(2〜3ユニット)に入らないこと
// (③はPhase 5-3で②だけでは「近すぎる」を検出できないと判明した教訓を反映して追加。
// 詳細はObsidian Decisions/2026-07-15-ball-camera-proximity-design.md)
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getBallPose } from './ballPath'
import {
  HOME_HOLD_END,
  DRIBBLE_START,
  DRIBBLE_END,
  CATCH_START,
  CATCH_END,
  RING_U,
  FALL_END,
  RECEIVE_END,
  TOSS_END,
  SPIKE_END,
  REST_END,
} from './beats'
import { CAMERA_PATH, LOOKAT_PATH, PATH_END_OFFSET } from '../path'

describe('ビート継ぎ目', () => {
  const boundaries: Array<[string, number]> = [
    ['HOME_HOLD_END', HOME_HOLD_END],
    ['DRIBBLE_START', DRIBBLE_START],
    ['DRIBBLE_END', DRIBBLE_END],
    ['CATCH_START', CATCH_START],
    ['CATCH_END', CATCH_END],
    ['RING_U', RING_U],
    ['FALL_END', FALL_END],
    ['RECEIVE_END', RECEIVE_END],
    ['TOSS_END', TOSS_END],
    ['SPIKE_END', SPIKE_END],
    ['REST_END', REST_END],
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
    // Phase 5-5の3倍化で最速区間はsetToss序盤(easeOutの立ち上がりでネット上帯超えへ
    // 一気に持ち上げる、実測ピーク2.69 @u=0.692)。それでも大幅に逸脱する実装バグ
    // (アンカー取り違え等)は検出できるよう、実測×1.5弱の余裕を持たせた上限とする
    expect(maxStep).toBeLessThan(4.0)
  })
})

function cameraAt(u: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
  const clampedU = Math.min(u, PATH_END_OFFSET)
  camera.position.copy(CAMERA_PATH.getPointAt(clampedU))
  const target = LOOKAT_PATH.getPointAt(clampedU)
  const { position: ballPos, focusWeight } = getBallPose(u)
  if (focusWeight > 0) target.lerp(ballPos, focusWeight)
  camera.lookAt(target)
  camera.updateMatrixWorld()
  return camera
}

describe('見せ場でのフレーム内収まり(NDC)', () => {
  function projectAt(u: number): THREE.Vector3 {
    const camera = cameraAt(u)
    const { position: ballPos } = getBallPose(u)
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
    ['fall中間', (RING_U + FALL_END) / 2],
    ['receive中間', (FALL_END + RECEIVE_END) / 2],
    ['receive終盤', RECEIVE_END - 0.001],
    ['setToss中間', (RECEIVE_END + TOSS_END) / 2],
    ['setToss終盤(トス頂点直前)', TOSS_END - 0.001],
    ['spike中間', (TOSS_END + SPIKE_END) / 2],
    ['spike終盤(Contact手前)', SPIKE_END - 0.001],
    ['rest中間', (SPIKE_END + REST_END) / 2],
    ['rest終端(最終静止)', REST_END - 0.0005],
  ]

  for (const [label, u] of sampleUs) {
    it(`${label}(u=${u.toFixed(4)})でボールがカメラのフレーム内(|x|<0.9, |y|<0.85)にある`, () => {
      const ndc = projectAt(u)
      expect(Math.abs(ndc.x)).toBeLessThan(0.9)
      expect(Math.abs(ndc.y)).toBeLessThan(0.85)
    })
  }
})

describe('カメラ-ボール間の近接歪み検知(Phase 5-3の教訓: NDCフレーム内テストだけでは不十分)', () => {
  // フレーム内かどうかに加え、カメラ-ボール距離も一次防衛線にする。
  // Phase 5-3では距離2〜3ユニットで角度ズレがNDCに激しく増幅される事故が2件あった。
  // 見せ場(focusWeight>0、注視される区間)の全域で、この危険域に入らないことを確認する
  it('全区間サンプルでfocusWeight>0のときカメラ-ボール距離が2ユニット未満にならない', () => {
    const N = 500
    let minDist = Infinity
    let minDistU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { position: ballPos, focusWeight } = getBallPose(u)
      if (focusWeight <= 0) continue
      const camPos = CAMERA_PATH.getPointAt(Math.min(u, PATH_END_OFFSET))
      const dist = camPos.distanceTo(ballPos)
      if (dist < minDist) {
        minDist = dist
        minDistU = u
      }
    }
    expect(minDist, `最接近点 u=${minDistU.toFixed(4)} で距離${minDist.toFixed(2)}`).toBeGreaterThan(2.0)
  })
})

describe('カメラから見た球の見かけの大きさ(画面占有率)', () => {
  // Phase 5-4のQAで、「距離は2ユニット以上あるのに画面の9割以上を球が占める」ケースが
  // 見つかった(u=0.48、fall序盤)。距離だけでは球の見た目半径(1.5、他venueの静的ボール
  // 0.28〜0.32よりずっと大きい)を考慮できないため、見かけの角度サイズも一次防衛線にする。
  // Phase 5-4では「freeThrow終盤の意図的接写(実測0.94〜0.98)」を除外するためRING_U以降のみ
  // 検査していたが、Phase 5-5の新配置でその接写は消滅した(実測最大0.76 @u=0.648、fall終端)
  // ため、focusWeight>0の全域を検査対象に拡大した
  const BALL_RADIUS = 1.5
  const FOV_DEG = 50

  it('focusWeight>0の全区間で見かけの角度サイズが視野角の90%を超えない', () => {
    const N = 500
    const fovRad = THREE.MathUtils.degToRad(FOV_DEG)
    let maxRatio = 0
    let maxRatioU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { position: ballPos, focusWeight } = getBallPose(u)
      if (focusWeight <= 0) continue
      const camPos = CAMERA_PATH.getPointAt(Math.min(u, PATH_END_OFFSET))
      const dist = camPos.distanceTo(ballPos)
      const apparentAngle = 2 * Math.atan(BALL_RADIUS / dist)
      const ratio = apparentAngle / fovRad
      if (ratio > maxRatio) {
        maxRatio = ratio
        maxRatioU = u
      }
    }
    expect(maxRatio, `最大占有率 u=${maxRatioU.toFixed(4)} で視野角比${maxRatio.toFixed(2)}`).toBeLessThan(0.9)
  })
})
