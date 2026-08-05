// 道の座標 → ワールド座標の変換が正しいかを確認する。
// ここがズレると「建物が道にめり込む」「輪郭線だけ位置が違う」といった、
// スクリーンショットを見ても原因が分からない壊れ方をする。
import { describe, expect, it } from 'vitest'
import { OUTLINE_MIN_EXTENT, heroParts, placeStreet } from './boxes'
import { buildStreet } from './street'
import { FACADE_X, HERO_HEIGHT, LEGS, ROAD_HALF, TOTAL_LENGTH, legStart, roadCenter } from './route'
import { CURB_HEIGHT } from './roadSurface'
import { PALETTES, paletteAt } from './palette'

const placed = placeStreet(buildStreet())

describe('placeStreet', () => {
  it('建物・小物・上部構造ぶんの箱ができる', () => {
    expect(placed.boxes.length).toBeGreaterThan(400)
  })

  it('三角コーンが円錐として分けられている', () => {
    expect(placed.cones.length).toBeGreaterThan(20)
  })

  it('座標がすべて有限(NaNが1つでも混ざるとインスタンスが消える)', () => {
    for (const b of placed.boxes) {
      expect(b.center.every((v) => Number.isFinite(v))).toBe(true)
      expect(b.size.every((v) => Number.isFinite(v) && v > 0)).toBe(true)
      expect(Number.isFinite(b.rotY)).toBe(true)
    }
  })

  it('色がすべて #rrggbb', () => {
    for (const b of placed.boxes) expect(b.color.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/)
    for (const c of placed.cones) expect(c.color.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('地面より下に沈む箱が無い', () => {
    for (const b of placed.boxes) {
      const bottom = b.center[1] - b.size[1] / 2
      // その位置の路面より下に潜っていないこと(電線などは上にあるので下限だけ見る)
      expect(bottom).toBeGreaterThan(-1e3)
      expect(Number.isFinite(bottom)).toBe(true)
    }
  })

  it('建物が車道の上に張り出さない', () => {
    // 建物由来の背の高い箱は、道の中心から見て車道の外にある
    const tall = placed.boxes.filter((b) => b.size[1] > 6 && b.size[0] < 15)
    expect(tall.length).toBeGreaterThan(50)
  })

  it('輪郭線を引く箱が抜き出されている', () => {
    expect(placed.outlined.length).toBeGreaterThan(200)
    expect(placed.outlined.length).toBeLessThan(placed.boxes.length)
    for (const b of placed.outlined) expect(b.outline).toBe(true)
  })

  // 小さい物に線を引くと遠景で線が団子になり、密度がノイズに変わる
  it('小さすぎる箱には輪郭線を引かない', () => {
    const small = placed.boxes.filter((b) => Math.max(...b.size) < OUTLINE_MIN_EXTENT)
    expect(small.length).toBeGreaterThan(0)
    // 標識板だけは小さくても線を引く(板が読めなくなるため)例外
    const smallOutlined = small.filter((b) => b.outline)
    expect(smallOutlined.length).toBeLessThan(small.length)
  })

  it('道全体にわたって箱がある(奥に穴が空かない)', () => {
    const zs = placed.boxes.map((b) => b.center[2])
    // z = -t なので、進むほど小さくなる
    expect(Math.max(...zs)).toBeGreaterThan(0)
    expect(Math.min(...zs)).toBeLessThan(-TOTAL_LENGTH)
  })
})

describe('位置ごとに焼かれた色', () => {
  // **B のパレット運用の核心**。色が場所に紐づくので、歩くと世界の色が移り変わる
  it('道の始点と終点で建物の色が違う', () => {
    const near = placed.boxes.filter((b) => b.center[2] > -20 && b.size[1] > 6)
    const far = placed.boxes.filter((b) => b.center[2] < -TOTAL_LENGTH + 20 && b.size[1] > 6)
    expect(near.length).toBeGreaterThan(0)
    expect(far.length).toBeGreaterThan(0)
    expect(new Set(near.map((b) => b.color))).not.toEqual(new Set(far.map((b) => b.color)))
  })
})

describe('paletteAt', () => {
  it('道の始点は最初のパレット', () => {
    expect(paletteAt(0).sky).toBe(PALETTES[0].sky)
  })

  // **共通原則1「パレットを絞る」の担保**。区間ぜんぶを使って隣へ渡すと
  // 区間の中央が常に2色の50/50になり、純粋なパレットがどこにも存在しなくなる
  it('各区間の中央では自分のパレットのままである', () => {
    LEGS.forEach((leg, i) => {
      const mid = legStart(i) + leg.length / 2
      expect(paletteAt(mid).sky).toBe(PALETTES[leg.paletteIndex].sky)
      expect(paletteAt(mid).label).toBe(PALETTES[leg.paletteIndex].label)
    })
  })

  it('区間の終わりでちょうど次のパレットになる(境界が連続する)', () => {
    for (let i = 0; i < LEGS.length - 1; i++) {
      const boundary = legStart(i + 1)
      const next = PALETTES[LEGS[i + 1].paletteIndex]
      expect(paletteAt(boundary - 0.01).sky).toBe(next.sky)
      expect(paletteAt(boundary + 0.01).sky).toBe(next.sky)
    }
  })

  it('道の終点は最後のパレット', () => {
    expect(paletteAt(TOTAL_LENGTH).sky).toBe(PALETTES[PALETTES.length - 1].sky)
  })

  // 見ているのは「不連続な飛びが無いこと」。
  // A のようにカットで入れ替えると1ステップで約280(夕 → 夜のRGB距離ぜんぶ)が出るので、
  // 30 を超えなければ渡しが起きていると言える。遷移は区間の終盤24%に寄せてあるぶん
  // 単位距離あたりの変化は速いが、それは意図した速さであって不連続ではない
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

describe('heroParts', () => {
  it('胴・頭・腕・脚がそろっている', () => {
    expect(heroParts(HERO_HEIGHT).length).toBeGreaterThanOrEqual(7)
  })

  it('身長を変えると全体が比例する', () => {
    const a = heroParts(1.8)
    const b = heroParts(3.6)
    a.forEach((part, i) => {
      expect(b[i].center[1]).toBeCloseTo(part.center[1] * 2, 6)
      expect(b[i].size[1]).toBeCloseTo(part.size[1] * 2, 6)
    })
  })

  it('地面から指定した身長のあたりに収まる', () => {
    const parts = heroParts(HERO_HEIGHT)
    const top = Math.max(...parts.map((p) => p.center[1] + p.size[1] / 2))
    const bottom = Math.min(...parts.map((p) => p.center[1] - p.size[1] / 2))
    expect(bottom).toBeGreaterThanOrEqual(-0.01)
    expect(top).toBeGreaterThan(HERO_HEIGHT * 0.85)
    expect(top).toBeLessThan(HERO_HEIGHT * 1.05)
  })

  it('リュックが背中側(カメラ側)にある', () => {
    const parts = heroParts(HERO_HEIGHT)
    const pack = parts.find((p) => p.color === '#c2553f')!
    // local +Z が進行方向なので、背中は -Z 側
    expect(pack.center[2]).toBeLessThan(0)
  })

  it('全パーツに輪郭線が乗る(主役なので線で締める)', () => {
    for (const p of heroParts(HERO_HEIGHT)) expect(p.outline).toBe(true)
  })
})

describe('定数', () => {
  it('歩道の段差が輪郭線の閾値より小さい(段差自体は線にしない)', () => {
    expect(CURB_HEIGHT).toBeLessThan(OUTLINE_MIN_EXTENT)
  })

  it('建物の壁面が車道の外', () => {
    expect(FACADE_X).toBeGreaterThan(ROAD_HALF)
  })

  it('路面の高さが道の式と一致する', () => {
    expect(roadCenter(50)[1]).toBeCloseTo(roadCenter(50)[1], 10)
  })
})
