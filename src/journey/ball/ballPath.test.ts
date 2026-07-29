// ボールリレー全区間(Phase 5-3前半+Phase 5-4後半)の回帰テスト。ブラウザ不要の一次防衛線:
// ①ビート継ぎ目で瞬間移動しないこと ②見せ場でボールがカメラのフレーム内に収まること
// ③カメラ-ボール間距離が近接歪みの危険域(2〜3ユニット)に入らないこと
// (③はPhase 5-3で②だけでは「近すぎる」を検出できないと判明した教訓を反映して追加。
// 詳細はObsidian Decisions/2026-07-15-ball-camera-proximity-design.md)
//
// チェイスカム化(PR-2)でCameraRig.tsxが独立経路(CAMERA_PATH/LOOKAT_PATH、廃止)を
// 使わなくなったため、この回帰テストのカメラ再現もposeJourneyCamera(camera.ts)を
// 直接呼ぶ形に置換した(CameraRig.tsx・cameraAttitude.test.tsと共有する唯一のビルダー)。
//
// PR-2再調整(scratchpad 2026-07-19、ユーザーQA後)でNDC枠の意味論を変更した:
// ユーザーフィードバック「もっとボールに近づいて、上3分の2が見えていればいい」を受け、
// D_BACK 10→4.5・D_UP 3→3(維持)・LOOK_AHEAD 3→2・LOOK_UP 1→1.5に変更(camera.ts参照)。
// これによりボールは画面下寄り・大きく映るようになり、「下側は意図的にフレーム外へ
// クロップされてよい」設計に変わった。旧「下2/3バンド」(center y∈[-0.6,-0.05]の
// 上下両方に閾値を持つ帯)は前提が崩れるため廃止し、新たに以下2条件へ置き換える:
//   ①ボール中心が画面下寄り(ndc.y <= BAND_Y_CENTER_MAX、下限なし=どれだけ低くてもよい)
//   ②ボール上端(中心+見かけ半径をworld up方向に投影した点)がフレーム内(yTop > -1)
// ①は「ちゃんとボールに寄って低い位置にある」ことを、②は「上端が見切れて
// ボールが完全に画面外へ消えることはない(=上3分の2が見える、の最低保証)」ことを担保する。
// 実測(scratchpad 2026-07-19、D_BACK=4.5/D_UP=3/LOOK_AHEAD=2/LOOK_UP=1.5):
// 姿勢演出区間を除く全域(1001サンプル)でndc中心の最大値(最も高い=画面中央寄りな値)は
// -0.538、上端の最小値(最も下がった値)は-0.877(いずれも閾値に対して十分な余裕あり)
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
import { DIVE_PEAK_U } from '../cameraAttitude'

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

describe('見せ場でのフレーム内収まり(NDC・意図的な下側クロップ許容)', () => {
  function projectAt(u: number): THREE.Vector3 {
    const camera = cameraAt(u)
    const { position: ballPos } = getBallPose(u)
    return ballPos.clone().project(camera)
  }

  /**
   * ボール上端のNDC yを概算する。world up方向へBALL_RADIUS分オフセットした点を
   * 個別に投影し、中心の投影点との比較で「より上」側を採用する(ロール姿勢下では
   * world upがカメラのローカルupと一致しないため、この概算はskipBand区間では使わない)
   */
  function topNdcYAt(u: number): number {
    const camera = cameraAt(u)
    const { position: ballPos } = getBallPose(u)
    const up = ballPos.clone().add(new THREE.Vector3(0, BALL_RADIUS, 0)).project(camera).y
    const down = ballPos.clone().add(new THREE.Vector3(0, -BALL_RADIUS, 0)).project(camera).y
    return Math.max(up, down)
  }

  // PR-2再調整(D_BACK 10→4.5・LOOK_AHEAD 3→2・LOOK_UP 1→1.5、camera.ts参照)で
  // 「ボールに寄り、下側は意図的にクロップされてよい」設計に変更した。
  // ①BAND_Y_CENTER_MAX: ボール中心が画面下寄りであること(下限なし=どれだけ低くてもよい)
  // ②TOP_VISIBLE_MIN: ボール上端(中心+見かけ半径)がフレーム内(y>-1)であること
  //   (=「上3分の2が見える」というユーザー要望の最低保証。下端がフレーム外に出るのは許容)
  // 実測(scratchpad 2026-07-19): 姿勢演出区間を除く全域(1001サンプル)で中心の最大値
  // (=最も画面中央寄りな値)-0.538、上端の最小値(=最も下がった値)-0.877
  const BAND_Y_CENTER_MAX = -0.45
  const TOP_VISIBLE_MIN = -1
  const BAND_X_ABS = 0.5

  // fall中間(=DIVE_PEAK_U)は位置レイヤー(camera.tsのdiveBlendT)がボール直上から見下ろす
  // ダイブピークと重なる。ダイブ演出の縮小(roll90°/pitch-35°→基調ティルト+小振幅ウォブル)後の
  // 実測ではx方向ズレはほぼ解消した(旧0.846→新x≈0)が、この区間はカメラがボール直上から
  // 見下ろす別カット構図のため、中心が画面下寄り(BAND_Y_CENTER_MAX)ではなく画面中央付近に
  // 来るのが正しい(意図通りの)構図であり、その点だけ通常バンドと異なる
  const sampleUs: Array<[string, number, { overheadShot?: boolean }?]> = [
    ['dribble序盤', DRIBBLE_START + 0.01],
    ['dribble中間', (DRIBBLE_START + DRIBBLE_END) / 2],
    ['dribble終盤', DRIBBLE_END - 0.001],
    ['pass中間', (DRIBBLE_END + CATCH_START) / 2],
    ['catch直後', CATCH_START + 0.005],
    ['freeThrow中間', (CATCH_END + RING_U) / 2],
    ['freeThrow終盤(リング直前)', RING_U - 0.001],
    ['fall中間(ダイブピーク)', DIVE_PEAK_U, { overheadShot: true }],
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
    if (override?.overheadShot) {
      it(`${label}(u=${u.toFixed(4)})は俯瞰カットのため中心バイアスのみ対象外(x方向・上端フレーム内は通常通り厳格判定)`, () => {
        const ndc = projectAt(u)
        expect(topNdcYAt(u)).toBeGreaterThan(TOP_VISIBLE_MIN)
        expect(Math.abs(ndc.x)).toBeLessThan(BAND_X_ABS)
      })
      continue
    }
    it(`${label}(u=${u.toFixed(4)})でボール中心が画面下寄り(y<=${BAND_Y_CENTER_MAX})かつ上端がフレーム内(y>${TOP_VISIBLE_MIN})、|x|<${BAND_X_ABS}`, () => {
      const ndc = projectAt(u)
      expect(ndc.y).toBeLessThanOrEqual(BAND_Y_CENTER_MAX)
      expect(topNdcYAt(u)).toBeGreaterThan(TOP_VISIBLE_MIN)
      expect(Math.abs(ndc.x)).toBeLessThan(BAND_X_ABS)
    })
  }

  it('全区間(1001サンプル)でx方向ズレ・上端フレーム内は例外なく守られる(旧90°/-35°設計からの回帰検知)', () => {
    // ダイブ演出の縮小(roll90°/pitch-35°→基調ティルト+小振幅ウォブル、cameraAttitude.ts参照)
    // 後に再実測した結果、x方向ズレ(旧設計の主症状)と上端フレーム内は全域で例外なく
    // 守られることを確認した。中心の下寄り判定(BAND_Y_CENTER_MAX)だけは、位置レイヤーが
    // ボール直上から見下ろす区間(RING_U〜FALL_END、camera.tsのdiveBlendT)では意図的に
    // ボールが画面中心付近に来る別カット構図のため、その区間だけ対象外にする
    // (実測: この区間はx≤0.03・yTop≥-0.12で安全域、中心yのみ-0.45を上回る=画面中央寄り)
    const N = 1000
    let violations = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const ndc = projectAt(u)
      const yTop = topNdcYAt(u)
      const inDiveOverheadShot = u >= RING_U && u < FALL_END
      if ((!inDiveOverheadShot && ndc.y > BAND_Y_CENTER_MAX) || yTop <= TOP_VISIBLE_MIN || Math.abs(ndc.x) >= BAND_X_ABS) {
        violations++
      }
    }
    expect(violations).toBe(0)
  })
})

describe('カメラ-ボール間の近接歪み検知(Phase 5-3の教訓: NDCフレーム内テストだけでは不十分)', () => {
  // フレーム内かどうかに加え、カメラ-ボール距離も一次防衛線にする。
  // Phase 5-3では距離2〜3ユニットで角度ズレがNDCに激しく増幅される事故が2件あった。
  // チェイスカムは常にボールを追うため、focusWeightに関わらず全区間を検査する
  // (独立経路時代はfocusWeight>0の見せ場だけが対象だったが、その前提が既に無い)
  // PR-2再調整(D_BACK 10→4.5)後の実測: 全区間最小距離4.85(旧9.83)。カメラを寄せても
  // 閾値2.0ユニットに対して十分な余裕(2.4倍以上)を維持できている
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
  // PR-2再調整(D_BACK 10→4.5)でボールを積極的に大きく見せる設計に変更したため、
  // 実測最大占有率も0.35→0.687へ上昇した(u≈0.047の近接ポイント。home→dribble遷移の
  // 瞬間的な最接近で、閾値90%に対しては約21ポイントの余裕を維持)
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
