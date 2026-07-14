// Phase 5-1 弧長パラメータ化の回帰テスト(ブラウザ不要の一次防衛線)。
// QA基準は「構図の同等性」: 経路の形そのものではなく、
// 「各セクション区間でカメラがヴェニューの近くを通り、視線がヴェニューを向く」ことを担保する
import { describe, expect, it } from 'vitest'
import { CAMERA_PATH, LOOKAT_PATH, PATH_END_OFFSET, PAGES } from './curves'
import { SECTION_RANGES, sectionAt } from './sections'
import { VENUES } from './venues'

/** セクション区間の代表点(中間)を経路クランプ込みで返す */
function midU(start: number, end: number): number {
  return Math.min((start + Math.min(end, 1)) / 2, PATH_END_OFFSET)
}

describe('経路長', () => {
  it('カメラ経路の弧長が想定レンジにある(Phase 5-2で66→約200ユニットに延長)', () => {
    const len = CAMERA_PATH.getLength()
    expect(len).toBeGreaterThan(190)
    expect(len).toBeLessThan(210)
  })

  it('視線経路の弧長が想定レンジにある', () => {
    const len = LOOKAT_PATH.getLength()
    expect(len).toBeGreaterThan(188)
    expect(len).toBeLessThan(208)
  })

  it('getPointAtの進行が弧長ベースで均等(等Δuの移動距離がほぼ一定)', () => {
    const N = 100
    const dists: number[] = []
    for (let i = 1; i <= N; i++) {
      const a = CAMERA_PATH.getPointAt((i - 1) / N)
      const b = CAMERA_PATH.getPointAt(i / N)
      dists.push(a.distanceTo(b))
    }
    const mean = dists.reduce((s, d) => s + d, 0) / N
    for (const d of dists) {
      expect(d).toBeGreaterThan(mean * 0.75)
      expect(d).toBeLessThan(mean * 1.25)
    }
  })

  it('カメラは常に前進する(zが単調減少)', () => {
    let prev = Infinity
    for (let i = 0; i <= 200; i++) {
      const z = CAMERA_PATH.getPointAt(i / 200).z
      expect(z).toBeLessThanOrEqual(prev + 1e-4)
      prev = z
    }
  })
})

describe('SECTION_RANGES', () => {
  it('全区間で start < end', () => {
    for (const r of SECTION_RANGES) {
      expect(r.start).toBeLessThan(r.end)
    }
  })

  it('区間が昇順に並び、重なりがない', () => {
    for (let i = 1; i < SECTION_RANGES.length; i++) {
      expect(SECTION_RANGES[i].start).toBeGreaterThanOrEqual(SECTION_RANGES[i - 1].end)
    }
  })

  it('先頭はoffset 0から始まり、末尾はスクロール終端(1.0)を含む', () => {
    expect(SECTION_RANGES[0].start).toBe(0)
    expect(SECTION_RANGES[SECTION_RANGES.length - 1].end).toBeGreaterThan(1)
  })

  it('sectionAtが境界・隙間・終端で正しいセクションを返す', () => {
    expect(sectionAt(0)).toBe('home')
    expect(sectionAt(0.09)).toBeNull() // home→projects間の意図した隙間(見出し重なり回避)
    expect(sectionAt(0.41)).toBe('skills')
    expect(sectionAt(1.0)).toBe('contact')
  })
})

describe('u→座標のヴェニュー近傍性(構図の同等性)', () => {
  const venueSections = SECTION_RANGES.filter(
    (r): r is (typeof SECTION_RANGES)[number] & { id: keyof typeof VENUES } => r.id in VENUES
  )

  it.each(venueSections)('$id: 区間中にカメラがヴェニューのz近傍まで到達する', (r) => {
    const venue = VENUES[r.id].center
    const zStart = CAMERA_PATH.getPointAt(Math.min(r.start, PATH_END_OFFSET)).z
    const zEnd = CAMERA_PATH.getPointAt(Math.min(r.end, PATH_END_OFFSET)).z
    // 区間開始時はヴェニューがまだ前方にあり(z前方=負方向)、区間終了までにz±5以内へ到達する
    expect(venue.z).toBeLessThanOrEqual(zStart)
    expect(zEnd).toBeLessThanOrEqual(venue.z + 5)
  })

  it.each(venueSections)('$id: 区間中間で視線ターゲットがヴェニュー中心の近傍にある', (r) => {
    const venue = VENUES[r.id].center
    const look = LOOKAT_PATH.getPointAt(midU(r.start, r.end))
    expect(look.distanceTo(venue)).toBeLessThan(3.5)
  })
})

describe('終端静止(offsetクランプ)', () => {
  it('PATH_END_OFFSETでのカメラがゲート通過直後の構図にある(Phase 5-2延長後)', () => {
    const cam = CAMERA_PATH.getPointAt(PATH_END_OFFSET)
    expect(Math.abs(cam.x)).toBeLessThan(0.15)
    expect(cam.y).toBeGreaterThan(1.4)
    expect(cam.y).toBeLessThan(1.6)
    expect(cam.z).toBeGreaterThan(-188) // 延長終点 z=-189 の近傍
    expect(cam.z).toBeLessThan(-186)
  })

  it('PATH_END_OFFSETでの視線がContactプラザ(表彰台)を向いている', () => {
    const look = LOOKAT_PATH.getPointAt(PATH_END_OFFSET)
    expect(Math.abs(look.x)).toBeLessThan(0.2)
    expect(look.z).toBeGreaterThan(-195) // Contactヴェニュー z=-191 の近傍
    expect(look.z).toBeLessThan(-191)
  })

  it('クランプ値が終端手前の妥当な範囲にある', () => {
    expect(PATH_END_OFFSET).toBeGreaterThan(0.95)
    expect(PATH_END_OFFSET).toBeLessThan(1)
  })
})

describe('スクロール設定', () => {
  it('PAGESはPhase 5-2で経路延長(約3倍)に合わせて7→21', () => {
    expect(PAGES).toBe(21)
  })
})
