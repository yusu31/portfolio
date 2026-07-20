// ダイブ演出(#6・Issue #288)のカメラオフセットブレンド回帰テスト。
// cameraAttitude.test.tsと同じ観点で検証する: ①恒等区間の保証 ②継ぎ目の連続性
// ③ピークの成立 ④復帰の厳密性 ⑤カメラ-anchor距離の安全性(視線特異点の回避を含む)
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getCameraOffset } from './camera'
import { RING_U, FALL_END } from './ball/beats'
import { DIVE_PEAK_U } from './cameraAttitude'

const NORMAL = { dBack: 4.5, dUp: 3.0, lookAhead: 2, lookUp: 1.5 }
const DIVE = { dBack: 1.5, dUp: 7, lookAhead: 0.5, lookUp: -1.5 }

describe('恒等区間(ダイブ対象外への影響ゼロ)', () => {
  it('u<RING_Uの全サンプルで通常chase値のまま', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * RING_U * 0.9999
      const offset = getCameraOffset(u)
      expect(offset).toEqual(NORMAL)
    }
  })

  it('u≥FALL_ENDの全サンプルで通常chase値のまま(About以降への影響ゼロ)', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = FALL_END + (i / N) * (1.01 - FALL_END)
      const offset = getCameraOffset(u)
      expect(offset).toEqual(NORMAL)
    }
  })

  it('FALL_ENDちょうどで通常chase値', () => {
    expect(getCameraOffset(FALL_END)).toEqual(NORMAL)
  })
})

describe('継ぎ目の連続性', () => {
  it('1000分割で隣接Δdback・Δdup・Δlookが閾値未満(瞬間スナップなし)', () => {
    const N = 1000
    const maxStep = 0.5
    let prev = getCameraOffset(0)
    for (let i = 1; i <= N; i++) {
      const cur = getCameraOffset(i / N)
      expect(Math.abs(cur.dBack - prev.dBack)).toBeLessThan(maxStep)
      expect(Math.abs(cur.dUp - prev.dUp)).toBeLessThan(maxStep)
      expect(Math.abs(cur.lookAhead - prev.lookAhead)).toBeLessThan(maxStep)
      expect(Math.abs(cur.lookUp - prev.lookUp)).toBeLessThan(maxStep)
      prev = cur
    }
  })
})

describe('ダイブピークの成立', () => {
  it('DIVE_PEAK_Uでダイブ値そのもの(dBack=1.5, dUp=7, lookAhead=0.5, lookUp=-1.5)', () => {
    const offset = getCameraOffset(DIVE_PEAK_U)
    expect(offset.dBack).toBeCloseTo(DIVE.dBack, 9)
    expect(offset.dUp).toBeCloseTo(DIVE.dUp, 9)
    expect(offset.lookAhead).toBeCloseTo(DIVE.lookAhead, 9)
    expect(offset.lookUp).toBeCloseTo(DIVE.lookUp, 9)
  })

  it('[RING_U, FALL_END]内でdBackが縮小・dUpが拡大するピークを通過する', () => {
    const N = 500
    let minDBack = Infinity
    let maxDUp = -Infinity
    for (let i = 0; i <= N; i++) {
      const u = RING_U + (i / N) * (FALL_END - RING_U)
      const offset = getCameraOffset(u)
      minDBack = Math.min(minDBack, offset.dBack)
      maxDUp = Math.max(maxDUp, offset.dUp)
    }
    expect(minDBack).toBeCloseTo(DIVE.dBack, 5)
    expect(maxDUp).toBeCloseTo(DIVE.dUp, 5)
  })
})

describe('復帰の厳密性', () => {
  it('RING_Uちょうどで通常chase値(ブレンド開始点)', () => {
    expect(getCameraOffset(RING_U)).toEqual(NORMAL)
  })

  it('FALL_END直前で値がほぼダイブ値から離れきっていない中間だが、直後に恒等復帰する', () => {
    const justBefore = getCameraOffset(FALL_END - 1e-6)
    const at = getCameraOffset(FALL_END)
    expect(at).toEqual(NORMAL)
    // smootherstepの終端傾きゼロにより、直前値も通常値にほぼ収束しているはず
    expect(Math.abs(justBefore.dBack - NORMAL.dBack)).toBeLessThan(1e-6)
  })
})

describe('カメラ-anchor距離の安全性(視線特異点の回避)', () => {
  it('ピークでのカメラ-anchor距離が危険域(2〜3ユニット)より十分離れている', () => {
    const { dBack, dUp } = getCameraOffset(DIVE_PEAK_U)
    const dist = Math.hypot(dBack, dUp)
    expect(dist).toBeGreaterThan(4)
  })

  it('ピークでの視線ベクトルが世界upとほぼ平行にならない(lookAtの特異点回避)', () => {
    const { dBack, dUp, lookAhead, lookUp } = getCameraOffset(DIVE_PEAK_U)
    // forward = target - camPos = heading*(lookAhead - (-dBack)) + up*(lookUp - dUp)
    const horizontal = lookAhead + dBack
    const vertical = lookUp - dUp
    const forward = new THREE.Vector3(horizontal, vertical, 0).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const angleFromVerticalDeg = THREE.MathUtils.radToDeg(forward.angleTo(worldUp.clone().negate()))
    expect(angleFromVerticalDeg).toBeGreaterThan(5)
  })
})
