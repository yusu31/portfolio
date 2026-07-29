// ワープVFX包絡線の回帰テスト。diveVeilEnvelope.test.tsと同じ観点で検証する。
import { describe, expect, it } from 'vitest'
import { warpVfxEnvelope, WARP_PEAK_U } from './warpVfxEnvelope'
import { DRIBBLE_END, CATCH_START } from './ball/beats'

describe('恒等区間(ピーク遠方への影響ゼロ)', () => {
  it('DRIBBLE_END付近(ピークから十分離れた区間内)で0', () => {
    expect(warpVfxEnvelope(DRIBBLE_END)).toBe(0)
  })

  it('CATCH_START付近(ピークから十分離れた区間内)で0', () => {
    expect(warpVfxEnvelope(CATCH_START)).toBe(0)
  })

  it('u=0・u=1で0', () => {
    expect(warpVfxEnvelope(0)).toBe(0)
    expect(warpVfxEnvelope(1)).toBe(0)
  })
})

describe('ピークの成立', () => {
  it('WARP_PEAK_Uで1', () => {
    expect(warpVfxEnvelope(WARP_PEAK_U)).toBeCloseTo(1, 9)
  })

  it('WARP_PEAK_UはDRIBBLE_ENDとCATCH_STARTの中点', () => {
    expect(WARP_PEAK_U).toBeCloseTo((DRIBBLE_END + CATCH_START) / 2, 9)
  })
})

describe('対称性', () => {
  it('ピークから等距離の両側で同じ値', () => {
    const N = 100
    for (let i = 1; i <= N; i++) {
      const d = (i / N) * 0.019
      expect(warpVfxEnvelope(WARP_PEAK_U - d)).toBeCloseTo(warpVfxEnvelope(WARP_PEAK_U + d), 9)
    }
  })
})

describe('継ぎ目の連続性', () => {
  it('1000分割で隣接Δが閾値未満(瞬間スナップなし)', () => {
    // 「短いフラッシュ」設計(半幅0.02)によりdiveVeilEnvelope(半幅約0.19)より傾きが急なため、
    // 理論最大傾き(smootherstepのt=0.5での傾き1.875 ÷ 半幅0.02 ≒ 93.75/u)に対し
    // 1/1000刻み(Δu=0.001)での理論最大Δ≒0.094に余裕を持たせた閾値
    const N = 1000
    const maxStep = 0.12
    let prev = warpVfxEnvelope(0)
    for (let i = 1; i <= N; i++) {
      const cur = warpVfxEnvelope(i / N)
      expect(Math.abs(cur - prev)).toBeLessThan(maxStep)
      prev = cur
    }
  })
})
