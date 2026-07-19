// カメラ姿勢反転演出(#271)の回帰テスト。ブラウザ不要の一次防衛線:
// ①恒等区間の保証(サッカー区間・About後半〜Contactへ影響ゼロ) ②継ぎ目の連続性
// ③ダイブピークの成立 ④復帰の厳密性 ⑤太陽グレア安全性 ⑥reduced-motion ⑦振幅暴走ガード
// 数値の根拠はスクラッチパッド実測(2026-07-18、u1000分割。PR #271本文に記録)。
// チェイスカム化(PR-2)でカメラの基準方向が根本的に変わったため、太陽グレア判定に使う
// カメラ再現をposeJourneyCamera(camera.ts)ベースへ置換して全域再実測した(2026-07-19)。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getCameraAttitude, applyCameraAttitude, DIVE_PEAK_U } from './cameraAttitude'
import { CATCH_START, RING_U, FALL_END, RECEIVE_END } from './ball/beats'
import { poseJourneyCamera } from './camera'
import { SUN_DIRECTION } from './skyConfig'

const deg = THREE.MathUtils.radToDeg

describe('恒等区間(演出対象外への影響ゼロ)', () => {
  it('u<CATCH_STARTの全サンプルでroll=0・pitch=0(サッカー区間は完全無変更)', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * CATCH_START * 0.9999
      const { roll, pitch } = getCameraAttitude(u, 1)
      expect(roll).toBe(0)
      expect(pitch).toBe(0)
    }
  })

  it('u≥RECEIVE_ENDの全サンプルでroll=0・pitch=0(About後半〜Contactの復帰保証)', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = RECEIVE_END + (i / N) * (1.01 - RECEIVE_END)
      const { roll, pitch } = getCameraAttitude(u, 1)
      expect(roll).toBe(0)
      expect(pitch).toBe(0)
    }
  })
})

describe('継ぎ目の連続性', () => {
  it('1000分割で隣接Δroll・Δpitchが閾値未満(瞬間スナップなし)', () => {
    // smootherstep補間の理論最大勾配は最急セグメント(RING_U→DIVE_PEAK_U、roll70°/長さ≈0.095)で
    // 1.875×70/0.095≈1380°/u → 1/1000刻みで≈1.38°/step(実測1.378°)。2.5°/stepなら
    // 補間の破壊(線形化・キーフレーム順序の崩れ等)だけを検出できる
    const N = 1000
    const maxStepDeg = 2.5
    let prev = getCameraAttitude(0, 1)
    for (let i = 1; i <= N; i++) {
      const cur = getCameraAttitude(i / N, 1)
      expect(Math.abs(deg(cur.roll - prev.roll))).toBeLessThan(maxStepDeg)
      expect(Math.abs(deg(cur.pitch - prev.pitch))).toBeLessThan(maxStepDeg)
      prev = cur
    }
  })
})

describe('ダイブピークの成立', () => {
  it('DIVE_PEAK_U(fall中間)でroll=90°・pitch=-35°(設計書の確定振付)', () => {
    const { roll, pitch } = getCameraAttitude(DIVE_PEAK_U, 1)
    expect(deg(roll)).toBeCloseTo(90, 5)
    expect(deg(pitch)).toBeCloseTo(-35, 5)
  })

  it('[RING_U, FALL_END]内でroll・pitchがピークレンジ(90°付近・-35°付近)を通過する', () => {
    const N = 500
    let maxRoll = -Infinity
    let minPitch = Infinity
    for (let i = 0; i <= N; i++) {
      const u = RING_U + (i / N) * (FALL_END - RING_U)
      const { roll, pitch } = getCameraAttitude(u, 1)
      maxRoll = Math.max(maxRoll, deg(roll))
      minPitch = Math.min(minPitch, deg(pitch))
    }
    expect(maxRoll).toBeGreaterThan(85)
    expect(maxRoll).toBeLessThanOrEqual(90 + 1e-9) // 完全反転(オーバーシュート)しない
    expect(minPitch).toBeLessThan(-30)
    expect(minPitch).toBeGreaterThanOrEqual(-35 - 1e-9)
  })
})

describe('復帰の厳密性', () => {
  it('RECEIVE_ENDちょうどでroll=0・pitch=0', () => {
    const { roll, pitch } = getCameraAttitude(RECEIVE_END, 1)
    expect(roll).toBe(0)
    expect(pitch).toBe(0)
  })

  it('RECEIVE_END直前で値がほぼゼロ(smootherstepの傾きゼロ復帰=継ぎ目でカクつかない)', () => {
    // smootherstepは終端で1階・2階微分ともゼロ → s(1-δ)≈1-10δ³。
    // δ=1e-4/セグメント長0.137≈7.3e-4 → 残差はroll90°×3.9e-9で実質ゼロになるはず
    const { roll, pitch } = getCameraAttitude(RECEIVE_END - 1e-4, 1)
    expect(Math.abs(deg(roll))).toBeLessThan(0.001)
    expect(Math.abs(deg(pitch))).toBeLessThan(0.001)
  })
})

describe('太陽グレア安全性(Bloom threshold 0.9の暴発防止)', () => {
  // CameraRigと同一手順でカメラを再現する(ballPath.test.tsのcameraAtと同じposeJourneyCameraを使う)
  function buildCamera(u: number, attitudeScale: number): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
    poseJourneyCamera(camera, u, attitudeScale)
    camera.updateMatrixWorld()
    return camera
  }

  function sunAngleDeg(camera: THREE.PerspectiveCamera): number {
    const fwd = new THREE.Vector3()
    camera.getWorldDirection(fwd)
    return deg(fwd.angleTo(SUN_DIRECTION))
  }

  // 設計書の原不変条件は「全uで>55°(FOV対角半角43.6°+マージン)」。旧独立経路(CAMERA_PATH/
  // LOOKAT_PATH)時代はベースライン(姿勢なし)がu≈0.689で48.06°まで近づく既存挙動があったが、
  // チェイスカム化(PR-2)でカメラが常にボールの進行方向(≒-z)を向くようになった結果、
  // ベースラインの最小太陽角は74.30°@u=0.145まで改善した(実測、scratchpad 2026-07-19)。
  // それでも「姿勢演出が新たなグレアリスクを作らない」不変条件は形式として維持する:
  // (a)姿勢が意味を持つ区間では55°超(実測最小89.61°) (b)全uで姿勢がベースラインの
  // 太陽角度を55°未満へ押し下げない(実測: 全域55°を下回らないためb側は事実上恒等的に成立)
  it('姿勢が1°を超える全区間で太陽角度>55°(1/1000刻み)', () => {
    const N = 1000
    let minAngle = Infinity
    let minAngleU = 0
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const { roll, pitch } = getCameraAttitude(u, 1)
      if (Math.max(Math.abs(deg(roll)), Math.abs(deg(pitch))) <= 1) continue
      const angle = sunAngleDeg(buildCamera(u, 1))
      if (angle < minAngle) {
        minAngle = angle
        minAngleU = u
      }
    }
    expect(minAngle, `最小太陽角度 ${minAngle.toFixed(2)}° @u=${minAngleU.toFixed(4)}`).toBeGreaterThan(55)
  })

  it('全uで姿勢適用がベースラインの太陽角度を55°未満へ押し下げない(1/1000刻み)', () => {
    const N = 1000
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const withAttitude = sunAngleDeg(buildCamera(u, 1))
      if (withAttitude > 55) continue
      // 55°以下になるのは、姿勢なしでも同等以下だった(=既存挙動の)場合のみ許す
      const baseline = sunAngleDeg(buildCamera(u, 0))
      expect(withAttitude, `u=${u.toFixed(4)} 姿勢あり${withAttitude.toFixed(2)}° vs ベース${baseline.toFixed(2)}°`).toBeGreaterThanOrEqual(baseline - 0.01)
    }
  })
})

describe('reduced-motion', () => {
  it('reducedMotionScale=0のとき全uでroll=0・pitch=0', () => {
    const N = 500
    for (let i = 0; i <= N; i++) {
      const { roll, pitch } = getCameraAttitude(i / N, 0)
      expect(roll).toBe(0)
      expect(pitch).toBe(0)
    }
  })
})

describe('振幅上限ガード(暴走防止)', () => {
  it('全uで|pitch|≤85°・|roll|≤180°', () => {
    const N = 1000
    for (let i = 0; i <= N; i++) {
      const { roll, pitch } = getCameraAttitude(i / N, 1)
      expect(Math.abs(deg(pitch))).toBeLessThanOrEqual(85)
      expect(Math.abs(deg(roll))).toBeLessThanOrEqual(180)
    }
  })
})
