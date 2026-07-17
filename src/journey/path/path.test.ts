// Phase 5-1 弧長パラメータ化の回帰テスト(ブラウザ不要の一次防衛線)。
// QA基準は「構図の同等性」: 経路の形そのものではなく、
// 「各セクション区間でカメラがヴェニューの近くを通り、視線がコートを向く」ことを担保する。
// Phase 5-5(世界の3倍化)で視線テストの意味論を「ヴェニュー中心から3.5以内」→
// 「対象コートのAABB内」に置換した: タッチライン際カメラの設計ではLOOKATは
// ヴェニュー中心(遠い)ではなくボール活動帯(道寄り)を向くのが正しいため
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { CAMERA_PATH, LOOKAT_PATH, PATH_END_OFFSET, PAGES } from './curves'
import { SECTION_RANGES, sectionAt } from './sections'
import {
  VENUES,
  COURT_SIZES,
  SOCCER_GOAL_GROUP_OFFSET,
  SOCCER_GOAL_POST_Z,
  VOLLEY_NET_GROUP_OFFSET,
  VOLLEY_NET_POST_Z,
  FINISH_GATE_OFFSET_Z,
  FINISH_GATE_POLE_X,
} from './venues'
import { HOOP_GROUP_OFFSET, HOOP_POST_LOCAL_OFFSET } from '../ball/anchors'

/** セクション区間の代表点(中間)を経路クランプ込みで返す */
function midU(start: number, end: number): number {
  return Math.min((start + Math.min(end, 1)) / 2, PATH_END_OFFSET)
}

describe('経路長', () => {
  it('カメラ経路の弧長が想定レンジにある(Phase 5-5で約200→253.5に延長)', () => {
    const len = CAMERA_PATH.getLength()
    expect(len).toBeGreaterThan(245)
    expect(len).toBeLessThan(265)
  })

  it('視線経路の弧長が想定レンジにある', () => {
    const len = LOOKAT_PATH.getLength()
    expect(len).toBeGreaterThan(245)
    expect(len).toBeLessThan(265)
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

  // コートを持つ3ヴェニュー: 視線ターゲットが「コートのAABB(xzマージン1.0)内」にあること。
  // 3倍コートで「中心から3.5以内」は視線設計(ボール活動帯=道寄りを向く)と矛盾するため置換した
  const courtSections = venueSections.filter(
    (r): r is (typeof venueSections)[number] & { id: keyof typeof COURT_SIZES } => r.id in COURT_SIZES
  )

  it.each(courtSections)('$id: 区間中間で視線ターゲットがコートのAABB内にある', (r) => {
    const venue = VENUES[r.id].center
    const { width, depth } = COURT_SIZES[r.id]
    const margin = 1.0
    const look = LOOKAT_PATH.getPointAt(midU(r.start, r.end))
    expect(look.x).toBeGreaterThanOrEqual(venue.x - width / 2 - margin)
    expect(look.x).toBeLessThanOrEqual(venue.x + width / 2 + margin)
    expect(look.z).toBeGreaterThanOrEqual(venue.z - depth / 2 - margin)
    expect(look.z).toBeLessThanOrEqual(venue.z + depth / 2 + margin)
  })

  it('contact: 区間中間で視線ターゲットがプラザ中心の近傍にある(プラザは1x据え置き)', () => {
    const r = SECTION_RANGES.find((s) => s.id === 'contact')!
    const look = LOOKAT_PATH.getPointAt(midU(r.start, r.end))
    expect(look.distanceTo(VENUES.contact.center)).toBeLessThan(3.5)
  })
})

describe('構造物クリアランス(Phase 5-5固有のハザード)', () => {
  // 3倍化した構造物(ゴール・フープ支柱・ネット支柱)とゲートポールが「道に迫る」事故への一次防衛線。
  // 全構造物の位置はvenues.tsx描画と単一ソース(path/venues.ts・ball/anchors.tsの定数)で共有し、
  // カメラ経路の全域サンプルとの水平距離が確保されていることを確認する
  const structures: Array<[string, THREE.Vector3]> = [
    [
      'サッカーゴールポスト北',
      VENUES.projects.center.clone().add(SOCCER_GOAL_GROUP_OFFSET).add(new THREE.Vector3(0, 0, -SOCCER_GOAL_POST_Z)),
    ],
    [
      'サッカーゴールポスト南',
      VENUES.projects.center.clone().add(SOCCER_GOAL_GROUP_OFFSET).add(new THREE.Vector3(0, 0, SOCCER_GOAL_POST_Z)),
    ],
    ['バスケフープ支柱', VENUES.skills.center.clone().add(HOOP_GROUP_OFFSET).add(HOOP_POST_LOCAL_OFFSET)],
    [
      'バレーネット支柱北',
      VENUES.about.center.clone().add(VOLLEY_NET_GROUP_OFFSET).add(new THREE.Vector3(0, 0, -VOLLEY_NET_POST_Z)),
    ],
    [
      'バレーネット支柱南',
      VENUES.about.center.clone().add(VOLLEY_NET_GROUP_OFFSET).add(new THREE.Vector3(0, 0, VOLLEY_NET_POST_Z)),
    ],
    [
      'フィニッシュゲートポール西',
      VENUES.contact.center.clone().add(new THREE.Vector3(-FINISH_GATE_POLE_X, 0, FINISH_GATE_OFFSET_Z)),
    ],
    [
      'フィニッシュゲートポール東',
      VENUES.contact.center.clone().add(new THREE.Vector3(FINISH_GATE_POLE_X, 0, FINISH_GATE_OFFSET_Z)),
    ],
  ]

  it.each(structures)('%s とカメラ経路の水平距離が1.2以上ある', (_name, pos) => {
    const N = 500
    let minDist = Infinity
    let minDistU = 0
    for (let i = 0; i <= N; i++) {
      const cam = CAMERA_PATH.getPointAt(i / N)
      const dist = Math.hypot(cam.x - pos.x, cam.z - pos.z)
      if (dist < minDist) {
        minDist = dist
        minDistU = i / N
      }
    }
    expect(minDist, `最接近 u=${minDistU.toFixed(4)} で距離${minDist.toFixed(2)}`).toBeGreaterThan(1.2)
  })
})

describe('終端静止(offsetクランプ)', () => {
  it('PATH_END_OFFSETでのカメラがゲート通過直後の構図にある(Phase 5-5延長後)', () => {
    const cam = CAMERA_PATH.getPointAt(PATH_END_OFFSET)
    expect(Math.abs(cam.x)).toBeLessThan(0.15)
    expect(cam.y).toBeGreaterThan(1.4)
    expect(cam.y).toBeLessThan(1.6)
    expect(cam.z).toBeGreaterThan(-242.5) // ゲート(z=-241.4)通過直後、延長終点z=-243の手前
    expect(cam.z).toBeLessThan(-240)
  })

  it('PATH_END_OFFSETでの視線がContactプラザ(台座)を向いている', () => {
    const look = LOOKAT_PATH.getPointAt(PATH_END_OFFSET)
    expect(Math.abs(look.x)).toBeLessThan(0.2)
    expect(look.z).toBeGreaterThan(-249) // Contactヴェニュー z=-245 の近傍
    expect(look.z).toBeLessThan(-245)
  })

  it('クランプ値が終端手前の妥当な範囲にある', () => {
    expect(PATH_END_OFFSET).toBeGreaterThan(0.95)
    expect(PATH_END_OFFSET).toBeLessThan(1)
  })
})

describe('スクロール設定', () => {
  it('PAGESはPhase 5-5でスクロール速度パリティにより21→27', () => {
    expect(PAGES).toBe(27)
  })
})
