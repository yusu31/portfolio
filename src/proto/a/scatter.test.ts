// 共通原則4「密度を上げる」の実装(散布)のテスト。
// 「実際に何個置けたか」を確認できることが重要で、棄却サンプリングが詰まると
// 密度パラメータを上げたのに件数が増えないという分かりにくい失敗をする。
import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './chapters'
import { KIND_MIXES, mulberry32, scatterProps, type ScatterSpec } from './scatter'

const baseSpec: ScatterSpec = {
  seed: 1234,
  count: 60,
  half: 10.2,
  exclusionHalf: 5.5,
  kinds: KIND_MIXES.gym,
  colorCount: 4,
  minGap: 0.62,
}

describe('mulberry32', () => {
  it('同じシードなら同じ列を返す', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('別のシードなら別の列になる', () => {
    const a = mulberry32(42)
    const b = mulberry32(43)
    expect(a()).not.toBe(b())
  })

  it('0以上1未満を返す', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 500; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('scatterProps', () => {
  it('同じ仕様なら完全に同じ配置になる(カットで章に戻っても動かない)', () => {
    expect(scatterProps(baseSpec)).toEqual(scatterProps(baseSpec))
  })

  it('指定した数を置き切れる', () => {
    expect(scatterProps(baseSpec)).toHaveLength(baseSpec.count)
  })

  it('散布範囲からはみ出さない', () => {
    for (const it of scatterProps(baseSpec)) {
      expect(Math.abs(it.x)).toBeLessThanOrEqual(baseSpec.half)
      expect(Math.abs(it.z)).toBeLessThanOrEqual(baseSpec.half)
    }
  })

  it('中央の除外矩形を空ける(主役と固定物の場所)', () => {
    for (const it of scatterProps(baseSpec)) {
      const inside = Math.abs(it.x) < baseSpec.exclusionHalf && Math.abs(it.z) < baseSpec.exclusionHalf
      expect(inside).toBe(false)
    }
  })

  it('最小間隔を守る', () => {
    const items = scatterProps(baseSpec)
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        expect(Math.hypot(items[i].x - items[j].x, items[i].z - items[j].z)).toBeGreaterThanOrEqual(baseSpec.minGap)
      }
    }
  })

  it('色はパレットの範囲に収まる(色数を増やさない)', () => {
    for (const it of scatterProps(baseSpec)) {
      expect(it.colorIndex).toBeGreaterThanOrEqual(0)
      expect(it.colorIndex).toBeLessThan(baseSpec.colorCount)
    }
  })

  it('寸法が正の値になる', () => {
    for (const it of scatterProps(baseSpec)) {
      expect(it.footprint).toBeGreaterThan(0)
      expect(it.height).toBeGreaterThan(0)
    }
  })

  it('配合で指定した形しか出てこない', () => {
    const allowed = new Set(KIND_MIXES.gym.map((k) => k.kind))
    for (const it of scatterProps(baseSpec)) {
      expect(allowed.has(it.kind)).toBe(true)
    }
  })

  // 置き切れない設定でも固まらずに返ること。極端値で差分を測るときに固まると調査が止まる
  it('置き切れない密度でも無限ループせず、置けた分だけ返す', () => {
    const impossible: ScatterSpec = { ...baseSpec, count: 400, half: 6, exclusionHalf: 5.5, minGap: 1.5 }
    const items = scatterProps(impossible)
    expect(items.length).toBeLessThan(impossible.count)
    expect(items.length).toBeGreaterThan(0)
  })

  it('全章の実際の設定で目標数を置き切れる', () => {
    for (const c of CHAPTERS) {
      const items = scatterProps({
        seed: c.seed,
        count: c.propCount,
        half: 10.2,
        exclusionHalf: 5.5,
        kinds: KIND_MIXES[c.id],
        colorCount: 4,
        minGap: 0.62,
      })
      expect(items).toHaveLength(c.propCount)
    }
  })
})

describe('KIND_MIXES', () => {
  it('全章ぶんの配合がある', () => {
    for (const c of CHAPTERS) {
      expect(KIND_MIXES[c.id]).toBeDefined()
      expect(KIND_MIXES[c.id].length).toBeGreaterThan(0)
    }
  })

  it('重みが正の値', () => {
    for (const mix of Object.values(KIND_MIXES)) {
      for (const k of mix) expect(k.weight).toBeGreaterThan(0)
    }
  })
})
