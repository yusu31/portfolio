// 輪郭線が「箱の稜線として正しく出ているか」を数値で確認する。
// 描画を目で見て判断すると、線が出ていないのか色が同じで見えないのか区別がつかない。
// 純データにしてあるのは、そこを切り分けられるようにするため。
import { describe, expect, it } from 'vitest'
import {
  BOX_EDGE_INDICES,
  boxCorners,
  boxEdgeSegments,
  buildEdgeBuffer,
  segmentCount,
  shouldOutline,
  type OutlineBox,
} from './outline'

const unit: OutlineBox = { center: [0, 0, 0], size: [2, 4, 6], rotY: 0 }

describe('boxCorners', () => {
  it('8頂点を返す', () => {
    expect(boxCorners(unit)).toHaveLength(8)
  })

  it('回転なしなら軸に沿った角になる', () => {
    const c = boxCorners(unit)
    expect(new Set(c.map((p) => p[0]))).toEqual(new Set([-1, 1]))
    expect(new Set(c.map((p) => p[1]))).toEqual(new Set([-2, 2]))
    expect(new Set(c.map((p) => p[2]))).toEqual(new Set([-3, 3]))
  })

  it('中心が移動すると全頂点が移動する', () => {
    const moved = boxCorners({ ...unit, center: [10, 20, 30] })
    const base = boxCorners(unit)
    moved.forEach((p, i) => {
      expect(p[0]).toBeCloseTo(base[i][0] + 10, 6)
      expect(p[1]).toBeCloseTo(base[i][1] + 20, 6)
      expect(p[2]).toBeCloseTo(base[i][2] + 30, 6)
    })
  })

  it('回転しても箱の寸法が変わらない', () => {
    const rotated = boxCorners({ ...unit, rotY: 0.7 })
    // 対角の距離は回転で不変
    const diag = Math.hypot(2, 4, 6)
    expect(Math.hypot(rotated[7][0] - rotated[0][0], rotated[7][1] - rotated[0][1], rotated[7][2] - rotated[0][2])).toBeCloseTo(
      diag,
      6
    )
  })

  it('高さは回転の影響を受けない(Y軸回転のみ)', () => {
    const rotated = boxCorners({ ...unit, rotY: 1.9 })
    expect(new Set(rotated.map((p) => p[1]))).toEqual(new Set([-2, 2]))
  })
})

describe('BOX_EDGE_INDICES', () => {
  it('12本ある', () => {
    expect(BOX_EDGE_INDICES).toHaveLength(12)
  })

  it('どの辺も頂点番号が1ビットだけ違う(=実在する稜線)', () => {
    for (const [a, b] of BOX_EDGE_INDICES) {
      const diff = a ^ b
      expect(diff & (diff - 1)).toBe(0)
      expect(diff).not.toBe(0)
    }
  })

  it('同じ辺を二度数えていない', () => {
    const keys = BOX_EDGE_INDICES.map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)
    expect(new Set(keys).size).toBe(12)
  })
})

describe('boxEdgeSegments', () => {
  it('12本 = 24点 = 72要素', () => {
    expect(boxEdgeSegments(unit)).toHaveLength(72)
  })

  it('各辺の長さが箱の寸法のいずれかと一致する', () => {
    const seg = boxEdgeSegments({ ...unit, rotY: 0.4 })
    for (let i = 0; i < seg.length; i += 6) {
      const len = Math.hypot(seg[i] - seg[i + 3], seg[i + 1] - seg[i + 4], seg[i + 2] - seg[i + 5])
      expect([2, 4, 6].some((d) => Math.abs(len - d) < 1e-6)).toBe(true)
    }
  })
})

describe('buildEdgeBuffer', () => {
  const boxes: OutlineBox[] = Array.from({ length: 30 }, (_, i) => ({
    center: [i, 0, 0],
    size: [1, 2, 1],
    rotY: 0,
  }))

  it('箱の数だけ稜線が入る', () => {
    expect(segmentCount(buildEdgeBuffer(boxes))).toBe(30 * 12)
  })

  it('上限で必ず打ち切る(密度を極端に振っても線で潰れない)', () => {
    const buffer = buildEdgeBuffer(boxes, 120)
    expect(segmentCount(buffer)).toBeLessThanOrEqual(120)
    // 箱単位で切るので12の倍数になる
    expect(segmentCount(buffer) % 12).toBe(0)
  })

  it('空なら空のバッファを返す', () => {
    expect(segmentCount(buildEdgeBuffer([]))).toBe(0)
  })

  it('数値がすべて有限(NaNが混ざるとジオメトリ全体が消える)', () => {
    const buffer = buildEdgeBuffer(boxes.map((b) => ({ ...b, rotY: 1.23 })))
    expect(buffer.every((v) => Number.isFinite(v))).toBe(true)
  })
})

describe('shouldOutline', () => {
  // 小さい物まで線を引くと遠景で線が団子になり、密度がノイズに変わる
  it('最大辺が閾値以上なら線を引く', () => {
    expect(shouldOutline([0.3, 3, 0.3], 1)).toBe(true)
    expect(shouldOutline([0.4, 0.5, 0.4], 1)).toBe(false)
  })

  it('閾値ちょうどは引く', () => {
    expect(shouldOutline([1, 1, 1], 1)).toBe(true)
  })
})
