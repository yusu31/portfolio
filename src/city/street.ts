// 沿道の中身の生成。**「囲む構図」と「密度」を作る唯一の仕組み**(設計書 §1.2 / §5.3)。
//
// 移植元は `proto/b/street.ts`。生成の骨組み(道に沿った距離 `t` と横位置 `lateral` の2軸で置く /
// 完全に決定的 / 純データでワールド座標は描画側が解く)は B のままで、変えたのは3点:
//
//   1. **除外区間(`exclusions`)を受け取れるようにした**(§1.2 装置1)。
//      街区フェーズにだけ建物が立ち、敷地では街の壁が消える
//   2. `Leg` → `Chapter`。街の性格は `CHAPTERS[i].street` から引く(§2.1)
//   3. `legIndex` → `chapterIndex`
//
// ⚠ **除外の実装方法が設計の要点**(§1.2)。区間ごとに生成すると
//   シード連鎖が切れて境界で建物が食い合う(B が実際に踏んだ失敗)。
//   だから**生成は道の端から端まで一本のカーソルで通し、後からフィルタで抜く**。
//   「除外区間を渡しても生き残った建物が1つも動かない」ことを street.test.ts で縛っている。
import {
  CHAPTERS,
  FACADE_X,
  ROAD_END,
  ROAD_HALF,
  ROAD_START,
  chapterStart,
  chapterLength,
  openingRanges,
  resolveChapter,
  type Chapter,
  type Span,
} from './route'

/**
 * 街全体のシード。**建物と上部構造は章で切らず道全体で一本に生成する**。
 *
 * B は最初これを区間ごとに分けていて、区間の境界で建物どうしが食い合った(テストが検出)。
 * 章はパラメータ(高さ・幅・間隔)の供給元にとどめ、並びは道に沿って連続させる
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
  chapterIndex: number
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

/** 小物の種類。参考例①で名指しされていたものをそのまま項目にしてある */
export type PropKind = 'pole' | 'sign' | 'cone' | 'unit' | 'rail' | 'bin' | 'step'

export type StreetProp = {
  chapterIndex: number
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
  chapterIndex: number
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
 * 建物が道に沿って占める区間。除外の判定はこの footprint で行う
 * (中心だけで判定すると、境界の外に中心がある建物が幅の半分だけ開口へ突き出す)
 */
export function buildingFootprint(b: Building): Span {
  return { start: b.t - b.width / 2, end: b.t + b.width / 2 }
}

/**
 * 除外区間に触れた建物を落とす。**境界を跨ぐ建物は落とさずに切り詰める**ので、
 * 街の壁が開口の入口でぴったり途切れる(落とすだけだと壁の終わりが建物1棟ぶん手前まで下がる)。
 *
 * 切り詰めた結果これより細くなったら落とす。板のような建物が残るのを避けるため
 */
const MIN_TRIMMED_WIDTH = 2.0

function clipBuilding(b: Building, exclusions: readonly Span[]): Building | null {
  let { start, end } = buildingFootprint(b)

  for (const ex of exclusions) {
    if (end <= ex.start || start >= ex.end) continue
    // 完全に内側 → 落とす。除外区間(47)より広い建物は無いので前後同時の切り詰めは起きない
    if (start >= ex.start && end <= ex.end) return null
    if (start < ex.start && end > ex.end) return null
    if (end > ex.start && start < ex.start) end = ex.start
    else start = ex.end
  }

  const width = end - start
  if (width < MIN_TRIMMED_WIDTH) return null
  if (width === b.width) return b
  return { ...b, t: (start + end) / 2, width }
}

/**
 * 建物を道の両側に並べる。**道の端から端まで一本のカーソルで進める**ので、
 * 章の境界でも建物が食い合わない。
 *
 * 左右は別々のカーソルなので向かい合う建物の切れ目が揃わず、
 * 「門」のように道が区切られて見えるのを避けられる。
 * 高さ・幅はカーソル位置の章から引くので、街の性格は章ごとに変わる
 */
function buildBuildings(chapters: readonly Chapter[], rand: () => number): Building[] {
  const out: Building[] = []

  for (const side of [-1, 1] as Side[]) {
    let cursor = ROAD_START
    // 右側だけ1棟ぶんずらして始める。左右の切れ目が最初から揃わないようにするため
    if (side === 1) cursor -= between(rand(), 2, 6)

    while (cursor < ROAD_END) {
      const { index } = resolveChapter(cursor)
      const profile = chapters[Math.min(index, chapters.length - 1)].street
      const width = between(rand(), profile.buildingWidth[0], profile.buildingWidth[1]) + between(rand(), 1.5, 4)
      const height = between(rand(), profile.buildingHeight[0], profile.buildingHeight[1])
      const depth = between(rand(), 6, 11)
      const setback = between(rand(), 0, 1.2)
      const capRoll = rand()
      out.push({
        chapterIndex: index,
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
 * 一点透視では等間隔に並んだ垂直の柱がそのまま奥行きの目盛りになる。
 * ランダムに散らすと固まったり空いたりして目盛りにならない
 * (B は最初これを小物の1種類として散らしていて、実際にリズムが出なかった)
 */
const POLE_SPACING = 12

/** 小物の配合。ここを変えるだけで街の性格が動く。電柱は別枠なので入れない */
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
function buildProps(
  chapter: Chapter,
  chapterIndex: number,
  start: number,
  end: number,
  rand: () => number
): StreetProp[] {
  const out: StreetProp[] = []
  const span = end - start
  const count = Math.round(span * chapter.street.propDensity)

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
      chapterIndex,
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
      chapterIndex: resolveChapter(t).index,
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
 * 上部構造。**参考例①の「上部は歩道橋が横切って画面を締める」の実装**。
 *
 * 一点透視で広角にすると画面上部が空だけになりやすく、そこが抜けると
 * 「囲む」構図ではなく「開けた道」になってしまう。等間隔で必ず横切らせる。
 *
 * ⚠ **敷地フェーズでこれを照明塔・防球ネットへ差し替えるのが §1.2 装置4**だが、それは PR 3。
 *   PR 2 では B と同じく道全体に置く(だから `maxOverheadGap` も道全体で測れる)
 */
function buildOverheads(chapters: readonly Chapter[], rand: () => number): Overhead[] {
  const out: Overhead[] = []
  let cursor = ROAD_START + 8

  while (cursor < ROAD_END) {
    const { index } = resolveChapter(cursor)
    const profile = chapters[Math.min(index, chapters.length - 1)].street
    const roll = rand()
    // 歩道橋を主役にしつつ、細い部材(電線・梁・横断幕)を混ぜて単調さを避ける
    const kind: Overhead['kind'] = roll < 0.42 ? 'bridge' : roll < 0.62 ? 'beam' : roll < 0.84 ? 'wire' : 'banner'
    out.push({
      chapterIndex: index,
      t: cursor,
      kind,
      height: kind === 'bridge' ? between(rand(), 6.2, 7.4) : between(rand(), 5.4, 8.6),
      thickness: kind === 'bridge' ? between(rand(), 0.5, 0.75) : kind === 'wire' ? 0.09 : between(rand(), 0.3, 0.5),
      span: kind === 'bridge' ? between(rand(), 2.6, 3.6) : kind === 'banner' ? between(rand(), 0.2, 0.35) : 0.4,
      colorIndex: Math.min(Math.floor(rand() * 4), 3),
    })
    // 間隔を ±25% ゆらす。完全な等間隔だと機械的に見える
    cursor += profile.overheadSpacing * between(rand(), 0.75, 1.25)
  }
  return out
}

export type StreetOptions = {
  /**
   * 建物を置かない区間(§1.2 装置1)。既定は `openingRanges()` = 各章の 導入〜章末。
   *
   * **生成そのものは除外区間に影響されない**(全域で連続に回してから抜く)ので、
   * ここを変えても街区に残る建物は1棟も動かない
   */
  exclusions?: readonly Span[]
  chapters?: readonly Chapter[]
}

/** 街ぜんぶを生成する */
export function buildStreet(options: StreetOptions = {}): Street {
  const chapters = options.chapters ?? CHAPTERS
  const exclusions = options.exclusions ?? openingRanges()

  const props: StreetProp[] = []

  // 建物・電柱・上部構造は道全体で一本に通す(章で切ると境界で食い合う / リズムが崩れる)
  const buildings = buildBuildings(chapters, mulberry32(STREET_SEED))
    .map((b) => clipBuilding(b, exclusions))
    .filter((b): b is Building => b !== null)
  const overheads = buildOverheads(chapters, mulberry32(STREET_SEED ^ 0x51ed))
  props.push(...buildPoles(mulberry32(STREET_SEED ^ 0x2f13)))

  // 小物は点として散らすだけなので章ごとでよい。
  // 章ごとにシードを分けておくと、1章の密度を触っても他章の配置が動かない
  chapters.forEach((chapter, i) => {
    // 最初の章は助走ぶん手前から、最後の章は走り抜けぶん先まで散らす。
    // 一点透視では常に70ユニット以上先が見えているので、
    // 最終章の終わりで街が終わると画面の奥に穴が空く
    const start = i === 0 ? ROAD_START : chapterStart(i)
    const end = i === chapters.length - 1 ? ROAD_END : chapterStart(i) + chapterLength(i)
    props.push(...buildProps(chapter, i, start, end, mulberry32(chapter.street.seed ^ 0x9e37)))
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

/**
 * 建物が道に沿って途切れている区間。**「街の壁が消える」が実際に成立しているか**を測る。
 *
 * 除外区間を渡したつもりでも、切り詰めの結果として壁が残っていれば開口にならない。
 * 開口の長さは設計書 §1.2 の「≥ 45」を満たす必要があり、テストで縛る。
 * 片側ずつ測るのは、左右で切れ目が揃っていない(意図的にずらしてある)ため
 */
export function buildingGaps(buildings: readonly Building[], side: Side): Span[] {
  const sorted = buildings.filter((b) => b.side === side).sort((a, b) => a.t - b.t)
  const out: Span[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = buildingFootprint(sorted[i - 1]).end
    const currStart = buildingFootprint(sorted[i]).start
    if (currStart > prevEnd) out.push({ start: prevEnd, end: currStart })
  }
  return out
}
