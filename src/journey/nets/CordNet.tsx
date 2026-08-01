// マージ済み静的ジオメトリ + 頂点シェーダーの風で描くネット(サッカー/バレー共通)。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §4
// バスケネット(BasketNet.tsx)はu軸ベイク物理で毎フレームCPUがインスタンス行列を書くが、
// こちらはボールが接触しないのでCPUは毎フレーム**uniformを1つ更新するだけ**。
//
// frustumCulled は既定(true)のまま。InstancedMeshと違ってマージ済みジオメトリの
// バウンディングスフィアはネット全体を正しく含むため、BasketNetで必要だった
// frustumCulled={false} はここでは不要(むしろ切ったほうが遠景で無駄になる)
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import { buildCordNetGeometry, type CordNetSpec } from './cordNetGeometry'
import { advanceWindTime, createNetWindUniforms, createNetWindMaterial, isWindFrozen } from './netWind'
import { useReducedMotion } from '../useReducedMotion'

export function CordNet({
  spec,
  color,
  windAmplitude,
}: {
  spec: CordNetSpec
  color: string
  windAmplitude: number
}) {
  const uniforms = useMemo(() => createNetWindUniforms(windAmplitude), [windAmplitude])
  const geometry = useMemo(() => buildCordNetGeometry(spec), [spec])
  const material = useMemo(() => createNetWindMaterial(color, uniforms), [color, uniforms])
  const timeRef = useRef(uniforms.uWindTime.value)
  // reduced-motion時は風を止める。ネットは静止形状のままでも「実体のある網」として成立し、
  // 演出上の意味(ボールの通過)を失わないため(cameraAttitudeと同じ考え方)
  const motion = useReducedMotion()

  // useMemoで作った資源はR3Fの自動disposeの対象外(宣言的に生成したものだけが対象)
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    const frozen = motion === 0 || isWindFrozen()
    timeRef.current = advanceWindTime(timeRef.current, delta, frozen)
    uniforms.uWindTime.value = timeRef.current
  })

  return <mesh geometry={geometry} material={material as THREE.Material} />
}
