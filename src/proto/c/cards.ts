// カードの定義と、**固定カメラ**・カードの流し方。
//
// A / B / C の骨子はここで分かれる:
//   A = カメラが章ごとに飛ぶ(カット送り。不連続)
//   B = カメラが一本道を連続移動する
//   C = **カメラは1ミリも動かない。ワールドのほうが手前に流れてくる**
//
// カメラを完全に固定すると、構図が常に同じになる。
// A の「決め打ちの構図を見せきる」良さと、B の「連続していて途切れない」良さを
// 同時に取れるかを見るのが C の狙いで、参考例②(Railway パック)の
// 「章が独立した小さな世界」という持ち方とも噛み合う。
//
// カード i は `z = (p - i) * CARD_SPACING` に置く。`p` はスクロール由来の連続値で、
// `p = i` のときカード i がステージ(z=0 = カメラの注視点)にぴったり乗る。
// `p` が増えると全カードが +Z(カメラ側)へ流れ、手前のカードは画面下へ抜けていく。
//
// 構図の指標はすべてここに関数として置き、`cards.test.ts` で数値で縛る(A / B で確立したやり方)。

import {
  ISLAND_SPAN,
  HERO_HEIGHT,
  SKYWAY_SPAN,
  islandDepth,
  laneWeaveAt,
  skywayPose,
  tileCenter,
  type IslandSpec,
} from './island'
import type { ModuleWeight } from './modules'
import { ATMOSPHERE_HOLD, getPalette, lerpPalette, type Palette } from './palette'

/** 画角。狭いほど遠近が圧縮されてアイソメトリックに近づく(参考例②③④の構図) */
export const CAMERA_FOV = 30

/** カメラの方位角(度)。正面から少しずらすと、流れてくる列が画面を斜めに横切る */
export const CAMERA_AZIMUTH_DEG = 26

/** カメラの仰角(度)。俯瞰が強いほど島の天面(= 情報を乗せた面)の面積が増える */
export const CAMERA_ELEVATION_DEG = 34

/** ステージからカメラまでの距離。**島がフレームに収まりつつ奥のカードの余地が残る**値 */
export const CAMERA_DISTANCE = 58

/** 注視点の高さ(島の天面が y=0) */
export const LOOK_Y = 1.6

/**
 * カードの間隔。**島の一辺より広くないとカードどうしが world 上で食い合う**。
 * 広すぎると列が伸びて奥のカードがフォグに完全に溶けるので、島1枚ぶん強に取る
 */
export const CARD_SPACING = 34

/** QAスクリーンショットのビューポート比(1280x800)。画面内判定はこの比で行う */
export const QA_ASPECT = 1280 / 800

/**
 * 影を落とす範囲の中心Z。**ステージのカードと1枚先のカードの中間**に置く。
 *
 * ステージのカードに合わせると1枚先のカードが影の外に出て、
 * 手前の島だけ影があり奥の島は影が無いという状態になる(俯瞰なので露骨に見える)。
 * カメラが固定なので、影の範囲もワールドに固定でよい(B はカメラ追従が必要だった)
 */
export const SHADOW_CENTER_Z = -CARD_SPACING / 2

/** 影を落とす範囲の半径。ステージと1枚先の両方の島がここに入る必要がある(cards.test.ts) */
export const SHADOW_RADIUS = 42

/** カード。島の形(IslandSpec)に、物語とパレットの割り当てを足したもの */
export type Card = IslandSpec & {
  title: string
  caption: string
  /** PALETTES のインデックス。**カードは自分のパレットで塗られたまま列に並ぶ** */
  paletteIndex: number
}

/** 重みの書き方を短くするだけのヘルパ */
const w = (kind: ModuleWeight['kind'], weight: number): ModuleWeight => ({ kind, weight })

/**
 * 4枚。A / B と同じ物語(体育教師 → エンジニア)を独立した4つの島に置き直したもの。
 *
 * **使えるモジュールは4枚とも同じ**で、違うのは重みとシードとパレットだけ。
 * これが②の「同じアセットで別の世界を作る」の実体になる
 */
export const CARDS: readonly Card[] = [
  {
    id: 'gym',
    title: '体育館の島',
    caption: '教えていた場所',
    paletteIndex: 0,
    seed: 3301,
    // 校舎と体育館。屋内競技の島なので建物とスタンドを厚くする
    weights: [w('block', 3.2), w('stand', 2.2), w('court', 1.8), w('grove', 1.5), w('fence', 1.3), w('gear', 1.0), w('floodlight', 0.5), w('empty', 1.2)],
    patchRatio: 0.35,
    heroTile: [4, 5],
    heroRotY: Math.PI * 0.15,
  },
  {
    id: 'field',
    title: '校庭の島',
    caption: '走らせて、走っていた',
    paletteIndex: 1,
    seed: 6142,
    // 開けた土地。コートのラインと木立を厚くして、Dusk の長い影が乗る面を広く取る
    weights: [w('court', 3.4), w('grove', 2.6), w('fence', 2.0), w('block', 1.2), w('gear', 1.0), w('stand', 0.9), w('floodlight', 0.5), w('empty', 1.6)],
    patchRatio: 0.55,
    heroTile: [5, 4],
    heroRotY: -Math.PI * 0.35,
  },
  {
    id: 'court',
    title: '街のコートの島',
    caption: '独学の時間',
    paletteIndex: 2,
    seed: 9718,
    // 用具置き場と柵。**密度が一番高いカード**(参考例④の物量)
    weights: [w('gear', 3.4), w('block', 2.6), w('fence', 2.2), w('court', 1.8), w('stand', 1.3), w('grove', 1.0), w('floodlight', 0.9), w('empty', 0.8)],
    patchRatio: 0.4,
    heroTile: [2, 5],
    heroRotY: Math.PI * 0.8,
  },
  {
    id: 'desk',
    title: 'オフィスの島',
    caption: 'いま作っている場所',
    paletteIndex: 3,
    seed: 4457,
    // 建物で高さを作る。**照明塔は絞る**(重みを上げたら QA で「棒の森」になった)
    weights: [w('block', 4.0), w('stand', 1.8), w('gear', 1.6), w('floodlight', 1.1), w('fence', 1.0), w('court', 0.9), w('grove', 0.8), w('empty', 0.9)],
    patchRatio: 0.3,
    heroTile: [5, 5],
    heroRotY: Math.PI * 1.1,
  },
]

/**
 * 旅をする球体の半径。**A / B の主役は人物だったが、C の主役は球体**。
 *
 * このポートフォリオの世界で移動するのは球体なので、
 * 走路(`lane` モジュール)の上をこれが転がっていく。
 * カードのほうが流れてくる構図なので、球体は**ワールドに固定**されていて、
 * 島だけが下を通り過ぎる(球体から見れば自分が走っているのと同じ)
 */
export const BALL_RADIUS = 1.15

/**
 * 球体の色。**4つの世界のどれでもこの色のまま**にしてある。
 *
 * 島はパレットで塗り替わるが、旅をしている本人は変わらない。
 * 1つだけパレットに従わない物があることで、その物が主役だと分かる
 */
export const BALL_COLOR = '#ff8a3c'
export const BALL_EMISSIVE = '#ff5a1a'

/**
 * ステージ位置の島の揺れ。球体を島の上に着地させるのに使う。
 *
 * カード単体の `cardBob` をそのまま使うと、ステージのカードが切り替わる瞬間に
 * 球体が跳ねる。前後のカードの揺れを補間して連続にする
 */
export function stageBob(p: number, time: number): number {
  const clamped = Math.min(Math.max(p, 0), maxProgress())
  const i = Math.min(Math.floor(clamped), CARDS.length - 1)
  const j = Math.min(i + 1, CARDS.length - 1)
  const u = clamped - i
  return cardBob(i, time) * (1 - u) + cardBob(j, time) * u
}

// --- 球体の動き -----------------------------------------------------------
//
// **「球体がまっすぐしか進まない」への答え。** 元は原点に完全固定で、動いていたのは
// 上下(島の揺れ)と転がりだけだった。動かなかったのは意図というより、
// 「カメラを動かさない」と「走路を全カード同じ列に敷く」の2つから自動的にそうなっていた。
//
// 2つの案を独立に入れてある。**どちらが良いかは撮って決める**ので、
// `?weave=0` / `?hop=0` でそれぞれ切れる。

/**
 * A案: 球体の横位置。**ステージにいるカードの走路の蛇行をそのまま追う**。
 *
 * 球体が勝手に動くのではなく、走路が曲がっていて球体はその上を走っているだけ、
 * という関係にしてある。動く理由が世界の側にあるので、
 * 振れ幅も走路の回廊(`LANE_WEAVE_MAX`)を超えない
 */
export function ballLaneX(p: number, enabled = true): number {
  if (!enabled) return 0
  const clamped = Math.min(Math.max(p, 0), maxProgress())
  const index = Math.min(Math.round(clamped), CARDS.length - 1)
  // 球体はワールド原点にいる。カード i はワールド z = cardZ(i,p) にあるので、
  // 球体の真下にあたる島ローカルZ はその符号を反転したもの
  const localZ = -cardZ(index, clamped)
  // カード間の空白では `laneWeaveAt` が 0 を返すので、そこは真っ直ぐに戻る
  return laneWeaveAt(localZ, CARDS[index].seed)
}

/** バウンド1往復あたりに進む距離。短くすると刻みすぎて跳ねているように見えない */
export const BALL_HOP_PERIOD = 9.0

/** バウンドの高さ。球体の直径(2.3)を超えると跳ねるというより飛んでいるように見える */
export const BALL_HOP_HEIGHT = 1.05

/**
 * B案: 球体のバウンド。**進んだ距離の関数**なので `offset` が唯一の真実であり続ける
 * (時刻で駆動すると逆スクロールで位相が飛び、QAのスクリーンショットも収束しない)。
 *
 * `abs(sin)` にしているのは、接地の瞬間に厳密に 0 を通るから。
 * 素の sin だと球体が地面にめり込む
 */
export function ballHop(p: number, enabled = true): number {
  if (!enabled) return 0
  const travelled = Math.min(Math.max(p, 0), maxProgress()) * CARD_SPACING
  return BALL_HOP_HEIGHT * Math.abs(Math.sin((Math.PI * travelled) / BALL_HOP_PERIOD))
}

/**
 * 球体の転がり角(ラジアン)。**滑らず転がる**ので進んだ距離を半径で割る。
 *
 * 島が +Z(カメラ側)へ流れるということは、球体から見れば -Z へ走っているということ。
 * 転がりが距離と噛み合っていないと、その場で空回りしているように見える
 */
export function ballSpin(p: number): number {
  return (p * CARD_SPACING) / BALL_RADIUS
}

/** スクロールの進み `p` の最大値。カード0がステージ → 最後のカードがステージ、まで */
export function maxProgress(): number {
  return Math.max(CARDS.length - 1, 0)
}

/** スクロールoffset(0〜1) → 進み `p` */
export function progressAt(offset: number): number {
  return Math.min(Math.max(offset, 0), 1) * maxProgress()
}

/**
 * カード i のワールドZ。**C の運動のすべてがこの1行**。
 * `p = i` で 0(ステージ)、`p > i` で正(カメラ側へ抜けていく)
 */
export function cardZ(index: number, p: number): number {
  return (p - index) * CARD_SPACING
}

export type CardState = {
  /** いまステージに一番近いカード */
  index: number
  /** 次のカードへの移動量 0〜1 */
  local: number
}

/**
 * 進み `p` → どのカードがステージにいるか。
 *
 * A の `resolveCut` と違って**カメラの位置に一切使わない**(カメラは固定なので)。
 * 使い道はオーバーレイの表示と大気の色だけ
 */
export function resolveCard(p: number): CardState {
  const clamped = Math.min(Math.max(p, 0), maxProgress())
  const index = Math.min(Math.round(clamped), CARDS.length - 1)
  const floor = Math.floor(clamped)
  return { index, local: Math.min(Math.max(clamped - floor, 0), 1) }
}

/** カードの上下の揺れ。浮島なので静止させない。**`?card=N` 指定時は 0 に凍結する** */
export function cardBob(index: number, time: number): number {
  return Math.sin(time * 0.55 + index * 1.7) * 0.34
}

/**
 * カードのパレット。`?pal=N` を渡すと**全カードが同じパレットになる**。
 *
 * 通常は各カードが自分のパレットで塗られたまま列に並ぶので、
 * 1画面に朝の島と夜の島が同時に映る(= 章が独立した小さな世界)
 */
export function cardPalette(index: number, override: number | null = null): Palette {
  if (override !== null) return getPalette(override)
  return getPalette(CARDS[Math.min(Math.max(index, 0), CARDS.length - 1)].paletteIndex)
}

/**
 * 空・フォグ・ライトの色。**大気だけは連続に混ぜる**。
 *
 * 島そのものは自分の色を保つが(上記)、背景まで飛ぶとカードが入れ替わるたびに
 * 画面全体が瞬間的に別物になってしまう。カードが移動している最中だけ渡し、
 * ステージに乗っている前後はそのカードの色そのままにする(`ATMOSPHERE_HOLD`)
 */
export function atmosphereAt(p: number, override: number | null = null): Palette {
  if (override !== null) return getPalette(override)
  const clamped = Math.min(Math.max(p, 0), maxProgress())
  const i = Math.min(Math.floor(clamped), CARDS.length - 1)
  const a = getPalette(CARDS[i].paletteIndex)
  const b = getPalette(CARDS[Math.min(i + 1, CARDS.length - 1)].paletteIndex)
  const local = clamped - i
  if (local <= ATMOSPHERE_HOLD) return a
  if (local >= 1 - ATMOSPHERE_HOLD) return b
  const u = (local - ATMOSPHERE_HOLD) / (1 - ATMOSPHERE_HOLD * 2)
  // smoothstep で渡し始めと渡し終わりの変化率を0にして、色の動きが折れないようにする
  return lerpPalette(a, b, u * u * (3 - 2 * u))
}

// --- カメラと投影 ---------------------------------------------------------

const deg = (d: number) => (d * Math.PI) / 180

function normalize(v: readonly [number, number, number]): [number, number, number] {
  const n = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / n, v[1] / n, v[2] / n]
}

const sub = (a: readonly number[], b: readonly number[]): [number, number, number] => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
]

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/**
 * カメラの姿勢。**引数を取らない**のが C の定義そのもので、
 * スクロールしてもカードが変わってもこの値は一切動かない
 */
export function cameraPose(): { position: [number, number, number]; target: [number, number, number] } {
  const az = deg(CAMERA_AZIMUTH_DEG)
  const el = deg(CAMERA_ELEVATION_DEG)
  const horizontal = Math.cos(el) * CAMERA_DISTANCE
  return {
    position: [Math.sin(az) * horizontal, Math.sin(el) * CAMERA_DISTANCE, Math.cos(az) * horizontal],
    target: [0, LOOK_Y, 0],
  }
}

/** カメラの正規直交基底(前・右・上) */
function cameraBasis(): {
  position: [number, number, number]
  forward: [number, number, number]
  right: [number, number, number]
  up: [number, number, number]
} {
  const { position, target } = cameraPose()
  const forward = normalize(sub(target, position))
  const right = normalize(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  return { position, forward, right, up }
}

const halfV = () => Math.tan(deg(CAMERA_FOV / 2))

/**
 * ワールド座標 → 画面座標。-1〜+1 が画面内で、`depth` はカメラ軸方向の奥行き。
 *
 * 目分量でカメラを決めると「島がはみ出る」「奥のカードが見えない」が後から出るので、
 * **構図の判定は全部これを通してテストで縛る**(A / B で確立した進め方)
 */
export function projectToScreen(
  point: readonly [number, number, number],
  aspect: number = QA_ASPECT
): { x: number; y: number; depth: number } {
  const { position, forward, right, up } = cameraBasis()
  const v = sub(point, position)
  const depth = dot(v, forward)
  // カメラの背後は投影が反転するので、そのまま返して呼び出し側で depth を見て弾く
  if (depth <= 0) return { x: Infinity, y: Infinity, depth }
  return {
    x: dot(v, right) / depth / (halfV() * aspect),
    y: dot(v, up) / depth / halfV(),
    depth,
  }
}

/** 画面内か */
export function isOnScreen(point: readonly [number, number, number], aspect: number = QA_ASPECT): boolean {
  const p = projectToScreen(point, aspect)
  return p.depth > 0 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1
}

/** カード i の天面4隅のワールド座標(進み `p` のとき) */
export function islandTopCorners(index: number, p: number): Array<[number, number, number]> {
  const half = ISLAND_SPAN / 2
  const z = cardZ(index, p)
  return [
    [half, 0, z + half],
    [-half, 0, z + half],
    [half, 0, z - half],
    [-half, 0, z - half],
  ]
}

/**
 * カード i の空中歩廊の両端(進み `p` のとき)。
 * **上部を横切る構造が本当に画面の上部を横切っているか**を測るのに使う
 */
export function skywayEnds(index: number, p: number): [[number, number, number], [number, number, number]] {
  const card = CARDS[Math.min(Math.max(index, 0), CARDS.length - 1)]
  const { y, z } = skywayPose(card.seed)
  const zw = z + cardZ(index, p)
  return [
    [-SKYWAY_SPAN / 2, y, zw],
    [SKYWAY_SPAN / 2, y, zw],
  ]
}

/** カード i の最下点(岩の先端)。フレーム下端の余裕を測るのに使う */
export function islandBottom(index: number, p: number): [number, number, number] {
  return [0, -islandDepth(), cardZ(index, p)]
}

/**
 * 主役が画面高に占める割合。**共通原則2「主役を画面の1/4以下」を数値で守るための関数**。
 * 透視投影なのでカメラ軸方向の奥行きで割る(直線距離ではない)
 */
export function apparentHeroFraction(index: number, p: number): number {
  const card = CARDS[Math.min(Math.max(index, 0), CARDS.length - 1)]
  const { position, forward } = cameraBasis()
  const center: [number, number, number] = [
    tileCenter(card.heroTile[0]),
    HERO_HEIGHT / 2,
    tileCenter(card.heroTile[1]) + cardZ(index, p),
  ]
  const depth = dot(sub(center, position), forward)
  if (depth <= 0) return 0
  return HERO_HEIGHT / (2 * depth * halfV())
}

// --- QA用クエリ -----------------------------------------------------------
// A(`?ch` / `?cut`)・B(`?leg` / `?at` / `?ol`)と同じ発想で最初から入れる。
// スクロールを見なくなるのでカードが最初のフレームから静止し、
// **同時にアニメーション(浮島の揺れ)も凍結する**(動きが残ると収束しない。B で踏んだ)

export const CARD_QUERY = 'card'
export const AT_QUERY = 'at'
export const PALETTE_QUERY = 'pal'
export const CHAIN_QUERY = 'chain'
export const SKYWAY_QUERY = 'sky'
export const WEAVE_QUERY = 'weave'
export const HOP_QUERY = 'hop'

/** `?card=2` → 2。未指定・不正値は null(スクロール駆動のまま) */
export function parseCardOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get(CARD_QUERY)
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return Math.min(Math.max(Math.round(parsed), 0), CARDS.length - 1)
}

/**
 * `?at=0.5` → 0.5。**未指定は 0**(カードがステージにぴったり乗った状態)。
 * B の既定が 0.5 だったのは道の途中が代表的な絵だからで、
 * C は「カードが決まった位置に乗っている」瞬間が代表的な絵になる
 */
export function parseAtOverride(search: string): number {
  const raw = new URLSearchParams(search).get(AT_QUERY)
  if (raw === null || raw === '') return 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), 1)
}

/**
 * `?pal=1` で**全カードを同じパレットで塗る**。未指定は null(カードごとのパレット)。
 *
 * **これが C の検証項目そのもの**。②の売りは「同じアセットにパレットを差し替えると
 * 別の世界になる」だったので、同じカードを別パレットで撮り比べられるようにしておく。
 * B の `?ol=0` があったから輪郭線の価値を実測で言えたのと同じ役割
 */
export function parsePaletteOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get(PALETTE_QUERY)
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return Math.max(Math.round(parsed), 0)
}

/**
 * `?chain=0` で**ステージのカードだけ**描く。既定は列ぜんぶ。
 *
 * 奥へ続くカードの列に価値があるか(= 1画面に複数の世界が並ぶことに意味があるか)を
 * 同じ構図の有無で比べるためのノブ
 */
export function parseChainEnabled(search: string): boolean {
  const raw = new URLSearchParams(search).get(CHAIN_QUERY)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/**
 * `?sky=0` で**上部を横切る構造を切る**。既定は有り。
 *
 * 「島の上が空きすぎている」という問題に効いているかを**同じ構図の有無で比べる**ためのノブ。
 * B の `?ol=0`(輪郭線)があったから輪郭線の価値を実測で言えたのと同じ役割
 */
export function parseSkywayEnabled(search: string): boolean {
  const raw = new URLSearchParams(search).get(SKYWAY_QUERY)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/**
 * `?weave=0` で**走路の蛇行(A案)を切る**。既定は有り。
 * 走路が真っ直ぐに戻り、球体も原点に固定される
 */
export function parseWeaveEnabled(search: string): boolean {
  const raw = new URLSearchParams(search).get(WEAVE_QUERY)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/** `?hop=0` で**球体のバウンド(B案)を切る**。既定は有り */
export function parseHopEnabled(search: string): boolean {
  const raw = new URLSearchParams(search).get(HOP_QUERY)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/** `?card=N` があれば、そこに対応する進み `p` を返す。無ければ null(スクロール駆動) */
export function overrideProgress(search: string): number | null {
  const card = parseCardOverride(search)
  if (card === null) return null
  return Math.min(card + parseAtOverride(search), maxProgress())
}

/** ブラウザ外(テスト・SSR)では常に空。`typeof window` 分岐を1か所に集める */
export function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}
