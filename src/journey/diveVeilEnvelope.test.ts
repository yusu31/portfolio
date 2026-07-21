// ダイブ雲ヴェール包絡線の回帰テスト。cameraAttitude.test.tsと同じ観点で検証する。
import { describe, expect, it } from 'vitest'
import { diveVeilEnvelope, diveVeilScale, diveHoleStrength } from './diveVeilEnvelope'
import { RING_U, FALL_END } from './ball/beats'
import { DIVE_PEAK_U } from './cameraAttitude'

describe('恒等区間(ダイブ対象外への影響ゼロ)', () => {
  it('u<RING_Uの全サンプルで0', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = (i / N) * RING_U * 0.9999
      expect(diveVeilEnvelope(u)).toBe(0)
    }
  })

  it('u≥FALL_ENDの全サンプルで0', () => {
    const N = 250
    for (let i = 0; i <= N; i++) {
      const u = FALL_END + (i / N) * (1.01 - FALL_END)
      expect(diveVeilEnvelope(u)).toBe(0)
    }
  })
})

describe('ピークの成立', () => {
  it('DIVE_PEAK_Uで1', () => {
    expect(diveVeilEnvelope(DIVE_PEAK_U)).toBeCloseTo(1, 9)
  })

  it('RING_Uちょうど・FALL_ENDちょうどで0(境界の厳密性)', () => {
    expect(diveVeilEnvelope(RING_U)).toBe(0)
    expect(diveVeilEnvelope(FALL_END)).toBe(0)
  })
})

describe('継ぎ目の連続性', () => {
  it('1000分割で隣接Δが閾値未満(瞬間スナップなし)', () => {
    const N = 1000
    const maxStep = 0.05
    let prev = diveVeilEnvelope(0)
    for (let i = 1; i <= N; i++) {
      const cur = diveVeilEnvelope(i / N)
      expect(Math.abs(cur - prev)).toBeLessThan(maxStep)
      prev = cur
    }
  })
})

describe('diveVeilScale', () => {
  it('全uで[MIN_SCALE, 1]の範囲に収まる', () => {
    const N = 500
    for (let i = 0; i <= N; i++) {
      const scale = diveVeilScale(i / N)
      expect(scale).toBeGreaterThan(0)
      expect(scale).toBeLessThanOrEqual(1)
    }
  })

  it('DIVE_PEAK_Uで1', () => {
    expect(diveVeilScale(DIVE_PEAK_U)).toBeCloseTo(1, 9)
  })
})

describe('diveHoleStrength', () => {
  it('diveVeilEnvelopeと同一の値を返す', () => {
    const N = 200
    for (let i = 0; i <= N; i++) {
      const u = i / N
      expect(diveHoleStrength(u)).toBe(diveVeilEnvelope(u))
    }
  })
})
