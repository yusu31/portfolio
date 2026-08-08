// 縦グラデーションの焼き込みを縛る。**これは B に無い /city 独自の工夫**なので、
// 「効いていること」と「壊れると絵にどう出るか」をここに書き残す。
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  GRADIENT_BASE,
  GRADIENT_CURVE,
  GRADIENT_TOP,
  bakeVerticalGradient,
  verticalGradientFactor,
} from './shading'

describe('verticalGradientFactor', () => {
  it('底で GRADIENT_BASE、天で GRADIENT_TOP', () => {
    expect(verticalGradientFactor(0)).toBeCloseTo(GRADIENT_BASE, 10)
    expect(verticalGradientFactor(1)).toBeCloseTo(GRADIENT_TOP, 10)
  })

  it('範囲外はクランプする', () => {
    expect(verticalGradientFactor(-3)).toBeCloseTo(GRADIENT_BASE, 10)
    expect(verticalGradientFactor(9)).toBeCloseTo(GRADIENT_TOP, 10)
  })

  it('下から上へ単調に明るくなる', () => {
    let prev = -Infinity
    for (let i = 0; i <= 20; i++) {
      const f = verticalGradientFactor(i / 20)
      expect(f).toBeGreaterThan(prev)
      prev = f
    }
  })

  /**
   * **足元に陰が集まっていること**が「接地して見える」の実体。
   * 曲線(0.6)が線形(1.0)に戻ると、壁の全高にわたって均一に明るくなるだけで
   * 塊として読めなくなる。中央での値が線形の中点(0.94)より明るいことで曲線を縛る
   */
  it('明度の立ち上がりが足元に寄っている(線形ではない)', () => {
    const linearMid = (GRADIENT_BASE + GRADIENT_TOP) / 2
    expect(GRADIENT_CURVE).toBeLessThan(1)
    expect(verticalGradientFactor(0.5)).toBeGreaterThan(linearMid)
  })

  /**
   * 1.0 をまたぐこと。**下は暗く、上は明るく**でないと「陰を足した」ではなく
   * 「全体を暗くした」になり、パレットの明度設計から外れる
   */
  it('1.0 をまたぐ倍率になっている', () => {
    expect(GRADIENT_BASE).toBeLessThan(1)
    expect(GRADIENT_TOP).toBeGreaterThan(1)
  })
})

describe('bakeVerticalGradient', () => {
  it('頂点数ぶんの色属性が付く', () => {
    const g = bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, 3, 1))
    const color = g.getAttribute('color')
    expect(color).toBeDefined()
    expect(color.count).toBe(g.getAttribute('position').count)
    expect(color.itemSize).toBe(3)
  })

  it('グレースケール(RGBが同値)になる。色ではなく明度の倍率だから', () => {
    const g = bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, 3, 1))
    const c = g.getAttribute('color')
    for (let i = 0; i < c.count; i++) {
      expect(c.getY(i)).toBeCloseTo(c.getX(i), 10)
      expect(c.getZ(i)).toBeCloseTo(c.getX(i), 10)
    }
  })

  it('一番下の頂点が最も暗く、一番上が最も明るい', () => {
    const g = bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, 3, 1))
    const p = g.getAttribute('position')
    const c = g.getAttribute('color')
    let bottom = Infinity
    let top = -Infinity
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < bottom) bottom = p.getY(i)
      if (p.getY(i) > top) top = p.getY(i)
    }
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) === bottom) expect(c.getX(i)).toBeCloseTo(GRADIENT_BASE, 6)
      if (p.getY(i) === top) expect(c.getX(i)).toBeCloseTo(GRADIENT_TOP, 6)
    }
  })

  /**
   * **高さの分割が無いと曲線が出ない**。上下の2値しか焼けないので、
   * 足元に陰を集める `GRADIENT_CURVE` が絵に出なくなる。
   * 描画側が `BOX_HEIGHT_SEGMENTS` を分割している理由がこれ
   */
  it('高さを分割すると中間の段が焼かれる', () => {
    const split = bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, 3, 1))
    const flat = bakeVerticalGradient(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1))
    const distinct = (g: THREE.BufferGeometry) => {
      const c = g.getAttribute('color')
      const set = new Set<number>()
      for (let i = 0; i < c.count; i++) set.add(Math.round(c.getX(i) * 1e6))
      return set.size
    }
    expect(distinct(flat)).toBe(2)
    expect(distinct(split)).toBeGreaterThan(2)
  })

  it('円錐のような別のジオメトリでも高さで正規化される', () => {
    const g = bakeVerticalGradient(new THREE.ConeGeometry(1, 1, 6, 2))
    const c = g.getAttribute('color')
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < c.count; i++) {
      min = Math.min(min, c.getX(i))
      max = Math.max(max, c.getX(i))
    }
    expect(min).toBeCloseTo(GRADIENT_BASE, 6)
    expect(max).toBeCloseTo(GRADIENT_TOP, 6)
  })
})
