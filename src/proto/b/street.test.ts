// 「囲む構図」と「密度」を数値で縛るテスト。
// ①の観察のうち、沿道の生成で担保すべきものをここに集めている。
import { describe, expect, it } from 'vitest'
import { buildStreet, maxOverheadGap, mulberry32 } from './street'
import {
  FACADE_X,
  LEGS,
  ROAD_END,
  ROAD_HALF,
  ROAD_START,
  enclosureElevationDeg,
  halfVerticalFovDeg,
} from './route'

const street = buildStreet()
const SPAN = ROAD_END - ROAD_START

describe('mulberry32', () => {
  it('同じシードなら同じ列を返す', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('0〜1に収まる', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('buildStreet の決定性', () => {
  it('2回呼んでも同じ街になる', () => {
    const again = buildStreet()
    expect(again.buildings.length).toBe(street.buildings.length)
    expect(again.buildings[10]).toEqual(street.buildings[10])
    expect(again.props[50]).toEqual(street.props[50])
    expect(again.overheads[3]).toEqual(street.overheads[3])
  })
})

describe('建物(囲む構図)', () => {
  it('どの区間でも道の両側に建物がある', () => {
    LEGS.forEach((_, i) => {
      const inLeg = street.buildings.filter((b) => b.legIndex === i)
      expect(inLeg.some((b) => b.side === -1)).toBe(true)
      expect(inLeg.some((b) => b.side === 1)).toBe(true)
    })
  })

  // **これが「画面を左右から挟む」の実体**。一番低い建物でも画面上端を越えること
  it('実際に生成された最低の建物でも画面上端より上に伸びる', () => {
    const lowest = Math.min(...street.buildings.map((b) => b.height))
    expect(enclosureElevationDeg(lowest)).toBeGreaterThan(halfVerticalFovDeg())
  })

  it('同じ側の建物どうしが重ならない', () => {
    for (const side of [-1, 1]) {
      const sorted = street.buildings.filter((b) => b.side === side).sort((a, b) => a.t - b.t)
      for (let i = 1; i < sorted.length; i++) {
        const prevEnd = sorted[i - 1].t + sorted[i - 1].width / 2
        const currStart = sorted[i].t - sorted[i].width / 2
        expect(currStart).toBeGreaterThanOrEqual(prevEnd - 1e-6)
      }
    }
  })

  it('壁面が車道にはみ出さない', () => {
    for (const b of street.buildings) {
      expect(FACADE_X + b.setback).toBeGreaterThan(ROAD_HALF)
    }
  })

  it('道の見えている範囲すべてに建物がある(奥に穴が空かない)', () => {
    for (const side of [-1, 1]) {
      const ts = street.buildings.filter((b) => b.side === side).map((b) => b.t)
      expect(Math.min(...ts)).toBeLessThan(ROAD_START + 12)
      expect(Math.max(...ts)).toBeGreaterThan(ROAD_END - 20)
    }
  })

  it('パレットの4色以外を指さない', () => {
    for (const b of street.buildings) {
      expect(b.colorIndex).toBeGreaterThanOrEqual(0)
      expect(b.colorIndex).toBeLessThan(4)
    }
  })
})

describe('小物(密度)', () => {
  // 共通原則4。A では章あたり50個以上で縛った。B は道なので「1ユニットあたり」で測る。
  // 最初は0.85で通していたが、実際に撮ると歩道がガランとしていたので実態に合わせて上げた
  it('道全体で1ユニットあたり1.8個以上ある', () => {
    expect(street.props.length / SPAN).toBeGreaterThan(1.8)
  })

  it('どの区間にも十分な数の小物がある', () => {
    LEGS.forEach((leg, i) => {
      const count = street.props.filter((p) => p.legIndex === i).length
      expect(count).toBeGreaterThan(leg.length * leg.propDensity * 0.85)
    })
  })

  // 車道が物で埋まると、奥へ消える一本の道という一点透視の主線が切れる
  it('三角コーン以外は車道の上に置かない', () => {
    for (const p of street.props) {
      if (p.kind === 'cone') continue
      expect(Math.abs(p.lateral)).toBeGreaterThanOrEqual(ROAD_HALF)
    }
  })

  it('小物が建物の壁を突き抜けない', () => {
    for (const p of street.props) {
      expect(Math.abs(p.lateral)).toBeLessThan(FACADE_X)
    }
  })

  it('差し色は少数にとどまる(画面の色数を保つ)', () => {
    const accents = street.props.filter((p) => p.accent).length
    expect(accents / street.props.length).toBeLessThan(0.2)
  })

  it('①で名指しされた種類がすべて出現する', () => {
    const kinds = new Set(street.props.map((p) => p.kind))
    for (const k of ['pole', 'sign', 'cone', 'unit', 'rail', 'bin', 'step']) {
      expect(kinds.has(k as never)).toBe(true)
    }
  })
})

describe('電柱(一点透視のリズム)', () => {
  const poles = street.props.filter((p) => p.kind === 'pole').sort((a, b) => a.t - b.t)

  // **等間隔であることに意味がある**。ランダムに散らすと固まったり空いたりして
  // 奥行きの目盛りにならない(実際に小物の1種類として散らしていたときはリズムが出なかった)
  it('等間隔に並ぶ', () => {
    expect(poles.length).toBeGreaterThan(25)
    for (let i = 1; i < poles.length; i++) {
      expect(poles[i].t - poles[i - 1].t).toBeCloseTo(poles[1].t - poles[0].t, 6)
    }
  })

  it('左右交互に立つ(片側だけ柱の壁にならない)', () => {
    for (let i = 1; i < poles.length; i++) {
      expect(Math.sign(poles[i].lateral)).not.toBe(Math.sign(poles[i - 1].lateral))
    }
  })

  it('車道の縁に沿う(消失点へ向かう線が一番強く出る位置)', () => {
    for (const p of poles) {
      expect(Math.abs(p.lateral)).toBeGreaterThan(ROAD_HALF)
      expect(Math.abs(p.lateral)).toBeLessThan(ROAD_HALF + 1.5)
    }
  })

  it('道の見えている範囲すべてに立つ', () => {
    expect(Math.min(...poles.map((p) => p.t))).toBeLessThan(ROAD_START + 10)
    expect(Math.max(...poles.map((p) => p.t))).toBeGreaterThan(ROAD_END - 14)
  })
})

describe('上部構造(画面を締める)', () => {
  it('道全体にわたって存在する', () => {
    expect(street.overheads.length).toBeGreaterThan(8)
  })

  // **抜けを作らないことが①の構図の条件**。間隔が空きすぎると画面上部が空だけになる。
  // 最初は50で通していたが、実際に撮ると近くに1つも無い区間ができて上が抜けた。
  // 手前に常に1つ入る間隔まで詰める
  it('上部が空に抜ける区間ができない(最大間隔34以内)', () => {
    expect(maxOverheadGap(street.overheads)).toBeLessThan(34)
  })

  it('歩道橋が含まれる(①の「上部を歩道橋が横切る」)', () => {
    expect(street.overheads.some((o) => o.kind === 'bridge')).toBe(true)
  })

  it('主役の頭上を通る高さにある(くぐれる)', () => {
    for (const o of street.overheads) {
      expect(o.height).toBeGreaterThan(4)
      expect(o.height).toBeLessThan(10)
    }
  })
})

describe('maxOverheadGap', () => {
  it('空なら範囲全体を返す', () => {
    expect(maxOverheadGap([], 0, 100)).toBe(100)
  })

  it('端の余りも隙間として数える', () => {
    const at = (t: number) =>
      ({ legIndex: 0, t, kind: 'beam', height: 6, thickness: 0.3, span: 0.4, colorIndex: 0 }) as const
    expect(maxOverheadGap([at(10)], 0, 100)).toBe(90)
    expect(maxOverheadGap([at(90)], 0, 100)).toBe(90)
  })
})
