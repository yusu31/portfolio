// ボールリレー全区間(Phase 5-3前半+Phase 5-4後半)の回帰テスト。ブラウザ不要の一次防衛線:
// ①ビート継ぎ目で瞬間移動しないこと ②見せ場でボールがカメラのフレーム内に収まること
// ③カメラ-ボール間距離が近接歪みの危険域(2〜3ユニット)に入らないこと
// (③はPhase 5-3で②だけでは「近すぎる」を検出できないと判明した教訓を反映して追加。
// 詳細はObsidian Decisions/2026-07-15-ball-camera-proximity-design.md)
//
// チェイスカム化(PR-2)でCameraRig.tsxが独立経路(CAMERA_PATH/LOOKAT_PATH、廃止)を
// 使わなくなったため、この回帰テストのカメラ再現もposeJourneyCamera(camera.ts)を
// 直接呼ぶ形に置換した(CameraRig.tsx・cameraAttitude.test.tsと共有する唯一のビルダー)。
// NDC枠は「下2/3バンド」(y∈[-0.6,-0.05], |x|<0.5)に改定: チェイスカムは常にボールの
// 背後から追うため、独立経路時代の「フレームのどこかに収まっていればよい」広い許容
// (|x|<0.9, |y|<0.85)は不要になり、より厳格な構図保証に置き換えられる
// (実測: scratchpad 2026-07-19、D_BACK=10/D_UP=3/LOOK_AHEAD=3/LOOK_UP=1で
// 姿勢演出区間(CATCH_START〜RECEIVE_END)を除く全域(1001サンプル)で違反ゼロ)。
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
import { BALL_RADIUS } from './roll'
import { poseJourneyCamera } from '../camera'
import { DIVE_PEAK_U, getCameraAttitude } from '../cameraAttitude'

const deg = THREE.MathUtils.radToDeg

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

// CameraRigと同一手順のカメラ再現。poseJourneyCameraが位置・視線・姿勢を一括で組み立てる
// (旧cameraAt()が個別に再現していたCAMERA_PATH/LOOKAT_PATH/focusWeightブレンドは廃止)
function cameraAt(u: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
  poseJourneyCamera(camera, u, 1)
  camera.updateMatrixWorld()
  return camera
}

describe('見せ場でのフレーム内収まり(NDC・下2/3バンド)', () => {
  function projectAt(u: number): THREE.Vector3 {
    const camera = cameraAt(u)
    const { position: ballPos } = getBallPose(u)
    return ballPos.clone().project(camera)
  }

  // 下2/3バンド: y∈[-0.6,-0.05](画面下2/3、下端に張り付かない)・|x|<0.5(横ズレなし)
  const BAND_Y_MIN = -0.6
  const BAND_Y_MAX = -0.05
  const BAND_X_ABS = 0.5

  // fall中間(=DIVE_PEAK_U)はカメラ姿勢反転演出のダイブピーク(roll90°/pitch-35°)と重なる。
  // roll90°でベースラインの縦オフセットが横軸へ写り、かつ「地面が上空になる」世界反転を
  // 見せる演出そのものが目的のため、下2/3バンドの対象外として実測値+マージンの緩い枠で
  // 別枠許容する(計画書§2「姿勢演出区間は別枠で許容」の実装)。
  // 実測(scratchpad 2026-07-19): x=0.617, y=0.000 @u=0.5528
  const sampleUs: Array<[string, number, { skipBand?: boolean }?]> = [
    ['dribble序盤', DRIBBLE_START + 0.01],
    ['dribble中間', (DRIBBLE_START + DRIBBLE_END) / 2],
    ['dribble終盤', DRIBBLE_END - 0.001],
    ['pass中間', (DRIBBLE_END + CATCH_START) / 2],
    ['catch直後', CATCH_START + 0.005],
    ['freeThrow中間', (CATCH_END + RING_U) / 2],
    ['freeThrow終盤(リング直前)', RING_U - 0.001],
    ['fall中間(ダイブピーク)', DIVE_PEAK_U, { skipBand: true }],
    ['receive中間', (FALL_END + RECEIVE_END) / 2],
    ['receive終盤', RECEIVE_END - 0.001],
    ['setToss中間', (RECEIVE_END + TOSS_END) / 2],
    ['setToss終盤(トス頂点直前)', TOSS_END - 0.001],
    ['spike中間', (TOSS_END + SPIKE_END) / 2],
    ['spike終盤(Contact手前)', SPIKE_END - 0.001],
    ['rest中間', (SPIKE_END + REST_END) / 2],
    ['rest終端(最終静止)', REST_END - 0.0005],
  ]

  for (const [label, u, override] of sampleUs) {
    if (override?.skipBand) {
      it(`${label}(u=${u.toFixed(4)})は姿勢演出ピークのため下2/3バンド対象外(実測+マージンの緩い枠のみ確認)`, () => {
        const ndc = projectAt(u)
        expect(Math.abs(ndc.x)).toBeLessThan(0.75) // 実測0.617+マージン
        expect(Math.abs(ndc.y)).toBeLessThan(0.3) // 実測0.000+マージン
      })
      continue
    }
    it(`${label}(u=${u.toFixed(4)})でボールが下2/3バンド(y∈[${BAND_Y_MIN},${BAND_Y_MAX}], |x|<${BAND_X_ABS})に収まる`, () => {
      const ndc = projectAt(u)
      expect(ndc.y).toBeGreaterThanOrEqual(BAND_Y_MIN)
      expect(ndc.y).toBeLessThanOrEqual(BAND_Y_MAX)
      expect(Math.abs(ndc.x)).toBeLessThan(BAND_X_ABS)
    })
  }

  it('全区間(1001サンプル)でも下2/3バンド違反が姿勢演出区間以外に出ない', () => {
    // 姿勢演出区間(CATCH_START〜RECEIVE_END、roll/pitchが1°を超える区間)全体を対象外とする。
    // ビート代表点(上のit群)ではfreeThrow中間/リング直前/receive中間は帯に収まっていたが、
    // その間の遷移区間(smootherstepの立ち上がり・立ち下がり)で帯を一時的に外れる箇所が
    // 実測で見つかった(ダイブピーク近傍だけの除外では不十分だった)。姿勢演出はroll90°/
    // pitch-35°という「地面が上空になる」意図的な世界反転のためNDC帯の対象外として扱う設計
    // (計画書§2「姿勢演出区間は別枠で許容」)であり、この区間だけ対象外にするのは妥当
    const N = 1000
    let violations = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { roll, pitch } = getCameraAttitude(u, 1)
      if (Math.max(Math.abs(deg(roll)), Math.abs(deg(pitch))) > 1) continue
      const ndc = projectAt(u)
      if (ndc.y < BAND_Y_MIN || ndc.y > BAND_Y_MAX || Math.abs(ndc.x) >= BAND_X_ABS) violations++
    }
    expect(violations).toBe(0)
  })
})

describe('カメラ-ボール間の近接歪み検知(Phase 5-3の教訓: NDCフレーム内テストだけでは不十分)', () => {
  // フレーム内かどうかに加え、カメラ-ボール距離も一次防衛線にする。
  // Phase 5-3では距離2〜3ユニットで角度ズレがNDCに激しく増幅される事故が2件あった。
  // チェイスカムは常にボールを追うため、focusWeightに関わらず全区間を検査する
  // (独立経路時代はfocusWeight>0の見せ場だけが対象だったが、その前提が既に無い)
  it('全区間サンプルでカメラ-ボール距離が2ユニット未満にならない', () => {
    const N = 500
    let minDist = Infinity
    let minDistU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { position: ballPos } = getBallPose(u)
      const camPos = cameraAt(u).position
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
  // 見つかった。距離だけでは球の見た目半径(1.5)を考慮できないため、見かけの角度サイズも
  // 一次防衛線にする。チェイスカムは常にボールを追うため全区間を検査する
  const FOV_DEG = 50

  it('全区間で見かけの角度サイズが視野角の90%を超えない', () => {
    const N = 500
    const fovRad = THREE.MathUtils.degToRad(FOV_DEG)
    let maxRatio = 0
    let maxRatioU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { position: ballPos } = getBallPose(u)
      const camPos = cameraAt(u).position
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
