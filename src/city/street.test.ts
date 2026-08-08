// 街の生成を数値で縛るテスト(設計書 §11)。移植元は `proto/b/street.test.ts`。
//
// B から足したのは**除外区間**まわりの3件で、これが §1.2 装置1 の仕様そのもの:
//   - 除外区間に建物が残らない
//   - **除外区間を渡しても、街区に残る建物が1棟も動かない**(シード連鎖が切れていない証明)
//   - 街の壁が途切れている長さが設計書の「≥ 45」を満たす
import { describe, expect, it } from 'vitest'
import { buildStreet, buildingFootprint, buildingGaps, maxOverheadGap, mulberry32, type Side } from './street'
import { enclosureElevationDeg, halfVerticalFovDeg, sampleDistances } from './camera'
import {
  CHAPTERS,
  FACADE_X,
  ROAD_END,
  ROAD_HALF,
  ROAD_START,
  openingRanges,
  phaseRange,
  resolvePhase,
  type Span,
} from './route'
import { CURB_HEIGHT } from './roadSurface'

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
  it('どの章でも街区の両側に建物がある', () => {
    CHAPTERS.forEach((_, i) => {
      const inChapter = street.buildings.filter((b) => b.chapterIndex === i)
      expect(inChapter.some((b) => b.side === -1)).toBe(true)
      expect(inChapter.some((b) => b.side === 1)).toBe(true)
    })
  })

  /**
   * **これが「画面を左右から挟む」の実体**。一番低い建物でも画面上端を越えること。
   *
   * /city のカメラ高は下り勾配とビートのブレンドで `t` によって変わるので、
   * **街区の中で最も不利な地点**を探して見る。実測値(2026-08-08):
   *
   * | 測り方 | 最も不利な角度 | カメラの路面クリアランス |
   * |---|---|---|
   * | 街区のみ(採用) | **31.98°** @t=5.5 | 3.470(街区の最大) |
   * | 全長(誤り) | 24.44° @t=239.75 | 4.489(敷地の dUp 3.0) |
   * | B の式(定数 2.6) | 36.60° | — |
   *
   * **街区に限るのが正しい**。敷地には建物が無い(§1.2 装置1)ので、そこのカメラで
   * 壁の仰角を測ることに意味がない。全長で測ると 24.44° で落ちるが、それは
   * 「囲む構図が壊れている」ではなく「測る対象が無い場所で測っている」だけ。
   *
   * B の式を素朴に移植すると 36.60° と出て**実際より 4.6° 甘い**。カメラ高を
   * 路面基準の定数 2.6 としていたためで、/city の街区の実測は 1.52〜3.47 に散る
   */
  it('実際に生成された最低の建物でも、街区のどの地点から見ても画面上端より上に伸びる', () => {
    const lowest = Math.min(...street.buildings.map((b) => b.height))
    const inStreet = sampleDistances(0.25).filter((t) => resolvePhase(t).phase === 'street')
    const worst = Math.min(...inStreet.map((t) => enclosureElevationDeg(lowest + CURB_HEIGHT, FACADE_X, t)))
    expect(worst).toBeGreaterThan(halfVerticalFovDeg())
  })

  it('同じ側の建物どうしが重ならない(境界で食い合わない)', () => {
    for (const side of [-1, 1] as Side[]) {
      const sorted = street.buildings.filter((b) => b.side === side).sort((a, b) => a.t - b.t)
      for (let i = 1; i < sorted.length; i++) {
        expect(buildingFootprint(sorted[i]).start).toBeGreaterThanOrEqual(buildingFootprint(sorted[i - 1]).end - 1e-6)
      }
    }
  })

  it('壁面が車道にはみ出さない', () => {
    for (const b of street.buildings) {
      expect(FACADE_X + b.setback).toBeGreaterThan(ROAD_HALF)
    }
  })

  it('街区では道の見えている範囲すべてに建物がある(奥に穴が空かない)', () => {
    for (const side of [-1, 1] as Side[]) {
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

// --- §1.2 装置1: 街の壁が消える -------------------------------------------

const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end

describe('除外区間(開ける型の装置1)', () => {
  const exclusions = openingRanges()

  it('章ごとに1つ、長さ47の開口がある(設計書の「≥ 45」を満たす)', () => {
    expect(exclusions).toHaveLength(CHAPTERS.length)
    for (const ex of exclusions) {
      expect(ex.end - ex.start).toBeCloseTo(47, 6)
    }
  })

  it('開口は導入フェーズの始まりから章の終わりまで', () => {
    exclusions.forEach((ex, i) => {
      expect(ex.start).toBe(phaseRange(i, 'open')!.start)
    })
  })

  it('開口の中に建物が1棟も残らない', () => {
    for (const b of street.buildings) {
      for (const ex of exclusions) {
        expect(overlaps(buildingFootprint(b), ex)).toBe(false)
      }
    }
  })

  // **これが B の教訓そのもの**。区間ごとに生成するとシード連鎖が切れて、
  // 除外の有無で街区の建物まで動いてしまう(= 境界で食い合う)。
  // 生成を全域で連続に回してからフィルタしているので、生き残った建物は1つも動かない
  it('除外区間を渡しても、街区に残る建物が1棟も動かない', () => {
    const withoutExclusions = buildStreet({ exclusions: [] })
    const untouched = withoutExclusions.buildings.filter((b) =>
      exclusions.every((ex) => !overlaps(buildingFootprint(b), ex))
    )
    expect(untouched.length).toBeGreaterThan(0)
    for (const b of untouched) {
      expect(street.buildings).toContainEqual(b)
    }
  })

  it('除外しなければ開口に建物が立つ(除外が効いていることの対照)', () => {
    const all = buildStreet({ exclusions: [] })
    const inside = all.buildings.filter((b) => exclusions.some((ex) => overlaps(buildingFootprint(b), ex)))
    expect(inside.length).toBeGreaterThan(20)
  })

  // 境界を跨ぐ建物は落とさず切り詰めるので、**壁が開口の入口でぴったり途切れる**。
  // 落とすだけだと壁の終わりが建物1棟ぶん(最大13)手前まで下がって、開口が締まらない
  it('街の壁が開口の入口まで届いている(左右それぞれ 1.0 以内)', () => {
    for (const side of [-1, 1] as Side[]) {
      const ends = street.buildings.filter((b) => b.side === side).map((b) => buildingFootprint(b).end)
      for (const ex of openingRanges()) {
        const nearest = Math.max(...ends.filter((e) => e <= ex.start + 1e-6))
        expect(ex.start - nearest).toBeLessThan(1.0)
      }
    }
  })

  it('壁が途切れている長さが 45 以上ある(左右それぞれ)', () => {
    for (const side of [-1, 1] as Side[]) {
      const gaps = buildingGaps(street.buildings, side)
      for (const ex of openingRanges()) {
        const covering = gaps.find((g) => g.start <= ex.start + 1e-6 && g.end >= ex.end - 1e-6)
        expect(covering, `side=${side} の開口 ${ex.start} が壁で埋まっている`).toBeDefined()
        expect(covering!.end - covering!.start).toBeGreaterThanOrEqual(45)
      }
    }
  })
})

describe('小物(密度)', () => {
  // B は「1ユニットあたり1.8個以上」で縛っていた。実際に撮って歩道がガランとしない下限
  it('道全体で1ユニットあたり1.8個以上ある', () => {
    expect(street.props.length / SPAN).toBeGreaterThan(1.8)
  })

  it('どの章にも十分な数の小物がある', () => {
    CHAPTERS.forEach((chapter, i) => {
      const count = street.props.filter((p) => p.chapterIndex === i).length
      const length = chapter.phases.reduce((s, p) => s + p.length, 0)
      expect(count).toBeGreaterThan(length * chapter.street.propDensity * 0.85)
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

  it('参考例①で名指しされた種類がすべて出現する', () => {
    const kinds = new Set(street.props.map((p) => p.kind))
    for (const k of ['pole', 'sign', 'cone', 'unit', 'rail', 'bin', 'step']) {
      expect(kinds.has(k as never)).toBe(true)
    }
  })
})

describe('電柱(一点透視のリズム)', () => {
  const poles = street.props.filter((p) => p.kind === 'pole').sort((a, b) => a.t - b.t)

  // **等間隔であることに意味がある**。ランダムに散らすと固まったり空いたりして
  // 奥行きの目盛りにならない(B が小物の1種類として散らしていたときはリズムが出なかった)
  it('等間隔に並ぶ', () => {
    expect(poles.length).toBeGreaterThan(35)
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

  // **抜けを作らないことが囲む構図の条件**。間隔が空きすぎると画面上部が空だけになる。
  // B は 50 で通していたが、実際に撮ると近くに1つも無い区間ができて上が抜けたので 34 まで詰めた
  it('上部が空に抜ける区間ができない(最大間隔34以内)', () => {
    expect(maxOverheadGap(street.overheads)).toBeLessThan(34)
  })

  it('歩道橋が含まれる(「上部を歩道橋が横切る」)', () => {
    expect(street.overheads.some((o) => o.kind === 'bridge')).toBe(true)
  })

  it('球の頭上を通る高さにある(くぐれる)', () => {
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
      ({ chapterIndex: 0, t, kind: 'beam', height: 6, thickness: 0.3, span: 0.4, colorIndex: 0 }) as const
    expect(maxOverheadGap([at(10)], 0, 100)).toBe(90)
    expect(maxOverheadGap([at(90)], 0, 100)).toBe(90)
  })
})
