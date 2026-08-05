// 1枚のカード(浮島)を組み立てる層。**ここが作るのは色を持たない純ジオメトリ**。
//
// C の設計上の核心はこの分離にある:
//   `buildIsland(spec)`            → 形だけ。パレットを受け取らない
//   `paintIsland(layout, palette)` → 形はそのままに色だけ乗せる
//
// 参考例②(threejs assets のモジュールパック)の売りは「同じアセットにパレットを差し替えると別の世界になる」
// だった(docs/references/2026-08-02_x-4examples.md)。それを設計として成立させると
// **同じ形が4通りの世界になる**ことが構造から保証される。
// A / B は物を作る時点で色を焼き込んでいたので、ここが C の固有の作りになる。
// `island.test.ts` で「パレットを変えてもジオメトリが1つも変わらない」を数値で縛っている。
//
// 座標系: 島ローカル。**天面が y=0**、島の中心が原点。岩は y<0 に伸びる。

import { MODULES, heroFigure, mulberry32, pickModule, type ModuleKind, type ModuleWeight, type Piece } from './modules'
import { slotColor, type Palette } from './palette'

/** タイル格子の一辺の枚数。奇数にして中央列を1本に定める(走路が通る列) */
export const GRID = 7

/** タイル1枚の一辺 */
export const TILE = 3.2

/** 島の一辺。カード間隔はこれより広くないとカードどうしが world 上で食い合う(cards.test.ts) */
export const ISLAND_SPAN = GRID * TILE

/** 天面の板の厚み */
export const TOP_THICKNESS = 0.7

/**
 * 走路が通る列(0〜GRID-1)。**全カードで同じ列**なので、
 * 走路が全カードを貫いて1本につながる(= 球体が転がっていく道)
 */
export const LANE_COLUMN = (GRID - 1) / 2

/**
 * 走路のカメラ側の隣の列。**ここには低い物しか置かない**。
 *
 * カメラは +X+Z の側にいるので、この列に高い建物が立つと
 * **走路の上を走っている球体がちょうど隠れる**(QAで実測。card3 で球体が半分欠けた)。
 * 主役が隠れるのは構図の失敗なので、1列だけ開けて視線を通す。
 * 走路の手前が開けているのは競技場の絵としても自然
 */
export const LANE_CLEAR_COLUMN = LANE_COLUMN + 1

/** 開けた列に置いてよいモジュール。すべて背が低く、球体の手前に来ても視界を塞がない */
export const LANE_CLEAR_KINDS: readonly ModuleKind[] = ['court', 'fence', 'gear', 'empty']

/** 開けた列の物の高さの上限。球体の中心(半径ぶん)より低いことをテストで縛る */
export const LANE_CLEAR_HEIGHT = 1.7

/**
 * 主役の身長。カメラ側の `apparentHeroFraction` と対にして「画面の1/4以下」を作る(共通原則2)。
 *
 * 島の一辺(22.4)に対して意図的に大きめに取ってある。カメラが58離れているので、
 * 実寸どおりの縮尺にすると主役が画面の1/20を切って**存在が読めなくなる**。
 * 参考例③(1/8)④(1/6)も主役だけスケールが誇張されて見えるので、そちら側に合わせている。
 * 最初 2.6 で撮ったら4枚中3枚で主役を目視で見つけられなかったので上げた(QAで実測)
 */
export const HERO_HEIGHT = 3.2

/**
 * 島の下の岩。**曲面を使わず箱を積むだけ**にしてある。
 *
 * 全部が箱なら島まるごと1つの InstancedMesh に流し込めて、
 * 「モジュールを積んで世界を作る」という C の言い分がジオメトリの側でも一貫する。
 * 下へ行くほど細く・暗くして、浮島の底が背景の空に溶けないようにする
 */
const ROCK_LAYERS: ReadonlyArray<{ scale: number; height: number; deep: boolean }> = [
  { scale: 0.93, height: 1.7, deep: false },
  { scale: 0.75, height: 1.9, deep: false },
  { scale: 0.54, height: 2.0, deep: true },
  { scale: 0.32, height: 1.9, deep: true },
  { scale: 0.14, height: 1.5, deep: true },
]

/** 島の形を決めるもの。**パレットは含まない**(それが C の設計) */
export type IslandSpec = {
  id: string
  /** モジュール抽選のシード。同じシード → 常に同じ島 */
  seed: number
  /** 抽選の重み。カードごとに違うのはここと seed だけで、使えるモジュールは全カード共通 */
  weights: readonly ModuleWeight[]
  /** 地面パッチ(芝・土の色違い)を敷くタイルの割合。地面に情報を乗せる量(共通原則3) */
  patchRatio: number
  /** 主役が立つタイル [tx, tz]。**このタイルはモジュールを空にする**(主役が物に埋もれる) */
  heroTile: readonly [number, number]
  heroRotY: number
}

/** 組み上がった島。色はまだ無い */
export type IslandLayout = {
  id: string
  pieces: readonly Piece[]
  /** 天面に乗せたマークの数(縁石・目地・パッチ)。共通原則3をテストで縛る */
  groundMarkCount: number
  /** モジュールが乗ったタイルの枚数(empty を除く)。共通原則4をテストで縛る */
  filledTiles: number
  /** タイルごとに選ばれたモジュール。デバッグと検証用 */
  tileKinds: readonly ModuleKind[]
  hero: { center: readonly [number, number, number]; height: number }
}

/** タイル座標 → 島ローカル座標(タイル中心) */
export function tileCenter(index: number): number {
  return (index - (GRID - 1) / 2) * TILE
}

/**
 * 島を組み立てる。**タイルを1枚ずつ舐めるだけ**で、特別扱いは中央列(走路)と
 * 主役のタイル(空ける)の2つしかない。この単純さが②のモジュラー思想そのもの
 */
export function buildIsland(spec: IslandSpec): IslandLayout {
  const pieces: Piece[] = []
  const half = ISLAND_SPAN / 2

  // --- 天面と縁石 -------------------------------------------------------
  // 天面は y=0 が上面になるように沈める
  pieces.push({
    center: [0, -TOP_THICKNESS / 2, 0],
    size: [ISLAND_SPAN, TOP_THICKNESS, ISLAND_SPAN],
    rotY: 0,
    slot: 'ground',
  })

  let groundMarkCount = 0

  // 島の縁の縁石。切り取られた世界の輪郭がここで決まる(線を引かずに縁を立てる)
  const curbH = 0.26
  const curbW = 0.34
  for (const [dx, dz, sx, sz] of [
    [0, -half + curbW / 2, ISLAND_SPAN, curbW],
    [0, half - curbW / 2, ISLAND_SPAN, curbW],
    [-half + curbW / 2, 0, curbW, ISLAND_SPAN],
    [half - curbW / 2, 0, curbW, ISLAND_SPAN],
  ] as const) {
    pieces.push({ center: [dx, curbH / 2, dz], size: [sx, curbH, sz], rotY: 0, slot: 'curb' })
    groundMarkCount++
  }

  // タイルの目地。**地面が単色で無地**という現行シーンの問題への直接の答え(共通原則3)。
  // 外周は縁石が担当するので内側の境界だけ引く
  const groutW = 0.1
  for (let i = 1; i < GRID; i++) {
    const u = -half + TILE * i
    pieces.push({ center: [u, 0.02, 0], size: [groutW, 0.06, ISLAND_SPAN], rotY: 0, slot: 'grout' })
    pieces.push({ center: [0, 0.02, u], size: [ISLAND_SPAN, 0.06, groutW], rotY: 0, slot: 'grout' })
    groundMarkCount += 2
  }

  // --- タイルごとのモジュール -------------------------------------------
  const tileKinds: ModuleKind[] = []
  let filledTiles = 0

  for (let tz = 0; tz < GRID; tz++) {
    for (let tx = 0; tx < GRID; tx++) {
      // タイルごとに独立した乱数列にする。**1枚のモジュールが使う乱数の数を変えても
      // 他のタイルの見た目が動かない**ので、試作中にモジュールをいじりやすい
      const rand = mulberry32(spec.seed + tx * 73856093 + tz * 19349663)
      const cx = tileCenter(tx)
      const cz = tileCenter(tz)

      const isHeroTile = tx === spec.heroTile[0] && tz === spec.heroTile[1]
      const kind: ModuleKind = isHeroTile
        ? 'empty'
        : tx === LANE_COLUMN
          ? 'lane'
          : tx === LANE_CLEAR_COLUMN
            ? // 走路の手前側は低い物だけ。カードの重みは尊重しつつ、対象を絞って引き直す
              pickModule(
                spec.weights.filter((x) => LANE_CLEAR_KINDS.includes(x.kind)),
                rand()
              )
            : pickModule(spec.weights, rand())

      // 地面パッチ。タイル一面の色を変えて、天面が単色の板にならないようにする。
      // 走路のタイルは舗装で埋まるので敷かない
      if (kind !== 'lane' && rand() < spec.patchRatio) {
        pieces.push({
          center: [cx, 0.015, cz],
          size: [TILE - groutW * 2, 0.05, TILE - groutW * 2],
          rotY: 0,
          slot: 'groundAlt',
        })
        groundMarkCount++
      }

      const built = MODULES[kind]({ cx, cz, tile: TILE, rand })
      pieces.push(...built)
      tileKinds.push(kind)
      if (built.length > 0) filledTiles++
    }
  }

  // --- 主役 -------------------------------------------------------------
  const heroX = tileCenter(spec.heroTile[0])
  const heroZ = tileCenter(spec.heroTile[1])
  pieces.push(...heroFigure(heroX, heroZ, spec.heroRotY, HERO_HEIGHT))

  // --- 島の下の岩 -------------------------------------------------------
  const rockRand = mulberry32(spec.seed ^ 0x5f3759df)
  let depth = TOP_THICKNESS
  for (const layer of ROCK_LAYERS) {
    const span = ISLAND_SPAN * layer.scale
    pieces.push({
      center: [
        (rockRand() - 0.5) * ISLAND_SPAN * 0.06,
        -(depth + layer.height / 2),
        (rockRand() - 0.5) * ISLAND_SPAN * 0.06,
      ],
      size: [span, layer.height, span],
      // わずかに回して積み木の面が揃わないようにする。揃うと人工物に見える
      rotY: (rockRand() - 0.5) * 0.5,
      slot: layer.deep ? 'rockDeep' : 'rock',
    })
    depth += layer.height
  }

  return {
    id: spec.id,
    pieces,
    groundMarkCount,
    filledTiles,
    tileKinds,
    hero: { center: [heroX, 0, heroZ], height: HERO_HEIGHT },
  }
}

/** 島の底が天面から何ユニット下まで伸びるか。カメラの near/far と影の範囲を決めるのに使う */
export function islandDepth(): number {
  return TOP_THICKNESS + ROCK_LAYERS.reduce((s, l) => s + l.height, 0)
}

/** 色が乗った1個 */
export type PaintedPiece = Piece & { color: string }

/**
 * 色を乗せる。**ジオメトリには一切触らない**。
 *
 * これが分かれていることが「パレットを差し替えると別の世界になる」の実体で、
 * `?pal=N` で全カードを同じパレットに塗り替えても配置が1つも動かない
 */
export function paintIsland(layout: IslandLayout, palette: Palette): PaintedPiece[] {
  return layout.pieces.map((p) => ({ ...p, color: slotColor(palette, p.slot) }))
}
