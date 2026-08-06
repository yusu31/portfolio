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
  SKYWAY_SPAN,
  buildIsland,
  buildSkyway,
  islandDepth,
  paintIsland,
  skywayPose,
  tileCenter,
  type IslandLayout,
  type IslandSpec,
} from './island'
import { MIN_ROOF_SKY_DELTA_E, PALETTES, deltaE, slotColor } from './palette'
import { BALL_RADIUS, CARDS } from './cards'

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

  // 対象は**島に乗っているモジュールだけ**。上部を横切る構造は同じ列の上を通るが、
  // 天面から10以上離れているので球体とは screen 上でも重ならない(下の専用テストで縛る)
  it('開けた列の物は球体を隠さない高さに収まる', () => {
    const xMin = tileCenter(LANE_CLEAR_COLUMN) - TILE / 2
    const xMax = tileCenter(LANE_CLEAR_COLUMN) + TILE / 2
    for (const card of CARDS) {
      for (const p of buildIsland(card, false).pieces) {
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
  const limit = ISLAND_SPAN / 2 + 1.2

  // **カードが並ぶのは Z 方向**なので、隣に侵入しうるのは Z のはみ出しだけ。
  // 上部を横切る構造は X に大きく伸びるが、その先には何も無いので侵入は起きない
  it('Z方向は島の枠から出ない(隣のカードに侵入しない)', () => {
    for (const card of CARDS) {
      for (const p of buildIsland(card).pieces) {
        expect(Math.abs(p.center[2]) + p.size[2] / 2, `${card.id}/z`).toBeLessThanOrEqual(limit)
      }
    }
  })

  it('島に乗っている物は X方向にも島の枠から出ない', () => {
    for (const card of CARDS) {
      // 上部を横切る構造だけは意図的に島の外へ出すので、ここでは組まない
      for (const p of buildIsland(card, false).pieces) {
        expect(Math.abs(p.center[0]) + p.size[0] / 2, `${card.id}/x`).toBeLessThanOrEqual(limit)
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

// C は固定カメラの俯瞰なので島が画面の中央〜下に収まり、その上が最後まで空になる。
// **B の「囲む構図」から借りるのは高架という題材ではなく「上を横切らせて画面を締める」作り方**。
// 構図に効いているかどうかは cards.test.ts で画面座標に落として測る。
// ここではジオメトリとして成立しているかを見る
describe('上部を横切る構造(空中歩廊)', () => {
  it('カードごとに高さと Z がずれる(4枚が定規のように揃わない)', () => {
    const poses = CARDS.map((c) => skywayPose(c.seed))
    expect(new Set(poses.map((p) => p.y.toFixed(4))).size).toBe(CARDS.length)
    expect(new Set(poses.map((p) => p.z.toFixed(4))).size).toBe(CARDS.length)
  })

  it('同じシードなら常に同じ姿勢(カードが画面外へ抜けて戻っても動かない)', () => {
    for (const card of CARDS) {
      expect(skywayPose(card.seed)).toEqual(skywayPose(card.seed))
    }
  })

  it('島の一辺より長く、両端が島の外へ出る', () => {
    expect(SKYWAY_SPAN).toBeGreaterThan(ISLAND_SPAN)
    for (const p of buildSkyway(CARDS[0].seed)) {
      // 端の縦材が半分だけ出るぶんは許す(0.08)
      expect(Math.abs(p.center[0]) + p.size[0] / 2).toBeLessThanOrEqual(SKYWAY_SPAN / 2 + 0.1)
    }
    const widest = buildSkyway(CARDS[0].seed).reduce((a, b) => (a.size[0] > b.size[0] ? a : b))
    expect(widest.size[0]).toBeCloseTo(SKYWAY_SPAN, 6)
  })

  it('島の天面から十分離れて浮く(下のモジュールと食い合わない)', () => {
    for (const card of CARDS) {
      for (const p of buildSkyway(card.seed)) {
        // 一番下に垂れる board を含めても天面から5以上ある
        expect(p.center[1] - p.size[1] / 2, card.id).toBeGreaterThan(8)
      }
    }
  })

  // **島の上に立つ物の最高点は照明塔の 7.74**。吊り下げた board がここに触れると
  // 歩廊と島の物が刺さって見える(最初 SKYWAY_HEIGHT=11.6 で実際に食い合った)
  it('島の一番高い物より上を通る(照明塔と食い合わない)', () => {
    for (const card of CARDS) {
      const islandTop = Math.max(...buildIsland(card, false).pieces.map((p) => p.center[1] + p.size[1] / 2))
      expect(islandTop, `${card.id}: 島の最高点`).toBeLessThan(8)
      const lowest = Math.min(...buildSkyway(card.seed).map((p) => p.center[1] - p.size[1] / 2))
      expect(lowest, card.id).toBeGreaterThan(islandTop)
    }
  })

  it('球体の高さとは大きく離れている(主役を隠さない)', () => {
    for (const card of CARDS) {
      const lowest = Math.min(...buildSkyway(card.seed).map((p) => p.center[1] - p.size[1] / 2))
      expect(lowest - BALL_RADIUS * 2, card.id).toBeGreaterThan(4)
    }
  })

  // 上下2本の平行な棒だと「構造」ではなく「線」に見える。
  // 箱だけで組む縛りがあるので斜材は張れず、等間隔の縦材でトラスを表している
  it('上弦と下弦を縦材でつないでいる(1本の棒に見えない)', () => {
    const pieces = buildSkyway(CARDS[0].seed)
    // 吊り物のハンガーも細い縦材なので、奥行き(0.9)で縦材だけを選び分ける
    const webs = pieces.filter((p) => p.slot === 'roof' && p.size[0] < 0.3 && p.size[1] > 0.5 && p.size[2] > 0.5)
    expect(webs.length).toBeGreaterThanOrEqual(10)
    // 縦材が X 方向に等間隔で並ぶ
    const xs = webs.map((p) => p.center[0]).sort((a, b) => a - b)
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6)
  })

  it('島へ向けて board を吊っている(上の構造と下の島がつながって見える)', () => {
    for (const card of CARDS) {
      const board = buildSkyway(card.seed).find((p) => p.slot === 'structure3' && p.size[1] > 1.5 && p.size[0] < 4)
      expect(board, card.id).toBeDefined()
    }
  })

  it('新しい色を持ち込まない(既存のスロットしか使わない)', () => {
    // **`post` は入れない**。島の柵と同じ色にすると夜のパレットで空に溶ける(ΔE 17.3)
    const allowed = ['roof', 'structure3', 'accent']
    for (const card of CARDS) {
      for (const p of buildSkyway(card.seed)) expect(allowed, card.id).toContain(p.slot)
    }
  })

  // 歩廊は空を背にするので、空に溶けるとフレームを締める役に立たない
  it('どのパレットでも構造の色が空から読める', () => {
    for (const palette of PALETTES) {
      for (const card of CARDS) {
        for (const p of buildSkyway(card.seed)) {
          expect(
            deltaE(slotColor(palette, p.slot), palette.sky),
            `${palette.id}/${p.slot}`
          ).toBeGreaterThanOrEqual(MIN_ROOF_SKY_DELTA_E)
        }
      }
    }
  })

  it('?sky=0 相当で組まないと、ジオメトリが歩廊のぶんだけ減る', () => {
    for (const card of CARDS) {
      const withSky = buildIsland(card).pieces.length
      const without = buildIsland(card, false).pieces.length
      expect(withSky - without, card.id).toBe(buildSkyway(card.seed).length)
    }
  })
})
