// 一本道の定義と背面追従カメラ。**カメラは連続移動する**のがプロトタイプBの骨子で、
// ここが A(カット送り・補間なし)との一番大きな違いになる。
//
// 参考例①(probiex007 / messenger.abeto.co)の観察:
//   「三人称背面追従。キャラは画面中央やや下、身長は画面高の約1/4」
//   「強い一点透視。坂道が奥へ消え、両側の建物が画面を左右から挟む。
//     上部は歩道橋が横切って画面を締める(= 抜けを作らず『囲む』構図)」
//   (docs/references/2026-08-02_x-4examples.md)
//
// この「強い一点透視」「囲む構図」「主役が画面高の1/4」は全部**数値で確認できる**ので、
// 目分量ではなくここに関数として置き、route.test.ts で縛っている。
// 作り込みを粗くしても方向の定義だけは崩れないようにするため(A で確立したやり方)。
//
// 座標系: 道は -Z 方向に進む。`t` は道に沿った距離(0 〜 TOTAL_LENGTH)。

/** 画角。**広角であることが「強い一点透視」の実体**。A は 28(望遠 = アイソメ寄り)で真逆 */
export const CAMERA_FOV = 55

/** 主役の身長。カメラの追従距離と対にして「画面高の約1/4」を作る */
export const HERO_HEIGHT = 1.8

/** カメラが主役の後ろに下がる距離 */
export const CAMERA_BACK = 6.5
/** カメラが路面から浮く高さ */
export const CAMERA_HEIGHT = 2.6
/** 注視点を主役より前方に取る距離。**これがあるから主役が画面中央やや下に落ちる** */
export const LOOK_AHEAD = 14
/** 注視点の路面からの高さ */
export const LOOK_UP = 2.2

/** 車道の半幅 */
export const ROAD_HALF = 4.2
/** 歩道の幅。建物はこの外側から立ち上がる */
export const SIDEWALK_WIDTH = 1.8
/** 建物の壁面が立つ位置(道の中心からの距離) */
export const FACADE_X = ROAD_HALF + SIDEWALK_WIDTH

/** 道の全長。スクロールで進む範囲 */
export const TOTAL_LENGTH = 280

/**
 * スクロール開始点より手前に伸ばす長さ。カメラは主役の **後ろ** にいるので、
 * `t=0` の時点でカメラは `-CAMERA_BACK` の位置にある。ここに道が無いと足元が抜ける
 */
export const ROAD_LEAD = 16

/**
 * スクロール終端より先に伸ばす長さ。
 *
 * **一点透視では常に70ユニット以上先が見えている**ので、最終区間の終わりで道が終わっていると
 * 画面の奥で道が途切れる。「奥へ消える」構図の本体が消えるということなので、
 * 見えている範囲ぶんだけ余分に作る。消失点のズレを測る `vanishingOffsetDeg` も
 * この余白があって初めて終端まで正しく測れる(打ち切ると足元を見て値が跳ねる)
 */
export const ROAD_RUNOUT = 95

/** 実際に生成する道の範囲 */
export const ROAD_START = -ROAD_LEAD
export const ROAD_END = TOTAL_LENGTH + ROAD_RUNOUT

/** 全体としての下り量。①の「坂道が奥へ消える」構図の本体 */
const OVERALL_DROP = 26
/** 坂のうねり。単調な斜面だと画が平坦になるので、視界の中に段の変化を入れる */
const UNDULATION = 3.4
/** 横カーブの振幅。**大きくすると消失点が画面中央から外れて一点透視が崩れる**(テストで上限を縛る) */
const CURVE_AMPLITUDE = 5.0

/**
 * 路面の高さ。全体としては下りつつ、緩くうねる。
 *
 * 下り坂にしているのは、上り坂だと奥が壁のように立ち上がって「奥へ消える」感じが出ないため。
 * 下れば道は遠くまで見通せて、フォグに溶けるところまで一本の線が伸びる
 */
export function elevationAt(t: number): number {
  const u = t / TOTAL_LENGTH
  return -OVERALL_DROP * u + UNDULATION * Math.sin(u * Math.PI * 3.1)
}

/** 道の中心線の横位置。緩いカーブだけ入れて、消失点が画面中央から外れない範囲に収める */
export function lateralAt(t: number): number {
  const u = t / TOTAL_LENGTH
  return CURVE_AMPLITUDE * Math.sin(u * Math.PI * 1.6) + CURVE_AMPLITUDE * 0.35 * Math.sin(u * Math.PI * 4.2 + 0.9)
}

/** 道の中心線上の点 */
export function roadCenter(t: number): [number, number, number] {
  return [lateralAt(t), elevationAt(t), -t]
}

function normalize(v: [number, number, number]): [number, number, number] {
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
 * 進行方向(単位ベクトル)。中心差分で求める。
 *
 * 解析微分にしないのは、`elevationAt` / `lateralAt` の式を後から差し替えても
 * 接線の導出を書き直さなくて済むようにするため(試作なので式は動かす前提)
 */
export function roadTangent(t: number): [number, number, number] {
  const h = 0.05
  return normalize(sub(roadCenter(t + h), roadCenter(t - h)))
}

/** 道の横方向(単位ベクトル)。進行方向とワールドUpの外積なので、坂でも水平に保たれる */
export function roadSide(t: number): [number, number, number] {
  return normalize(cross(roadTangent(t), [0, 1, 0]))
}

/** 道の中心から横に `offset` ずれた路面上の点。建物・小物・白線の配置がすべてこれを通る */
export function roadPoint(t: number, offset: number): [number, number, number] {
  const c = roadCenter(t)
  const s = roadSide(t)
  return [c[0] + s[0] * offset, c[1] + s[1] * offset, c[2] + s[2] * offset]
}

/** 区間。パレットが切り替わる単位で、A の「章」に相当する */
export type Leg = {
  id: string
  title: string
  caption: string
  /** PALETTES のインデックス */
  paletteIndex: number
  /** この区間の長さ */
  length: number
  /** 沿道生成のシード */
  seed: number
  /** 沿道の建物の高さレンジ。**下限が「囲む構図」の成立条件**(route.test.ts で縛る) */
  buildingHeight: readonly [number, number]
  /** 建物どうしの間隔レンジ */
  buildingGap: readonly [number, number]
  /** 上部を横切る構造(歩道橋・アーケード・電線)の間隔 */
  overheadSpacing: number
  /** 1ユニットあたりの小物の数。**密度がこの試作でも主眼** */
  propDensity: number
}

/**
 * 4区間。A と同じ物語(体育教師 → エンジニア)を一本道の上に置き直したもの。
 * 区間が進むほど建物が高く密になり、街が深くなっていく
 */
export const LEGS: readonly Leg[] = [
  {
    id: 'gym',
    title: '体育館へ続く道',
    caption: '教えていた場所',
    paletteIndex: 0,
    length: 70,
    seed: 2207,
    buildingHeight: [7, 12],
    buildingGap: [6, 9],
    overheadSpacing: 26,
    propDensity: 1.9,
  },
  {
    id: 'field',
    title: '校庭沿い',
    caption: '走らせて、走っていた',
    paletteIndex: 1,
    length: 70,
    seed: 5531,
    buildingHeight: [7, 14],
    buildingGap: [5.5, 8.5],
    overheadSpacing: 24,
    propDensity: 2.1,
  },
  {
    id: 'court',
    title: '街の坂',
    caption: '独学の時間',
    paletteIndex: 2,
    length: 70,
    // ①に一番近い区間。建物を高く・間隔を詰めて、左右から挟む圧を最大にする
    seed: 9902,
    buildingHeight: [9, 17],
    buildingGap: [4.5, 7],
    overheadSpacing: 21,
    propDensity: 2.5,
  },
  {
    id: 'desk',
    title: 'オフィス街',
    caption: 'いま作っている場所',
    paletteIndex: 3,
    length: 70,
    seed: 7619,
    buildingHeight: [10, 18],
    buildingGap: [4.5, 7],
    overheadSpacing: 20,
    propDensity: 2.4,
  },
]

/** 各区間の開始距離(累積)。`LEGS[i]` は `legStart(i)` から始まる */
export function legStart(index: number): number {
  let acc = 0
  for (let i = 0; i < index && i < LEGS.length; i++) acc += LEGS[i].length
  return acc
}

/** 全区間の合計長。TOTAL_LENGTH と一致させておく(テストで確認する) */
export function totalLegLength(): number {
  return LEGS.reduce((s, l) => s + l.length, 0)
}

export type LegState = {
  index: number
  /** その区間の中での進み具合 0〜1 */
  local: number
}

/**
 * 距離 → どの区間か。
 *
 * A の `resolveCut` と役割は同じだが、**返した local をカメラの補間に使わない**のが違い。
 * B ではカメラは距離 `t` から直接決まる(連続)ので、区間はパレットとUIの切り替えにしか使わない
 */
export function resolveLeg(t: number): LegState {
  const clamped = Math.min(Math.max(t, 0), totalLegLength())
  let acc = 0
  for (let i = 0; i < LEGS.length; i++) {
    const end = acc + LEGS[i].length
    if (clamped < end || i === LEGS.length - 1) {
      return { index: i, local: Math.min(Math.max((clamped - acc) / LEGS[i].length, 0), 1) }
    }
    acc = end
  }
  return { index: LEGS.length - 1, local: 1 }
}

/** スクロールoffset(0〜1) → 道に沿った距離 */
export function distanceAt(offset: number): number {
  return Math.min(Math.max(offset, 0), 1) * TOTAL_LENGTH
}

/** 主役の姿勢。道の中心よりわずかに左(歩く側)に寄せる */
export const HERO_LATERAL = -1.1

export function heroPose(t: number): { position: [number, number, number]; rotY: number } {
  const p = roadPoint(t, HERO_LATERAL)
  const tan = roadTangent(t)
  // 進行方向へ向ける。背面追従なので画面には背中が映る
  return { position: p, rotY: Math.atan2(tan[0], tan[2]) }
}

/**
 * 背面追従カメラ。**主役の後ろの路面を基準に置く**のが要点。
 *
 * カメラの高さを「主役の位置の路面 + 一定」にすると、下り坂でカメラが路面にめり込む
 * (主役は坂を下った先にいるので路面が低い)。カメラ自身の位置の路面から測ることで
 * 坂の上に立ったまま坂の下を見下ろす形になり、①の「坂道が奥へ消える」構図が出る
 */
export function cameraPose(t: number): { position: [number, number, number]; target: [number, number, number] } {
  const behind = roadPoint(t - CAMERA_BACK, HERO_LATERAL)
  const ahead = roadPoint(t + LOOK_AHEAD, HERO_LATERAL * 0.4)
  return {
    position: [behind[0], behind[1] + CAMERA_HEIGHT, behind[2]],
    target: [ahead[0], ahead[1] + LOOK_UP, ahead[2]],
  }
}

/** カメラの正規直交基底(前・右・上)。画面上の位置を測る計算で使う */
function cameraBasis(t: number): {
  position: [number, number, number]
  forward: [number, number, number]
  right: [number, number, number]
  up: [number, number, number]
} {
  const { position, target } = cameraPose(t)
  const forward = normalize(sub(target, position))
  const right = normalize(cross(forward, [0, 1, 0]))
  const up = cross(right, forward)
  return { position, forward, right, up }
}

const halfVFovRad = () => ((CAMERA_FOV / 2) * Math.PI) / 180

/** 垂直画角の半分(度)。「画面の上端」を角度で表したもの */
export function halfVerticalFovDeg(): number {
  return CAMERA_FOV / 2
}

/**
 * 主役が画面高に占める割合。
 * 透視投影では**カメラ軸方向の奥行き**で割るのが正しいので、直線距離ではなく内積を使う。
 * 参考例①は「身長は画面高の約1/4」だったので、ここが 0.25 前後になるよう定数を決めてある
 */
export function apparentHeroFraction(t: number): number {
  const { position, forward } = cameraBasis(t)
  const hero = heroPose(t).position
  const center: [number, number, number] = [hero[0], hero[1] + HERO_HEIGHT / 2, hero[2]]
  const depth = dot(sub(center, position), forward)
  const visibleHeight = 2 * depth * Math.tan(halfVFovRad())
  return HERO_HEIGHT / visibleHeight
}

/**
 * 主役が画面の縦どこに写るか。-1 = 下端、0 = 中央、+1 = 上端。
 * ①は「画面中央やや下」なので、わずかに負の値になるのが正解
 */
export function heroScreenY(t: number): number {
  const { position, forward, up } = cameraBasis(t)
  const hero = heroPose(t).position
  const center: [number, number, number] = [hero[0], hero[1] + HERO_HEIGHT / 2, hero[2]]
  const v = sub(center, position)
  const depth = dot(v, forward)
  return dot(v, up) / depth / Math.tan(halfVFovRad())
}

/**
 * **一点透視の強さの指標**。遠方の道がカメラの前方軸から何度ずれているか。
 *
 * 0度なら道の消失点が画面のど真ん中にある = 完全な一点透視。
 * 横カーブを強くするとここが増えて、消失点が画面の外に流れていく。
 * `route.test.ts` で全区間の上限を縛ることで「強い一点透視」を仕様として固定している
 */
export function vanishingOffsetDeg(t: number, ahead: number = 70): number {
  const { position, forward } = cameraBasis(t)
  // ROAD_END まで道があるので打ち切らない。打ち切ると終端でカメラの足元を指してしまい、
  // 構図ではなく計測の都合で値が跳ねる(実際に最初はこれで20度が出た)
  const far = roadPoint(t + ahead, 0)
  const dir = normalize(sub(far, position))
  const c = Math.min(Math.max(dot(dir, forward), -1), 1)
  return (Math.acos(c) * 180) / Math.PI
}

/**
 * **囲む構図の指標**。高さ `height` の壁が横 `lateral` に立っているとき、
 * カメラから見た上端の仰角(度)。
 *
 * これが垂直画角の半分(27.5度)を超えていれば、その建物は画面の上端より上まで伸びている
 * = 「画面を左右から挟む」状態になる。①の構図の成立条件そのもの
 */
export function enclosureElevationDeg(height: number, lateral: number = FACADE_X): number {
  return (Math.atan2(height - CAMERA_HEIGHT, lateral) * 180) / Math.PI
}

// --- QA用クエリ ---------------------------------------------------------
// A で確立した「区間を直接指定できるようにしておく」を最初から入れる。
// スクロールを見なくなるのでカメラが最初のフレームから静止し、
// スクリーンショットが2回目のポーリングで収束する(ScrollControls の damping を待たなくて済む)

export const LEG_QUERY = 'leg'
export const AT_QUERY = 'at'
export const OUTLINE_QUERY = 'ol'

/** `?leg=2` → 2。未指定・不正値は null(スクロール駆動のまま) */
export function parseLegOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get(LEG_QUERY)
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return Math.min(Math.max(Math.round(parsed), 0), LEGS.length - 1)
}

/** `?at=0.8` → 0.8。未指定は0.5(区間の真ん中。代表的な絵になる) */
export function parseAtOverride(search: string): number {
  const raw = new URLSearchParams(search).get(AT_QUERY)
  if (raw === null || raw === '') return 0.5
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0.5
  return Math.min(Math.max(parsed, 0), 1)
}

/**
 * `?ol=0` で輪郭線を消す。既定は有効。
 *
 * **これは B の検証項目そのもの**。参考例4例のうち輪郭線があるのは①だけで、
 * 「Bでは輪郭線を入れる価値があるか」を同じ構図の有無で比べられるようにしておく
 */
export function parseOutlineEnabled(search: string): boolean {
  const raw = new URLSearchParams(search).get(OUTLINE_QUERY)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/** `?leg=N` があれば、そこに対応する距離を返す。無ければ null(スクロール駆動) */
export function overrideDistance(search: string): number | null {
  const leg = parseLegOverride(search)
  if (leg === null) return null
  return legStart(leg) + LEGS[leg].length * parseAtOverride(search)
}

/** ブラウザ外(テスト・SSR)では常に空。`typeof window` 分岐を1か所に集める */
export function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}
