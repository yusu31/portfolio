// プロトタイプC(箱庭カード)のパレット。**これを最初に固定する**のは A / B と同じ。
//
// 名前を Day / Golden / Misty / Night にしてあるのは参考例②(threejs assets の Railway パック)
// そのままで、②の売りが「**同じアセットにパレットを差し替えると別の世界になる**」だったため
// (docs/references/2026-08-02_x-4examples.md)。
//
// C ではその売りを**構造として実装する**。
//   - `island.ts` が作るのは**色を持たない純ジオメトリ**
//   - 色は `paintIsland(layout, palette)` が後から乗せる
//   - どのパレットで塗ってもジオメトリは1ビットも変わらない(island.test.ts で縛る)
// A / B はパレットを物の生成時に焼き込んでいたので、ここが C の固有の設計になる。
//
// もうひとつ A / B と違うのは **1画面に複数のパレットが同時に映る**こと。
// カードが列になって奥へ続くので、手前が Golden の島、奥が Misty の島…と並ぶ。
// 「章が独立した小さな世界」であることが1枚の絵の中で見える。

/**
 * 塗り分けの口。**モジュールはこの名前しか知らない**ので、パレットを差し替えても
 * モジュール側を1行も触らずに世界の色が入れ替わる(②のモジュラー思想の実体)。
 *
 * 宣言された色は9つだけで、残りはそこから導出する。
 * 別の色を持ち込まないので、情報を足しても1画面の色数が増えない(共通原則1)
 */
export type ColorSlot =
  | 'ground'
  | 'groundAlt'
  | 'foliage'
  | 'grout'
  | 'curb'
  | 'post'
  | 'rock'
  | 'rockDeep'
  | 'lane'
  | 'laneMark'
  | 'wood'
  | 'soil'
  | 'structure0'
  | 'structure1'
  | 'structure2'
  | 'structure3'
  | 'roof'
  | 'accent'
  | 'heroBody'
  | 'heroLimb'
  | 'heroSkin'

/** 宣言される色。**この9色以外を持たない**のがパレット絞り込みの実体 */
export type Palette = {
  id: string
  /** UIに出す表示名。②の4パレット名をそのまま使う */
  label: string
  /** 背景。浮島は空に浮いているので、これがそのまま画面の地色になる */
  sky: string
  /** 奥のカードを溶かすフォグ。**近すぎると列が消えて「流れてくる」が見えなくなる** */
  fogNear: number
  fogFar: number
  /** 島の天面 */
  ground: string
  /** 天面のもう1色(芝・土・畝)。地面に情報を乗せるための色 */
  groundAlt: string
  /** タイルの目地 */
  grout: string
  /** 島の下の岩 */
  rock: string
  /** 構造物。**建物・箱・塔はこの4色からしか取らない** */
  structures: readonly [string, string, string, string]
  /** 差し色。看板・信号・主役の胴。少量だけ */
  accent: string
  /** 影の色 = 陰面に残る間接光の色。three.js では **ambientLight の色 = 影の色**(A で確立) */
  shadowColor: string
  /** 上方向の間接光(空の照り返し) */
  skyColor: string
  ambientIntensity: number
  /** キーライト。島は常にステージ付近に来るので、位置は固定で足りる */
  key: { color: string; intensity: number; position: readonly [number, number, number] }
  /** 影の濃さ。1にすると真っ黒になり ambientLight で作った影の色が見えなくなる */
  shadowOpacity: number
}

/**
 * ②の4パレットに対応する4種。
 * 掲載カットは Golden(黄土色〜琥珀の単一トーンに全部が沈んでいる)だったので、
 * Golden を一番「らしい」側に振ってある。
 *
 * 物語(体育教師 → エンジニア)は Day → Golden → Misty → Night の順で並ぶ
 */
export const PALETTES: readonly Palette[] = [
  {
    id: 'day',
    label: 'Day',
    sky: '#bcd9e6',
    fogNear: 70,
    fogFar: 205,
    ground: '#c9c3b2',
    groundAlt: '#9db584',
    grout: '#8f8a7c',
    rock: '#8d8272',
    structures: ['#e4ddd0', '#d9b5a6', '#b8c4c9', '#c8b98f'],
    accent: '#e0663c',
    shadowColor: '#7f95a8',
    skyColor: '#eaf5fb',
    ambientIntensity: 1.1,
    key: { color: '#fff6e4', intensity: 2.5, position: [26, 34, 20] },
    shadowOpacity: 0.45,
  },
  {
    id: 'golden',
    label: 'Golden',
    // ②の掲載カット。**全部が1つのトーンに沈んでいる**のがこのパレットの要点なので、
    // 色相を琥珀〜黄土の狭い帯に閉じ込めて、青系を1色も入れない
    sky: '#e8bf85',
    fogNear: 58,
    fogFar: 180,
    ground: '#c7a273',
    groundAlt: '#a98a55',
    grout: '#8a6b46',
    rock: '#7d5f42',
    structures: ['#e5c79b', '#d4a377', '#bb8b5e', '#a8763f'],
    accent: '#ff8a3d',
    shadowColor: '#6b4a3c',
    skyColor: '#ffdfae',
    ambientIntensity: 1.0,
    // y を下げて影を長く伸ばす。ゴールデンアワーの本体は長い影
    key: { color: '#ffc879', intensity: 2.9, position: [-30, 18, 22] },
    shadowOpacity: 0.5,
  },
  {
    id: 'misty',
    label: 'Misty',
    // 霧。**フォグを一番近くまで寄せる**のでこのパレットだけ奥のカードがほとんど溶ける。
    // 彩度を落として明度差も詰め、輪郭ではなく空気で奥行きを作る
    sky: '#c3ccce',
    fogNear: 34,
    fogFar: 118,
    ground: '#b0b3ae',
    groundAlt: '#8fa094',
    grout: '#7d8583',
    rock: '#6f7674',
    structures: ['#cfd3ce', '#b6bcbd', '#9fa8a8', '#8b9395'],
    accent: '#5c9c96',
    shadowColor: '#77848a',
    skyColor: '#e2e9e8',
    ambientIntensity: 1.25,
    key: { color: '#eef2ef', intensity: 1.7, position: [18, 30, 14] },
    shadowOpacity: 0.32,
  },
  {
    id: 'night',
    label: 'Night',
    // 夜。唯一の暗いパレットで、accent(窓の灯り・信号)だけが浮く。
    //
    // **最初はもっと暗くしていて、QAで撮ると地面の目地も建物の面も全部潰れた**。
    // 空は暗いままにしつつ、島の側だけ持ち上げてある(夜でも被写体は見えていないと
    // 「密度を上げる」「地面に情報を乗せる」の投資がまるごと無駄になる)
    sky: '#1a2233',
    fogNear: 46,
    fogFar: 155,
    ground: '#59617a',
    groundAlt: '#4c687b',
    grout: '#3d4560',
    rock: '#333b52',
    structures: ['#5f6a90', '#6c6188', '#7a7399', '#4e5a7c'],
    accent: '#63dfc2',
    // 影も真っ黒にしない。夜の影に残るのは月と街灯の青
    shadowColor: '#2f3a5c',
    skyColor: '#8ba4d4',
    ambientIntensity: 1.35,
    key: { color: '#ffd6a2', intensity: 2.2, position: [-22, 30, 18] },
    shadowOpacity: 0.5,
  },
]

/** 範囲外はクランプ。カードの解決が1つズレても色が消えないようにする */
export function getPalette(index: number): Palette {
  const i = Math.min(Math.max(Math.round(index), 0), PALETTES.length - 1)
  return PALETTES[i]
}

/** `#rrggbb` → [r,g,b] (0-255) */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) throw new Error(`invalid hex color: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: readonly [number, number, number]): string {
  return `#${rgb
    .map((v) =>
      Math.min(Math.max(Math.round(v), 0), 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

/** 2色を混ぜる。`t=0` で a、`t=1` で b */
export function mixHex(a: string, b: string, t: number): string {
  const u = Math.min(Math.max(t, 0), 1)
  const [ar, ag, ab] = parseHex(a)
  const [br, bg, bb] = parseHex(b)
  return toHex([ar + (br - ar) * u, ag + (bg - ag) * u, ab + (bb - ab) * u])
}

/**
 * 色を明るく/暗くする。`amount` は -1(黒) 〜 +1(白)。
 * **導出される色はすべてこれを通る**ので、宣言された9色から離れた色が生まれない
 */
export function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const t = Math.min(Math.max(amount, -1), 1)
  const target = t >= 0 ? 255 : 0
  const mix = (c: number) => c + (target - c) * Math.abs(t)
  return toHex([mix(r), mix(g), mix(b)])
}

/**
 * 塗り分けの口 → 実際の色。**モジュール側とパレット側をつなぐ唯一の関数**。
 *
 * 半分近くが導出色なのは意図的で、レール・枕木・バラスト・屋根まで固有色にすると
 * 1画面の色数が倍になって②の「1つのトーンに沈んでいる」が崩れる
 */
export function slotColor(palette: Palette, slot: ColorSlot): string {
  switch (slot) {
    case 'ground':
      return palette.ground
    case 'groundAlt':
      return palette.groundAlt
    // 木の葉。芝と同系にして緑を専用色として増やさないが、わずかに沈めて
    // 芝の上に立つ木が地面のパッチに溶けないようにする
    case 'foliage':
      return shadeHex(palette.groundAlt, -0.08)
    case 'grout':
      return palette.grout
    // 島の縁。**地面に貼り付いているもの**だけがこのスロットを使う
    case 'curb':
      return shadeHex(palette.grout, -0.18)
    // 柵の支柱・手すり。縁石と同じ色だが**立ち上がる物**なので語彙を分けてある
    // (同じスロットにすると「天面のマークは地面に貼り付いている」を検証できなくなる)
    case 'post':
      return shadeHex(palette.grout, -0.18)
    case 'rock':
      return palette.rock
    // 島の下ほど暗くして、浮島の底が空に溶けないようにする
    case 'rockDeep':
      return shadeHex(palette.rock, -0.34)
    // 走路の舗装。地面より一段沈めて「踏み固められた道」にする。
    // **専用色を宣言せず地面から導出する**ので、パレットを替えても道だけ浮かない
    case 'lane':
      return shadeHex(palette.ground, -0.16)
    // 走路の白線・コートのライン。地面に乗る情報の主役(共通原則3)
    case 'laneMark':
      return shadeHex(palette.ground, 0.62)
    // 木の幹・ベンチなどの木部
    case 'wood':
      return shadeHex(palette.rock, 0.12)
    // むき出しの土。走路の路肩とコートの地面に使う
    case 'soil':
      return shadeHex(palette.groundAlt, -0.16)
    case 'structure0':
      return palette.structures[0]
    case 'structure1':
      return palette.structures[1]
    case 'structure2':
      return palette.structures[2]
    case 'structure3':
      return palette.structures[3]
    // 屋根は必ず壁より暗い。俯瞰なので屋根の面積が大きく、壁と同色だと箱が平らに見える
    case 'roof':
      return shadeHex(palette.structures[3], -0.22)
    case 'accent':
      return palette.accent
    // 主役は画面の1/4以下なので、差し色を当てて視線が見つけられるようにする
    case 'heroBody':
      return palette.accent
    case 'heroLimb':
      return shadeHex(palette.grout, -0.3)
    case 'heroSkin':
      return shadeHex(palette.accent, 0.45)
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * パレットどうしを混ぜる。**空・フォグ・ライトにだけ使う**。
 *
 * 島そのものは自分のパレットで塗ったままにする。カードは独立した世界なので、
 * ここを混ぜると「隣の島の色が移る」ことになって C の前提が壊れる。
 * 混ざるのは大気だけで、島は最後まで自分の色を保つ
 */
export function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  const u = Math.min(Math.max(t, 0), 1)
  const c = (x: string, y: string) => mixHex(x, y, u)
  return {
    id: u < 0.5 ? a.id : b.id,
    label: u < 0.5 ? a.label : b.label,
    sky: c(a.sky, b.sky),
    fogNear: lerp(a.fogNear, b.fogNear, u),
    fogFar: lerp(a.fogFar, b.fogFar, u),
    ground: c(a.ground, b.ground),
    groundAlt: c(a.groundAlt, b.groundAlt),
    grout: c(a.grout, b.grout),
    rock: c(a.rock, b.rock),
    structures: [
      c(a.structures[0], b.structures[0]),
      c(a.structures[1], b.structures[1]),
      c(a.structures[2], b.structures[2]),
      c(a.structures[3], b.structures[3]),
    ],
    accent: c(a.accent, b.accent),
    shadowColor: c(a.shadowColor, b.shadowColor),
    skyColor: c(a.skyColor, b.skyColor),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, u),
    key: {
      color: c(a.key.color, b.key.color),
      intensity: lerp(a.key.intensity, b.key.intensity, u),
      position: [
        lerp(a.key.position[0], b.key.position[0], u),
        lerp(a.key.position[1], b.key.position[1], u),
        lerp(a.key.position[2], b.key.position[2], u),
      ],
    },
    shadowOpacity: lerp(a.shadowOpacity, b.shadowOpacity, u),
  }
}

/**
 * 大気のパレットを純粋に保つ範囲(カード間の移動量に対する割合)。
 *
 * カードがステージに乗っている前後はそのカードの色そのままで、
 * **移動している最中だけ次の色へ渡す**。B の `PALETTE_BLEND` と同じ理屈だが、
 * C ではカードが止まっている時間があるぶん保持を大きく取れる
 */
export const ATMOSPHERE_HOLD = 0.3
