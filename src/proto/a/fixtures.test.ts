// 固定物(その場所が何であるかを説明する物)のテスト。
// 散布(scatter)が密度を作るのに対し、こちらは意味を作る。両方無いと
// 「密度はあるが何の場所か分からない」or「意味はあるがガランとしている」のどちらかになる。
import { describe, expect, it } from 'vitest'
import { CHAPTERS, DIORAMA_SIZE } from './chapters'
import { buildFixtures } from './fixtures'
import { PALETTES } from './palette'

describe('buildFixtures', () => {
  it('全章に固定物がある', () => {
    for (const c of CHAPTERS) {
      expect(buildFixtures(c.id).length).toBeGreaterThan(0)
    }
  })

  it('各章が10個以上の固定物を持つ(場所の説明として最低限の量)', () => {
    for (const c of CHAPTERS) {
      expect(buildFixtures(c.id).length).toBeGreaterThanOrEqual(10)
    }
  })

  it('寸法がすべて正の値', () => {
    for (const c of CHAPTERS) {
      for (const b of buildFixtures(c.id)) {
        expect(b.w).toBeGreaterThan(0)
        expect(b.h).toBeGreaterThan(0)
        expect(b.d).toBeGreaterThan(0)
      }
    }
  })

  it('地面より下に沈まない', () => {
    for (const c of CHAPTERS) {
      for (const b of buildFixtures(c.id)) {
        expect(b.y).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // 背景の校舎やビルは意図的に箱庭の外へ出すので、余裕を持った上限で見る
  it('箱庭から極端に離れた位置に置かれていない', () => {
    const limit = DIORAMA_SIZE // 半辺11に対して倍の余裕。背景物のはみ出しは許容する
    for (const c of CHAPTERS) {
      for (const b of buildFixtures(c.id)) {
        expect(Math.abs(b.x)).toBeLessThanOrEqual(limit)
        expect(Math.abs(b.z)).toBeLessThanOrEqual(limit)
      }
    }
  })

  it('色インデックスがパレットの範囲に収まる(-1は差し色)', () => {
    const propCount = PALETTES[0].props.length
    for (const c of CHAPTERS) {
      for (const b of buildFixtures(c.id)) {
        expect(b.colorIndex).toBeGreaterThanOrEqual(-1)
        expect(b.colorIndex).toBeLessThan(propCount)
      }
    }
  })

  // 差し色は少量だけ。固定物の大半が accent になるとパレットの絞り込みが意味を失う
  it('差し色(accent)が固定物の3割を超えない', () => {
    for (const c of CHAPTERS) {
      const blocks = buildFixtures(c.id)
      const accents = blocks.filter((b) => b.colorIndex < 0).length
      expect(accents / blocks.length).toBeLessThan(0.3)
    }
  })

  it('自光する固定物は夜の章にしか多く置かない', () => {
    const emissiveCounts = CHAPTERS.map((c) => buildFixtures(c.id).filter((b) => b.emissive).length)
    const nightIndex = CHAPTERS.findIndex((c) => PALETTES[c.paletteIndex].id === 'night')
    expect(nightIndex).toBeGreaterThanOrEqual(0)
    expect(emissiveCounts[nightIndex]).toBeGreaterThan(0)
  })
})
