// プロトタイプAの共通原則のうち「カメラを引く」「密度を上げる」を数値で縛るテスト。
// 参考例の分析(docs/references/2026-08-02_x-4examples.md)から出てきた原則を、
// 目視ではなく数式で守れるものは数式で守る。作り込みを粗くしても方針だけは崩れないようにするため。
import { describe, expect, it } from 'vitest'
import {
  CHAPTERS,
  DIORAMA_SIZE,
  apparentHeroFraction,
  cameraPose,
  parseChapterOverride,
  parseLocalOverride,
  resolveCut,
} from './chapters'
import { PALETTES } from './palette'

describe('CHAPTERS', () => {
  it('章IDが重複しない', () => {
    const ids = CHAPTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('すべての章が実在するパレットを指す', () => {
    for (const c of CHAPTERS) {
      expect(c.paletteIndex).toBeGreaterThanOrEqual(0)
      expect(c.paletteIndex).toBeLessThan(PALETTES.length)
    }
  })

  // 共通原則2。参考例では主役が画面の1/4〜1/8だった。現行シーンはこれが真逆(球が画面の1/3超)
  it('主役が画面高の1/4以下に収まる', () => {
    for (const c of CHAPTERS) {
      // local=1(章の終わり)が最もカメラが寄る側。そこで測って上限を満たすこと
      expect(apparentHeroFraction(c, 1)).toBeLessThan(0.25)
    }
  })

  // 小さすぎても「主役」として読めなくなるので下限も置く
  it('主役が小さくなりすぎない(画面高の1/16以上)', () => {
    for (const c of CHAPTERS) {
      expect(apparentHeroFraction(c, 0)).toBeGreaterThan(1 / 16)
    }
  })

  // 共通原則4。密度がこの試作の主眼なので、章あたりの下限を明示的に縛る
  it('各章が50個以上の小物を散布する', () => {
    for (const c of CHAPTERS) {
      expect(c.propCount).toBeGreaterThanOrEqual(50)
    }
  })

  // 参考例は俯瞰3例・一点透視1例。方向Aは俯瞰に寄せる
  it('カメラが俯瞰(仰角25〜55度)である', () => {
    for (const c of CHAPTERS) {
      expect(c.cut.elevation).toBeGreaterThanOrEqual(25)
      expect(c.cut.elevation).toBeLessThanOrEqual(55)
    }
  })

  it('主役が中央の除外矩形の中に立つ(散布した小物と重ならない)', () => {
    for (const c of CHAPTERS) {
      expect(Math.abs(c.heroPos[0])).toBeLessThan(5.5)
      expect(Math.abs(c.heroPos[1])).toBeLessThan(5.5)
    }
  })
})

describe('resolveCut', () => {
  it('offsetを章数で等分する', () => {
    expect(resolveCut(0, 4).index).toBe(0)
    expect(resolveCut(0.24, 4).index).toBe(0)
    expect(resolveCut(0.26, 4).index).toBe(1)
    expect(resolveCut(0.51, 4).index).toBe(2)
    expect(resolveCut(0.76, 4).index).toBe(3)
  })

  it('境界のちょうどで次の章に入る', () => {
    expect(resolveCut(0.25, 4)).toEqual({ index: 1, local: 0 })
    expect(resolveCut(0.5, 4)).toEqual({ index: 2, local: 0 })
  })

  it('offset=1 でも最終章にとどまる(範囲外にならない)', () => {
    expect(resolveCut(1, 4)).toEqual({ index: 3, local: 1 })
  })

  it('範囲外のoffsetをクランプする', () => {
    expect(resolveCut(-3, 4)).toEqual({ index: 0, local: 0 })
    expect(resolveCut(9, 4)).toEqual({ index: 3, local: 1 })
  })

  it('章の中では local が 0→1 に進む', () => {
    expect(resolveCut(0.125, 4).local).toBeCloseTo(0.5, 6)
    expect(resolveCut(0.375, 4).local).toBeCloseTo(0.5, 6)
  })
})

describe('cameraPose', () => {
  it('注視点は箱庭の中心(ワールド原点)の真上', () => {
    for (const c of CHAPTERS) {
      const { target } = cameraPose(c, 0)
      expect(target[0]).toBe(0)
      expect(target[2]).toBe(0)
      expect(target[1]).toBe(c.cut.lookY)
    }
  })

  it('カメラは指定した距離と仰角の球面上にある', () => {
    for (const c of CHAPTERS) {
      const { position } = cameraPose(c, 0)
      const d = Math.hypot(position[0], position[1], position[2])
      expect(d).toBeCloseTo(c.cut.distance, 6)
      const elevation = (Math.asin(position[1] / d) * 180) / Math.PI
      expect(elevation).toBeCloseTo(c.cut.elevation, 6)
    }
  })

  it('章の中でドリフトする(local 0 と 1 でカメラが動く)', () => {
    for (const c of CHAPTERS) {
      const a = cameraPose(c, 0).position
      const b = cameraPose(c, 1).position
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeGreaterThan(0.5)
    }
  })

  // カットは瞬間移動であるべき。境界で連続だと現行シーンと同じ「なめらかに動くカメラ」になる
  it('章の境界でカメラが不連続に飛ぶ(=カットになっている)', () => {
    for (let i = 0; i < CHAPTERS.length - 1; i++) {
      const endOfCut = cameraPose(CHAPTERS[i], 1).position
      const startOfNext = cameraPose(CHAPTERS[i + 1], 0).position
      const jump = Math.hypot(
        endOfCut[0] - startOfNext[0],
        endOfCut[1] - startOfNext[1],
        endOfCut[2] - startOfNext[2]
      )
      expect(jump).toBeGreaterThan(DIORAMA_SIZE / 2)
    }
  })
})

describe('QAクエリ', () => {
  it('?ch=N で章を指定できる', () => {
    expect(parseChapterOverride('?ch=2')).toBe(2)
    expect(parseChapterOverride('?ch=0')).toBe(0)
  })

  it('章の範囲外はクランプする', () => {
    expect(parseChapterOverride('?ch=99')).toBe(CHAPTERS.length - 1)
    expect(parseChapterOverride('?ch=-5')).toBe(0)
  })

  it('未指定・不正値は null(スクロール駆動のまま)', () => {
    expect(parseChapterOverride('')).toBeNull()
    expect(parseChapterOverride('?ch=')).toBeNull()
    expect(parseChapterOverride('?ch=abc')).toBeNull()
    expect(parseChapterOverride('?other=1')).toBeNull()
  })

  it('?cut は 0〜1 にクランプ、未指定は0.5', () => {
    expect(parseLocalOverride('?cut=0.8')).toBe(0.8)
    expect(parseLocalOverride('?cut=5')).toBe(1)
    expect(parseLocalOverride('?cut=-1')).toBe(0)
    expect(parseLocalOverride('')).toBe(0.5)
    expect(parseLocalOverride('?cut=xyz')).toBe(0.5)
  })
})
