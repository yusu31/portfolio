// `/city` のカメラと球の仕様固定。設計書 §3 / §11。
//
// ここで縛るのは「構図」そのもの。街が入っても施設が入っても、
// **球が画面のどこにどの大きさで写るか**は動かさない、という宣言になっている。
import { describe, expect, it } from 'vitest'
import {
  CAMERA_BEATS,
  STREET_OFFSET,
  VENUE_OFFSET,
  apparentBallFraction,
  ballScreenY,
  beatBlendT,
  cameraRoadClearance,
  getCameraOffset,
  vanishingOffsetDeg,
} from './camera'
import { BALL_RADIUS, ballAnchorAt, ballHeadingAt, getCityBallRollQuaternion, totalRollAngle } from './ball'
import { CHAPTERS, TOTAL_LENGTH, elevationAt, phaseRange, roadPoint } from './route'

/** 街区フェーズの代表点(章ごとに前・中・後) */
const streetPoints: number[] = []
/** 敷地フェーズの代表点 */
const venuePoints: number[] = []
for (let i = 0; i < CHAPTERS.length; i++) {
  const s = phaseRange(i, 'street')!
  const v = phaseRange(i, 'venue')!
  for (const at of [0.05, 0.5, 0.95]) {
    streetPoints.push(s.start + (s.end - s.start) * at)
    venuePoints.push(v.start + (v.end - v.start) * at)
  }
}

describe('オフセット4値(§3.2 の訂正)', () => {
  it('街区は B と同じ見かけの大きさになるよう引き直した値', () => {
    // ⚠ 設計書 §3.2 は街区を「路面基準」、見せ場を「球中心基準」で計算していた。
    // カメラは getBallFrame(= 球中心)の契約だけを消費するので、B の生値をそのまま
    // 入れると球が画面下半分に沈む。lookUp は BALL_RADIUS を引くのが正しい。
    // dBack と dUp はさらに引き直してある(下のテストで理由ごと縛る)
    expect(STREET_OFFSET.dBack).toBe(10.85)
    expect(STREET_OFFSET.dUp).toBe(2.0)
    expect(STREET_OFFSET.lookAhead).toBe(14)
    expect(STREET_OFFSET.lookUp).toBeCloseTo(2.2 - BALL_RADIUS, 10)
  })

  it('見せ場は ② の値そのまま(② の anchor は元から球中心)', () => {
    expect(VENUE_OFFSET).toEqual({ dBack: 4.5, dUp: 3.0, lookAhead: 2, lookUp: 1.5 })
  })
})

describe('構図 — 球の画面内位置と大きさ(§3.2 / §11)', () => {
  it('街区は「画面中央やや下・画面高の 26%」= B の主役と同じ見かけ', () => {
    // B の人物(身長1.8)は画面高の 26.5% を占めていた。球は直径 3.0 なので同じ
    // カメラ距離では 44.2% になってしまう(1.67倍)。dBack を 6.5 → 10.85 に広げて
    // **B と同じ 26.5% に揃えた**(2026-08-08 実機で撮り比べてユーザーが選択)
    for (const t of streetPoints) {
      expect(ballScreenY(t)).toBeCloseTo(-0.2512, 3)
      expect(apparentBallFraction(t)).toBeCloseTo(0.2634, 3)
    }
  })

  it('街区では球の全身がフレームに入る', () => {
    // これが崩れると「街を見せる」構図ではなく「球を追う」構図になる。
    // 実測: 上端 +0.012 / 下端 −0.515
    for (const t of streetPoints) {
      expect(ballScreenY(t) + apparentBallFraction(t)).toBeLessThan(1)
      expect(ballScreenY(t) - apparentBallFraction(t)).toBeGreaterThan(-1)
    }
  })

  it('見せ場への寄りが「読める」大きさの変化になっている', () => {
    // 街区 44% のままだと見せ場 57% との差が小さく、カメラの寄り引きがほぼ読めなかった。
    // これが dBack を広げる決め手になったので、比としてテストに残す
    const street = apparentBallFraction(streetPoints[0])
    const venue = apparentBallFraction(venuePoints[0])
    expect(venue / street).toBeGreaterThan(2)
  })

  it('見せ場は球へ寄る(画面高の 57%)', () => {
    for (const t of venuePoints) {
      expect(ballScreenY(t)).toBeCloseTo(-0.7257, 3)
      expect(apparentBallFraction(t)).toBeCloseTo(0.5695, 3)
    }
  })

  it('終着プラザは最後まで寄ったまま終わる', () => {
    // 第4章には退出フェーズが無い。ここが街区値へ戻ると旅の終わりで急に引く
    expect(apparentBallFraction(TOTAL_LENGTH)).toBeCloseTo(0.5695, 3)
  })

  it('全域で 26%〜57% の間に収まる', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 0.5) {
      const f = apparentBallFraction(t)
      expect(f).toBeGreaterThanOrEqual(0.2634 - 1e-3)
      expect(f).toBeLessThanOrEqual(0.5695 + 1e-3)
    }
  })
})

describe('一点透視(§11・B から移植)', () => {
  it('消失点が画面中央から 12° 以内にある', () => {
    // B の縛りをそのまま継承。実測の最大は 8.78°(@t=175.25)で、上限まで 3.2° の余裕がある。
    // CURVE_AMPLITUDE を上げるとここが増えて一点透視が崩れる
    let max = 0
    for (let t = 0; t <= TOTAL_LENGTH; t += 0.25) max = Math.max(max, vanishingOffsetDeg(t))
    expect(max).toBeLessThan(12)
    expect(max).toBeCloseTo(8.78, 1)
  })
})

describe('カメラのブレンド区間(§3.4)', () => {
  it('章の数だけあり、開口フェーズ全体を覆う', () => {
    expect(CAMERA_BEATS).toHaveLength(4)
    expect(CAMERA_BEATS[0]).toMatchObject({ from: 45, to: 92, rampIn: 10, rampOut: 9 })
    // 終着プラザは引かずに終わる
    expect(CAMERA_BEATS[3]).toMatchObject({ from: 321, to: 368, rampIn: 10, rampOut: 0 })
  })

  it('区間が互いに重ならない', () => {
    // ② のコードがコメントで前提にしていた性質をテストへ格上げしたもの。
    // 重なると街区値からの連鎖 lerp が壊れる
    for (let i = 0; i < CAMERA_BEATS.length; i++) {
      for (let j = i + 1; j < CAMERA_BEATS.length; j++) {
        const a = CAMERA_BEATS[i]
        const b = CAMERA_BEATS[j]
        expect(a.to <= b.from || b.to <= a.from).toBe(true)
      }
    }
  })

  it('ランプが区間長を超えない(台形の天井が 1.0 に届く)', () => {
    for (const b of CAMERA_BEATS) expect(b.rampIn + b.rampOut).toBeLessThanOrEqual(b.to - b.from)
  })

  it('街区では厳密に 0、敷地では厳密に 1', () => {
    for (const beat of CAMERA_BEATS) {
      expect(beatBlendT(beat, beat.from)).toBe(0)
      expect(beatBlendT(beat, beat.from - 1)).toBe(0)
      expect(beatBlendT(beat, beat.from + beat.rampIn)).toBeCloseTo(1, 10)
      if (beat.rampOut > 0) {
        expect(beatBlendT(beat, beat.to)).toBe(0)
        expect(beatBlendT(beat, beat.to - beat.rampOut)).toBeCloseTo(1, 10)
      } else {
        expect(beatBlendT(beat, beat.to)).toBeCloseTo(1, 10)
      }
    }
  })

  it('ブレンドが敷地フェーズと正確に重なる', () => {
    // ランプをフェーズ長で取っているので、天井が張り付く区間 = 敷地フェーズになる
    for (let i = 0; i < CHAPTERS.length; i++) {
      const v = phaseRange(i, 'venue')!
      expect(beatBlendT(CAMERA_BEATS[i], v.start)).toBeCloseTo(1, 10)
      expect(beatBlendT(CAMERA_BEATS[i], v.end)).toBeCloseTo(1, 10)
    }
  })

  it('オフセットが全域で連続(カメラが飛ばない)', () => {
    const STEP = 0.1
    let prev = getCameraOffset(0)
    for (let t = STEP; t <= TOTAL_LENGTH; t += STEP) {
      const cur = getCameraOffset(t)
      // 上限の出どころ: smootherstep の傾きの最大は 1.875。ランプ長 10 ユニットなので
      // ブレンドは最大 0.1875/ユニット で動く。0.1 刻みでは
      //   dBack     振れ幅 10.85−4.5 = 6.35 → 6.35 × 0.1875 × 0.1 = 0.119
      //   lookAhead 振れ幅 14−2    = 12   → 12   × 0.1875 × 0.1 = 0.225
      // それぞれに余裕を持たせた値で縛る
      expect(Math.abs(cur.dBack - prev.dBack)).toBeLessThan(0.2)
      expect(Math.abs(cur.dUp - prev.dUp)).toBeLessThan(0.1)
      expect(Math.abs(cur.lookAhead - prev.lookAhead)).toBeLessThan(0.3)
      expect(Math.abs(cur.lookUp - prev.lookUp)).toBeLessThan(0.1)
      prev = cur
    }
  })
})

describe('カメラが路面にめり込まない(§6 Step 10)', () => {
  it('全域で路面より球の半径ぶん以上高い', () => {
    // B はカメラ高を「主役の後ろの路面」基準にしてこれを避けていたが、/city は
    // getBallFrame の契約に乗るので球中心からの相対になり、**下り勾配 × dBack のぶん
    // 余裕が減る**。dBack を 10.85 へ広げたときこれが効いて、dUp 1.1 のままだと
    // 最小 0.6246(@t=124.25、うねりの下り最急点)まで落ちていた。
    // **カメラが球の半径より路面に近づかない**ことを条件に dUp を 2.0 へ引き直してある。
    // OVERALL_DROP / UNDULATION / dBack を上げるとここが減るので縛っておく
    let min = Infinity
    for (let t = 0; t <= TOTAL_LENGTH; t += 0.25) min = Math.min(min, cameraRoadClearance(t))
    expect(min).toBeGreaterThanOrEqual(BALL_RADIUS)
    expect(min).toBeCloseTo(1.5246, 2)
  })
})

describe('球の居場所(§2.2)', () => {
  it('球は道の上を離れない', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 4) {
      const anchor = ballAnchorAt(t)
      const road = roadPoint(t, 0)
      // 水平には道の中心、垂直には路面 + 半径(= 路面に接している)
      expect(Math.hypot(anchor.x - road[0], anchor.z - road[2])).toBeCloseTo(0, 6)
      expect(anchor.y - road[1]).toBeCloseTo(BALL_RADIUS, 6)
    }
  })

  it('heading は水平な単位ベクトル', () => {
    // 坂の勾配が向きに漏れるとカメラのヨー・ピッチが揺れる
    for (let t = 0; t <= TOTAL_LENGTH; t += 4) {
      const h = ballHeadingAt(t)
      expect(h.y).toBe(0)
      expect(h.length()).toBeCloseTo(1, 6)
      expect(h.z).toBeLessThan(0)
    }
  })
})

describe('転がり(§7.2 の再発防止)', () => {
  it('経路長ぶん回っている(滑らない転がり)', () => {
    // 368 / 1.5 = 245.3 rad。うねりと勾配で経路長が少し伸びるぶん上回る
    expect(totalRollAngle()).toBeGreaterThan(TOTAL_LENGTH / BALL_RADIUS)
    expect(totalRollAngle() / (Math.PI * 2)).toBeCloseTo(39.4, 1)
  })

  it('どの区間でも回転が止まらない', () => {
    // **② の roll.ts は `step.y = 0` で落下中だけ回転が止まっていた**(§7.2)。
    // 同じ罠を将来また踏まないよう、「u あたりの回転が下限を超える」ことをテストで見張る。
    // 回転が止まっていたことに誰も気づかなかったのが今回の問題なので、テストに気づかせる
    const STEP = 2
    const q = getCityBallRollQuaternion(0).clone()
    for (let t = STEP; t <= TOTAL_LENGTH; t += STEP) {
      const cur = getCityBallRollQuaternion(t)
      const delta = q.clone().invert().premultiply(cur)
      const angle = 2 * Math.acos(Math.min(Math.abs(delta.w), 1))
      // 水平移動 STEP に対する理論値 STEP/1.5 = 1.333 rad の 9 割は最低でも回る
      expect(angle).toBeGreaterThan((STEP / BALL_RADIUS) * 0.9)
      q.copy(cur)
    }
  })

  it('同じ距離は常に同じ向きを返す(スクラブ再生で再現する)', () => {
    const a = getCityBallRollQuaternion(123.4).clone()
    const b = getCityBallRollQuaternion(123.4)
    expect(a.angleTo(b)).toBeCloseTo(0, 10)
  })
})

describe('道の下りとカメラの整合', () => {
  it('カメラは常に球より後ろかつ上にいる', () => {
    for (let t = 0; t <= TOTAL_LENGTH; t += 4) {
      const off = getCameraOffset(t)
      expect(off.dBack).toBeGreaterThan(0)
      expect(off.dUp).toBeGreaterThan(0)
      // 球の中心より上にカメラがある = 見下ろす
      expect(ballAnchorAt(t).y + off.dUp).toBeGreaterThan(elevationAt(t))
    }
  })
})
