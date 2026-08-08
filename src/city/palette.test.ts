// パレットの絞り込みと、**骨子である「連続移動」を色の側でも守れているか**の確認。
// 移植元は `proto/b/palette.test.ts` と `proto/b/boxes.test.ts` の `paletteAt` 節。
//
// `city/palette.ts` は PR 1 で移植したがテストが無かった。PR 2 は路面・建物・輪郭線・
// 路面マーキングの4系統がすべて `paletteAt(t)` から色を焼くので、ここで閉じておく。
import { describe, expect, it } from 'vitest'
import { PALETTES, getPalette, lerpPalette, mixHex, paletteAt, parseHex, shadeHex } from './palette'
import { CHAPTERS, TOTAL_LENGTH, chapterLength, chapterStart } from './route'

const HEX = /^#[0-9a-f]{6}$/

describe('PALETTES', () => {
  it('章の数だけある', () => {
    expect(PALETTES.length).toBe(CHAPTERS.length)
  })

  it('IDが重複しない', () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
  })

  it('すべての色が #rrggbb 形式', () => {
    for (const p of PALETTES) {
      for (const c of [
        p.sky,
        p.road,
        p.roadMark,
        p.sidewalk,
        p.accent,
        p.outline,
        p.shadowColor,
        p.skyColor,
        p.key.color,
      ]) {
        expect(c.toLowerCase()).toMatch(HEX)
      }
      for (const c of p.buildings) expect(c.toLowerCase()).toMatch(HEX)
    }
  })

  // パレット絞り込みの実体。建物の色をこの4色からしか取らない
  it('建物の色がちょうど4色', () => {
    for (const p of PALETTES) expect(p.buildings).toHaveLength(4)
  })

  it('フォグが遠景を残す(奥へ消える道が消えない)', () => {
    for (const p of PALETTES) {
      expect(p.fogFar).toBeGreaterThan(p.fogNear)
      // 一点透視で見える範囲(70以上先)より手前で全部溶けてしまうと構図が成立しない
      expect(p.fogFar).toBeGreaterThan(150)
    }
  })

  // 影が真っ黒だと ambientLight で作った影の色が見えなくなる
  it('影の濃さが1未満(影色が残る)', () => {
    for (const p of PALETTES) {
      expect(p.shadowOpacity).toBeGreaterThan(0)
      expect(p.shadowOpacity).toBeLessThan(1)
    }
  })

  it('キーライトが空の上にある', () => {
    for (const p of PALETTES) expect(p.key.offset[1]).toBeGreaterThan(5)
  })

  it('夜のパレットだけが暗い', () => {
    const brightness = (hex: string) => parseHex(hex).reduce((s, v) => s + v, 0) / 3
    const dark = PALETTES.filter((p) => brightness(p.sky) < 100)
    expect(dark).toHaveLength(1)
    expect(dark[0].id).toBe('night')
  })

  /**
   * **ランドマークの可視距離の前提**(§1.3)。章の 110 ユニット手前から照明塔が
   * 見えていなければならないので、最も厳しい Night の `fogFar` でも 110 を超える必要がある。
   * 実装は PR 6 だが、前提が崩れたらそこで気づけるようここで縛る
   */
  it('最も濃いフォグでもランドマークの可視距離 110 を超える', () => {
    expect(Math.min(...PALETTES.map((p) => p.fogFar))).toBeGreaterThan(110)
  })
})

describe('getPalette', () => {
  it('範囲外をクランプする', () => {
    expect(getPalette(-3)).toBe(PALETTES[0])
    expect(getPalette(99)).toBe(PALETTES[PALETTES.length - 1])
  })
})

describe('parseHex / mixHex / shadeHex', () => {
  it('16進を分解する', () => {
    expect(parseHex('#ff8000')).toEqual([255, 128, 0])
    expect(parseHex('00ff10')).toEqual([0, 255, 16])
  })

  it('不正な色は例外にする(黙って黒くしない)', () => {
    expect(() => parseHex('#xyz')).toThrow()
    expect(() => parseHex('#fff')).toThrow()
  })

  it('両端でそれぞれの色になる', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('中間で中間色になる', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('範囲外をクランプする', () => {
    expect(mixHex('#000000', '#ffffff', -5)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 9)).toBe('#ffffff')
  })

  it('明るく/暗くできる', () => {
    expect(shadeHex('#808080', 1)).toBe('#ffffff')
    expect(shadeHex('#808080', -1)).toBe('#000000')
    expect(shadeHex('#808080', 0)).toBe('#808080')
  })
})

describe('lerpPalette', () => {
  const [a, b] = PALETTES

  it('t=0 と t=1 で元のパレットの色に一致する', () => {
    expect(lerpPalette(a, b, 0).sky).toBe(a.sky)
    expect(lerpPalette(a, b, 1).sky).toBe(b.sky)
    expect(lerpPalette(a, b, 0).fogNear).toBe(a.fogNear)
    expect(lerpPalette(a, b, 1).shadowOpacity).toBe(b.shadowOpacity)
  })

  it('建物の4色すべてが混ざる', () => {
    const mid = lerpPalette(a, b, 0.5)
    mid.buildings.forEach((c, i) => {
      expect(c).toBe(mixHex(a.buildings[i], b.buildings[i], 0.5))
    })
  })

  it('キーライトの位置も混ざる(光の向きが飛ばない)', () => {
    const mid = lerpPalette(a, b, 0.5)
    mid.key.offset.forEach((v, i) => {
      expect(v).toBeCloseTo((a.key.offset[i] + b.key.offset[i]) / 2, 6)
    })
  })

  it('範囲外をクランプする', () => {
    expect(lerpPalette(a, b, -2).sky).toBe(a.sky)
    expect(lerpPalette(a, b, 5).sky).toBe(b.sky)
  })
})

describe('paletteAt', () => {
  it('道の始点は最初のパレット', () => {
    expect(paletteAt(0).sky).toBe(PALETTES[0].sky)
  })

  // **「パレットを絞る」の担保**。章ぜんぶを使って隣へ渡すと
  // 章の中央が常に2色の50/50になり、純粋なパレットがどこにも存在しなくなる
  it('各章の中央では自分のパレットのままである', () => {
    CHAPTERS.forEach((chapter, i) => {
      const mid = chapterStart(i) + chapterLength(i) / 2
      expect(paletteAt(mid).sky).toBe(PALETTES[chapter.paletteIndex].sky)
      expect(paletteAt(mid).label).toBe(PALETTES[chapter.paletteIndex].label)
    })
  })

  it('章の終わりでちょうど次のパレットになる(境界が連続する)', () => {
    for (let i = 0; i < CHAPTERS.length - 1; i++) {
      const boundary = chapterStart(i + 1)
      const next = PALETTES[CHAPTERS[i + 1].paletteIndex]
      expect(paletteAt(boundary - 0.01).sky).toBe(next.sky)
      expect(paletteAt(boundary + 0.01).sky).toBe(next.sky)
    }
  })

  it('道の終点は最後のパレット', () => {
    expect(paletteAt(TOTAL_LENGTH).sky).toBe(PALETTES[PALETTES.length - 1].sky)
  })

  /**
   * 見ているのは「不連続な飛びが無いこと」。クリック駆動の①のようにカットで入れ替えると
   * 1ステップで約280(夕 → 夜のRGB距離ぜんぶ)が出るので、30 を超えなければ渡しが
   * 起きていると言える。遷移は章の終盤24%に寄せてあるぶん単位距離あたりの変化は速いが、
   * それは意図した速さであって不連続ではない
   */
  it('位置に対して連続している(色が飛ばない)', () => {
    const toRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
    for (let t = 0; t < TOTAL_LENGTH; t += 1) {
      const [ar, ag, ab] = toRgb(paletteAt(t).sky)
      const [br, bg, bb] = toRgb(paletteAt(t + 1).sky)
      expect(Math.hypot(ar - br, ag - bg, ab - bb)).toBeLessThan(30)
    }
  })

  it('範囲外でもクランプして返す', () => {
    expect(paletteAt(-500).sky).toBe(PALETTES[0].sky)
    expect(paletteAt(TOTAL_LENGTH + 500).sky).toBe(PALETTES[PALETTES.length - 1].sky)
  })
})
