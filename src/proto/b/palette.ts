// プロトタイプB(背面追従 + 強い一点透視)のパレット。**これを最初に固定する**のは A と同じ。
//
// A との決定的な違いは「**補間できること**」。
// A はカット送りが骨子なので章の境界でパレットがまるごと入れ替わったが、
// B はカメラが一本道を連続移動するので、区間の境界で色が飛ぶと
// 「連続移動している」という B の定義そのものが壊れる。
// そのため全フィールドを `lerpPalette` で混ぜられる形にしてある(色も数値も)。
//
// 色の狙いは参考例①(probiex007 / messenger.abeto.co)の観察に正面から従う:
//   「空は水色〜ミント、建物はパステルのグレー／ピンク／クリーム。彩度は中程度」
//   (docs/references/2026-08-02_x-4examples.md)
// A のパレットより彩度を1段落として、輪郭線が乗っても色が濁らない側に寄せている。

import { LEGS, resolveLeg } from './route'

/** 区間ごとのパレット。連続移動なので隣り合う2つが混ざる前提で持つ */
export type Palette = {
  id: string
  /** UIに出す表示名 */
  label: string
  /** 空 = 背景色。①は水色〜ミント */
  sky: string
  /** 遠方を溶かすフォグ。**奥に消える道が見えなくなるほど近づけない**(一点透視の本体を消してしまう) */
  fogNear: number
  fogFar: number
  /** 路面の色 */
  road: string
  /** 白線・マンホールなど路面マーキングの色 */
  roadMark: string
  /** 歩道の色。路面とわずかに変えて段差を読ませる */
  sidewalk: string
  /** 建物の色。**この4色以外を使わない**のがパレット絞り込みの実体 */
  buildings: readonly [string, string, string, string]
  /** 差し色。看板・自販機・信号など少量だけ */
  accent: string
  /** 輪郭線の色。純黒にすると浮くので、暗い有彩色に寄せる(①の線もそう見える) */
  outline: string
  /** 影の色 = 陰面に残る間接光の色。three.js では **ambientLight の色 = 影の色**(A で確立) */
  shadowColor: string
  /** 上方向の間接光(空の照り返し) */
  skyColor: string
  ambientIntensity: number
  /**
   * キーライト。B は道に沿って進み続けるので、位置ではなく
   * **主役からの相対オフセット**で持つ(ライトとシャドウカメラを追従させるため)
   */
  key: { color: string; intensity: number; offset: readonly [number, number, number] }
  /** 影の濃さ。1にすると真っ黒になり ambientLight で作った影の色が見えなくなる */
  shadowOpacity: number
}

/**
 * 4区間ぶん。A と同じ物語(体育教師 → エンジニア)を一本道の上に置き直したもので、
 * 朝 → 昼 → 夕 → 夜と進むので色の移り変わりがそのまま時間の経過として読める。
 * B では境界で切り替わらず**なめらかに混ざる**ので、「道を歩くうちに日が暮れる」ように見える
 */
export const PALETTES: readonly Palette[] = [
  {
    id: 'morning',
    label: 'Morning',
    // 朝の水色。①の空に最も近い側
    sky: '#a9d5e8',
    fogNear: 70,
    fogFar: 210,
    road: '#9c9a96',
    roadMark: '#f2efe4',
    sidewalk: '#b3aea4',
    buildings: ['#dcd6cc', '#e9c6c8', '#f1e6cf', '#b7c6cd'],
    accent: '#e2703a',
    outline: '#2b3138',
    // 朝の影は空の色を拾って青い
    shadowColor: '#7d95b0',
    skyColor: '#e8f4fb',
    ambientIntensity: 1.1,
    // 斜め後方やや右から。背面追従なので進行方向(-Z)に対して側面光になる
    key: { color: '#fff3dc', intensity: 2.5, offset: [18, 24, 8] },
    shadowOpacity: 0.45,
  },
  {
    id: 'noon',
    label: 'Noon',
    // ミント。①のもう一方の空。彩度は上げずに明度だけ上げる
    sky: '#bfe3dc',
    fogNear: 78,
    fogFar: 220,
    road: '#a5a29c',
    roadMark: '#f6f3e8',
    sidewalk: '#bab5aa',
    buildings: ['#e2ddd3', '#efd0cf', '#f4ecd8', '#c2cfd2'],
    accent: '#f08a3c',
    outline: '#2d3634',
    shadowColor: '#6f8f92',
    skyColor: '#f0fbf7',
    ambientIntensity: 1.15,
    // 真上に寄せる。影が短くなり、正午の乾いた感じが出る
    key: { color: '#fffaf0', intensity: 2.7, offset: [12, 30, -4] },
    shadowOpacity: 0.4,
  },
  {
    id: 'amber',
    label: 'Amber',
    // 夕。坂道が一番よく効く時間帯なので、キーライトを低くして影を長く伸ばす
    sky: '#f0c9a4',
    fogNear: 62,
    fogFar: 190,
    road: '#9a8b7e',
    roadMark: '#f7ead2',
    sidewalk: '#ab998a',
    buildings: ['#e6cdb2', '#e8b3a8', '#f2ddb8', '#b09a94'],
    accent: '#ff7a3c',
    shadowColor: '#6b4f5e',
    outline: '#33272c',
    skyColor: '#ffe2c0',
    ambientIntensity: 1.0,
    // y を下げて影を長く。一点透視の道に沿って影が伸びると奥行きが増幅される
    key: { color: '#ffc07a', intensity: 2.8, offset: [-26, 13, 6] },
    shadowOpacity: 0.52,
  },
  {
    id: 'night',
    label: 'Night',
    // 夜。唯一の暗いパレットで、accent(看板・窓の灯り)だけが浮く
    sky: '#1d2740',
    fogNear: 48,
    fogFar: 160,
    road: '#3a3f4e',
    roadMark: '#cfd3d0',
    sidewalk: '#454a59',
    buildings: ['#39415a', '#4c4356', '#5a5568', '#2f3a4a'],
    accent: '#5ee0c0',
    outline: '#10151f',
    shadowColor: '#161d31',
    skyColor: '#8fa8d9',
    ambientIntensity: 0.85,
    key: { color: '#ffd9a8', intensity: 1.6, offset: [-16, 26, 10] },
    shadowOpacity: 0.6,
  },
]

/** 範囲外はクランプ。区間の解決が1つズレても色が消えないようにする */
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
  return `#${rgb.map((v) => Math.min(Math.max(Math.round(v), 0), 255).toString(16).padStart(2, '0')).join('')}`
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
 * 建物の側面の陰・路面の汚れを**パレットのベース色から導出する**ために使う。
 * 別の色を持ち込まないので、情報を足しても画面の色数が増えない
 */
export function shadeHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const t = Math.min(Math.max(amount, -1), 1)
  const target = t >= 0 ? 255 : 0
  const mix = (c: number) => c + (target - c) * Math.abs(t)
  return toHex([mix(r), mix(g), mix(b)])
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * パレットどうしを混ぜる。**B の骨子である「連続移動」を色の側でも守るための関数**。
 *
 * A ではこれを意図的に持たなかった(カット送りなので境界で入れ替わるのが正しい)。
 * B で同じことをすると、道を歩いている最中に世界の色だけが瞬間的に飛ぶことになり、
 * 一本道を進んでいるという前提が壊れる
 */
export function lerpPalette(a: Palette, b: Palette, t: number): Palette {
  const u = Math.min(Math.max(t, 0), 1)
  const c = (x: string, y: string) => mixHex(x, y, u)
  return {
    // idとlabelは混ざらないので、半分を境に近いほうを名乗る(UI表示にしか使わない)
    id: u < 0.5 ? a.id : b.id,
    label: u < 0.5 ? a.label : b.label,
    sky: c(a.sky, b.sky),
    fogNear: lerp(a.fogNear, b.fogNear, u),
    fogFar: lerp(a.fogFar, b.fogFar, u),
    road: c(a.road, b.road),
    roadMark: c(a.roadMark, b.roadMark),
    sidewalk: c(a.sidewalk, b.sidewalk),
    buildings: [
      c(a.buildings[0], b.buildings[0]),
      c(a.buildings[1], b.buildings[1]),
      c(a.buildings[2], b.buildings[2]),
      c(a.buildings[3], b.buildings[3]),
    ],
    accent: c(a.accent, b.accent),
    outline: c(a.outline, b.outline),
    shadowColor: c(a.shadowColor, b.shadowColor),
    skyColor: c(a.skyColor, b.skyColor),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, u),
    key: {
      color: c(a.key.color, b.key.color),
      intensity: lerp(a.key.intensity, b.key.intensity, u),
      offset: [
        lerp(a.key.offset[0], b.key.offset[0], u),
        lerp(a.key.offset[1], b.key.offset[1], u),
        lerp(a.key.offset[2], b.key.offset[2], u),
      ],
    },
    shadowOpacity: lerp(a.shadowOpacity, b.shadowOpacity, u),
  }
}

/**
 * パレットを渡し始める位置(区間長に対する割合)。
 *
 * **区間ぜんぶを使って隣へ移すと、区間の中央が常に2色の50/50になり、
 * 純粋なパレットがどこにも存在しなくなる**(最初はそう書いていて、区間3の真ん中が
 * 夕方ではなく夜との混色になっていた)。
 * 「パレットを絞る」が共通原則1なので、区間の大半は自分の色を保ち、
 * 終盤だけで次へ渡す。区間の終わりでちょうど次の色になるので境界は連続したまま
 */
export const PALETTE_BLEND = 0.24

/**
 * 道の位置 `t` におけるパレット。**Bのパレット運用の中心になる関数**。
 *
 * 空・フォグ・ライトはカメラの位置で毎フレーム引く(数個のuniformなので安い)。
 * 建物や小物の色は**その物自身の位置で1回だけ焼く**。
 * こうすると世界の色が場所に紐づくので、道を歩くと朝の街から夜の街へ**空間的に**移り変わる
 * (毎フレーム数百個のインスタンス色を書き換える必要もなくなる)。
 */
export function paletteAt(t: number): Palette {
  const { index, local } = resolveLeg(t)
  const a = getPalette(LEGS[index].paletteIndex)
  const b = getPalette(LEGS[Math.min(index + 1, LEGS.length - 1)].paletteIndex)
  const hold = 1 - PALETTE_BLEND
  if (local <= hold) return a
  const u = (local - hold) / PALETTE_BLEND
  // smoothstep で渡し始めと渡し終わりの変化率を0にして、色の動きが折れないようにする
  return lerpPalette(a, b, u * u * (3 - 2 * u))
}
