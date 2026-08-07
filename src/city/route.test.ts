// `/city` の道と章構成の仕様固定。設計書 §1.1 / §1.4 / §6 / §11。
//
// A / B / ② で確立した「**仕様を目分量ではなく数値で固定する**」を継承する。
// 作り込みが粗い段階でも方向の定義だけは崩れないようにするため。
import { describe, expect, it } from 'vitest'
import {
  CHAPTERS,
  MIN_ASPECT,
  PAGES,
  ROAD_END,
  ROAD_START,
  TOTAL_LENGTH,
  chapterLength,
  chapterStart,
  distanceAt,
  elevationAt,
  halfHorizontalFovDeg,
  lateralPerDepth,
  onScreenDepth,
  overrideDistance,
  parseAtOverride,
  parseLandmarksEnabled,
  parseLegOverride,
  parseOutlineEnabled,
  parsePhaseOverride,
  parseWarpEnabled,
  phaseRange,
  resolveChapter,
  resolvePhase,
  responsiveFov,
  roadPoint,
  roadTangent,
  totalChapterLength,
} from './route'

describe('経路の全体', () => {
  it('章の合計長と経路長が一致する', () => {
    // B から引き継いだ縛り。章割りを触ったときに経路長の更新を忘れると落ちる
    expect(totalChapterLength()).toBe(TOTAL_LENGTH)
  })

  it('4章 × 92 になっている(§1.1)', () => {
    expect(CHAPTERS).toHaveLength(4)
    for (let i = 0; i < CHAPTERS.length; i++) expect(chapterLength(i)).toBe(92)
  })

  it('道は前後に伸ばしてある(一点透視の奥を切らない)', () => {
    expect(ROAD_START).toBe(-16)
    // ROAD_RUNOUT=95。一点透視では常に70ユニット以上先が見えているので終端で切らない
    expect(ROAD_END).toBe(TOTAL_LENGTH + 95)
  })
})

describe('フェーズの区間(§1.4 の表)', () => {
  // 設計書 §1.4 の表をそのまま写したもの。ここがズレると施設の z 座標が全部ズレる
  const EXPECTED: readonly (readonly [number, string, number, number])[] = [
    [0, 'street', 0, 45],
    [0, 'open', 45, 55],
    [0, 'venue', 55, 83],
    [0, 'exit', 83, 92],
    [1, 'street', 92, 137],
    [1, 'open', 137, 147],
    [1, 'venue', 147, 175],
    [1, 'exit', 175, 184],
    [2, 'street', 184, 229],
    [2, 'open', 229, 239],
    [2, 'venue', 239, 267],
    [2, 'exit', 267, 276],
    [3, 'street', 276, 321],
    [3, 'open', 321, 331],
    [3, 'venue', 331, 368],
  ]

  it.each(EXPECTED)('ch%i の %s は [%i, %i)', (ch, phase, start, end) => {
    expect(phaseRange(ch as number, phase as never)).toEqual({ start, end })
  })

  it('第4章には退出フェーズが無い(終着プラザで旅が終わる)', () => {
    expect(phaseRange(3, 'exit')).toBeNull()
  })

  it('敷地中心 z が §1.4 の表と一致する', () => {
    // 施設・ランドマークの配置がここを基準にするので、表の値そのものを縛る
    const centers = [0, 1, 2, 3].map((i) => {
      const r = phaseRange(i, 'venue')!
      return (r.start + r.end) / 2
    })
    expect(centers).toEqual([69, 161, 253, 349.5])
  })
})

describe('距離 → 章 / フェーズ', () => {
  it('章の境界を跨いでも索けている', () => {
    expect(resolveChapter(0).index).toBe(0)
    expect(resolveChapter(91.9).index).toBe(0)
    expect(resolveChapter(92).index).toBe(1)
    expect(resolveChapter(TOTAL_LENGTH).index).toBe(3)
  })

  it('範囲外はクランプする(色が消えない)', () => {
    expect(resolveChapter(-50).index).toBe(0)
    expect(resolveChapter(TOTAL_LENGTH + 500).index).toBe(3)
  })

  it('フェーズが4つとも索ける', () => {
    expect(resolvePhase(20)).toMatchObject({ chapterIndex: 0, phase: 'street' })
    expect(resolvePhase(50)).toMatchObject({ chapterIndex: 0, phase: 'open' })
    expect(resolvePhase(69)).toMatchObject({ chapterIndex: 0, phase: 'venue' })
    expect(resolvePhase(88)).toMatchObject({ chapterIndex: 0, phase: 'exit' })
    expect(resolvePhase(350)).toMatchObject({ chapterIndex: 3, phase: 'venue' })
  })

  it('全長にわたってフェーズが途切れない', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 0.5) {
      const p = resolvePhase(t)
      expect(p.local).toBeGreaterThanOrEqual(0)
      expect(p.local).toBeLessThanOrEqual(1)
    }
  })
})

describe('アスペクト比(§6 Step 2)', () => {
  it('最小サポートは 16:10(QA ビューポート 1280×800 と一致)', () => {
    expect(MIN_ASPECT).toBeCloseTo(1.6, 10)
  })

  it('水平半画角が 39.79°、d/z が 0.8329', () => {
    // ⚠ 設計書 §6 Step 2 の 16:10 の行(40.5° / 0.854)は誤り。正しくはこの値
    expect(halfHorizontalFovDeg()).toBeCloseTo(39.7912, 3)
    expect(lateralPerDepth()).toBeCloseTo(0.8329, 4)
  })

  it('16:9 と 4:3 の値は設計書と一致する(基準を変えたときの検算用)', () => {
    // 設計書の 42.79 / 34.7 はこれを丸めた値
    expect(halfHorizontalFovDeg(16 / 9)).toBeCloseTo(42.783, 3)
    expect(halfHorizontalFovDeg(4 / 3)).toBeCloseTo(34.764, 3)
  })

  it('的(水平距離12)は前方 14.4 から画面に入る(§2.3)', () => {
    // 敷地の長さ 28 に対して十分な滞在時間がある、という設計の根拠そのもの
    expect(onScreenDepth(12)).toBeCloseTo(14.41, 2)
    expect(onScreenDepth(12)).toBeLessThan(28)
  })

  it('近サイドライン(x=±9.0)と街の壁(x=±6.0)の値', () => {
    expect(onScreenDepth(9)).toBeCloseTo(10.81, 2)
    expect(onScreenDepth(6)).toBeCloseTo(7.2, 2)
  })

  it('16:10 以上では fov を触らない', () => {
    expect(responsiveFov(MIN_ASPECT)).toBe(55)
    expect(responsiveFov(16 / 9)).toBe(55)
    expect(responsiveFov(21 / 9)).toBe(55)
  })

  it('縦長では垂直画角を広げて部分補償する', () => {
    const fov43 = responsiveFov(4 / 3)
    expect(fov43).toBeGreaterThan(55)
    expect(fov43).toBeCloseTo(59.388, 3)
    // 4:3 の水平半画角が 34.76° から 37.2° まで戻る(基準の 39.79° には届かない = 部分補償)
    expect(halfHorizontalFovDeg(4 / 3)).toBeLessThan(37.2)
  })

  it('補償には上限がある(極端な縦長で歪ませない)', () => {
    // スマホ縦(9:19.5 ≒ 0.46)でも 78° で頭打ちにする
    expect(responsiveFov(0.46)).toBe(78)
  })
})

describe('道の形', () => {
  it('全体として下っている(奥へ消える構図の本体)', () => {
    expect(elevationAt(TOTAL_LENGTH)).toBeLessThan(elevationAt(0))
    // 終端の高さ = 線形項 -OVERALL_DROP(-34) + うねり(3.4·sin(3.1π) = -1.05)
    expect(elevationAt(TOTAL_LENGTH)).toBeCloseTo(-35.05, 2)
    // 全域でうねりの振幅を足し引きした範囲に収まる
    for (let t = 0; t <= TOTAL_LENGTH; t += 4) {
      const linear = (-34 * t) / TOTAL_LENGTH
      expect(Math.abs(elevationAt(t) - linear)).toBeLessThanOrEqual(3.4 + 1e-9)
    }
  })

  it('接線は単位ベクトルで、常に -Z 方向へ進む', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 4) {
      const tan = roadTangent(t)
      expect(Math.hypot(tan[0], tan[1], tan[2])).toBeCloseTo(1, 6)
      expect(tan[2]).toBeLessThan(0)
    }
  })

  it('横オフセットが道の中心から正しい距離に出る', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 8) {
      const c = roadPoint(t, 0)
      const p = roadPoint(t, 9)
      expect(Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])).toBeCloseTo(9, 6)
    }
  })
})

describe('スクロール → 距離', () => {
  it('offset 0〜1 が経路全体に対応する', () => {
    expect(distanceAt(0)).toBe(0)
    expect(distanceAt(1)).toBe(TOTAL_LENGTH)
  })

  it('範囲外をクランプする', () => {
    expect(distanceAt(-1)).toBe(0)
    expect(distanceAt(2)).toBe(TOTAL_LENGTH)
  })

  it('単調増加する', () => {
    for (let u = 0; u < 1; u += 0.01) expect(distanceAt(u + 0.01)).toBeGreaterThan(distanceAt(u))
  })

  it('ページ数はワープ導入前の値', () => {
    // ② の 10.4 ユニット/ページ。PR 10 でワープが入ると実距離が 293 に縮んで約30になる
    expect(PAGES).toBe(35)
  })
})

describe('QAノブ(§11)', () => {
  it('?leg=N を索く。未指定はスクロール駆動', () => {
    expect(parseLegOverride('')).toBeNull()
    expect(parseLegOverride('?leg=2')).toBe(2)
    // 範囲外はクランプ
    expect(parseLegOverride('?leg=9')).toBe(3)
    expect(parseLegOverride('?leg=abc')).toBeNull()
  })

  it('?at= は未指定で章の真ん中', () => {
    expect(parseAtOverride('')).toBe(0.5)
    expect(parseAtOverride('?at=0.8')).toBe(0.8)
    expect(parseAtOverride('?at=5')).toBe(1)
  })

  it('?ph= はフェーズ名だけ通す', () => {
    expect(parsePhaseOverride('?ph=venue')).toBe('venue')
    expect(parsePhaseOverride('?ph=street')).toBe('street')
    expect(parsePhaseOverride('?ph=nope')).toBeNull()
    expect(parsePhaseOverride('')).toBeNull()
  })

  it('?ol=0 / ?warp=0 / ?land=0 は既定 true で 0 のときだけ false', () => {
    expect(parseOutlineEnabled('')).toBe(true)
    expect(parseOutlineEnabled('?ol=0')).toBe(false)
    expect(parseOutlineEnabled('?ol=false')).toBe(false)
    expect(parseWarpEnabled('?warp=0')).toBe(false)
    expect(parseLandmarksEnabled('?land=0')).toBe(false)
    expect(parseWarpEnabled('')).toBe(true)
    expect(parseLandmarksEnabled('')).toBe(true)
  })

  it('?leg + ?at で章の中の位置を指す', () => {
    expect(overrideDistance('?leg=1&at=0')).toBe(chapterStart(1))
    expect(overrideDistance('?leg=1&at=1')).toBe(chapterStart(1) + 92)
    expect(overrideDistance('')).toBeNull()
  })

  it('?ph を足すとそのフェーズの中を割る(開ける型の QA の本体)', () => {
    expect(overrideDistance('?leg=0&ph=venue&at=0')).toBe(55)
    expect(overrideDistance('?leg=0&ph=venue&at=1')).toBe(83)
    expect(overrideDistance('?leg=0&ph=venue&at=0.5')).toBe(69)
    expect(overrideDistance('?leg=2&ph=open&at=0')).toBe(229)
  })

  it('存在しないフェーズを指定したら章まるごとへ落ちる', () => {
    // 第4章に exit は無い。落ちずに章の頭を返す
    expect(overrideDistance('?leg=3&ph=exit&at=0')).toBe(chapterStart(3))
  })
})
