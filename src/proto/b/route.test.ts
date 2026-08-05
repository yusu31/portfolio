// プロトタイプBの構図の定義を数値で縛るテスト。
//
// ①(probiex007)の観察「強い一点透視」「囲む構図」「主役は画面高の約1/4・中央やや下」は
// どれも目分量ではなく計算で確認できる。作り込みを粗くしても方向の定義だけは崩れないように、
// 数式で守れるものは数式で守る(A で確立したやり方)。
import { describe, expect, it } from 'vitest'
import {
  CAMERA_FOV,
  CAMERA_HEIGHT,
  FACADE_X,
  HERO_HEIGHT,
  LEGS,
  TOTAL_LENGTH,
  apparentHeroFraction,
  cameraPose,
  currentSearch,
  distanceAt,
  enclosureElevationDeg,
  halfVerticalFovDeg,
  heroPose,
  heroScreenY,
  legStart,
  overrideDistance,
  parseAtOverride,
  parseLegOverride,
  parseOutlineEnabled,
  resolveLeg,
  roadCenter,
  roadPoint,
  roadTangent,
  totalLegLength,
  vanishingOffsetDeg,
} from './route'
import { PALETTES } from './palette'

/** 道全体を等間隔で見る。端だけ満たして途中で破綻していないことを確認するため */
const SAMPLES = Array.from({ length: 57 }, (_, i) => (i / 56) * TOTAL_LENGTH)

describe('LEGS', () => {
  it('区間IDが重複しない', () => {
    const ids = LEGS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('すべての区間が実在するパレットを指す', () => {
    for (const l of LEGS) {
      expect(l.paletteIndex).toBeGreaterThanOrEqual(0)
      expect(l.paletteIndex).toBeLessThan(PALETTES.length)
    }
  })

  it('区間の合計が道の全長と一致する', () => {
    expect(totalLegLength()).toBe(TOTAL_LENGTH)
  })

  it('legStart が累積になっている', () => {
    expect(legStart(0)).toBe(0)
    expect(legStart(1)).toBe(LEGS[0].length)
    expect(legStart(LEGS.length)).toBe(TOTAL_LENGTH)
  })
})

describe('道の形', () => {
  it('進行方向は -Z 側へ進む', () => {
    for (const t of SAMPLES) expect(roadTangent(t)[2]).toBeLessThan(0)
  })

  it('接線が単位ベクトルである', () => {
    for (const t of SAMPLES) {
      const v = roadTangent(t)
      expect(Math.hypot(v[0], v[1], v[2])).toBeCloseTo(1, 6)
    }
  })

  it('全体として下る坂になっている(①の「坂道が奥へ消える」)', () => {
    expect(roadCenter(TOTAL_LENGTH)[1]).toBeLessThan(roadCenter(0)[1] - 10)
  })

  it('道が途中で途切れたり飛んだりしない(連続している)', () => {
    for (const t of SAMPLES) {
      const a = roadCenter(t)
      const b = roadCenter(t + 1)
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1.6)
    }
  })

  it('横位置オフセットが道の幅ぶんだけ効く', () => {
    for (const t of SAMPLES) {
      const a = roadPoint(t, -FACADE_X)
      const b = roadPoint(t, FACADE_X)
      expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeCloseTo(FACADE_X * 2, 4)
    }
  })
})

describe('カメラ(背面追従)', () => {
  // ①「強い一点透視」。A の fov28(望遠 = アイソメ寄り)と真逆であることが方向Bの定義
  it('広角である(fov 50以上)', () => {
    expect(CAMERA_FOV).toBeGreaterThanOrEqual(50)
  })

  // ①「身長は画面高の約1/4」
  it('主役が画面高の1/4前後に写る', () => {
    for (const t of SAMPLES) {
      const f = apparentHeroFraction(t)
      expect(f).toBeGreaterThan(0.18)
      expect(f).toBeLessThan(0.32)
    }
  })

  // 共通原則2「主役を画面の1/4以下に収める」の上限側も明示的に守る
  it('主役が画面高の1/3を超えない', () => {
    for (const t of SAMPLES) expect(apparentHeroFraction(t)).toBeLessThan(1 / 3)
  })

  // ①「キャラは画面中央やや下」
  it('主役が画面中央やや下に来る', () => {
    for (const t of SAMPLES) {
      const y = heroScreenY(t)
      expect(y).toBeLessThan(-0.02)
      expect(y).toBeGreaterThan(-0.6)
    }
  })

  // **これが「強い一点透視」の数値定義**。遠方の道が画面中央付近に収束していること
  it('遠方の道がカメラ前方軸から大きく外れない(消失点が画面中央付近)', () => {
    for (const t of SAMPLES) {
      expect(vanishingOffsetDeg(t)).toBeLessThan(12)
    }
  })

  it('カメラが路面にめり込まない', () => {
    for (const t of SAMPLES) {
      const cam = cameraPose(t).position
      // カメラの真下の路面(カメラは主役の後ろにいるので t-CAMERA_BACK 付近)
      const ground = roadCenter(Math.max(t - 6.5, 0))[1]
      expect(cam[1] - ground).toBeGreaterThan(CAMERA_HEIGHT * 0.8)
    }
  })

  it('注視点が主役より前方にある(だから主役が画面下に落ちる)', () => {
    for (const t of SAMPLES.slice(0, -3)) {
      const { target } = cameraPose(t)
      const hero = heroPose(t).position
      expect(target[2]).toBeLessThan(hero[2])
    }
  })

  // **A との対比。A は「章の境界でカメラが不連続に飛ぶ」ことをテストしていた。
  // B は連続移動が骨子なので、逆に「飛ばないこと」が仕様になる**
  it('カメラが連続移動する(区間の境界でも飛ばない)', () => {
    for (let i = 1; i < LEGS.length; i++) {
      const boundary = legStart(i)
      const before = cameraPose(boundary - 0.1).position
      const after = cameraPose(boundary + 0.1).position
      expect(
        Math.hypot(before[0] - after[0], before[1] - after[1], before[2] - after[2])
      ).toBeLessThan(0.5)
    }
  })

  it('道全体を通してカメラが滑らかに動く', () => {
    for (const t of SAMPLES) {
      const a = cameraPose(t).position
      const b = cameraPose(t + 0.5).position
      expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1.2)
    }
  })
})

describe('囲む構図', () => {
  // ①「両側の建物が画面を左右から挟む」= 建物の上端が画面の上端より上にあること。
  // 垂直画角の半分を超える仰角に建物の頭が来ていれば成立している
  it('どの区間でも最低の建物が画面上端より上に伸びる', () => {
    for (const leg of LEGS) {
      expect(enclosureElevationDeg(leg.buildingHeight[0])).toBeGreaterThan(halfVerticalFovDeg())
    }
  })

  it('カメラ高さより低い壁は囲みに寄与しない(指標の健全性)', () => {
    expect(enclosureElevationDeg(CAMERA_HEIGHT - 0.5)).toBeLessThan(0)
  })

  it('区間が進むほど建物が高くなる(街が深くなる)', () => {
    expect(LEGS[LEGS.length - 1].buildingHeight[1]).toBeGreaterThan(LEGS[0].buildingHeight[1])
  })
})

describe('resolveLeg', () => {
  it('距離から区間を引ける', () => {
    expect(resolveLeg(0).index).toBe(0)
    expect(resolveLeg(LEGS[0].length - 1).index).toBe(0)
    expect(resolveLeg(LEGS[0].length + 1).index).toBe(1)
    expect(resolveLeg(TOTAL_LENGTH).index).toBe(LEGS.length - 1)
  })

  it('境界のちょうどで次の区間に入る', () => {
    expect(resolveLeg(legStart(1))).toEqual({ index: 1, local: 0 })
  })

  it('範囲外をクランプする', () => {
    expect(resolveLeg(-50)).toEqual({ index: 0, local: 0 })
    expect(resolveLeg(TOTAL_LENGTH + 500)).toEqual({ index: LEGS.length - 1, local: 1 })
  })

  it('区間の中で local が 0→1 に進む', () => {
    expect(resolveLeg(legStart(2) + LEGS[2].length / 2).local).toBeCloseTo(0.5, 6)
  })
})

describe('distanceAt', () => {
  it('offset 0〜1 を道の全長に写す', () => {
    expect(distanceAt(0)).toBe(0)
    expect(distanceAt(1)).toBe(TOTAL_LENGTH)
    expect(distanceAt(0.5)).toBe(TOTAL_LENGTH / 2)
  })

  it('範囲外をクランプする', () => {
    expect(distanceAt(-2)).toBe(0)
    expect(distanceAt(9)).toBe(TOTAL_LENGTH)
  })
})

describe('QAクエリ', () => {
  it('?leg=N で区間を指定できる', () => {
    expect(parseLegOverride('?leg=2')).toBe(2)
    expect(parseLegOverride('?leg=0')).toBe(0)
  })

  it('区間の範囲外はクランプする', () => {
    expect(parseLegOverride('?leg=99')).toBe(LEGS.length - 1)
    expect(parseLegOverride('?leg=-4')).toBe(0)
  })

  it('未指定・不正値は null(スクロール駆動のまま)', () => {
    expect(parseLegOverride('')).toBeNull()
    expect(parseLegOverride('?leg=')).toBeNull()
    expect(parseLegOverride('?leg=abc')).toBeNull()
    expect(parseLegOverride('?other=1')).toBeNull()
  })

  it('?at は 0〜1 にクランプ、未指定は0.5', () => {
    expect(parseAtOverride('?at=0.8')).toBe(0.8)
    expect(parseAtOverride('?at=7')).toBe(1)
    expect(parseAtOverride('?at=-3')).toBe(0)
    expect(parseAtOverride('')).toBe(0.5)
    expect(parseAtOverride('?at=xyz')).toBe(0.5)
  })

  // 輪郭線の有無を同じ構図で比べられることが B の検証項目そのもの
  it('?ol=0 で輪郭線を切れる(既定は有効)', () => {
    expect(parseOutlineEnabled('')).toBe(true)
    expect(parseOutlineEnabled('?ol=1')).toBe(true)
    expect(parseOutlineEnabled('?ol=0')).toBe(false)
    expect(parseOutlineEnabled('?ol=false')).toBe(false)
  })

  it('?leg と ?at から距離が決まる', () => {
    expect(overrideDistance('?leg=1&at=0')).toBe(legStart(1))
    expect(overrideDistance('?leg=1&at=1')).toBe(legStart(2))
    expect(overrideDistance('?leg=0&at=0.5')).toBe(LEGS[0].length / 2)
  })

  it('?leg が無ければ null(スクロール駆動)', () => {
    expect(overrideDistance('')).toBeNull()
    expect(overrideDistance('?at=0.3')).toBeNull()
  })

  it('ブラウザ外では search が空', () => {
    expect(currentSearch()).toBe(typeof window === 'undefined' ? '' : window.location.search)
  })
})

describe('定数の健全性', () => {
  it('主役の身長が現実的な値である', () => {
    expect(HERO_HEIGHT).toBeGreaterThan(1.4)
    expect(HERO_HEIGHT).toBeLessThan(2.2)
  })

  it('建物の壁面が車道の外にある', () => {
    expect(FACADE_X).toBeGreaterThan(4.2)
  })
})
