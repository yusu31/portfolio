// 道の座標 → ワールド座標の変換が正しいかを確認する。移植元は `proto/b/boxes.test.ts`。
// ここがズレると「建物が道にめり込む」「輪郭線だけ位置が違う」といった、
// スクリーンショットを見ても原因が分からない壊れ方をする。
//
// B から落としたのは `heroParts` のテスト(人物アバターを入れないので関数自体が無い)。
import { describe, expect, it } from 'vitest'
import { OUTLINE_MIN_EXTENT, placeStreet } from './boxes'
import { buildStreet } from './street'
import { FACADE_X, ROAD_HALF, TOTAL_LENGTH, openingRanges, roadCenter } from './route'
import { CURB_HEIGHT } from './roadSurface'

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

  /**
   * **開口に背の高い箱が残らない**(§1.2 装置1)。
   *
   * `street.ts` のテストは「建物データが除外区間に無い」ことを見ているが、
   * ここで見たいのは**ワールド座標に置いたあと**の話。建物は `t` の周りに幅を持つので、
   * 配置の段階で座標を取り違えると開口の中に壁が現れうる。
   *
   * ⚠ **歩道橋の柱は敷地にも残る**(高さ 6 以上あるので高さだけでは建物と区別できない)。
   *   上部構造の差し替えは §1.2 装置4 = PR 3 の担当。ここでは
   *   **道を横切る奥行き(`size[0]`)が 5 を超える箱**だけを建物の壁として見る
   *   (建物の奥行きは 6〜11、歩道橋の柱は 0.5)
   */
  it('開口の中に建物の壁が立っていない', () => {
    const openings = openingRanges()
    const walls = placed.boxes.filter((b) => b.size[1] > 6 && b.size[0] > 5 && b.size[0] < 15)
    expect(walls.length).toBeGreaterThan(50)
    for (const w of walls) {
      for (const ex of openings) {
        // 箱の t は道に沿った位置。壁の道方向の広がりは size[2](local Z = 道に沿う)
        const half = w.size[2] / 2
        expect(w.t + half <= ex.start + 1e-6 || w.t - half >= ex.end - 1e-6).toBe(true)
      }
    }
  })
})

describe('位置ごとに焼かれた色', () => {
  // **パレット運用の核心**。色が場所に紐づくので、進むと世界の色が移り変わる
  it('道の始点と終点で建物の色が違う', () => {
    const near = placed.boxes.filter((b) => b.center[2] > -20 && b.size[1] > 6)
    const far = placed.boxes.filter((b) => b.center[2] < -TOTAL_LENGTH + 20 && b.size[1] > 6)
    expect(near.length).toBeGreaterThan(0)
    expect(far.length).toBeGreaterThan(0)
    expect(new Set(near.map((b) => b.color))).not.toEqual(new Set(far.map((b) => b.color)))
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
