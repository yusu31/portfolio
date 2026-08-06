import { describe, expect, it } from 'vitest'
import {
  GRID,
  HERO_HEIGHT,
  ISLAND_SPAN,
  LANE_CLEAR_COLUMN,
  LANE_CLEAR_HEIGHT,
  LANE_CLEAR_KINDS,
  LANE_COLUMN,
  TILE,
  TOP_THICKNESS,
  buildIsland,
  islandDepth,
  paintIsland,
  tileCenter,
  type IslandLayout,
  type IslandSpec,
} from './island'
import { PALETTES } from './palette'
import { CARDS } from './cards'

const SPEC: IslandSpec = {
  id: 'test',
  seed: 4242,
  weights: [
    { kind: 'block', weight: 3 },
    { kind: 'grove', weight: 2 },
    { kind: 'gear', weight: 2 },
    { kind: 'court', weight: 1.5 },
    { kind: 'fence', weight: 1 },
    { kind: 'stand', weight: 1 },
    { kind: 'floodlight', weight: 0.6 },
    { kind: 'empty', weight: 1 },
  ],
  patchRatio: 0.4,
  heroTile: [2, 4],
  heroRotY: 0.3,
}

/** ジオメトリだけの指紋。色が混ざっていないことを確かめるのに使う */
function geometryFingerprint(layout: IslandLayout): string {
  return JSON.stringify(layout.pieces.map((p) => [p.center, p.size, p.rotY]))
}

describe('タイル格子', () => {
  it('中央列が1本に定まる奇数格子', () => {
    expect(GRID % 2).toBe(1)
    expect(LANE_COLUMN).toBe((GRID - 1) / 2)
    expect(Number.isInteger(LANE_COLUMN)).toBe(true)
  })

  it('島の一辺はタイル数×タイル寸法', () => {
    expect(ISLAND_SPAN).toBeCloseTo(GRID * TILE, 6)
  })

  it('tileCenter は格子の中心を原点にする', () => {
    expect(tileCenter(LANE_COLUMN)).toBeCloseTo(0, 6)
    expect(tileCenter(0)).toBeCloseTo(-(ISLAND_SPAN - TILE) / 2, 6)
    expect(tileCenter(GRID - 1)).toBeCloseTo((ISLAND_SPAN - TILE) / 2, 6)
  })
})

describe('buildIsland', () => {
  const layout = buildIsland(SPEC)

  it('同じ spec からは常に同じ島ができる', () => {
    expect(geometryFingerprint(buildIsland(SPEC))).toBe(geometryFingerprint(layout))
  })

  it('シードが違えば別の島になる', () => {
    const other = buildIsland({ ...SPEC, seed: SPEC.seed + 1 })
    expect(geometryFingerprint(other)).not.toBe(geometryFingerprint(layout))
  })

  it('タイル数ぶんのモジュールが解決される', () => {
    expect(layout.tileKinds).toHaveLength(GRID * GRID)
  })

  // C の背骨。全カードで同じ列にレールが通るので、カードが一列に並ぶと
  // レールが全カードを貫いて奥の消失点へ収束する
  it('中央列は主役のタイルを除いてすべて lane(球体が走る道)', () => {
    for (let tz = 0; tz < GRID; tz++) {
      const kind = layout.tileKinds[tz * GRID + LANE_COLUMN]
      const isHeroTile = SPEC.heroTile[0] === LANE_COLUMN && SPEC.heroTile[1] === tz
      expect(kind, `tz=${tz}`).toBe(isHeroTile ? 'empty' : 'lane')
    }
  })

  it('中央列以外に lane は出ない(抽選に含まれていない)', () => {
    for (let tz = 0; tz < GRID; tz++) {
      for (let tx = 0; tx < GRID; tx++) {
        if (tx === LANE_COLUMN) continue
        expect(layout.tileKinds[tz * GRID + tx], `${tx},${tz}`).not.toBe('lane')
      }
    }
  })

  // 球体は走路の上を走るので、カメラ側の隣の列に高い物が立つと主役が隠れる。
  // QAで card3 の球体が建物に半分食われたのを見て入れた制約
  it('走路のカメラ側の列は低いモジュールしか置かない', () => {
    for (const card of CARDS) {
      const l = buildIsland(card)
      for (let tz = 0; tz < GRID; tz++) {
        const kind = l.tileKinds[tz * GRID + LANE_CLEAR_COLUMN]
        expect(LANE_CLEAR_KINDS, `${card.id}/tz=${tz}`).toContain(kind)
      }
    }
  })

  it('開けた列の物は球体を隠さない高さに収まる', () => {
    const xMin = tileCenter(LANE_CLEAR_COLUMN) - TILE / 2
    const xMax = tileCenter(LANE_CLEAR_COLUMN) + TILE / 2
    for (const card of CARDS) {
      for (const p of buildIsland(card).pieces) {
        if (p.center[0] < xMin || p.center[0] > xMax) continue
        // 島の天面・目地・岩はこの判定の対象外(平らか、下に伸びる物)
        if (p.center[1] <= 0.2) continue
        // 主役だけは背が高くてもよい。**細いので球体を塞がず、重なれば奥行きの手がかりになる**。
        // むしろ走路の脇に立っている絵(その時代の自分が球体を見送る)のほうが意図に合う
        if (p.slot.startsWith('hero')) continue
        expect(p.center[1] + p.size[1] / 2, `${card.id}/${p.slot}`).toBeLessThanOrEqual(LANE_CLEAR_HEIGHT)
      }
    }
  })

  it('主役のタイルは空ける(物に埋もれないように)', () => {
    const [hx, hz] = SPEC.heroTile
    expect(layout.tileKinds[hz * GRID + hx]).toBe('empty')
  })

  it('主役が指定タイルの中心に立つ', () => {
    expect(layout.hero.center[0]).toBeCloseTo(tileCenter(SPEC.heroTile[0]), 6)
    expect(layout.hero.center[2]).toBeCloseTo(tileCenter(SPEC.heroTile[1]), 6)
    expect(layout.hero.height).toBe(HERO_HEIGHT)
  })

  it('天面の上面がちょうど y=0(モジュールの基準面)', () => {
    const ground = layout.pieces.find((p) => p.slot === 'ground')!
    expect(ground.center[1] + ground.size[1] / 2).toBeCloseTo(0, 6)
    expect(ground.size[0]).toBeCloseTo(ISLAND_SPAN, 6)
    expect(ground.size[2]).toBeCloseTo(ISLAND_SPAN, 6)
    expect(ground.size[1]).toBeCloseTo(TOP_THICKNESS, 6)
  })
})

// --- 共通原則をここで数値に落とす -----------------------------------------

describe('共通原則3: 地面に情報を乗せる', () => {
  it('目地は内側の境界すべてに引かれる', () => {
    const layout = buildIsland(SPEC)
    const grout = layout.pieces.filter((p) => p.slot === 'grout')
    // 縦横それぞれ GRID-1 本
    expect(grout).toHaveLength((GRID - 1) * 2)
  })

  it('縁石が島の4辺を囲む', () => {
    const layout = buildIsland(SPEC)
    expect(layout.pieces.filter((p) => p.slot === 'curb' && p.size[0] >= ISLAND_SPAN - 1e-6).length).toBe(2)
    expect(layout.pieces.filter((p) => p.slot === 'curb' && p.size[2] >= ISLAND_SPAN - 1e-6).length).toBe(2)
  })

  it('4枚のカードすべてで天面のマークが20件を超える', () => {
    for (const card of CARDS) {
      expect(buildIsland(card).groundMarkCount, card.id).toBeGreaterThan(20)
    }
  })

  // 天面のマークが立ち上がっていると「地面に情報を乗せる」ではなく「物を置く」になる。
  // 木の葉が同じ色にならないよう `foliage` を分けてあるので、ここは色で選別できる
  it('天面のマークはすべて地面に貼り付いている', () => {
    const layout = buildIsland(SPEC)
    const marks = layout.pieces.filter((x) => x.slot === 'grout' || x.slot === 'groundAlt' || x.slot === 'curb')
    expect(marks.length).toBeGreaterThan(20)
    for (const p of marks) {
      expect(p.center[1] - p.size[1] / 2, p.slot).toBeLessThan(0.1)
      expect(p.size[1], p.slot).toBeLessThan(0.4)
    }
  })
})

describe('共通原則4: 密度を上げる', () => {
  it('4枚とも半分以上のタイルに物が乗る', () => {
    for (const card of CARDS) {
      const layout = buildIsland(card)
      expect(layout.filledTiles, card.id).toBeGreaterThan((GRID * GRID) / 2)
    }
  })

  it('4枚とも島あたり250個を超える', () => {
    for (const card of CARDS) {
      expect(buildIsland(card).pieces.length, card.id).toBeGreaterThan(250)
    }
  })

  it('空きタイルもいくらか残る(詰まりすぎると読めなくなる)', () => {
    for (const card of CARDS) {
      const layout = buildIsland(card)
      expect(layout.filledTiles, card.id).toBeLessThan(GRID * GRID)
    }
  })
})

describe('浮島の岩', () => {
  const layout = buildIsland(SPEC)
  const rocks = layout.pieces.filter((p) => p.slot === 'rock' || p.slot === 'rockDeep')

  it('天面より下にだけ伸びる', () => {
    for (const r of rocks) expect(r.center[1] + r.size[1] / 2).toBeLessThanOrEqual(-TOP_THICKNESS + 1e-6)
  })

  it('下へ行くほど細くなる(浮島の底が尖る)', () => {
    const sorted = [...rocks].sort((a, b) => b.center[1] - a.center[1])
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].size[0]).toBeLessThan(sorted[i - 1].size[0])
    }
  })

  it('一番上の岩は天面より小さい(天面の縁が張り出して見える)', () => {
    const top = rocks.reduce((a, b) => (a.center[1] > b.center[1] ? a : b))
    expect(top.size[0]).toBeLessThan(ISLAND_SPAN)
  })

  it('islandDepth が実際の最下点と一致する', () => {
    const lowest = Math.min(...layout.pieces.map((p) => p.center[1] - p.size[1] / 2))
    expect(islandDepth()).toBeCloseTo(-lowest, 6)
  })
})

describe('島の外形', () => {
  it('どの物も島の足元から大きくはみ出さない(隣のカードに侵入しない)', () => {
    const limit = ISLAND_SPAN / 2 + 1.2
    for (const card of CARDS) {
      for (const p of buildIsland(card).pieces) {
        expect(Math.abs(p.center[0]) + p.size[0] / 2, `${card.id}/x`).toBeLessThanOrEqual(limit)
        expect(Math.abs(p.center[2]) + p.size[2] / 2, `${card.id}/z`).toBeLessThanOrEqual(limit)
      }
    }
  })
})

// --- C の固有テスト: モジュラー思想が構造として成立しているか -------------
//
// 参考例②の売りは「同じアセットにパレットを差し替えると別の世界になる」だった。
// C ではジオメトリ生成にパレットを渡さないことでそれを構造として保証している。
// **ここが崩れたら C の言い分そのものが崩れる**ので、一番厳しく縛る

describe('パレット非依存(②のモジュラー思想)', () => {
  const layout = buildIsland(SPEC)

  it('生成されたジオメトリは色を1つも持たない', () => {
    for (const p of layout.pieces) expect(p).not.toHaveProperty('color')
  })

  it('4つのパレットで塗ってもジオメトリが1つも変わらない', () => {
    const before = geometryFingerprint(layout)
    const painted = PALETTES.map((p) => paintIsland(layout, p))
    // 塗ってもレイアウト自体が書き換わっていない
    expect(geometryFingerprint(layout)).toBe(before)
    for (const set of painted) {
      expect(JSON.stringify(set.map((p) => [p.center, p.size, p.rotY]))).toBe(before)
    }
  })

  it('同じ形が4通りの世界になる(色は全パレットで異なる)', () => {
    const signatures = PALETTES.map((p) => JSON.stringify(paintIsland(layout, p).map((x) => x.color)))
    expect(new Set(signatures).size).toBe(PALETTES.length)
  })

  it('塗った結果の色はすべて有効な16進', () => {
    for (const p of paintIsland(layout, PALETTES[2])) {
      expect(/^#[0-9a-f]{6}$/i.test(p.color), p.slot).toBe(true)
    }
  })

  // 共通原則1「パレットを絞る」が結果としても効いていること。
  // スロットは18種あるが、実際に使われる色数はそれ以下に収まる
  // 共通原則1「情報を足しても1画面の色数が増えない」の見張り。
  //
  // 上限は元は 20 だった。**窓を入れたときに `window` と `windowAlt` のちょうど2色だけ増えた**ので
  // 22 に上げてある。この2色は建物が無地の板でなくなるのと引き換えで、
  // ここを緩めるのは「壁の情報」と同格の投資に限る(看板は `accent` を使い回していて増やしていない)
  it('1つの島に出る色数は22色以下に収まる', () => {
    for (const card of CARDS) {
      const painted = paintIsland(buildIsland(card), PALETTES[card.paletteIndex])
      expect(new Set(painted.map((p) => p.color)).size, card.id).toBeLessThanOrEqual(22)
    }
  })
})

// 窓を入れたぶんピース数が跳ねる。**1カード = 1つの InstancedMesh** なので描画回数は
// 変わらないが、行列を焼くコストとメモリは枚数に比例する。青天井にしないための見張り
describe('壁の情報を足した後のピース数', () => {
  it('島1枚が上限内に収まる', () => {
    // 実測の最大は gym の 592。窓を裏面(-X / -Z)にも貼ると倍近くになるが、
    // カメラが固定で裏面は一度も映らないので貼っていない(modules.ts の windowsOn)
    for (const card of CARDS) {
      expect(buildIsland(card).pieces.length, card.id).toBeLessThan(700)
    }
  })
})
