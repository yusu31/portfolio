// 章の定義とカット送りの解決。**カメラは連続移動しない**のがプロトタイプAの骨子。
//
// 現行シーン(/scroll-poc)はボールを密着追従する1本のカメラで世界を舐めていく設計だが、
// 参考例②③④はどれも「引いた決め打ちの構図で箱庭を外から見る」構成だった
// (docs/references/2026-08-02_x-4examples.md の共通点2)。
// そこでスクロールを**カット送り**として扱う: 章の中ではカメラはほぼ止まり(微小ドリフトのみ)、
// 章の境界でカット(位置・パレット・箱庭ごと切り替わる)。
//
// **アクティブな章の箱庭だけを描画し、箱庭は常にワールド原点に置く**。
// カットは「カメラ位置・パレット・中身がまるごと入れ替わること」であって
// 世界の中を移動することではないので、箱庭を別々の座標に並べる必要がない。
// 原点に固定すると、シャドウカメラを1箱庭ぶん(±14)の狭さに保てて影が鮮明になり、
// キーライトのターゲット合わせも不要になる(ProtoAScene.tsx)。

export type ChapterId = 'gym' | 'field' | 'court' | 'desk'

/** カメラの決め打ち構図。箱庭中心からの球座標で持つ */
export type CameraCut = {
  /** 方位角(度)。0でZ+方向から見る */
  azimuth: number
  /** 仰角(度)。参考例はどれも俯瞰なので25〜50の範囲 */
  elevation: number
  /** 箱庭中心からの距離。fovが狭い(28°)ので大きめの値でアイソメ風になる */
  distance: number
  /** 注視点の高さ(箱庭の地面が y=0) */
  lookY: number
  /** 章の中でのドリフト量。カットを崩さない範囲で画に生気を与える */
  driftAzimuth: number
  driftDistance: number
}

export type Chapter = {
  id: ChapterId
  /** UIに出す章タイトル */
  title: string
  caption: string
  /** パレット(PALETTES)のインデックス */
  paletteIndex: number
  cut: CameraCut
  /** 小物散布のシード。章ごとに変えて配置を変える */
  seed: number
  /** 散布する小物の数。**密度がこの試作の主眼**なので下限をテストで縛る */
  propCount: number
  /** 主役(人物とボール)の立ち位置 [x, z]。中央の除外矩形の中に入れる */
  heroPos: readonly [number, number]
  /** 主役の向き(ラジアン) */
  heroRotY: number
}

/**
 * 箱庭の一辺(ワールド単位)。地面・土台・小物散布・シャドウカメラがすべてこの値から導出される。
 * カメラ距離40 / fov28 だと画面横幅に収まるのが約32ユニットなので、
 * 22 は「箱庭が画面の7割弱を占め、周囲に余白が残る」大きさ
 */
export const DIORAMA_SIZE = 22

/**
 * カメラの画角。狭いほど遠近が圧縮されてアイソメトリックに近づく。
 * 参考例②③④はどれもアイソメ寄りの俯瞰だった
 */
export const CAMERA_FOV = 28

/**
 * 主役(人物)の身長。**共通原則2「主役を画面の1/4以下に収める」を数値で守るための定数**で、
 * カメラ距離と対にして見かけの大きさをテストで縛っている(chapters.test.ts)
 */
export const HERO_HEIGHT = 2.2

/**
 * 主役が画面の高さに占める割合。パースの縮小は無視した上限値
 * (実際は注視点より手前/奥にぶれるので、これより小さくなる側にしか動かない)
 */
export function apparentHeroFraction(chapter: Chapter, local: number = 1): number {
  const d = chapter.cut.distance + chapter.cut.driftDistance * Math.min(Math.max(local, 0), 1)
  const visibleHeight = 2 * d * Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180)
  return HERO_HEIGHT / visibleHeight
}

/**
 * 4章。体育館 → 校庭 → 街のコート → デスクで「体育教師 → エンジニア」を辿る。
 * パレットも朝 → 夕 → 薄暮 → 夜と進むので、色の切替がそのまま時間の経過として読める
 */
export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'gym',
    title: '体育館',
    caption: '教えていた場所',
    paletteIndex: 0,
    // 少し斜めから見下ろす標準的なジオラマ構図。最初の章なので素直に見せる
    cut: { azimuth: 34, elevation: 33, distance: 41, lookY: 1.4, driftAzimuth: 5, driftDistance: -2.5 },
    seed: 1207,
    propCount: 58,
    heroPos: [-1.6, 3.2],
    heroRotY: Math.PI,
  },
  {
    id: 'field',
    title: '校庭',
    caption: '走らせて、走っていた',
    paletteIndex: 1,
    // 逆側から低めに。太陽が低い Golden パレットと合わせて影を長く見せる
    cut: { azimuth: -52, elevation: 27, distance: 45, lookY: 1.2, driftAzimuth: 7, driftDistance: -3 },
    seed: 4431,
    propCount: 66,
    heroPos: [1.8, 2.2],
    heroRotY: -0.6,
  },
  {
    id: 'court',
    title: 'コート',
    caption: '独学の時間',
    paletteIndex: 2,
    // 参考例③に寄せて仰角を上げる。俯瞰が強いほど床(=情報を乗せた面)の面積が増える
    cut: { azimuth: 18, elevation: 43, distance: 38, lookY: 1.6, driftAzimuth: -6, driftDistance: -2 },
    seed: 8802,
    propCount: 72,
    heroPos: [0.4, 1.8],
    heroRotY: Math.PI * 0.92,
  },
  {
    id: 'desk',
    title: 'デスク',
    caption: 'いま作っている場所',
    paletteIndex: 3,
    // 参考例④(Katamari)の真俯瞰寄り。小物の物量で画を持たせる章なので一番寄る
    cut: { azimuth: -22, elevation: 51, distance: 35, lookY: 1.5, driftAzimuth: 6, driftDistance: -2.5 },
    seed: 6519,
    propCount: 78,
    // デスクマット(x -6.6〜6.6 / z -5.7〜5.7)の上に立たせる
    heroPos: [-1.4, 2.6],
    heroRotY: Math.PI * 1.05,
  },
]

/** カット解決の結果 */
export type CutState = {
  /** 何章目か */
  index: number
  /** その章の中での進み具合 0〜1 */
  local: number
}

/**
 * スクロールoffset(0〜1) → カット。章は等分。
 *
 * 連続補間を**しない**のが要点で、index が変わった瞬間にカメラも箱庭もパレットも
 * すべて入れ替わる(=カット)。境界をまたぐブレンドを入れないのは、
 * 参考例が「1つの決め打ち構図を見せきる」設計だったため(なめらかにすると現行シーンに戻る)
 */
export function resolveCut(offset: number, chapterCount: number = CHAPTERS.length): CutState {
  const n = Math.max(1, Math.floor(chapterCount))
  const u = Math.min(Math.max(offset, 0), 1)
  const scaled = u * n
  // u=1 ちょうどで index が範囲外になるのでクランプする(最終章の local は 1 に張り付く)
  const index = Math.min(Math.floor(scaled), n - 1)
  return { index, local: Math.min(Math.max(scaled - index, 0), 1) }
}

/** QA用クエリ。`?ch=2` で章を直接指定、`?cut=0.8` で章の中の位置を指定 */
export const CHAPTER_QUERY = 'ch'
export const LOCAL_QUERY = 'cut'

/**
 * `?ch=N` があればスクロールを無視してその章に固定する。
 *
 * これはQAのための機構。スクロールで撮ると ScrollControls の damping が収束するまで
 * 待たされるうえ、待ち方を誤ると動いている途中の絵を撮ってしまう(現行シーンで実際に起きた)。
 * 章を直接指定できればカメラが**最初のフレームから静止している**ので、
 * スクリーンショットの比較条件が確実に揃う
 */
export function parseChapterOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get(CHAPTER_QUERY)
  if (raw === null || raw === '') return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return null
  return Math.min(Math.max(Math.round(parsed), 0), CHAPTERS.length - 1)
}

/** `?cut=0.8` → 0.8。未指定は0.5(章の真ん中。ドリフトの中間なので代表的な絵になる) */
export function parseLocalOverride(search: string): number {
  const raw = new URLSearchParams(search).get(LOCAL_QUERY)
  if (raw === null || raw === '') return 0.5
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0.5
  return Math.min(Math.max(parsed, 0), 1)
}

/** ブラウザ外(テスト・SSR)では常に空。`typeof window` 分岐を1か所に集める */
export function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}

/** カメラ位置と注視点。箱庭はワールド原点にあるので球座標をそのまま解けばよい */
export function cameraPose(
  chapter: Chapter,
  local: number
): { position: [number, number, number]; target: [number, number, number] } {
  const t = Math.min(Math.max(local, 0), 1)
  const { cut } = chapter
  const az = ((cut.azimuth + cut.driftAzimuth * t) * Math.PI) / 180
  const el = (cut.elevation * Math.PI) / 180
  const d = cut.distance + cut.driftDistance * t
  const horizontal = Math.cos(el) * d
  return {
    position: [Math.sin(az) * horizontal, Math.sin(el) * d, Math.cos(az) * horizontal],
    target: [0, cut.lookY, 0],
  }
}
