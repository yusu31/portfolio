// 輪郭線。**B の `proto/b/outline.ts` をそのまま移植したもの**(設計書 §5.3)。
// 稜線の出し方・打ち切り規則・足切りの閾値は1つも変えていない。
//
// ⚠ **輪郭線を入れるかどうかは PR 5 で決める**(§9)。窓・看板(PR 4)を入れると
//   「壁に情報が無いから溶ける」という前提が変わるので、測ってから決める。
//   ここで移植したのは `boxes.ts` が `OutlineBox` / `shouldOutline` に依存しているためで、
//   同時に `?ol=0` / `?ol=1` の撮り比べ(§9 の判定手順)ができる状態になる。
//
// ■ 方式の選定(B の判断をそのまま引き継ぐ)
// 現行シーンに残っている `journey/DepthOutline.tsx` は深度バッファのスクリーン空間エッジ検出だが、
// あれは**現行シーン固有の事情**(drei `<Cloud>` が depthWrite:false なので法線パスが使えない)に
// 合わせた設計。街は低ポリの直方体の集合なので、**箱の12稜線を解析的に出す**ほうが確実に
// 「はっきりした線」になり、スクリーン空間の閾値調整が要らない(遠景で線がノイズにならない)。
// 逆ハルは PR #351 で却下済み — 直方体では法線が不連続で角が割れるため。
//
// ■ データと描画を分ける
// 稜線が純粋な数値配列なら、本数・間引きの効き方をテストで縛れる。

/** 輪郭線を出す対象の箱。街の建物・上部構造・大きめの小物がこれになる */
export type OutlineBox = {
  /** 中心座標 */
  center: readonly [number, number, number]
  /** 全長(半分ではない) */
  size: readonly [number, number, number]
  /** Y軸まわりの回転(ラジアン) */
  rotY: number
}

/**
 * 直方体の12稜線を、頂点インデックスの組で表したもの。
 * 頂点番号はビットで、x方向=1 / y方向=2 / z方向=4。
 * 1ビットだけ違う組み合わせが辺になる(= 12通り)
 */
export const BOX_EDGE_INDICES: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

/** 8頂点をワールド座標で返す。並びは BOX_EDGE_INDICES のビット規約に従う */
export function boxCorners(box: OutlineBox): [number, number, number][] {
  const [cx, cy, cz] = box.center
  const hx = box.size[0] / 2
  const hy = box.size[1] / 2
  const hz = box.size[2] / 2
  const cos = Math.cos(box.rotY)
  const sin = Math.sin(box.rotY)

  const out: [number, number, number][] = []
  for (let i = 0; i < 8; i++) {
    const lx = (i & 1 ? 1 : -1) * hx
    const ly = (i & 2 ? 1 : -1) * hy
    const lz = (i & 4 ? 1 : -1) * hz
    // Y軸回転のみ。街の要素はすべて地面に垂直に立っているのでこれで足りる
    out.push([cx + lx * cos + lz * sin, cy + ly, cz - lx * sin + lz * cos])
  }
  return out
}

/** 1つの箱の稜線を、線分リスト(2点で1本)として平坦な数値配列にする。12本 = 24点 = 72要素 */
export function boxEdgeSegments(box: OutlineBox): number[] {
  const corners = boxCorners(box)
  const out: number[] = []
  for (const [a, b] of BOX_EDGE_INDICES) {
    out.push(corners[a][0], corners[a][1], corners[a][2])
    out.push(corners[b][0], corners[b][1], corners[b][2])
  }
  return out
}

/**
 * 輪郭線を出すかどうかの判定。
 *
 * **小さい物まで全部に線を引くと、遠景で線が団子になって密度がノイズに変わる**。
 * ①の実物でも線が乗っているのは建物・階段・手すり・電柱といった構造物で、
 * 細かい散乱物は色の塊として置かれている。ここで足切りするのはその再現
 */
export function shouldOutline(size: readonly [number, number, number], minExtent: number): boolean {
  return Math.max(size[0], size[1], size[2]) >= minExtent
}

/**
 * 複数の箱をまとめて1本のバッファにする。描画は `<lineSegments>` 1つで済む。
 *
 * `maxSegments` で必ず打ち切るのは、密度パラメータを極端に振ったときに
 * 線だけでフレームを落とさないため(街の密度は上げる方向に振られる前提なので上限を持たせる)
 */
export function outlinedBoxLimit(maxSegments: number = 20000): number {
  return Math.max(0, Math.floor(maxSegments / BOX_EDGE_INDICES.length))
}

export function buildEdgeBuffer(boxes: readonly OutlineBox[], maxSegments: number = 20000): Float32Array {
  const segmentsPerBox = BOX_EDGE_INDICES.length
  const used = boxes.slice(0, outlinedBoxLimit(maxSegments))

  const out = new Float32Array(used.length * segmentsPerBox * 6)
  let o = 0
  for (const box of used) {
    const seg = boxEdgeSegments(box)
    out.set(seg, o)
    o += seg.length
  }
  return out
}

/** バッファに入っている線分の本数。テストと、描画側の件数確認に使う */
export function segmentCount(buffer: Float32Array): number {
  return buffer.length / 6
}

/**
 * 稜線の頂点ごとの色。`buildEdgeBuffer` と**同じ打ち切り規則**で作るので、
 * 位置と色が必ず対応する(別々に切ると線の色がひとつずつズレる)。
 *
 * 箱ごとに色を変えられるようにしてあるのは、輪郭線の色も**その箱自身の位置**の
 * パレットから引くため(夜の章の線は暗く、朝の章の線は明るい)
 */
export function buildEdgeColorBuffer(
  boxes: readonly OutlineBox[],
  colorOf: (box: OutlineBox, index: number) => readonly [number, number, number],
  maxSegments: number = 20000
): Float32Array {
  const used = boxes.slice(0, outlinedBoxLimit(maxSegments))
  const verticesPerBox = BOX_EDGE_INDICES.length * 2
  const out = new Float32Array(used.length * verticesPerBox * 3)

  used.forEach((box, i) => {
    const [r, g, b] = colorOf(box, i)
    const base = i * verticesPerBox * 3
    for (let v = 0; v < verticesPerBox; v++) {
      out[base + v * 3] = r
      out[base + v * 3 + 1] = g
      out[base + v * 3 + 2] = b
    }
  })

  return out
}
