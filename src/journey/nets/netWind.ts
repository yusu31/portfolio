// ネットの風(頂点シェーダー注入)と、QA用に風の時刻を固定するスイッチ。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §4.1 / §7.2
//
// 風は「offsetが唯一の真実」原則の**例外**にあたる時間駆動の動きだが、
// (位置, 時刻)の閉形式・ステートレス関数に限定することで状態を持たせない(設計原則2)。
// ボールと相互作用しない=決定論を要求しないので、この範囲なら時間駆動でよい。
//
// ただし**このプロジェクトはPlaywrightスクリーンショットQAに強く依存している**ため、
// 時間駆動のままだと毎回違う絵になり比較ができない。風の時刻を固定するスイッチを
// 実装の最初から入れておく(設計書§7.2)。
import * as THREE from 'three'

/** QA用グローバルフラグ。Playwrightから `window.__freezeNetWind = true` で切り替える */
export const WIND_FREEZE_FLAG = '__freezeNetWind'
/** QA用クエリパラメータ。`/scroll-poc?freezeWind=1` で最初から固定して開ける */
export const WIND_FREEZE_QUERY = 'freezeWind'
/**
 * 固定時の風の時刻。0(=位相ゼロ)にしないのは、そこで各sin項が揃って変位がほぼ無くなり
 * 「風が止まっている」のか「風が実装されていない」のか区別できなくなるため。
 * 中途半端な位相にしておくと、風が効いていることをスクリーンショットで確認できる
 */
export const WIND_FROZEN_TIME = 12.5

/** 風の時刻を固定すべきか。フラグ→クエリの順に見る(実行中の切り替えを効かせるため毎フレーム評価する) */
export function isWindFrozen(): boolean {
  if (typeof window === 'undefined') return true
  if ((window as unknown as Record<string, unknown>)[WIND_FREEZE_FLAG] === true) return true
  return new URLSearchParams(window.location.search).get(WIND_FREEZE_QUERY) !== null
}

/**
 * 風の時刻を進める。固定中は毎フレーム同じ値を返すので、スクリーンショットが完全に再現する。
 * 固定を解除すると WIND_FROZEN_TIME から連続して進む(飛びが起きない)
 */
export function advanceWindTime(previous: number, delta: number, frozen: boolean): number {
  return frozen ? WIND_FROZEN_TIME : previous + delta
}

/** シェーダーへ渡す風のuniform群 */
export interface NetWindUniforms {
  uWindTime: { value: number }
  uWindAmp: { value: number }
}

export function createNetWindUniforms(amplitude: number): NetWindUniforms {
  return { uWindTime: { value: WIND_FROZEN_TIME }, uWindAmp: { value: amplitude } }
}

/** 頂点シェーダーの宣言部に足すGLSL */
export const NET_WIND_PARS_VERTEX = /* glsl */ `
attribute float windWeight;
uniform float uWindTime;
uniform float uWindAmp;
`

/**
 * `#include <begin_vertex>` を置き換えるGLSL。
 *
 * 変位はワールド座標の位相を持つsin重畳にする。理由は2つ:
 * - コード断面の6頂点は互いに0.05ユニット以内にあるため、ほぼ同一の変位を受けて
 *   **断面が崩れずコード全体が平行移動する**(細い円柱が潰れない)
 * - サッカーとバレーはワールドzが130ユニット離れているため、同じ式でも位相が大きく違い、
 *   2つのネットが同期して揺れて見えることがない
 *
 * 変位をワールド空間で作ってオブジェクト空間の transformed に直接足しているのは、
 * **ネットの親グループが平行移動のみ(回転・スケールなし)** だから成り立つ近似。
 * venues.tsx でネットグループを回転させる場合はここも直す必要がある
 */
export const NET_WIND_BEGIN_VERTEX = /* glsl */ `
vec3 transformed = vec3( position );
vec3 windPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
float g1 = sin( windPos.z * 0.42 + windPos.y * 0.31 + uWindTime * 1.35 );
float g2 = sin( windPos.x * 0.55 - windPos.z * 0.27 + uWindTime * 0.95 + 1.7 );
float g3 = sin( windPos.y * 0.62 + windPos.x * 0.23 + uWindTime * 0.70 + 3.1 );
vec3 gust = vec3(
  g1 * 0.75 + g3 * 0.25,
  g3 * 0.35 + g2 * 0.15,
  g2 * 0.80 + g1 * 0.20
);
transformed += gust * windWeight * uWindAmp;
`

/**
 * meshStandardMaterialに風を注入する `onBeforeCompile`。
 *
 * 法線は再計算しない: 変位は断面より2桁大きいスケールの滑らかな場で、コード全体が
 * ほぼ平行移動するだけなので、陰影のズレは目視できない(頂点シェーダー内で
 * 微分から法線を作り直すコストに見合わない)
 */
export function netWindOnBeforeCompile(uniforms: NetWindUniforms) {
  return (shader: { vertexShader: string; uniforms: Record<string, { value: unknown }> }) => {
    shader.uniforms.uWindTime = uniforms.uWindTime
    shader.uniforms.uWindAmp = uniforms.uWindAmp
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${NET_WIND_PARS_VERTEX}`)
      .replace('#include <begin_vertex>', NET_WIND_BEGIN_VERTEX)
  }
}

/** 風マテリアルのプログラムキャッシュキー。素の meshStandardMaterial と混ざらないようにする */
export const NET_WIND_CACHE_KEY = 'cordNetWind'

/** 風付きのネット用マテリアルを作る */
export function createNetWindMaterial(color: string, uniforms: NetWindUniforms): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  material.onBeforeCompile = netWindOnBeforeCompile(uniforms)
  material.customProgramCacheKey = () => NET_WIND_CACHE_KEY
  return material
}
