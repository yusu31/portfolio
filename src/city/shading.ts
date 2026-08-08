// 箱に**縦の陰影を焼く**。街の壁が「1枚の単色の板」に見えないようにするための工夫。
//
// ■ なぜ要るか
// B の既知の弱点は「建物が無地の板で、近景の壁が大きな単色面になる」ことだった(§8.1)。
// 窓・看板を貼る本命は PR 4(C からの移植)だが、それとは別に**面そのものの明度が
// 一定であること**が板っぽさの原因になっている。街の谷間では足元ほど空が見えないので、
// 実際の壁は下が暗く上が明るい。これを頂点色として焼いておけば、
// ライトを増やさずに壁が「立っている塊」として読める。
//
// ■ なぜ頂点色でできるのか(three.js の実装を確認済み)
// `color_vertex.glsl.js` は `vColor` を 1.0 で初期化してから、
//   `vColor.rgb *= color;`          ← ジオメトリの頂点色属性
//   `vColor.rgb *= instanceColor;`  ← InstancedMesh の per-instance 色
// の順に**掛け算**する(three 0.184)。つまり**共有ジオメトリに焼いた縦グラデーション ×
// インスタンスごとのパレット色**になるので、箱が何百個あっても追加コストはゼロで、
// パレットの色数も増えない(明度の倍率でしかない)。
//
// 頂点色は色空間の変換を通らない(sRGB → Linear の変換が入るのは `Color.set()` の側)ので、
// ここで作る値は**リニア空間の倍率**としてそのまま乗る。それが欲しい挙動。
import * as THREE from 'three'

/**
 * 底の倍率。1.0 より小さいぶんが接地の陰(空が見えない足元)。
 *
 * ⚠ **0.78 では効かなかった**(2026-08-08 実測)。街区の壁は画面上端を越える高さなので、
 *   **画面に写るのは箱のローカル高さの下半分だけ**。そこに `GRADIENT_CURVE` の
 *   立ち上がりが集まっているぶん、底の値がそのまま「見える範囲の暗さ」を決める。
 *   0.78 のときの実測は壁の全可視高で **6%**(#cfbbb9 → #c3adab)しか動かず、
 *   フォグによる距離減衰と区別できなかった
 */
export const GRADIENT_BASE = 0.6
/** 天の倍率。1.0 より大きいぶんが空の照り返し。**画面外になりがちなので効きは小さい** */
export const GRADIENT_TOP = 1.12
/**
 * 明度の立ち上がりの鋭さ。1 未満で**足元に陰が集まる**。
 * 線形(1.0)だと壁の全高にわたって均一に明るくなるだけで、接地しているように見えない
 */
export const GRADIENT_CURVE = 0.55

/**
 * ジオメトリの高さ方向 0〜1 における明度の倍率。
 * `bakeVerticalGradient` と描画側が同じ式を見るために切り出してある
 */
export function verticalGradientFactor(
  y01: number,
  base: number = GRADIENT_BASE,
  top: number = GRADIENT_TOP,
  curve: number = GRADIENT_CURVE
): number {
  const u = Math.min(Math.max(y01, 0), 1)
  return base + (top - base) * Math.pow(u, curve)
}

/**
 * ジオメトリに縦グラデーションを頂点色として焼く。**同じジオメトリを使う全インスタンスに効く**。
 *
 * 高さの正規化はジオメトリ自身のバウンディングボックスで行うので、単位立方体でも円錐でも
 * そのまま使える。y の分割が無いジオメトリでは端の2値しか出ないため、
 * 曲線を効かせたいときは呼び出し側で `heightSegments` を分割しておくこと
 */
export function bakeVerticalGradient(
  geometry: THREE.BufferGeometry,
  base: number = GRADIENT_BASE,
  top: number = GRADIENT_TOP,
  curve: number = GRADIENT_CURVE
): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry

  const minY = box.min.y
  const height = box.max.y - minY || 1
  const colors = new Float32Array(position.count * 3)

  for (let i = 0; i < position.count; i++) {
    const f = verticalGradientFactor((position.getY(i) - minY) / height, base, top, curve)
    colors[i * 3] = f
    colors[i * 3 + 1] = f
    colors[i * 3 + 2] = f
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}
