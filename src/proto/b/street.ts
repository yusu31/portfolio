// 沿道の中身の生成。**「囲む構図」と「密度」を作る唯一の仕組み**。
//
// 参考例①の観察は2点:
//   「両側の建物が画面を左右から挟む。上部は歩道橋が横切って画面を締める(= 抜けを作らず囲む)」
//   「密度は高い。電柱・標識・三角コーン・室外機・階段・手すりが細かく置かれている」
//
// A の `scatter.ts` は「箱庭の中に面で散らす」だったが、B は一本道なので
// **道に沿った距離 `t` と、中心からの横位置 `lateral` の2軸**で置く。
// 生成は純データで、ワールド座標への変換は描画側(`ProtoBScene.tsx`)が `roadPoint()` で行う。
// 道が曲がっても坂になっても配置データを作り直さなくて済む形にしてある。
//
// 完全に決定的(同じシード → 同じ街)。QAで同じ区間を撮り直したときに街が変わると比較にならない。
import { FACADE_X, LEGS, ROAD_END, ROAD_HALF, ROAD_START, legStart, resolveLeg, type Leg } from './route'

/**
 * 街全体のシード。**建物と上部構造は区間で切らず道全体で一本に生成する**。
 *
 * 最初は区間ごとに生成していたが、区間の境界で建物どうしが食い合った(テストが検出)。
 * そもそも B は連続移動が骨子なので、街の生成だけ区間で切れているほうが設計として間違っていた。
 * 区間はパラメータ(高さ・間隔)の供給元にとどめ、並びは道に沿って連続させる
 */
const STREET_SEED = 30411

/** 短くて分布が十分な決定的PRNG(mulberry32) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const between = (r: number, lo: number, hi: number) => lo + r * (hi - lo)

/** 道のどちら側か。-1 = 左、+1 = 右 */
export type Side = -1 | 1

export type Building = {
  legIndex: number
  /** 道に沿った位置(建物の中心) */
  t: number
  side: Side
  /** 道に沿った幅 */
  width: number
  /** 道を横切る方向の奥行き */
  depth: number
  height: number
  /** 壁面を道から後退させる量。0だと全部の壁が一直線に揃って単調になる */
  setback: number
  /** パレットの buildings のインデックス(0〜3) */
  colorIndex: number
  /** 上に載せる小さい塊の高さ。0なら無し。シルエットに変化を出す */
  capHeight: number
  /** 1階の庇(店先)の張り出し。街の足元に情報を作る */
  awning: number
}

/** 小物の種類。①で名指しされていたものをそのまま項目にしてある */
export type PropKind = 'pole' | 'sign' | 'cone' | 'unit' | 'rail' | 'bin' | 'step'

export type StreetProp = {
  legIndex: number
  t: number
  /** 道の中心からの符号つき横位置 */
  lateral: number
  kind: PropKind
  /** 道を横切る方向の幅 */
  depth: number
  height: number
  /** 道に沿った幅 */
  width: number
  /** 道の向きに対する追加の回転(ラジアン) */
  yaw: number
  colorIndex: number
  /** 差し色を使うか。少数だけ true にして画面の色数を保つ */
  accent: boolean
}

/** 上部を横切って画面を締める構造。**これが無いと空に抜けて「囲む構図」が壊れる** */
export type Overhead = {
  legIndex: number
  t: number
  kind: 'bridge' | 'beam' | 'wire' | 'banner'
  /** 路面からの高さ */
  height: number
  /** 部材の太さ */
  thickness: number
  /** 道に沿った奥行き(歩道橋の床の幅) */
  span: number
  colorIndex: number
}

export type Street = {
  buildings: Building[]
  props: StreetProp[]
  overheads: Overhead[]
}

/**
 * 建物を道の両側に並べる。**道の端から端まで一本のカーソルで進める**ので、
 * 区間の境界でも建物が食い合わない(区間ごとに生成していたときは実際に重なった)。
 *
 * 左右は別々のカーソルなので向かい合う建物の切れ目が揃わず、
 * 「門」のように道が区切られて見えるのを避けられる。
 * 高さ・間隔はカーソル位置の区間から引くので、街の性格は区間ごとに変わる
 */
function buildBuildings(legs: readonly Leg[], rand: () => number): Building[] {
  const out: Building[] = []

  for (const side of [-1, 1] as Side[]) {
    let cursor = ROAD_START
    // 右側だけ1棟ぶんずらして始める。左右の切れ目が最初から揃わないようにするため
    if (side === 1) cursor -= between(rand(), 2, 6)

    while (cursor < ROAD_END) {
      const { index } = resolveLeg(cursor)
      const leg = legs[Math.min(index, legs.length - 1)]
      const width = between(rand(), leg.buildingGap[0], leg.buildingGap[1]) + between(rand(), 1.5, 4)
      const height = between(rand(), leg.buildingHeight[0], leg.buildingHeight[1])
      const depth = between(rand(), 6, 11)
      const setback = between(rand(), 0, 1.2)
      const capRoll = rand()
      out.push({
        legIndex: index,
        t: cursor + width / 2,
        side,
        width,
        depth,
        height,
        setback,
        colorIndex: Math.min(Math.floor(rand() * 4), 3),
        // 3棟に1棟くらいの割合で上に塊を載せる(屋上の設備・階段室)
        capHeight: capRoll < 0.34 ? between(rand(), 1.2, 3) : 0,
        awning: rand() < 0.55 ? between(rand(), 0.8, 1.6) : 0,
      })
      cursor += width + between(rand(), 0.2, 1.4)
    }
  }
  return out
}

/** 小物の寸法レンジ。すべて「小さくて単純」に寄せる(物量で見せるので個々は目立たせない) */
const PROP_DIMENSIONS: Record<PropKind, { depth: [number, number]; height: [number, number]; width: [number, number] }> =
  {
    // 電柱。垂直の線が一定間隔で入ると一点透視のリズムが一気に強くなる
    pole: { depth: [0.28, 0.38], height: [7, 9.5], width: [0.28, 0.38] },
    // 標識。細い柱に板が付く(板は描画側で足す)
    sign: { depth: [0.12, 0.18], height: [2.4, 3.4], width: [0.12, 0.18] },
    cone: { depth: [0.42, 0.6], height: [0.6, 0.85], width: [0.42, 0.6] },
    // 室外機。壁際に置くと建物の足元に情報が出る
    unit: { depth: [0.6, 0.95], height: [0.6, 1.0], width: [0.8, 1.3] },
    // 手すり。道に沿って長い横線が入り、パースの補助線になる
    rail: { depth: [0.1, 0.14], height: [0.9, 1.1], width: [2.5, 4.5] },
    bin: { depth: [0.55, 0.8], height: [0.9, 1.3], width: [0.55, 0.8] },
    // 段差(階段の踏面)。歩道の高低差を作る
    step: { depth: [1.2, 2.0], height: [0.18, 0.3], width: [1.4, 2.6] },
  }

/**
 * 電柱の間隔。**規則的に並ぶことに意味がある**ので、ランダムな小物とは別に置く。
 *
 * 一点透視では等間隔に並んだ垂直の柱がそのまま奥行きの目盛りになり、
 * ①の画で最も強く効いているリズムがこれ。ランダムに散らすと固まったり空いたりして
 * 目盛りにならない(最初は小物の1種類として散らしていて、実際にリズムが出なかった)
 */
const POLE_SPACING = 12

/** 区間ごとの小物の配合。ここを変えるだけで街の性格が動く。電柱は別枠なので入れない */
const KIND_WEIGHTS: ReadonlyArray<{ kind: PropKind; weight: number }> = [
  { kind: 'sign', weight: 2 },
  { kind: 'cone', weight: 2 },
  { kind: 'unit', weight: 3 },
  { kind: 'rail', weight: 2 },
  { kind: 'bin', weight: 2 },
  { kind: 'step', weight: 2 },
]

function pickKind(r: number): PropKind {
  const total = KIND_WEIGHTS.reduce((s, k) => s + k.weight, 0)
  let acc = r * total
  for (const k of KIND_WEIGHTS) {
    acc -= k.weight
    if (acc <= 0) return k.kind
  }
  return KIND_WEIGHTS[KIND_WEIGHTS.length - 1].kind
}

/**
 * 小物を歩道に散らす。**車道の上には置かない**(三角コーンだけ例外で車道側にはみ出す)。
 * 車道が物で埋まると、奥へ消える一本の道という一点透視の主線が切れてしまう
 */
function buildProps(leg: Leg, legIndex: number, start: number, end: number, rand: () => number): StreetProp[] {
  const out: StreetProp[] = []
  const span = end - start
  const count = Math.round(span * leg.propDensity)

  for (let i = 0; i < count; i++) {
    const t = start + rand() * span
    const side: Side = rand() < 0.5 ? -1 : 1
    const kind = pickKind(rand())
    const dim = PROP_DIMENSIONS[kind]

    // 歩道の帯(車道の縁 〜 壁面)の中に置く。コーンだけ車道側に少しはみ出す
    const inner = kind === 'cone' ? ROAD_HALF - 1.2 : ROAD_HALF + 0.25
    const outer = FACADE_X - 0.3
    const lateral = side * between(rand(), inner, outer)

    out.push({
      legIndex,
      t,
      lateral,
      kind,
      depth: between(rand(), dim.depth[0], dim.depth[1]),
      height: between(rand(), dim.height[0], dim.height[1]),
      width: between(rand(), dim.width[0], dim.width[1]),
      // 電柱・手すりは道に正対させる。それ以外だけ振る
      yaw: kind === 'pole' || kind === 'rail' ? 0 : between(rand(), -0.5, 0.5),
      colorIndex: Math.min(Math.floor(rand() * 4), 3),
      // 差し色は1割程度。看板・自販機のつもり
      accent: rand() < 0.1,
    })
  }
  return out
}

/**
 * 電柱を等間隔に並べる。左右交互に置くので、片側だけ柱の壁にならない。
 * 高さと太さだけ揺らして、間隔は揺らさない(揺らすと目盛りとして読めなくなる)
 */
function buildPoles(rand: () => number): StreetProp[] {
  const out: StreetProp[] = []
  const dim = PROP_DIMENSIONS.pole
  let i = 0

  for (let t = ROAD_START + 4; t < ROAD_END; t += POLE_SPACING, i++) {
    const side: Side = i % 2 === 0 ? -1 : 1
    const thickness = between(rand(), dim.depth[0], dim.depth[1])
    out.push({
      legIndex: resolveLeg(t).index,
      t,
      // 縁石のすぐ内側。車道の縁に沿って並ぶと消失点へ向かう線が一番強く出る
      lateral: side * (ROAD_HALF + 0.55),
      kind: 'pole',
      depth: thickness,
      height: between(rand(), dim.height[0], dim.height[1]),
      width: thickness,
      yaw: 0,
      colorIndex: Math.min(Math.floor(rand() * 4), 3),
      accent: false,
    })
  }
  return out
}

/**
 * 上部構造。**①の「上部は歩道橋が横切って画面を締める」の実装**。
 *
 * 一点透視で広角にすると画面上部が空だけになりやすく、そこが抜けると
 * 「囲む」構図ではなく「開けた道」になってしまう。等間隔で必ず横切らせる
 */
function buildOverheads(legs: readonly Leg[], rand: () => number): Overhead[] {
  const out: Overhead[] = []
  let cursor = ROAD_START + 8

  while (cursor < ROAD_END) {
    const { index } = resolveLeg(cursor)
    const leg = legs[Math.min(index, legs.length - 1)]
    const legIndex = index
    const roll = rand()
    // 歩道橋を主役にしつつ、細い部材(電線・梁・横断幕)を混ぜて単調さを避ける
    const kind: Overhead['kind'] = roll < 0.42 ? 'bridge' : roll < 0.62 ? 'beam' : roll < 0.84 ? 'wire' : 'banner'
    out.push({
      legIndex,
      t: cursor,
      kind,
      height: kind === 'bridge' ? between(rand(), 6.2, 7.4) : between(rand(), 5.4, 8.6),
      thickness: kind === 'bridge' ? between(rand(), 0.5, 0.75) : kind === 'wire' ? 0.09 : between(rand(), 0.3, 0.5),
      span: kind === 'bridge' ? between(rand(), 2.6, 3.6) : kind === 'banner' ? between(rand(), 0.2, 0.35) : 0.4,
      colorIndex: Math.min(Math.floor(rand() * 4), 3),
    })
    // 間隔を ±25% ゆらす。完全な等間隔だと機械的に見える
    cursor += leg.overheadSpacing * between(rand(), 0.75, 1.25)
  }
  return out
}

/** 街ぜんぶを生成する。区間ごとにシードを分けているので、1区間だけ調整しても他が変わらない */
export function buildStreet(legs: readonly Leg[] = LEGS): Street {
  const buildings: Building[] = []
  const props: StreetProp[] = []
  const overheads: Overhead[] = []

  // 建物・電柱・上部構造は道全体で一本に通す(区間で切ると境界で食い合う / リズムが崩れる)
  buildings.push(...buildBuildings(legs, mulberry32(STREET_SEED)))
  overheads.push(...buildOverheads(legs, mulberry32(STREET_SEED ^ 0x51ed)))
  props.push(...buildPoles(mulberry32(STREET_SEED ^ 0x2f13)))

  // 小物は点として散らすだけなので区間ごとでよい。
  // 区間ごとにシードを分けておくと、1区間の密度を触っても他の区間の配置が動かない
  legs.forEach((leg, i) => {
    // 最初の区間は助走ぶん手前から、最後の区間は走り抜けぶん先まで散らす。
    // 一点透視では常に70ユニット以上先が見えているので、
    // 最終区間の終わりで街が終わると画面の奥に穴が空く
    const start = i === 0 ? ROAD_START : legStart(i)
    const end = i === legs.length - 1 ? ROAD_END : legStart(i + 1)
    props.push(...buildProps(leg, i, start, end, mulberry32(leg.seed ^ 0x9e37)))
  })

  return { buildings, props, overheads }
}

/** 上部構造の最大の隙間。**大きすぎると空に抜けて囲む構図が壊れる**のでテストで縛る */
export function maxOverheadGap(
  overheads: readonly Overhead[],
  start: number = ROAD_START,
  end: number = ROAD_END
): number {
  if (overheads.length === 0) return end - start
  const ts = overheads.map((o) => o.t).sort((a, b) => a - b)
  let max = ts[0] - start
  for (let i = 1; i < ts.length; i++) max = Math.max(max, ts[i] - ts[i - 1])
  return Math.max(max, end - ts[ts.length - 1])
}
