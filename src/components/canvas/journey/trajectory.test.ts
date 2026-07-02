import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { parabolaPoint, dribbleBounceY, interpolateWaypoints, type Waypoint } from './trajectory'

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

describe('interpolateWaypoints', () => {
  const wps: Waypoint[] = [
    { progress: 0.0, pos: [0, 0, 0], camOffset: [0, 0, 5], rotSpeed: 1.0 },
    { progress: 0.5, pos: [4, 0, 0], camOffset: [0, 0, 5], rotSpeed: 0.5 },
    { progress: 1.0, pos: [8, 0, 0], camOffset: [0, 0, 5], rotSpeed: 1.0 },
  ]

  it('progress=0で最初のwaypoint位置を返す', () => {
    const r = interpolateWaypoints(0, wps)
    expect(r.pos.x).toBeCloseTo(0)
    expect(r.rotSpeed).toBeCloseTo(1.0)
  })

  it('progress=0.5で中間ウェイポイント位置を返す', () => {
    const r = interpolateWaypoints(0.5, wps)
    expect(r.pos.x).toBeCloseTo(4)
  })

  it('progress=0.25で線形補間値を返す', () => {
    const r = interpolateWaypoints(0.25, wps)
    expect(r.pos.x).toBeCloseTo(2)
    expect(r.rotSpeed).toBeCloseTo(0.75)
  })

  it('progress=1で最後のwaypoint位置を返す', () => {
    const r = interpolateWaypoints(1, wps)
    expect(r.pos.x).toBeCloseTo(8)
  })

  it('空配列でデフォルト値(原点)を返す', () => {
    const r = interpolateWaypoints(0.5, [])
    expect(r.pos.x).toBe(0)
    expect(r.pos.y).toBe(0)
  })
})
