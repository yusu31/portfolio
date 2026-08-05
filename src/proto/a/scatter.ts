// 小物の散布。**密度**を作るための唯一の仕組み(共通原則4)。
//
// 参考例④(Katamari クローン)は「1つ1つは単純な低ポリだが物量で画が持っている」構成だった。
// 現行シーンはオブジェクト間が空いていてガランとしているので、その逆をやる。
// 手で置くと数を増やせないので、シード付き乱数で散らして件数をパラメータにする。
//
// 完全に決定的(同じシード → 同じ配置)にしてあるのは、
// カット送りで章に戻ってきたときに配置が変わらないようにするため。

/** 小物の形。低ポリの原型を数種類だけ持ち、寸法と色で違いを出す */
export type PropKind = 'box' | 'cylinder' | 'cone' | 'plate' | 'post'

export type ScatterItem = {
  x: number
  z: number
  /** Y軸まわりの回転(ラジアン) */
  rotY: number
  kind: PropKind
  /** 底面の一辺/直径 */
  footprint: number
  /** 高さ */
  height: number
  /** パレットの props 配列のインデックス(0〜3)。色数を増やさないための間接参照 */
  colorIndex: number
}

export type ScatterSpec = {
  seed: number
  count: number
  /** 散布範囲の半径(正方形の半辺)。箱庭のサイズから導出して渡す */
  half: number
  /** 中央の空ける矩形の半辺。主役(人物とボール)と固定物のための余白 */
  exclusionHalf: number
  /** 使う形の重み。章ごとに変えて雰囲気を作る */
  kinds: ReadonlyArray<{ kind: PropKind; weight: number }>
  /** 色のバリエーション数(パレットの props の長さ) */
  colorCount: number
  /** 小物どうしの最小間隔。0にすると重なるが、ジオラマでは多少重なったほうが密に見える */
  minGap: number
}

/**
 * mulberry32。短くて分布が十分な決定的PRNG。
 * Math.random を使わないのは、同じ章に戻るたびに配置が変わると
 * 「カットが決め打ちである」というこの試作の前提が崩れるため
 */
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

/** 重み付き抽選 */
function pickKind(kinds: ScatterSpec['kinds'], r: number): PropKind {
  const total = kinds.reduce((s, k) => s + k.weight, 0)
  let acc = r * total
  for (const k of kinds) {
    acc -= k.weight
    if (acc <= 0) return k.kind
  }
  return kinds[kinds.length - 1].kind
}

/** 形ごとの寸法レンジ。すべて「小さくて単純」に寄せる(物量で見せるので個々は目立たせない) */
const DIMENSIONS: Record<PropKind, { foot: [number, number]; height: [number, number] }> = {
  box: { foot: [0.35, 1.1], height: [0.3, 1.4] },
  cylinder: { foot: [0.3, 0.8], height: [0.35, 1.2] },
  cone: { foot: [0.3, 0.7], height: [0.4, 1.3] },
  // 薄い板。地面に貼り付いて「散らかっている」感じを作る
  plate: { foot: [0.5, 1.4], height: [0.06, 0.18] },
  // 細い柱。垂直の線が入ると密度が一段上がって見える
  post: { foot: [0.1, 0.22], height: [1.2, 3.2] },
}

/**
 * 散布。中央の矩形を避けつつ、最小間隔を守って `count` 個を置く。
 *
 * 棄却サンプリングなので理論上は詰まりうる。試行上限を切って**足りなければ足りないまま返す**
 * 設計にしてあるのは、密度パラメータを極端に振ったときに固まらないようにするため
 * (「見えない=壊れている」と即断せず極端値で差分を測る、という今回の作業原則に合わせている)。
 * 実際に何個置けたかは呼び出し側が length で確認できる
 */
export function scatterProps(spec: ScatterSpec): ScatterItem[] {
  const rand = mulberry32(spec.seed)
  const items: ScatterItem[] = []
  const maxAttempts = spec.count * 40

  for (let attempt = 0; attempt < maxAttempts && items.length < spec.count; attempt++) {
    const x = (rand() * 2 - 1) * spec.half
    const z = (rand() * 2 - 1) * spec.half
    const kindR = rand()
    const footR = rand()
    const heightR = rand()
    const rotR = rand()
    const colorR = rand()

    // 中央は主役と固定物のために空ける
    if (Math.abs(x) < spec.exclusionHalf && Math.abs(z) < spec.exclusionHalf) continue
    if (spec.minGap > 0 && items.some((it) => Math.hypot(it.x - x, it.z - z) < spec.minGap)) continue

    const kind = pickKind(spec.kinds, kindR)
    const dim = DIMENSIONS[kind]
    items.push({
      x,
      z,
      rotY: rotR * Math.PI * 2,
      kind,
      footprint: dim.foot[0] + footR * (dim.foot[1] - dim.foot[0]),
      height: dim.height[0] + heightR * (dim.height[1] - dim.height[0]),
      colorIndex: Math.min(Math.floor(colorR * spec.colorCount), spec.colorCount - 1),
    })
  }

  return items
}

/** 章ごとの形の配合。ここを変えるだけで「校庭っぽさ」「机の上っぽさ」が動く */
export const KIND_MIXES: Record<string, ScatterSpec['kinds']> = {
  // 体育館: 用具と器具。垂直の柱(肋木・支柱)がそこそこ入る
  gym: [
    { kind: 'box', weight: 4 },
    { kind: 'cylinder', weight: 3 },
    { kind: 'plate', weight: 2 },
    { kind: 'post', weight: 2 },
    { kind: 'cone', weight: 1 },
  ],
  // 校庭: コーンと草木。円錐が主役
  field: [
    { kind: 'cone', weight: 4 },
    { kind: 'box', weight: 2 },
    { kind: 'post', weight: 3 },
    { kind: 'cylinder', weight: 2 },
    { kind: 'plate', weight: 1 },
  ],
  // 街のコート: 室外機・柵・標識。箱と柱で人工物に寄せる
  court: [
    { kind: 'box', weight: 4 },
    { kind: 'post', weight: 4 },
    { kind: 'cylinder', weight: 2 },
    { kind: 'plate', weight: 2 },
    { kind: 'cone', weight: 1 },
  ],
  // デスク: 本・箱・カップ。薄い板(紙・カード)が多いほど散らかって見える
  desk: [
    { kind: 'box', weight: 4 },
    { kind: 'plate', weight: 4 },
    { kind: 'cylinder', weight: 3 },
    { kind: 'post', weight: 1 },
  ],
}
