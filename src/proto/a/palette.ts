// プロトタイプA(ジオラマ)のパレット定義。**これを最初に固定する**のがこの試作の出発点。
//
// 参考例②(threejs assets の Railway パック)は同じアセットのまま
// Day / Golden / Misty / Night の4パレットを差し替えて売りにしていた。
// つまり世界観を作っているのはシェーダーの種類ではなく**色の絞り込み**のほうで、
// SESSION5 の retrofit(完成したPBRシーンにトゥーンの皮をかぶせる)が失敗したのは
// ここを触らずに線とトーンだけをいじったためだった(docs/references/2026-08-02_x-4examples.md)。
//
// 設計上の要点は3つ:
//   1. `props` を**4色に絞る**。小物をこの配列からしか塗らないので、物量を増やしても色が散らない
//   2. `shadowColor` を明示的に持つ。参考例③は「影が濃い紫」で世界を作っていた。
//      three.js では影の中に残るのは間接光だけなので、**ambientLight の色 = 影の色**になる。
//      hemisphereLight ではダメで、あれは上向き面に skyColor を当てるため床の影まで
//      skyColor に染まってしまう(pages/ProtoA.tsx の Lights に詳細)
//   3. `background` と `fog` を同色にする。箱庭の外を消して「切り取られた世界」に見せる

/** 章ごとに切り替わるパレット。1画面の色数を絞ることが目的なので、色を足すときは既存を減らす */
export type Palette = {
  id: string
  /** UIに出す表示名(②の Day/Golden/Misty/Night に相当) */
  label: string
  /** 背景色。フォグと同色にして箱庭の外を溶かす */
  background: string
  fogNear: number
  fogFar: number
  /** 地面のベース色。マーキングはこの上に描かれる */
  ground: string
  /** 地面のマーキング(白線・目地)の色 */
  groundMark: string
  /** 箱庭の土台(側面)の色 */
  plinth: string
  /** 小物の色。**この4色以外を使わない**のがパレット絞り込みの実体 */
  props: readonly [string, string, string, string]
  /** 差し色。少量だけ使う(発光やアクセント) */
  accent: string
  /** 影の色 = 陰面に回り込む間接光の色。参考例③の核心 */
  shadowColor: string
  /** 上方向の間接光(空の色) */
  skyColor: string
  /** 間接光全体の強さ */
  ambientIntensity: number
  /** キーライト(太陽・照明) */
  key: { color: string; intensity: number; position: readonly [number, number, number] }
  /**
   * 影の濃さ(0=影なし 1=直接光を完全に遮る)。DirectionalLight の `shadow.intensity` に入れる。
   * 1にすると影が真っ黒になり、ambientLight で作った影の色が見えなくなる
   */
  shadowOpacity: number
}

/**
 * 4パレット。章の順に並ぶ(体育館 → 校庭 → 街のコート → デスク)。
 * 時刻も朝 → 夕 → 薄暮 → 夜と進むので、パレットの切替がそのまま
 * 「体育教師 → エンジニア」の時間の経過として読める
 */
export const PALETTES: readonly Palette[] = [
  {
    id: 'chalk',
    label: 'Chalk',
    // 体育館の朝。窓から入る白い光。彩度を落としたクリームで全部を1トーンに沈める
    background: '#e6dfd0',
    fogNear: 34,
    fogFar: 78,
    ground: '#d3ac7e',
    groundMark: '#f8f3e9',
    plinth: '#b4a189',
    props: ['#e2ddd0', '#c4553f', '#5b6f8a', '#8b9d86'],
    accent: '#e2703a',
    // 体育館の影は青みのグレー(木の床の暖色に対する補色側)
    shadowColor: '#8b92ad',
    skyColor: '#fff6e6',
    ambientIntensity: 1.15,
    key: { color: '#fff0d6', intensity: 2.4, position: [16, 26, 12] },
    shadowOpacity: 0.42,
  },
  {
    id: 'golden',
    label: 'Golden',
    // 参考例②の Golden に正面から倣う。黄土〜琥珀の単一トーンに全部を沈める。
    // 太陽を低く置いて影を長く伸ばすのがこのパレットの主効果
    background: '#e7b774',
    // カメラ距離45に対してnearが近すぎると箱庭ぜんぶが霞んでパレットの評価ができない(実測)
    fogNear: 40,
    fogFar: 90,
    ground: '#a89347',
    groundMark: '#f6e6c0',
    plinth: '#8a6a3c',
    props: ['#d9a441', '#8c5a2b', '#e6d3a3', '#5f6b3a'],
    accent: '#ff8a3d',
    shadowColor: '#6b4230',
    skyColor: '#ffd9a0',
    ambientIntensity: 1.0,
    // y を低くして影を長くする。夕方の斜光がジオラマの立体感を一番強く出す
    key: { color: '#ffc074', intensity: 2.9, position: [-24, 14, 10] },
    shadowOpacity: 0.5,
  },
  {
    id: 'dusk',
    label: 'Dusk',
    // 参考例③(McGreenBeats)。極端に明るいパステル + **濃い紫の影**。
    // ハイライトではなくシャドウ側で世界を作っているのがこの例の発見だった
    background: '#cbb6e0',
    fogNear: 34,
    fogFar: 82,
    ground: '#d9c9e4',
    groundMark: '#fdf7ff',
    plinth: '#8d7aa6',
    props: ['#ffd9e8', '#a8e0e6', '#fff4d6', '#c4a6e8'],
    accent: '#ff7fa8',
    // ここがこのパレットの主役。明部との差が大きいほど③に近づく
    shadowColor: '#4b2f6b',
    skyColor: '#ffe9f4',
    ambientIntensity: 1.05,
    key: { color: '#fff0f6', intensity: 2.3, position: [14, 20, -16] },
    shadowOpacity: 0.55,
  },
  {
    id: 'night',
    label: 'Night',
    // 夜の部屋。唯一の暗いパレットで、accent(モニターの発光)だけが浮く。
    // 参考例④(Katamari クローン)の「木の色を基調に小物の原色が点在」を夜に置き換えた
    background: '#1b2138',
    fogNear: 32,
    fogFar: 76,
    ground: '#6b4a34',
    // 夜の章だけ「白線」に相当するものが紙。暗い机の上で明るい面が数枚あると情報が読める
    groundMark: '#e8dcc2',
    plinth: '#2a3050',
    props: ['#e8e2d4', '#4a90d9', '#e2703a', '#7a8ba8'],
    accent: '#5ee0c0',
    shadowColor: '#131a2e',
    skyColor: '#8fa8d9',
    ambientIntensity: 0.85,
    key: { color: '#ffd9a8', intensity: 1.7, position: [-14, 22, 14] },
    shadowOpacity: 0.6,
  },
]

/** 範囲外はクランプ。カット送りの境界計算が1つズレても色が消えないようにする */
export function getPalette(index: number): Palette {
  const i = Math.min(Math.max(Math.round(index), 0), PALETTES.length - 1)
  return PALETTES[i]
}

/** `#rrggbb` → [r,g,b] (0-255)。地面テクスチャの明暗生成で使う */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) throw new Error(`invalid hex color: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * 色を明るく/暗くする。`amount` は -1(黒) 〜 +1(白)。
 * 地面の木目・芝のストライプ・ひび割れを**パレットのベース色から導出する**ために使う。
 * 別の色を持ち込まないので、地面に情報を足しても色数が増えない
 */
export function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const t = Math.min(Math.max(amount, -1), 1)
  const mix = (c: number) => {
    const target = t >= 0 ? 255 : 0
    const v = Math.round(c + (target - c) * Math.abs(t))
    return Math.min(Math.max(v, 0), 255)
  }
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
