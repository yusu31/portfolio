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

/**
 * 低いモジュールしか置かない列。**走路の両隣**。
 *
 * カメラ側(`LANE_CLEAR_COLUMN`)は「球体が隠れないように」空けているが、
 * 反対側を空けている理由は別で、**走路が蛇行して入り込むから**。
 * 建物が走路の進路上に立っていると、球体が壁に突っ込むことになる。
 * 走路 + 両隣の3列で「回廊」を作り、蛇行の振幅はこの中に収める(`LANE_WEAVE_MAX`)
 */
export const LANE_CLEAR_COLUMNS: readonly number[] = [LANE_COLUMN - 1, LANE_COLUMN + 1]

/** 開けた列に置いてよいモジュール。すべて背が低く、球体の手前に来ても視界を塞がない */
export const LANE_CLEAR_KINDS: readonly ModuleKind[] = ['court', 'fence', 'gear', 'empty']

// --- 走路の蛇行(A案) -------------------------------------------------------
//
// 「球体がまっすぐしか進まない」への答え。**球体ではなく走路のほうを曲げる**。
//
// 球体はカメラの注視点に釘付けにしてあるので、球体だけを勝手に動かすと構図から外れる。
// 走路を曲げて球体がそれを追う形にすれば、動く理由が世界の側にあることになり、
// 振れ幅も走路の回廊に収まる。
//
// **カードの前後端では必ず 0 に戻す。** カードは独立した世界だが、走路だけは
// 全カードを貫いて1本に見えているのが C の背骨なので、そこは壊さない。
// 章ごとに違うのは「カードの中でどう曲がるか」だけ。

/**
 * 蛇行の最大振幅。走路の回廊(3列 = ±4.8)から、走路の実幅と路肩(1.63)を引いた残り。
 * ここを超えると走路が隣の建物の列へ食い込む
 */
export const LANE_WEAVE_MAX = 3.0

/** カードごとの蛇行のクセ(振幅と向き)。同じシードなら常に同じ */
function weaveShape(seed: number): { amp: number; dir: number } {
  const rand = mulberry32(seed ^ 0x27d4eb2f)
  const amp = LANE_WEAVE_MAX * (0.62 + rand() * 0.38)
  return { amp, dir: rand() < 0.5 ? -1 : 1 }
}

/**
 * 島ローカルZにおける走路の横ずれ。
 *
 * `sin(2πt)` を使っているのは、**t=0 と t=1(= カードの前後端)で厳密に 0 になる**から。
 * 途中で1回だけ左右に振れて戻ってくるので、1枚のカードの中で S 字を描く。
 * 条件分岐で端を 0 にするのではなく式で保証しているのは、境界に不連続を作らないため
 */
export function laneWeaveAt(zLocal: number, seed: number, enabled = true): number {
  if (!enabled) return 0
  const t = (zLocal + ISLAND_SPAN / 2) / ISLAND_SPAN
  // カードの外(カード間の空白)では横ずれ無し
  if (t < 0 || t > 1) return 0
  const { amp, dir } = weaveShape(seed)
  return dir * amp * Math.sin(2 * Math.PI * t)
}

/**
 * その地点で走路が向いている角度(Y軸まわり)。
 *
 * **これが無いと曲げたときに走路が階段状になる。** 箱をZ方向に分割しても、
 * 各セグメントを接線方向へ回さないと継ぎ目が角ばって「折れ線」に見える
 */
export function laneHeadingAt(zLocal: number, seed: number, enabled = true): number {
  if (!enabled) return 0
  const t = (zLocal + ISLAND_SPAN / 2) / ISLAND_SPAN
  if (t < 0 || t > 1) return 0
  const { amp, dir } = weaveShape(seed)
  // laneWeaveAt の zLocal 微分。Z方向へ1進むあいだに X がどれだけ動くか
  const slope = ((dir * amp * 2 * Math.PI) / ISLAND_SPAN) * Math.cos(2 * Math.PI * t)
  return Math.atan(slope)
}

/** モジュールに渡す形。`buildIsland` がこれを作って `lane` へ配る */
export function laneWeaveFn(seed: number, enabled = true): (z: number) => { x: number; rotY: number } {
  return (z) => ({ x: laneWeaveAt(z, seed, enabled), rotY: laneHeadingAt(z, seed, enabled) })
}

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

// --- 上部を横切る構造(空中歩廊) ------------------------------------------
//
// C は固定カメラの俯瞰なので島が画面の中央〜下に収まり、**その上が最後まで空**になる。
// 列の最後のカードでは奥に次の島も無いので、画面の上半分が丸ごと空いてしまう。
//
// B の「囲む構図」(道の上を高架が横切ってフレームの上端を締める)から持ってくるのは、
// **高架という題材ではなく「上を横切らせて画面を締める」という作り方のほう**。
//
// 作りの要点:
//   - **カードに属する**。カードと一緒に流れてくるので「章 = 独立した小さな世界」が壊れない
//   - **X方向に横切る**。カメラの方位が26度なので、X方向の桁は画面をほぼ水平に横切る
//   - **島より長くして両端を島の外へ出す**。島の幅のままだと画面の左右まで届かない
//   - **地面から支柱を立てない**。島そのものが浮いている世界なので空中構造も浮いていて筋が通るし、
//     天面に支柱を降ろすとモジュールと食い合って、そのぶんタイルを潰すことになる

/**
 * 島の天面から桁までの高さ。**カメラの仰角34度でこの高さが画面の上部に来る**(cards.test.ts で確認)。
 *
 * 上下の両側から挟まれていて、動かせる幅が狭い:
 *   - 低すぎる → 吊り下げた board が**照明塔の頭(島の最高点 7.74)と食い合う**(11.6 で実際に起きた)
 *   - 高すぎる → 桁の遠い側が**画面の上端を突き抜ける**(14.0 で card1 が NDC 1.0016 まで出た)
 * カードごとの振れ幅も、その範囲に収まるように ±1.0 まで詰めてある
 */
export const SKYWAY_HEIGHT = 13.4

/** 桁の長さ。島の一辺(22.4)より長くして両端を島の外へ出す */
export const SKYWAY_SPAN = ISLAND_SPAN * 1.7

/** 上弦と下弦の間隔。ここが薄いとトラスではなく1本の棒に見える */
const SKYWAY_TRUSS_DEPTH = 0.85

/**
 * 空中歩廊の姿勢(高さと Z)。**カードごとにずらす**ので、
 * 4枚が並んだときに歩廊が定規のように揃って人工的に見えるのを避けられる。
 *
 * 組み立てから分けてあるのは、**構図の判定(画面のどこを横切るか)を
 * ジオメトリを組まずに測れるようにする**ため(A / B で確立した進め方)
 */
export function skywayPose(seed: number): { y: number; z: number } {
  const rand = mulberry32(seed ^ 0x9e3779b9)
  return { y: SKYWAY_HEIGHT + (rand() - 0.5) * 2.0, z: (rand() - 0.5) * TILE * 3 }
}

/**
 * 空中歩廊を組む。**島ローカル座標**で、他のモジュールと同じ `Piece` を返す
 * (島まるごと1つの InstancedMesh に畳むという C の作りを崩さない)。
 *
 * 色は既存のスロットしか使わない。ただし**島に乗っている物とは選び方が違う**:
 * 空を背にするので、どのパレットでも空から読める色でなければならない
 * (`island.test.ts` で全パレット × 全ピースを ΔE で縛る)
 */
export function buildSkyway(seed: number): Piece[] {
  const out: Piece[] = []
  const { y, z } = skywayPose(seed)
  // 吊り物の位置だけ別の乱数列から引く。姿勢の乱数と混ぜると、
  // `skywayPose` を単独で呼んだときと結果がずれる
  const rand = mulberry32(seed ^ 0x85ebca6b)
  const half = SKYWAY_SPAN / 2

  // 上弦(歩廊の床)。**画面上でいちばん面積を持つのがこれ**。
  //
  // 断面は意図的に薄い。**歩廊は島より 13 上にある = カメラにそのぶん近い**ので、
  // 島と同じ感覚で寸法を取ると遠近で拡大されて、画面上部を占領する巨大なスラブになる
  // (最初 [幅0.5 × 奥行2.2] で組んで高速道路の高架に見えた)。
  //
  // 島の柵や支柱と同じ `post` を使っていたら、**夜のパレットで空と ΔE 17.3 まで近づいて溶けた**。
  // 島に乗っている物は島を背にするので `post` で足りるが、
  // **空中の構造は空を背にする**ので、空から読めることが保証されている色でないといけない
  out.push({ center: [0, y, z], size: [SKYWAY_SPAN, 0.3, 1.35], rotY: 0, slot: 'structure3' })

  // 下弦。上弦より暗くして厚みを出す
  out.push({ center: [0, y - SKYWAY_TRUSS_DEPTH, z], size: [SKYWAY_SPAN, 0.2, 0.8], rotY: 0, slot: 'roof' })

  // 斜材のかわりの垂直材。**これが無いと上下2本の平行な棒にしか見えない**。
  // 箱だけで組む縛りがあるので斜めは張れず、等間隔の縦材でトラスを表す
  const webs = 13
  for (let i = 0; i < webs; i++) {
    const x = -half + (SKYWAY_SPAN / (webs - 1)) * i
    out.push({
      center: [x, y - SKYWAY_TRUSS_DEPTH / 2, z],
      size: [0.14, SKYWAY_TRUSS_DEPTH, 0.6],
      rotY: 0,
      slot: 'roof',
    })
  }

  // 手すり。歩廊の両縁に細い線を走らせると、桁が「通路」として読める
  for (const side of [-1, 1]) {
    out.push({ center: [0, y + 0.34, z + side * 0.62], size: [SKYWAY_SPAN, 0.38, 0.09], rotY: 0, slot: 'structure3' })
  }

  // 吊り下げた灯り。**夜のパレットではここが光る**ので、上部にも差し色の点列ができる
  for (let i = 0; i < 6; i++) {
    const x = -half + (SKYWAY_SPAN / 6) * (i + 0.5)
    out.push({ center: [x, y - SKYWAY_TRUSS_DEPTH - 0.24, z], size: [0.26, 0.2, 0.26], rotY: 0, slot: 'accent' })
  }

  // 吊り下げた board(スコアボード / 横断幕)。**上の構造と下の島を視覚的につなぐ**。
  // これが無いと歩廊が画面上部に浮いているだけで、島と関係が無いものに見える
  const boardX = (rand() - 0.5) * SKYWAY_SPAN * 0.4
  const boardTop = y - SKYWAY_TRUSS_DEPTH - 0.3
  const boardH = 1.7
  for (const side of [-1, 1]) {
    out.push({
      center: [boardX + side * 1.1, boardTop - 0.45, z],
      size: [0.1, 0.9, 0.1],
      rotY: 0,
      slot: 'roof',
    })
  }
  out.push({
    center: [boardX, boardTop - 0.9 - boardH / 2, z],
    size: [2.5, boardH, 0.12],
    rotY: 0,
    slot: 'structure3',
  })
  // 板の縁の差し色。無地だと island の建物と同じ調子の面がもう1枚増えるだけになる
  out.push({
    center: [boardX, boardTop - 0.9 - boardH + 0.18, z],
    size: [2.5, 0.24, 0.16],
    rotY: 0,
    slot: 'accent',
  })
  return out
}

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
export function buildIsland(spec: IslandSpec, skyway = true, weave = true): IslandLayout {
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
  // 走路の蛇行。**島が持っている情報から作ってモジュールへ配る**ので、
  // モジュール側はカードのシードも島の一辺も知らないまま曲がった走路を作れる
  const weaveFn = laneWeaveFn(spec.seed, weave)

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
          : LANE_CLEAR_COLUMNS.includes(tx)
            ? // 走路の両隣は低い物だけ。カードの重みは尊重しつつ、対象を絞って引き直す
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

      const built = MODULES[kind]({ cx, cz, tile: TILE, rand, weave: weaveFn })
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

  // --- 上部を横切る構造 -------------------------------------------------
  // 最後に足すのは、それまでの「島の外形」を測るテストの対象を分けやすくするため
  if (skyway) pieces.push(...buildSkyway(spec.seed))

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
