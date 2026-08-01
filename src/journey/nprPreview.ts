// 【検証用・Issue #345 段階2】NPR(非写実)評価バンドルの純粋ロジック。
//
// 段階1(`?toon=1`)で「トゥーン化**だけ**では画が暖色に寄ってフラットになるだけ」と分かった。
// 段階2では欠けていた2つを足して撮り直す:
//   ① 輪郭線 — 参考4例の魅力の本体
//   ② ライティングのコントラスト — 段階トーンが出ない原因(後述)
//
// ①は方式A(深度エッジ)と方式B(逆ハル)を両方実装して撮り比べ、**方式Bは却下した**(#350)。
// 逆ハルは平面主体のこのシーンでは輪郭でなく二重像になり、transmissionのクリスタル球を
// 不透明にしてしまう。方式Aだけが残っている理由がこれ。
//
// このファイルはクエリ解析とプリセットだけを持つ純関数群。描画は DepthOutline.tsx /
// toonPreview.tsx が読む。恒久採用が決まるまで既存の見た目は
// **スイッチ無しでは1ピクセルも変わらない**(BASE がこれまでの実測値そのもの)

/** QA用クエリパラメータ */
export const OUTLINE_QUERY = 'outline'
export const CONTRAST_QUERY = 'contrast'

/**
 * ライティングのプリセット。
 *
 * `environmentIntensity` だけコントラストを上げても下げないのが要点:
 * **`MeshToonMaterial` は envMap を持たない**(three.jsのtoonシェーダーはenvMap非対応)ため、
 * `<Environment>` はトゥーン化した面の段には一切効かない。下げても段は増えず、
 * スキップ対象のクリスタル球(`MeshPhysicalMaterial` / transmission)だけが暗くなる。
 * 「球は変更不要」という既存判断を守るため据え置く。
 *
 * 効くのは `ambientLight` のほう。`lights_toon_fragment` の indirect 項は
 * gradientMap を通らず**そのまま加算される**ので、ambientが高いほど段が洗い流される。
 */
export type LightingPreset = {
  ambientIntensity: number
  keyIntensity: number
  rimIntensity: number
  environmentIntensity: number
  /** gradientMapの最暗段の値(0-255)。低いほど影が深い */
  toonFloor: number
}

/** 現行の実測値。`?contrast` 無しではこれが使われる = 既存の絵と完全に一致する */
const BASE: LightingPreset = {
  ambientIntensity: 0.55,
  keyIntensity: 1.6,
  rimIntensity: 0.6,
  environmentIntensity: 0.7,
  toonFloor: 90,
}

/**
 * コントラスト段階。ambientを下げてキーライトを上げ、同時にgradientMapの床も下げる。
 * 床を下げないと、ambientを削っても最暗段が 90/255 = 35% で頭打ちになり影が深くならない
 */
export const LIGHTING_PRESETS: readonly LightingPreset[] = [
  BASE,
  // 中: 4段が均等に使われ始めるあたりを狙う
  { ambientIntensity: 0.28, keyIntensity: 2.3, rimIntensity: 0.5, environmentIntensity: 0.7, toonFloor: 55 },
  // 強: セル画寄り。夕景パレットが破綻しないかを見る上限側の振り幅
  { ambientIntensity: 0.12, keyIntensity: 3.0, rimIntensity: 0.42, environmentIntensity: 0.7, toonFloor: 28 },
]

export const MAX_CONTRAST_LEVEL = LIGHTING_PRESETS.length - 1

/** `?contrast=2` → 2。未指定・不正値は0(現行維持)。範囲外はクランプ */
export function parseContrastLevel(search: string): number {
  const raw = new URLSearchParams(search).get(CONTRAST_QUERY)
  if (raw === null) return 0
  // `?contrast` のように値なしで付けた場合は「とりあえず上げたい」意図とみなす
  if (raw === '') return 1
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(Math.round(parsed), 0), MAX_CONTRAST_LEVEL)
}

export function getLightingPreset(search: string): LightingPreset {
  return LIGHTING_PRESETS[parseContrastLevel(search)]
}

/**
 * 深度エッジ輪郭線のパラメータ。
 * 「パラメータを極端に振って差分を測る」ため全部クエリから上書きできるようにする
 */
export type OutlineTuning = {
  /** 線の太さ(ピクセル)。近傍サンプルのオフセット量 */
  thickness: number
  /** シルエットの閾値。中心の距離に対する相対値なので遠景でも基準が変わらない */
  depthThreshold: number
  /** 折り目(深度の2階差分)の閾値 */
  creaseThreshold: number
  /** 線の濃さ(0〜1) */
  strength: number
  /** この距離から線が薄くなり始める(ワールド単位) */
  fadeNear: number
  /** この距離で線が完全に消える。遠景のネットが線の塊になるのを防ぐ */
  fadeFar: number
  /** 線の色 */
  color: string
}

// 初期案(thickness 1.4 / depth 0.035 / crease 0.03)は u=0.44 の実測で線が弱く、
// バスケットリングとボールの縁が背景に溶けた。閾値を1/4に下げ線を2pxにした値のほうが
// 明らかに良かったのでこちらを既定にする(判断根拠のスクリーンショット比較は #345 に添付)
export const OUTLINE_DEFAULTS: OutlineTuning = {
  thickness: 2,
  depthThreshold: 0.008,
  creaseThreshold: 0.006,
  strength: 0.85,
  fadeNear: 45,
  fadeFar: 110,
  // 夕景パレットに沈む赤褐色。純黒だと画から浮いて「後付けの線」に見える
  color: '#2b1a20',
}

/** クエリの数値を読む。未指定・不正値は fallback */
function readNumber(params: URLSearchParams, key: string, fallback: number): number {
  const raw = params.get(key)
  if (raw === null || raw === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

/** クエリの色を読む。`#` は省略できる(URLでは `#` 以降がフラグメント扱いになるため) */
function readColor(params: URLSearchParams, key: string, fallback: string): string {
  const raw = params.get(key)
  if (raw === null || raw === '') return fallback
  return /^#?[0-9a-fA-F]{6}$/.test(raw) ? (raw.startsWith('#') ? raw : `#${raw}`) : fallback
}

export function isOutlinePreview(search: string): boolean {
  return new URLSearchParams(search).get(OUTLINE_QUERY) !== null
}

export function getOutlineTuning(search: string): OutlineTuning {
  const params = new URLSearchParams(search)
  return {
    thickness: readNumber(params, 'olThickness', OUTLINE_DEFAULTS.thickness),
    depthThreshold: readNumber(params, 'olDepth', OUTLINE_DEFAULTS.depthThreshold),
    creaseThreshold: readNumber(params, 'olCrease', OUTLINE_DEFAULTS.creaseThreshold),
    strength: readNumber(params, 'olStrength', OUTLINE_DEFAULTS.strength),
    fadeNear: readNumber(params, 'olFadeNear', OUTLINE_DEFAULTS.fadeNear),
    fadeFar: readNumber(params, 'olFadeFar', OUTLINE_DEFAULTS.fadeFar),
    color: readColor(params, 'olColor', OUTLINE_DEFAULTS.color),
  }
}

/** ブラウザ外(テスト・SSR)では常に無効。呼び出し側の `typeof window` 分岐を1か所に集める */
export function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search
}
