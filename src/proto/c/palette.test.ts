import { describe, expect, it } from 'vitest'
import {
  ATMOSPHERE_HOLD,
  PALETTES,
  getPalette,
  lerpPalette,
  mixHex,
  parseHex,
  shadeHex,
  slotColor,
  type ColorSlot,
  type Palette,
} from './palette'

/** `slotColor` が受け取りうる全スロット。増やしたらここも増やす(網羅を落とさないため) */
const ALL_SLOTS: readonly ColorSlot[] = [
  'ground',
  'groundAlt',
  'foliage',
  'grout',
  'curb',
  'post',
  'rock',
  'rockDeep',
  'lane',
  'laneMark',
  'wood',
  'soil',
  'structure0',
  'structure1',
  'structure2',
  'structure3',
  'roof',
  'accent',
  'heroBody',
  'heroLimb',
  'heroSkin',
]

/** そのパレットが**宣言している**表面色。導出色はここに含まない */
function declaredSurfaceColors(p: Palette): string[] {
  return [p.ground, p.groundAlt, p.grout, p.rock, ...p.structures, p.accent]
}

const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s)

const brightness = (hex: string) => {
  const [r, g, b] = parseHex(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}

describe('PALETTES', () => {
  it('参考例②の4パレット(Day / Golden / Misty / Night)に対応している', () => {
    expect(PALETTES).toHaveLength(4)
    expect(PALETTES.map((p) => p.id)).toEqual(['day', 'golden', 'misty', 'night'])
    expect(PALETTES.map((p) => p.label)).toEqual(['Day', 'Golden', 'Misty', 'Night'])
  })

  it('すべての色フィールドが正しい16進表記', () => {
    for (const p of PALETTES) {
      for (const hex of [...declaredSurfaceColors(p), p.sky, p.shadowColor, p.skyColor, p.key.color]) {
        expect(isHex(hex), `${p.id}: ${hex}`).toBe(true)
      }
    }
  })

  // 共通原則1「パレットを絞る」。宣言する表面色を9色に固定し、
  // 残りはすべて導出にすることで、情報を足しても1画面の色数が増えないようにしている
  it('宣言する表面色は9色ちょうどで、すべて異なる', () => {
    for (const p of PALETTES) {
      const colors = declaredSurfaceColors(p)
      expect(colors).toHaveLength(9)
      expect(new Set(colors).size, p.id).toBe(9)
    }
  })

  it('フォグは奥のカードが列として見える範囲に置く', () => {
    for (const p of PALETTES) {
      expect(p.fogNear, p.id).toBeGreaterThan(0)
      expect(p.fogFar, p.id).toBeGreaterThan(p.fogNear)
      // 1枚先のカードが完全に消えない下限。カード間隔34 + カメラ距離58 で
      // 隣のカードまで概ね70〜100あるので、fogFar はそれを越えている必要がある
      expect(p.fogFar, p.id).toBeGreaterThan(100)
    }
  })

  it('暗いパレットは Night だけ', () => {
    const dark = PALETTES.filter((p) => brightness(p.sky) < 128)
    expect(dark.map((p) => p.id)).toEqual(['night'])
  })

  it('getPalette は範囲外をクランプする', () => {
    expect(getPalette(-3).id).toBe('day')
    expect(getPalette(99).id).toBe('night')
    expect(getPalette(1.4).id).toBe('golden')
  })
})

describe('slotColor', () => {
  it('全スロットが正しい16進を返す', () => {
    for (const p of PALETTES) {
      for (const slot of ALL_SLOTS) {
        expect(isHex(slotColor(p, slot)), `${p.id}/${slot}`).toBe(true)
      }
    }
  })

  it('宣言済みスロットはパレットの値をそのまま返す', () => {
    const p = PALETTES[0]
    expect(slotColor(p, 'ground')).toBe(p.ground)
    expect(slotColor(p, 'groundAlt')).toBe(p.groundAlt)
    expect(slotColor(p, 'rock')).toBe(p.rock)
    expect(slotColor(p, 'accent')).toBe(p.accent)
    expect(slotColor(p, 'structure2')).toBe(p.structures[2])
  })

  it('屋根は必ず壁より暗い(俯瞰で屋根の面積が大きいため)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'roof')), p.id).toBeLessThan(brightness(p.structures[3]))
    }
  })

  // 白線が乗るのは地面ではなく**舗装の上**なので、対比を測る相手は `lane`。
  // 地面(明るいベージュ)と比べると差が出ないが、実際にはそこに線を引かない
  it('走路の白線は舗装よりはっきり明るい(遠くからでも線として読める)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'laneMark')) - brightness(slotColor(p, 'lane')), p.id).toBeGreaterThan(55)
    }
  })

  it('コートの白線も同じ理屈で土より明るい', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'laneMark')) - brightness(slotColor(p, 'soil')), p.id).toBeGreaterThan(40)
    }
  })

  it('走路の舗装は地面より沈む(道として読める)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'lane')), p.id).toBeLessThan(brightness(p.ground))
    }
  })

  it('木の葉は芝より暗い(芝の上に立つ木が地面に溶けない)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'foliage')), p.id).toBeLessThan(brightness(p.groundAlt))
    }
  })

  it('岩は下ほど暗い(浮島の底が空に溶けないようにする)', () => {
    for (const p of PALETTES) {
      expect(brightness(slotColor(p, 'rockDeep')), p.id).toBeLessThan(brightness(slotColor(p, 'rock')))
    }
  })

  // 参考例②の掲載カットは Golden で、「黄土色〜琥珀の単一トーンに全部が沈んでいる」だった。
  // 青系が1色でも混じるとその性質が壊れるので、全スロットで R >= G >= B を要求する
  it('Golden は全スロットが暖色に沈んでいる(R >= G >= B)', () => {
    const golden = PALETTES[1]
    for (const slot of ALL_SLOTS) {
      const [r, g, b] = parseHex(slotColor(golden, slot))
      expect(r, slot).toBeGreaterThanOrEqual(g)
      expect(g, slot).toBeGreaterThanOrEqual(b)
    }
  })

  it('主役の胴は差し色なので、そのパレットの中で目立つ', () => {
    for (const p of PALETTES) {
      expect(slotColor(p, 'heroBody'), p.id).toBe(p.accent)
      // 地面より明るいか暗いかは問わないが、同じ色ではいけない(埋もれる)
      expect(slotColor(p, 'heroBody'), p.id).not.toBe(p.ground)
    }
  })
})

describe('色ユーティリティ', () => {
  it('parseHex は # の有無を問わない', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('ff8000')).toEqual([255, 128, 0])
  })

  it('parseHex は不正値で投げる', () => {
    expect(() => parseHex('#xyz')).toThrow()
    expect(() => parseHex('#fff')).toThrow()
  })

  it('mixHex は端点で元の色を返す', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('shadeHex は正で白へ、負で黒へ寄せる', () => {
    expect(shadeHex('#808080', 1)).toBe('#ffffff')
    expect(shadeHex('#808080', -1)).toBe('#000000')
    expect(shadeHex('#808080', 0)).toBe('#808080')
  })
})

describe('lerpPalette', () => {
  it('端点で元のパレットに一致する', () => {
    const a = PALETTES[0]
    const b = PALETTES[3]
    expect(lerpPalette(a, b, 0).sky).toBe(a.sky)
    expect(lerpPalette(a, b, 1).sky).toBe(b.sky)
    expect(lerpPalette(a, b, 0).ground).toBe(a.ground)
    expect(lerpPalette(a, b, 1).structures[2]).toBe(b.structures[2])
  })

  it('数値フィールドも連続に混ざる', () => {
    const a = PALETTES[0]
    const b = PALETTES[3]
    const mid = lerpPalette(a, b, 0.5)
    expect(mid.fogNear).toBeCloseTo((a.fogNear + b.fogNear) / 2, 5)
    expect(mid.key.intensity).toBeCloseTo((a.key.intensity + b.key.intensity) / 2, 5)
    expect(mid.key.position[1]).toBeCloseTo((a.key.position[1] + b.key.position[1]) / 2, 5)
  })

  it('混ぜた結果も正しい16進のまま', () => {
    const mid = lerpPalette(PALETTES[1], PALETTES[2], 0.37)
    for (const hex of [...declaredSurfaceColors(mid), mid.sky, mid.shadowColor]) {
      expect(isHex(hex)).toBe(true)
    }
  })
})

it('大気の保持幅はカードがステージに乗っている間を純色に保てる', () => {
  expect(ATMOSPHERE_HOLD).toBeGreaterThan(0)
  // 0.5 以上にすると保持どうしが重なって渡す区間が消える
  expect(ATMOSPHERE_HOLD).toBeLessThan(0.5)
})
