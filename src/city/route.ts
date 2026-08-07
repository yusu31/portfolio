// `/city` の道と章構成。設計書 docs/plans/2026-08-07-rebuild-city-journey.md の §1 / §5.3 / §6。
//
// 移植元は `proto/b/route.ts`(見た目の本体)。書き換えたのは次の3点だけで、
// 道の式(下り + うねり + 緩いカーブ)そのものは B のまま使っている:
//
//   1. `TOTAL_LENGTH` 280 → 368(4章 × 92) / `OVERALL_DROP` 26 → 34
//      (u あたりの勾配を B と同じに保つ: 26 × 368/280 = 34.2 → 34)
//   2. `LEGS`(物語ラベルだけの区間) → `CHAPTERS`(1章 = 4フェーズ)。
//      **街区フェーズが物語、敷地フェーズがセクション**という二層構造(§2.1)
//   3. `HERO_*`(人物アバター)を削除。主役は球体のみ(§5.3「捨てる」)
//
// 座標系: 道は -Z 方向へ進む。`t` は道に沿った距離(0 〜 TOTAL_LENGTH)。
//
// ⚠ カメラの追従4値はここには無い。`camera.ts` が持つ(B は route.ts に同居していたが、
//   /city ではカメラが区間ごとにブレンドされるので分けた)。

/** 画角。**広角であることが「強い一点透視」の実体**(B と同値。A の 28 とは真逆) */
export const CAMERA_FOV = 55

/**
 * サポートする最小アスペクト比(2026-08-07 ユーザー確認済み)。
 *
 * 設計書 §6 Step 2 は 16:9(水平半画角 42.79°)を前提に全ての角度計算をしていたが、
 * **QA スクリプトのビューポートは 1280×800 = 16:10**(`scripts/qa-proto-shots.mjs`)で、
 * proto/c も `QA_ASPECT = 1280/800` を画面内判定の基準に定数化している。
 * 16:9 のままにすると設計値と実測値が最初からズレるので、**計測環境と一致させた**。
 *
 * これより縦長の画面は既存の `responsiveFov`(`components/canvas/GlobalCanvas.tsx`)と
 * 同じ考え方で垂直画角を広げて部分補償する対象であり、**テストでは縛らない**。
 */
export const MIN_ASPECT = 1280 / 800

/** 水平半画角(度)。垂直画角とアスペクト比から決まる */
export function halfHorizontalFovDeg(aspect: number = MIN_ASPECT): number {
  return (Math.atan(Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * aspect) * 180) / Math.PI
}

/**
 * 画面端の横位置と前方距離の比 `d / z`。**施設・的・ランドマークの配置計算はすべてこれを通る**。
 *
 * 16:10 では 0.8329。つまり横位置 `d` の物体は **前方 `d / 0.8329` より遠いときだけ画面に入る**。
 * 設計書 §1.3 / §2.3 の角度計算をこの値でやり直すのが §6 Step 2 の中身。
 */
export function lateralPerDepth(aspect: number = MIN_ASPECT): number {
  return Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * aspect
}

/**
 * 横位置 `lateral` の物体が画面内に入り始める前方距離。
 * `lateralPerDepth` の逆で、「的は前方いくつから見えているか」を直接返す(§2.3)
 */
export function onScreenDepth(lateral: number, aspect: number = MIN_ASPECT): number {
  return Math.abs(lateral) / lateralPerDepth(aspect)
}

/** 補償後の垂直画角の上限。これ以上広げると歪みが目に見える */
const MAX_FOV = 78

/**
 * `MIN_ASPECT` より縦長の画面で、水平視野の欠けを垂直画角の拡大で部分補償する。
 *
 * 手法は既存の `components/canvas/GlobalCanvas.tsx` の `responsiveFov` と同じ(平方根で
 * 折半する Hor+ 方式)だが、**基準を 16:9 ではなく `MIN_ASPECT`(16:10)に取り直してある**。
 * あちらは module top-level で `window.matchMedia` を読むので import できず、式だけを移した。
 *
 * 完全補償(水平画角を保つ)にしないのは、4:3 で fov が 69.5 まで上がってしまい、
 * **§3.5 が「落下とスパイクの一瞬だけ」に使うと決めた 68 を常用値が超える**ため。
 * 一点透視の強さが常時変わるほうが、施設が少し切れることより害が大きい
 */
export function responsiveFov(aspect: number): number {
  if (aspect >= MIN_ASPECT) return CAMERA_FOV
  const t = Math.tan((CAMERA_FOV * Math.PI) / 360) * Math.sqrt(MIN_ASPECT / aspect)
  return Math.min((Math.atan(t) * 360) / Math.PI, MAX_FOV)
}

/** 車道の半幅 */
export const ROAD_HALF = 4.2
/** 歩道の幅。建物はこの外側から立ち上がる */
export const SIDEWALK_WIDTH = 1.8
/** 建物の壁面が立つ位置(道の中心からの距離)。街区フェーズにだけ建物が立つ(§1.2 装置1) */
export const FACADE_X = ROAD_HALF + SIDEWALK_WIDTH

/** 道の全長。4章 × 92(§1.1) */
export const TOTAL_LENGTH = 368

/** スクロール開始点より手前に伸ばす長さ。カメラは球の後ろにいるので、ここに道が無いと足元が抜ける */
export const ROAD_LEAD = 16

/**
 * スクロール終端より先に伸ばす長さ。
 * **一点透視では常に70ユニット以上先が見えている**ので、終端で道が切れると
 * 「奥へ消える」構図の本体が消える。B と同値(§1.4)
 */
export const ROAD_RUNOUT = 95

/** 実際に生成する道の範囲 */
export const ROAD_START = -ROAD_LEAD
export const ROAD_END = TOTAL_LENGTH + ROAD_RUNOUT

/**
 * 全体としての下り量。B の 26 を経路長の比で引き直した値(26 × 368/280 = 34.2)。
 * **u あたりの勾配を B と同じに保つ**のが狙いで、絵の勾配感は B と変わらない
 */
const OVERALL_DROP = 34
/** 坂のうねり。振幅は据え置き。周期は u 基準なので経路長に応じて自動で伸びる(§1.5) */
const UNDULATION = 3.4
/** 横カーブの振幅。**大きくすると消失点が画面中央から外れて一点透視が崩れる**(テストで上限を縛る) */
const CURVE_AMPLITUDE = 5.0

/**
 * 路面の高さ。全体としては下りつつ、緩くうねる。
 * 下り坂にしているのは、上り坂だと奥が壁のように立ち上がって「奥へ消える」感じが出ないため。
 * **下り坂であることには §7 で追加の役目がある**(落下の受け皿)
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

const cross = (a: readonly number[], b: readonly number[]): [number, number, number] => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/**
 * 進行方向(単位ベクトル)。中心差分で求める。
 * 解析微分にしないのは、`elevationAt` / `lateralAt` の式を後から差し替えても
 * 接線の導出を書き直さなくて済むようにするため
 */
export function roadTangent(t: number): [number, number, number] {
  const h = 0.05
  return normalize(sub(roadCenter(t + h), roadCenter(t - h)))
}

/** 道の横方向(単位ベクトル)。進行方向とワールドUpの外積なので、坂でも水平に保たれる */
export function roadSide(t: number): [number, number, number] {
  return normalize(cross(roadTangent(t), [0, 1, 0]))
}

/** 道の中心から横に `offset` ずれた路面上の点。建物・施設・白線の配置がすべてこれを通る */
export function roadPoint(t: number, offset: number): [number, number, number] {
  const c = roadCenter(t)
  const s = roadSide(t)
  return [c[0] + s[0] * offset, c[1] + s[1] * offset, c[2] + s[2] * offset]
}

// --- 章とフェーズ ---------------------------------------------------------

/**
 * 1章を構成する4フェーズ(§1.1)。**街の圧が解けて、また閉じる**のがこの世界の呼吸になる。
 *
 * - `street` 街区 … 建物が左右から画面を挟む。遠景に次の施設の照明塔が見えている
 * - `open`   導入 … 敷地の入口。**4装置が同時に発火する10ユニット**(§1.2)
 * - `venue`  敷地 … コートを並走。ボールの見せ場
 * - `exit`   退出 … フェンスが閉じ、街の建物が戻ってくる
 */
export type PhaseId = 'street' | 'open' | 'venue' | 'exit'

export type Phase = {
  id: PhaseId
  length: number
}

/**
 * 章。**二層構造**を1つの型で持つ(§2.1):
 * `story` が街区フェーズで語られる物語、`section` が敷地フェーズで見せるセクション。
 * この2つは競合しない。層が違う
 */
export type Chapter = {
  id: string
  /** 街区の物語(体育教師 → エンジニア) */
  story: string
  /** 敷地のセクション(ポートフォリオの中身) */
  section: string
  /** 敷地で起こる動詞(Lempens の「区間ごとの動詞」) */
  verb: string
  /** PALETTES のインデックス */
  paletteIndex: number
  phases: readonly Phase[]
}

/** 標準の4フェーズ。1章 = 45 + 10 + 28 + 9 = 92(§1.1) */
const STANDARD_PHASES: readonly Phase[] = [
  { id: 'street', length: 45 },
  { id: 'open', length: 10 },
  { id: 'venue', length: 28 },
  { id: 'exit', length: 9 },
]

/**
 * 4章。**街を歩きながら来歴を語り、施設に着いたら作品を見せる**(§2.1)。
 * 街の性格(パレット)が章ごとに変わっていくことが、そのまま時間の経過になる。
 *
 * 第4章だけ `exit` を持たない。敷地が終着プラザ(37)で、旅がそこで終わるため(§1.4)
 */
export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'projects',
    story: '教えていた場所',
    section: 'Projects',
    verb: '蹴り込む',
    paletteIndex: 0,
    phases: STANDARD_PHASES,
  },
  {
    id: 'skills',
    story: '走らせて、走っていた',
    section: 'Skills',
    verb: '撃ち上げる',
    paletteIndex: 1,
    phases: STANDARD_PHASES,
  },
  {
    id: 'about',
    story: '独学の時間',
    section: 'About',
    verb: '受けて、上げる',
    paletteIndex: 2,
    phases: STANDARD_PHASES,
  },
  {
    id: 'contact',
    story: 'いま作っている場所',
    section: 'Contact',
    verb: '着地する',
    paletteIndex: 3,
    // 終着プラザ。退出せずここで旅が終わるので venue を伸ばして 45+10+37 = 92 に揃える
    phases: [
      { id: 'street', length: 45 },
      { id: 'open', length: 10 },
      { id: 'venue', length: 37 },
    ],
  },
]

/** 章の長さ */
export function chapterLength(index: number): number {
  const c = CHAPTERS[Math.min(Math.max(index, 0), CHAPTERS.length - 1)]
  return c.phases.reduce((s, p) => s + p.length, 0)
}

/** 各章の開始距離(累積)。`CHAPTERS[i]` は `chapterStart(i)` から始まる */
export function chapterStart(index: number): number {
  let acc = 0
  for (let i = 0; i < index && i < CHAPTERS.length; i++) acc += chapterLength(i)
  return acc
}

/** 全章の合計長。`TOTAL_LENGTH` と一致させておく(テストで確認する) */
export function totalChapterLength(): number {
  let acc = 0
  for (let i = 0; i < CHAPTERS.length; i++) acc += chapterLength(i)
  return acc
}

/** フェーズの絶対区間 `[start, end)`。存在しないフェーズ(第4章の exit)は null */
export function phaseRange(chapterIndex: number, phase: PhaseId): { start: number; end: number } | null {
  const c = CHAPTERS[chapterIndex]
  if (!c) return null
  let acc = chapterStart(chapterIndex)
  for (const p of c.phases) {
    if (p.id === phase) return { start: acc, end: acc + p.length }
    acc += p.length
  }
  return null
}

export type ChapterState = {
  index: number
  /** その章の中での進み具合 0〜1 */
  local: number
}

/** 距離 → どの章か。パレットと UI の切り替えに使う */
export function resolveChapter(t: number): ChapterState {
  const clamped = Math.min(Math.max(t, 0), totalChapterLength())
  let acc = 0
  for (let i = 0; i < CHAPTERS.length; i++) {
    const end = acc + chapterLength(i)
    if (clamped < end || i === CHAPTERS.length - 1) {
      return { index: i, local: Math.min(Math.max((clamped - acc) / chapterLength(i), 0), 1) }
    }
    acc = end
  }
  return { index: CHAPTERS.length - 1, local: 1 }
}

export type PhaseState = {
  chapterIndex: number
  phase: PhaseId
  /** そのフェーズの中での進み具合 0〜1 */
  local: number
}

/**
 * 距離 → どのフェーズか。
 * **街の生成・縁石・フェンス・上部構造の切り替えが全部これを見る**ので(§1.2)、
 * 骨格の段階から置いておく
 */
export function resolvePhase(t: number): PhaseState {
  const clamped = Math.min(Math.max(t, 0), totalChapterLength())
  let acc = 0
  for (let i = 0; i < CHAPTERS.length; i++) {
    for (const p of CHAPTERS[i].phases) {
      const end = acc + p.length
      const isLast = i === CHAPTERS.length - 1 && p === CHAPTERS[i].phases[CHAPTERS[i].phases.length - 1]
      if (clamped < end || isLast) {
        return { chapterIndex: i, phase: p.id, local: Math.min(Math.max((clamped - acc) / p.length, 0), 1) }
      }
      acc = end
    }
  }
  return { chapterIndex: CHAPTERS.length - 1, phase: 'venue', local: 1 }
}

/**
 * スクロール1ページあたりの前進量。② の 10.4 に合わせる(街を歩く速度)。
 *
 * B は `PAGES = LEGS.length`(= 70ユニット/ページ)でスクロールが速かったが、
 * ② は 10.4 で、設計書 §4.2 が「通常 10.4」と書いているのは ② の値。
 * **ワープ(PR 10)を入れると実スクロール距離が 293 に縮んで PAGES ≈ 30 になる**(§4.3)。
 * ここではまだワープが無いので全長そのままで割る
 */
export const UNITS_PER_PAGE = 10.4

/** スクロールのページ数。ワープ導入(PR 10)で約30へ縮む */
export const PAGES = Math.round(TOTAL_LENGTH / UNITS_PER_PAGE)

/**
 * スクロール offset(0〜1) → 道に沿った距離。
 *
 * **ここが Lempens 式ワープの唯一の入口になる**(§4.2)。いまは線形だが、PR 10 で
 * 区間ごとに前進量を変える区分非線形写像に差し替える(色は `t` の関数なので影響を受けない)
 */
export function distanceAt(offset: number): number {
  return Math.min(Math.max(offset, 0), 1) * TOTAL_LENGTH
}

// --- QA用クエリ -----------------------------------------------------------
// A / B / C で確立した運用をそのまま採る(§11)。**検証したい違いはクエリで切り替えられるようにする**。
// `?leg=N` を付けるとスクロールを見なくなるのでカメラが最初のフレームから静止し、
// スクリーンショットが2回目のポーリングで収束する(この開発機で唯一収束する手順)

export const LEG_QUERY = 'leg'
export const AT_QUERY = 'at'
export const PHASE_QUERY = 'ph'
export const OUTLINE_QUERY = 'ol'
export const WARP_QUERY = 'warp'
export const LANDMARK_QUERY = 'land'

const PHASE_IDS: readonly PhaseId[] = ['street', 'open', 'venue', 'exit']

/** `?leg=2` → 2。未指定・不正値は null(スクロール駆動のまま) */
export function parseLegOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get(LEG_QUERY)
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return Math.min(Math.max(Math.round(parsed), 0), CHAPTERS.length - 1)
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
 * `?ph=venue` → 'venue'。未指定・不正値は null(章まるごとを `?at` で割る)。
 * **フェーズを直接指定できることが「開ける型」の QA の本体**になる(§1.2 の4装置を1つずつ見る)
 */
export function parsePhaseOverride(search: string): PhaseId | null {
  const raw = new URLSearchParams(search).get(PHASE_QUERY)
  if (raw === null || raw === '') return null
  return PHASE_IDS.includes(raw as PhaseId) ? (raw as PhaseId) : null
}

/** `?ol=0` で輪郭線を消す。既定は有効。**採否の判定(PR 5)に必須のノブ**(§9) */
export function parseOutlineEnabled(search: string): boolean {
  return parseFlag(search, OUTLINE_QUERY)
}

/** `?warp=0` でワープ無効。経路を連続で確認したいときに使う(PR 10 で実装が入る) */
export function parseWarpEnabled(search: string): boolean {
  return parseFlag(search, WARP_QUERY)
}

/** `?land=0` でランドマーク(照明塔)非表示。遠景予告の効き目を比べる(PR 6 で実装が入る) */
export function parseLandmarksEnabled(search: string): boolean {
  return parseFlag(search, LANDMARK_QUERY)
}

function parseFlag(search: string, key: string): boolean {
  const raw = new URLSearchParams(search).get(key)
  if (raw === null || raw === '') return true
  return raw !== '0' && raw !== 'false'
}

/**
 * `?leg=N` があれば、そこに対応する距離を返す。無ければ null(スクロール駆動)。
 * `?ph=` を併せて指定すると、その章のそのフェーズの中を `?at=` で割る
 */
export function overrideDistance(search: string): number | null {
  const leg = parseLegOverride(search)
  if (leg === null) return null
  const at = parseAtOverride(search)
  const phase = parsePhaseOverride(search)
  if (phase !== null) {
    const range = phaseRange(leg, phase)
    if (range) return range.start + (range.end - range.start) * at
  }
  return chapterStart(leg) + chapterLength(leg) * at
}

/** ブラウザ外(テスト・SSR)では常に空。`typeof window` 分岐を1か所に集める */
export function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}
