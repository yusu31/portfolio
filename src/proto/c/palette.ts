// プロトタイプC(箱庭カード)のパレット。**これを最初に固定する**のは A / B と同じ。
//
// 4種あるのは参考例②(threejs assets の Railway パック)に倣ったもので、
// ②の売りが「**同じアセットにパレットを差し替えると別の世界になる**」だったため
// (docs/references/2026-08-02_x-4examples.md)。
// ただし②の Golden はそのままでは主役の橙が溶けるので Dusk に置き換えてある(後述)。
//
// C ではその売りを**構造として実装する**。
//   - `island.ts` が作るのは**色を持たない純ジオメトリ**
//   - 色は `paintIsland(layout, palette)` が後から乗せる
//   - どのパレットで塗ってもジオメトリは1ビットも変わらない(island.test.ts で縛る)
// A / B はパレットを物の生成時に焼き込んでいたので、ここが C の固有の設計になる。
//
// もうひとつ A / B と違うのは **1画面に複数のパレットが同時に映る**こと。
// カードが列になって奥へ続くので、手前が Dusk の島、奥が Misty の島…と並ぶ。
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
 * 4種。物語(体育教師 → エンジニア)は Day → Dusk → Misty → Night の順で並ぶ。
 *
 * **4種を維持していて3種に絞っていない**のは、A/B/C を通した破綻(Night が毎回潰れる)の
 * 原因が「色相差・明度差の不足」と数値で特定できたため(`?pal=N` の撮り比べ + ΔE の実測)。
 * 直せる欠陥なので枚数は減らさない。4章に3パレットだと2つの章が同じ色になり、
 * 「章 = 独立した小さな世界」という C の前提そのものが弱くなる。
 *
 * **基準は Day**。撮り比べで唯一すべて(緑パッチ・建物4色・白線)が読めていたのがこれで、
 * 他の3種は Day の情報量を基準に作り直してある。
 *
 * ②の Golden(黄土〜琥珀の単一トーンに全部が沈む)は**そのままでは使えない**ことが実測で判明した。
 * 主役の球体がオレンジなので、世界ごと琥珀に沈めると主役が背景に溶ける(ΔE 41.5 で4種中最悪)。
 * **参考例から借りるのは作り方であって題材ではない**ので、
 * 「暖色の光 + 寒色の空」という夕方の組み立てに置き換えて Dusk にしてある。
 *
 * Night は消していない。**クリスタル球が最も映えるのが Night** だから
 * (球体と空の ΔE が 100.5 で4種中最大。Day の 84.1 を大きく上回る)。
 * 潰れていた原因のほうを直して残す。
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
    id: 'dusk',
    label: 'Dusk',
    // 夕方。**②の Golden を作り直したもの**(経緯は PALETTES の説明)。
    //
    // ゴールデンアワーの本体は「琥珀一色」ではなく **暖色の光と寒色の空の同居**のほうで、
    // 空を青に残すと橙の主役が背景から抜ける(球体と空の ΔE が 41.5 → 88.5)。
    // 暖かさはライトの色と長い影が担当する。地面の緑もオリーブに寄せて残し、
    // Day で読めていた情報(パッチ・建物の色分け)が夕方でも消えないようにする
    sky: '#8e9dc4',
    fogNear: 62,
    fogFar: 190,
    ground: '#c9a888',
    groundAlt: '#96a06a',
    grout: '#8a7a63',
    rock: '#6f5c4c',
    structures: ['#efd8b6', '#d9a58a', '#a8b0c4', '#c0a374'],
    // 主役の橙とは別の赤に寄せる。同じ橙にすると差し色が主役の役を食う
    accent: '#e8574e',
    // 夕方の影は寒色。暖色の光と対にすることで時間帯が読める
    shadowColor: '#4a4a72',
    skyColor: '#c9d6ee',
    ambientIntensity: 1.05,
    // y を下げて影を長く伸ばす。ゴールデンアワーの本体は長い影
    key: { color: '#ffc48a', intensity: 3.0, position: [-30, 16, 22] },
    shadowOpacity: 0.48,
  },
  {
    id: 'misty',
    label: 'Misty',
    // 霧。**フォグを一番近くまで寄せる**のでこのパレットだけ奥のカードがほとんど溶ける。
    // 彩度を落として輪郭ではなく空気で奥行きを作る。
    //
    // ただし**明度差まで詰めると建物が塊に溶ける**(元は建物どうしの ΔE が 7.8 しかなかった)。
    // 彩度は低いまま、明度のレンジだけ広げてある
    sky: '#c3ccce',
    fogNear: 34,
    fogFar: 118,
    ground: '#b4b7b2',
    groundAlt: '#83a08c',
    grout: '#7d8583',
    rock: '#6f7674',
    structures: ['#e4e8e2', '#bdc4c5', '#98a4a5', '#79858a'],
    accent: '#3f938c',
    shadowColor: '#77848a',
    skyColor: '#e2e9e8',
    ambientIntensity: 1.25,
    key: { color: '#eef2ef', intensity: 1.7, position: [18, 30, 14] },
    shadowOpacity: 0.32,
  },
  {
    id: 'night',
    label: 'Night',
    // 夜。**唯一の暗いパレットで、クリスタル球が最も映える1枚**なので終章に置く。
    //
    // A/B/C を通して毎回潰れていたが、`?pal=3` の撮り比べで原因が3つに特定できた:
    //   ① groundAlt が ground と同じ青系で、地面のパッチが完全に消えていた(ΔE 8.3)
    //   ② structures 4色の差が ΔE 7.0 しかなく、建物が全部ひとつの塊に見えていた
    //   ③ roof(structures[3] の導出色)が空と ΔE 17.5 まで近く、屋根が黒い穴になっていた
    //
    // **空は暗いまま**にする(それが球体を光らせている当のもの)。持ち上げるのは島の側だけ。
    // 島だけが明るいのは絵として嘘ではなく、**この島には照明塔が立っている**ので
    // 「夜のグラウンドがナイター照明で照らされている」という読み方になる
    sky: '#131a2c',
    fogNear: 50,
    fogFar: 165,
    ground: '#6e7590',
    // ① 夜でも芝は緑。色相で分ければ暗いままでも地面のパッチが読める(ΔE 8.3 → 33.3)
    groundAlt: '#5d7d63',
    grout: '#474c66',
    rock: '#454b66',
    // ② 明度だけでなく色相も4方向へ散らす(青灰・紫・青緑・藍)。ΔE 7.0 → 11.9
    structures: ['#9ba3be', '#8c7fa0', '#6f8899', '#646d92'],
    accent: '#5fe0c0',
    // 影も真っ黒にしない。夜の影に残るのは月と街灯の青
    shadowColor: '#39456d',
    skyColor: '#93aadd',
    ambientIntensity: 1.4,
    key: { color: '#ffd9ab', intensity: 2.4, position: [-22, 30, 18] },
    // 影で地面の情報を潰さない。夜は影のほうが暗い側なので濃くすると情報が消える
    shadowOpacity: 0.42,
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

// --- 色が「読める」かを数値で見る道具 -------------------------------------
//
// A / B / C を通して Night が毎回潰れたが、**原因は「暗いこと」ではなく「色どうしが近いこと」**
// だった。暗くても色相が離れていれば読めるし(作り直した Night の芝がそれ)、
// 明るくても近ければ潰れる(元の Misty の建物がそれ)。
//
// 近さを目分量で見ているうちは同じ失敗を繰り返すので、**知覚距離で測って閾値に落とす**。
// 使うのは CIELAB の ΔE76。ΔE94 / ΔE2000 のほうが精度は高いが、
// ここで要るのは「潰れているかどうか」の粗い判定なので、式が短いほうの利点が勝つ。

/** sRGB の1チャンネル(0-255) → 線形値。ガンマを外さないと明度の比較が狂う */
function srgbToLinear(channel: number): number {
  const u = channel / 255
  return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)
}

/** `#rrggbb` → CIELAB [L*, a*, b*](D65) */
export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex).map(srgbToLinear)
  // sRGB → XYZ (D65)
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041
  // 白色点で正規化してから立方根。暗部は線形で近似する(cbrt が原点で潰れるため)
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29)
  const fx = f(x / 0.95047)
  const fy = f(y / 1.0)
  const fz = f(z / 1.08883)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/**
 * 2色の知覚距離(ΔE76)。**目安は ΔE 2.3 で「並べれば違いが分かる」**。
 * ここで欲しいのは低ポリの塊どうしが別物に見えるかなので、閾値はずっと大きく取る
 */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a)
  const [l2, a2, b2] = hexToLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

// 閾値。**すべて実測から決めた**(壊れていた側の値を下回り、直した側の値を上回る位置に置く)。
// 数字の出どころは `/proto/c?card=1&pal=0..3` の撮り比べ。

/** 建物どうし。旧 Night 7.0 / 旧 Misty 7.8 が「塊に溶ける」側、現行は最低でも 11.9 */
export const MIN_STRUCTURE_DELTA_E = 10

/** 地面と地面パッチ。旧 Night 8.3 でパッチが完全に消えていた。現行は最低 17.0 */
export const MIN_GROUND_PATCH_DELTA_E = 15

/**
 * 主役の球体と空。**旧 Golden の 41.5 が「主役が背景に溶ける」側**で、
 * これを弾くために 45 に置いてある。現行は最低 75.0
 */
export const MIN_HERO_SKY_DELTA_E = 45

/** 主役の球体と地面。球体は走路の上にいるので、地面との分離も要る。現行は最低 49.5 */
export const MIN_HERO_GROUND_DELTA_E = 40

/** 屋根と空。旧 Night の 17.5 で屋根が「空に抜けた穴」に見えていた。現行は最低 27.5 */
export const MIN_ROOF_SKY_DELTA_E = 20

/** 差し色と建物。旧 Misty の 19.6 が下限すれすれだった。現行は最低 23.8 */
export const MIN_ACCENT_STRUCTURE_DELTA_E = 18

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
