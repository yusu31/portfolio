import { describe, it, expect } from 'vitest'
import { computeSectionProgress } from './scrollProgress'

describe('computeSectionProgress', () => {
  it('区間開始前は0を返す', () => {
    expect(computeSectionProgress(1000, 500, 800)).toBe(0)
  })

  it('区間終了後は1を返す', () => {
    expect(computeSectionProgress(1000, 500, 1600)).toBe(1)
  })

  it('区間の中間点で0.5を返す', () => {
    expect(computeSectionProgress(1000, 500, 1250)).toBe(0.5)
  })

  it('区間の高さが0以下なら0を返す', () => {
    expect(computeSectionProgress(1000, 0, 1200)).toBe(0)
  })
})
