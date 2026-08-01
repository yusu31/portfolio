// 【検証用・Issue #345 段階2】方式A: 深度バッファのスクリーン空間エッジ検出による輪郭線。
//
// ■ なぜNormalPassを使わないのか(このシーン固有の理由)
// drei `<Cloud>` は `depthWrite: false`(core/Cloud.js)。つまり装飾雲4つもダイブヴェールも
// **深度バッファに一切書かない**ので、深度だけを見る限り雲は最初から存在しない。
// 一方 postprocessing の `NormalPass` は `scene.overrideMaterial` でシーンを描き直すため
// (build/index.js の NormalPass.render)、雲が不透明な板として法線バッファに写り、
// **billboardの四角い縁が全部輪郭線になる**。追加パスを増やして絵を壊すことになる。
//
// ■ 折り目線も深度だけで拾う
// 法線バッファが無くても、深度の**2階差分**を見れば「面が折れている」場所は分かる。
// 傾いた平面は1階差分が一定 = 2階差分が0になるので、床や斜面は線にならない。
import { useEffect, useMemo } from 'react'
import { BlendFunction, Effect, EffectAttribute } from 'postprocessing'
import * as THREE from 'three'
import {
  currentSearch,
  getOutlineTuning,
  isOutlinePreview,
  type OutlineTuning,
} from './nprPreview'

// postprocessing の effect.frag プレリュードが `depthBuffer` / `readDepth(uv)` /
// `getViewZ(depth)` / `texelSize` / `cameraNear` / `cameraFar` を注入済みなので、
// 追加のuniform配線なしにそのまま使える(build/index.js の effect.frag で確認)
const fragmentShader = /* glsl */ `
uniform vec3 lineColor;
uniform float thickness;
uniform float depthThreshold;
uniform float creaseThreshold;
uniform float strength;
uniform vec2 fadeRange;

/** カメラからの線形距離(正値)。非線形な深度値のまま引き算すると近景だけ過敏になる */
float linearDistanceAt(const in vec2 uv) {
  return -getViewZ(readDepth(uv));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float dC = -getViewZ(depth);

  vec2 o = texelSize * thickness;
  float dL = linearDistanceAt(uv - vec2(o.x, 0.0));
  float dR = linearDistanceAt(uv + vec2(o.x, 0.0));
  float dU = linearDistanceAt(uv + vec2(0.0, o.y));
  float dD = linearDistanceAt(uv - vec2(0.0, o.y));

  // ① シルエット: 近傍との距離差の最大値。中心距離で正規化するので、
  //    同じ「手前に飛び出している量」なら遠くても近くても同じ強さで線になる
  float maxDiff = max(max(abs(dL - dC), abs(dR - dC)), max(abs(dU - dC), abs(dD - dC)));
  float silhouetteEdge = depthThreshold * dC;
  // step()だとMSAA非搭載の環境でジャギるので、閾値の2倍までを立ち上がり幅にして軟らかくする
  float silhouette = smoothstep(silhouetteEdge, silhouetteEdge * 2.0, maxDiff);

  // ② 折り目: 深度の2階差分。斜面(1階差分が一定)では0になるため、
  //    地面やコート面が一様に線で埋まるのを防げる
  float curvature = abs(dL + dR - 2.0 * dC) + abs(dU + dD - 2.0 * dC);
  float creaseEdge = creaseThreshold * dC;
  float crease = smoothstep(creaseEdge, creaseEdge * 2.0, curvature);

  float edge = max(silhouette, crease);

  // 遠景ほど薄く。ネットのような細い格子は遠いとピクセル単位で深度が暴れ、
  // フェードが無いと画面奥が線のノイズで埋まる
  float fade = 1.0 - smoothstep(fadeRange.x, fadeRange.y, dC);

  outputColor = vec4(mix(inputColor.rgb, lineColor, edge * fade * strength), inputColor.a);
}
`

class DepthOutlineEffect extends Effect {
  constructor(tuning: OutlineTuning) {
    super('DepthOutlineEffect', fragmentShader, {
      // DEPTH を宣言すると EffectPass が深度テクスチャを要求し、mainImage に depth が渡る
      attributes: EffectAttribute.DEPTH,
      // 自前で mix 済みの色を出すので、合成はそのまま置き換える
      blendFunction: BlendFunction.SRC,
      uniforms: new Map<string, THREE.Uniform>([
        ['lineColor', new THREE.Uniform(new THREE.Color(tuning.color))],
        ['thickness', new THREE.Uniform(tuning.thickness)],
        ['depthThreshold', new THREE.Uniform(tuning.depthThreshold)],
        ['creaseThreshold', new THREE.Uniform(tuning.creaseThreshold)],
        ['strength', new THREE.Uniform(tuning.strength)],
        ['fadeRange', new THREE.Uniform(new THREE.Vector2(tuning.fadeNear, tuning.fadeFar))],
      ]),
    })
  }
}

/**
 * `?outline=1` のときだけ輪郭線エフェクトを EffectComposer に差し込む。
 *
 * `wrapEffect` を使わず `<primitive>` で渡すのは、`wrapEffect` 内部の
 * `useMemo(..., [JSON.stringify(props)])` を踏まないため(このコードベースで既知の
 * @react-three/postprocessing v3の制約。ScrollJourneyPoc.tsx のrefコメント参照)。
 * EffectComposer は子の `__r3f` を走査して `instanceof Effect` で拾うので、
 * primitive で渡しても正しく EffectPass に組まれる
 */
export function DepthOutline() {
  const enabled = isOutlinePreview(currentSearch())
  const effect = useMemo(() => (enabled ? new DepthOutlineEffect(getOutlineTuning(currentSearch())) : null), [enabled])

  useEffect(() => () => effect?.dispose(), [effect])

  if (!effect) return null
  return <primitive object={effect} dispose={null} />
}
