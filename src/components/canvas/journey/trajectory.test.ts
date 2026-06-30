import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { parabolaPoint, dribbleBounceY } from './trajectory'

describe('parabolaPoint', () => {
  const start = new Vector3(0, 0, 0)
  const end = new Vector3(10, 0, 0)

  it('t=0で開始点に一致する', () => {
    const p = parabolaPoint(0, start, end, 3)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
    expect(p.z).toBeCloseTo(0)
  })

  it('t=0.5で頂点の高さに達する', () => {
    const p = parabolaPoint(0.5, start, end, 3)
    expect(p.x).toBeCloseTo(5)
    expect(p.y).toBeCloseTo(3)
  })

  it('t=1で終了点に一致する', () => {
    const p = parabolaPoint(1, start, end, 3)
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeCloseTo(0)
  })
})

describe('dribbleBounceY', () => {
  it('t=0ではbaseYを返す（バウンドの谷）', () => {
    expect(dribbleBounceY(0, 2, 0.3, 6)).toBeCloseTo(2)
  })

  it('バウンド高さは常にbaseY以上になる', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(dribbleBounceY(t, 2, 0.3, 6)).toBeGreaterThanOrEqual(2)
    }
  })
})
