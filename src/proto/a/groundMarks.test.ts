// 共通原則3「地面に情報を乗せる」のテスト。
// 参考例4例に共通していたのは「地面が主役級の面積を持ち、そこに情報が乗っている」ことで、
// 現行シーンは面積だけあって無地だった。ここでは**情報量をマークの件数として縛る**。
import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './chapters'
import { buildGroundMarks, type GroundMark } from './groundMarks'

/** マークが使う正規化座標をすべて集める */
function coordsOf(mark: GroundMark): number[] {
  switch (mark.kind) {
    case 'band':
      return [mark.x, mark.y, mark.x + mark.w, mark.y + mark.h]
    case 'line':
      return [mark.x1, mark.y1, mark.x2, mark.y2]
    case 'rect':
      return [mark.x, mark.y, mark.x + mark.w, mark.y + mark.h]
    case 'circle':
    case 'arc':
      return [mark.cx, mark.cy]
    case 'dot':
      return [mark.cx, mark.cy]
  }
}

describe('buildGroundMarks', () => {
  it('全章ぶんのマーキングがある', () => {
    for (const c of CHAPTERS) {
      expect(buildGroundMarks(c.id).length).toBeGreaterThan(0)
    }
  })

  it('知らない章IDは投げる', () => {
    expect(() => buildGroundMarks('unknown')).toThrow()
  })

  it('同じ章IDなら常に同じ結果(乱数がシード固定されている)', () => {
    for (const c of CHAPTERS) {
      expect(buildGroundMarks(c.id)).toEqual(buildGroundMarks(c.id))
    }
  })

  // ここが原則3の実体。無地の地面に戻らないよう下限を明示する
  it('各章の地面に80件以上の情報が乗っている', () => {
    for (const c of CHAPTERS) {
      expect(buildGroundMarks(c.id).length).toBeGreaterThanOrEqual(80)
    }
  })

  it('座標がテクスチャの範囲(0〜1、少しのはみ出しは許容)に収まる', () => {
    for (const c of CHAPTERS) {
      for (const mark of buildGroundMarks(c.id)) {
        for (const v of coordsOf(mark)) {
          expect(v).toBeGreaterThanOrEqual(-0.06)
          expect(v).toBeLessThanOrEqual(1.06)
        }
      }
    }
  })

  it('線幅・半径が正の値', () => {
    for (const c of CHAPTERS) {
      for (const mark of buildGroundMarks(c.id)) {
        if ('lw' in mark) expect(mark.lw).toBeGreaterThan(0)
        if ('r' in mark) expect(mark.r).toBeGreaterThan(0)
      }
    }
  })

  // 白線(tone なし)と地の明暗(tone あり)の両方が必要。
  // 白線だけだとコートの図面になり、明暗だけだと素材が読めない
  it('各章が白線と地の明暗を両方持つ', () => {
    for (const c of CHAPTERS) {
      const marks = buildGroundMarks(c.id)
      expect(marks.some((m) => !('tone' in m) || m.tone === undefined)).toBe(true)
      expect(marks.some((m) => 'tone' in m && m.tone !== undefined)).toBe(true)
    }
  })

  it('tone は -1〜1 に収まる(shadeHex の定義域)', () => {
    for (const c of CHAPTERS) {
      for (const mark of buildGroundMarks(c.id)) {
        if ('tone' in mark && mark.tone !== undefined) {
          expect(mark.tone).toBeGreaterThanOrEqual(-1)
          expect(mark.tone).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})
