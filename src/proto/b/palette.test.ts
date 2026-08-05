// パレットの絞り込みと、**Bの骨子である「連続移動」を色の側でも守れているか**の確認。
import { describe, expect, it } from 'vitest'
import { PALETTES, getPalette, lerpPalette, mixHex, parseHex, shadeHex } from './palette'
import { LEGS } from './route'

const HEX = /^#[0-9a-f]{6}$/

describe('PALETTES', () => {
  it('区間の数だけある', () => {
    expect(PALETTES.length).toBe(LEGS.length)
  })

  it('IDが重複しない', () => {
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
  })

  it('すべての色が #rrggbb 形式', () => {
    for (const p of PALETTES) {
      for (const c of [p.sky, p.road, p.roadMark, p.sidewalk, p.accent, p.outline, p.shadowColor, p.skyColor, p.key.color]) {
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

  // 影が真っ黒だと ambientLight で作った影の色が見えなくなる(A で確立)
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

  // **A との対比**。A はカット送りなので境界で色が入れ替わるのが正しかったが、
  // B は連続移動なので色が飛ぶと「一本道を進んでいる」前提が壊れる
  it('全区間を通して色が連続する(境界で飛ばない)', () => {
    const at = (u: number) => {
      const scaled = Math.min(u, 0.999) * (PALETTES.length - 1)
      const i = Math.floor(scaled)
      return lerpPalette(PALETTES[i], PALETTES[Math.min(i + 1, PALETTES.length - 1)], scaled - i)
    }
    const distance = (x: string, y: string) => {
      const p = parseHex(x)
      const q = parseHex(y)
      return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
    }
    for (let u = 0; u < 0.99; u += 0.01) {
      expect(distance(at(u).sky, at(u + 0.005).sky)).toBeLessThan(12)
    }
  })

  it('範囲外をクランプする', () => {
    expect(lerpPalette(a, b, -2).sky).toBe(a.sky)
    expect(lerpPalette(a, b, 5).sky).toBe(b.sky)
  })
})
