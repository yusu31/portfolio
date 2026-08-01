// ダイブ演出(#6)の地面フェード(ground-hole)。ボールの真下の地面を円形にくり抜き、
// 「ネットを抜けたボールが地面に開いた穴へ落ちていく」表現を成立させる(Issue #327)。
//
// 強さの包絡線は diveVeilEnvelope.ts の diveHoleStrength(u) と単一ソース。
// 主役はあくまで DiveCloudVeil(密な雲)で、こちらは雲が隠しきれない縁を補う補助的な効果
// (DiveCloudVeil.tsx 冒頭のコメントと同じ役割分担)。
//
// 実装方式は netWind.ts と同じ onBeforeCompile 注入。ただし風が**頂点**シェーダーなのに対し、
// 穴は**フラグメント**シェーダーで diffuseColor.a を削る。
import * as THREE from 'three'

/**
 * 全開時(strength=1)の穴の半径。ボール半径1.5の約4.7倍。
 *
 * DiveCloudVeilの雲塊(bounds=[9,6,9] → 半幅4.5)より広く取る: 雲より穴が小さいと
 * 「雲の奥にまだ地面がある」のが透けて見えて、落下していく感じが出ない。
 * 逆に広げすぎるとバレーコート(z=-155.75が近端)に届いてしまう(groundHole.test.tsで担保)
 */
export const GROUND_HOLE_RADIUS = 7.0

/**
 * 穴の縁のぼかし幅。地面はtransparentで描くので、この幅でalphaが0→1へ滑らかに戻る。
 *
 * strengthが小さいうちは穴の半径(RADIUS×strength)がこの幅より狭く、中心でもalphaが
 * 0まで落ちない。結果として「薄く滲み始める → 貫通する → 塞がる」という開き方になる
 */
export const GROUND_HOLE_FEATHER = 3.0

/**
 * 地面の穴のalpha倍率(0=完全に抜ける, 1=無傷)。GLSL側と同じ式をTSで表現した検証用の実体。
 *
 * `mix(1, smoothstep(...), strength)` の形にしているのは、**strength=0で厳密に1**を返す
 * ためで、これが無いと旅の全区間でボール直下の地面が薄く欠ける(半径0でもfeatherぶんの
 * 裾が残るため)。diveVeilEnvelopeが区間外で厳密に0を返す設計と同じ考え方
 *
 * @param distance ボールXZから地面上の点までの水平距離
 * @param strength diveHoleStrength(u) の値(0〜1)
 */
export function groundHoleAlpha(distance: number, strength: number): number {
  const radius = GROUND_HOLE_RADIUS * strength
  const edge = THREE.MathUtils.smoothstep(distance, radius - GROUND_HOLE_FEATHER, radius)
  return THREE.MathUtils.lerp(1, edge, strength)
}

/** シェーダーへ渡す穴のuniform群 */
export interface GroundHoleUniforms {
  /** 穴の中心(ボールのワールドXZ) */
  uHoleCenter: { value: THREE.Vector2 }
  /** 穴の強さ = diveHoleStrength(u) */
  uHoleStrength: { value: number }
  uHoleRadius: { value: number }
  uHoleFeather: { value: number }
}

export function createGroundHoleUniforms(): GroundHoleUniforms {
  return {
    uHoleCenter: { value: new THREE.Vector2(0, 0) },
    uHoleStrength: { value: 0 },
    uHoleRadius: { value: GROUND_HOLE_RADIUS },
    uHoleFeather: { value: GROUND_HOLE_FEATHER },
  }
}

/** 頂点・フラグメント両方の宣言部に足すGLSL(varyingは両方で宣言が要る) */
export const GROUND_HOLE_PARS = /* glsl */ `
varying vec3 vHoleWorldPos;
uniform vec2 uHoleCenter;
uniform float uHoleStrength;
uniform float uHoleRadius;
uniform float uHoleFeather;
`

/**
 * `#include <begin_vertex>` の直後に足すGLSL。ワールド座標をフラグメントへ渡す。
 *
 * 穴は「ワールド空間の円柱」なので、地面(ワールド原点基準)とコート面(ヴェニュー中心へ
 * 平行移動したgroup配下)という**親の異なる2枚**に同じ式で穴を開けられる。
 * netWind.tsと同じくmodelMatrixで自前にワールド化している
 */
export const GROUND_HOLE_BEGIN_VERTEX = /* glsl */ `
#include <begin_vertex>
vHoleWorldPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`

/**
 * `#include <alphamap_fragment>` の直後に足すGLSL。groundHoleAlpha()と同じ式。
 *
 * 挿入位置がalphamapの後なのは、three.jsのフラグメントチャンク順で
 * `diffuseColor.a` が確定するのがここだから(この直後の`<alphatest_fragment>`より前に
 * 削っておく必要がある)
 */
export const GROUND_HOLE_ALPHA_FRAGMENT = /* glsl */ `
#include <alphamap_fragment>
float holeDist = distance( vHoleWorldPos.xz, uHoleCenter );
float holeRadius = uHoleRadius * uHoleStrength;
float holeEdge = smoothstep( holeRadius - uHoleFeather, holeRadius, holeDist );
diffuseColor.a *= mix( 1.0, holeEdge, uHoleStrength );
`

/** meshStandardMaterialに地面の穴を注入する `onBeforeCompile` */
export function groundHoleOnBeforeCompile(uniforms: GroundHoleUniforms) {
  return (shader: {
    vertexShader: string
    fragmentShader: string
    uniforms: Record<string, { value: unknown }>
  }) => {
    shader.uniforms.uHoleCenter = uniforms.uHoleCenter
    shader.uniforms.uHoleStrength = uniforms.uHoleStrength
    shader.uniforms.uHoleRadius = uniforms.uHoleRadius
    shader.uniforms.uHoleFeather = uniforms.uHoleFeather
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GROUND_HOLE_PARS}`)
      .replace('#include <begin_vertex>', GROUND_HOLE_BEGIN_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${GROUND_HOLE_PARS}`)
      .replace('#include <alphamap_fragment>', GROUND_HOLE_ALPHA_FRAGMENT)
  }
}

/** 穴マテリアルのプログラムキャッシュキー。素の meshStandardMaterial と混ざらないようにする */
export const GROUND_HOLE_CACHE_KEY = 'groundHole'

/**
 * 地面の穴付きマテリアルを作る。
 *
 * **`transparent: true` は旅の全区間で立てっぱなしにする**。three.jsは`transparent`から
 * 導く`opaque`をプログラムパラメータに含めるため、毎フレーム切り替えるとシェーダーの
 * 再コンパイルが走り、よりによって見せ場でフレームが落ちる(ベイクを遅延させない判断と同じ)。
 * strength=0のときalphaは厳密に1なので、描画順以外は不透明時と同じ絵になる
 */
export function createGroundHoleMaterial(
  params: THREE.MeshStandardMaterialParameters,
  uniforms: GroundHoleUniforms
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ ...params, transparent: true })
  material.onBeforeCompile = groundHoleOnBeforeCompile(uniforms)
  material.customProgramCacheKey = () => GROUND_HOLE_CACHE_KEY
  return material
}
