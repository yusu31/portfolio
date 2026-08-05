// 共通原則1「パレットを先に固定する」を守るためのテスト。
// 色数の上限をテストで縛っておかないと、作り込みの過程で少しずつ色が増えて
// 参考例②の「1画面の色数が少なく、全部が1つのトーンに沈んでいる」から離れていく。
import { describe, expect, it } from 'vitest'
import { PALETTES, getPalette, parseHex, shadeHex } from './palette'

const HEX = /^#[0-9a-f]{6}$/i

describe('PALETTES', () => {
  it('4種類ある(参考例②の Day/Golden/Misty/Night と同数)', () => {
    expect(PALETTES).toHaveLength(4)
  })

  it('IDが重複しない', () => {
    const ids = PALETTES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // ここが原則1の実体。小物はこの配列からしか塗らないので、物量を増やしても色が散らない
  it('小物の色が4色ちょうどに絞られている', () => {
    for (const p of PALETTES) {
      expect(p.props).toHaveLength(4)
    }
  })

  it('すべての色が #rrggbb 形式', () => {
    for (const p of PALETTES) {
      for (const c of [p.background, p.ground, p.groundMark, p.plinth, p.accent, p.shadowColor, p.skyColor, p.key.color, ...p.props]) {
        expect(c).toMatch(HEX)
      }
    }
  })

  it('フォグが手前から奥へ正しく張られている', () => {
    for (const p of PALETTES) {
      expect(p.fogNear).toBeGreaterThan(0)
      expect(p.fogFar).toBeGreaterThan(p.fogNear)
    }
  })

  // 参考例③の核心。影の色が明部より暗くないと「シャドウ側で世界を作る」構成が成立しない
  it('影の色が空の色より暗い', () => {
    for (const p of PALETTES) {
      const luma = (hex: string) => {
        const [r, g, b] = parseHex(hex)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      expect(luma(p.shadowColor)).toBeLessThan(luma(p.skyColor))
    }
  })
})

describe('getPalette', () => {
  it('インデックスでパレットを引く', () => {
    expect(getPalette(0)).toBe(PALETTES[0])
    expect(getPalette(3)).toBe(PALETTES[3])
  })

  it('範囲外をクランプする(カット境界の計算がズレても色が消えない)', () => {
    expect(getPalette(-2)).toBe(PALETTES[0])
    expect(getPalette(99)).toBe(PALETTES[PALETTES.length - 1])
  })
})

describe('parseHex', () => {
  it('#付き・#なしの両方を読む', () => {
    expect(parseHex('#ff8040')).toEqual([255, 128, 64])
    expect(parseHex('ff8040')).toEqual([255, 128, 64])
  })

  it('不正な色は投げる', () => {
    expect(() => parseHex('red')).toThrow()
    expect(() => parseHex('#fff')).toThrow()
  })
})

describe('shadeHex', () => {
  it('amount=0 は元の色', () => {
    expect(shadeHex('#3366cc', 0)).toBe('#3366cc')
  })

  it('正の値で白へ、負の値で黒へ寄る', () => {
    expect(shadeHex('#000000', 1)).toBe('#ffffff')
    expect(shadeHex('#ffffff', -1)).toBe('#000000')
    expect(shadeHex('#808080', 0.5)).toBe('#c0c0c0')
  })

  it('範囲外の amount はクランプされ、常に有効な色を返す', () => {
    expect(shadeHex('#3366cc', 12)).toMatch(HEX)
    expect(shadeHex('#3366cc', -12)).toMatch(HEX)
  })
})
