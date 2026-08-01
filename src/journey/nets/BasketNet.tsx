// バスケットネットの描画。リング中心をローカル原点として吊り下がる。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §3.3 / §3.4
// 実装順序④でu軸ベイクVerlet(basketNetBake.ts)を載せた。結び目位置の供給元が
// 静止形状から「ベイクテーブルの補間 + 風の加算」に変わっただけで、
// 行列を組む部分(writeInstanceMatrices)は①のまま無変更で動いている。
//
// コードをLineSegmentsではなくInstancedMeshの円柱にするのは、厚みゼロの線が確実に
// チープに見えるため。結び目の球は円柱の継ぎ目を埋めつつ実物のディテールにもなる。
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import {
  NET_CORD_COUNT,
  NET_CORD_RADIUS,
  NET_KNOT_RADIUS,
  NET_COLOR,
  NET_SIMULATED_COUNT,
  NET_COLUMNS,
  netCords,
  netRestPositions,
} from './basketNetGeometry'
import { applyNetWind, ensureNetBake, sampleNetBake } from './basketNetBake'
import { advanceWindTime, isWindFrozen } from './netWind'
import { useReducedMotion } from '../useReducedMotion'

/** 円柱の軸(+Y)を線分方向へ向けるための基準ベクトル */
const CYLINDER_AXIS = new THREE.Vector3(0, 1, 0)

/**
 * 結び目位置の配列からコード(円柱)と結び目(球)のインスタンス行列を書き込む。
 * `positions` は段0(ピン留め12個)を含む全結び目。`cords` のインデックスもそれ基準
 */
function writeInstanceMatrices(
  positions: THREE.Vector3[],
  cords: readonly [number, number][],
  cordMesh: THREE.InstancedMesh,
  knotMesh: THREE.InstancedMesh,
  scratch: {
    matrix: THREE.Matrix4
    mid: THREE.Vector3
    dir: THREE.Vector3
    quat: THREE.Quaternion
    scale: THREE.Vector3
    identityQuat: THREE.Quaternion
    unitScale: THREE.Vector3
  }
) {
  const { matrix, mid, dir, quat, scale, identityQuat, unitScale } = scratch

  for (let i = 0; i < cords.length; i++) {
    const a = positions[cords[i][0]]
    const b = positions[cords[i][1]]
    mid.addVectors(a, b).multiplyScalar(0.5)
    dir.subVectors(b, a)
    const length = dir.length()
    // 高さ1の円柱をscale.yで伸ばす。長さ0の退化ケースは起きないが念のため下限を敷く
    quat.setFromUnitVectors(CYLINDER_AXIS, dir.divideScalar(length || 1))
    scale.set(1, Math.max(length, 1e-4), 1)
    cordMesh.setMatrixAt(i, matrix.compose(mid, quat, scale))
  }
  cordMesh.instanceMatrix.needsUpdate = true

  // 結び目は段1以降のみ(段0はリングに隠れるため描かない)。positionsの先頭NET_COLUMNS個が段0
  for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
    knotMesh.setMatrixAt(i, matrix.compose(positions[NET_COLUMNS + i], identityQuat, unitScale))
  }
  knotMesh.instanceMatrix.needsUpdate = true
}

export function BasketNet() {
  const cordRef = useRef<THREE.InstancedMesh>(null)
  const knotRef = useRef<THREE.InstancedMesh>(null)
  const scroll = useScroll()
  const motion = useReducedMotion()

  const { rest, cords, live, simulated, scratch } = useMemo(() => {
    // ベイク(実測約96ms)はここで済ませる。マウントはローダーが出ている間に起きるので
    // 体感ゼロだが、スクロールが窓に差しかかってから遅延ベイクすると見せ場でフレームが落ちる
    ensureNetBake()
    const restPositions = netRestPositions()
    return {
      rest: restPositions,
      cords: netCords(),
      // 描画に渡す全結び目(段0はrestのまま固定、段1以降を毎フレーム書き換える)
      live: restPositions.map((p) => p.clone()),
      // ベイクテーブルの読み出し先(段1〜5の60個)。毎フレーム再利用してアロケーションを避ける
      simulated: Array.from({ length: NET_SIMULATED_COUNT }, () => new THREE.Vector3()),
      scratch: {
        matrix: new THREE.Matrix4(),
        mid: new THREE.Vector3(),
        dir: new THREE.Vector3(),
        quat: new THREE.Quaternion(),
        scale: new THREE.Vector3(),
        identityQuat: new THREE.Quaternion(),
        unitScale: new THREE.Vector3(1, 1, 1),
      },
    }
  }, [])

  const windTimeRef = useRef(0)

  useFrame((_, delta) => {
    if (!cordRef.current || !knotRef.current) return
    // ベイクは u の純関数。スクロールを止めればネットも止まり、逆再生も対称になる
    sampleNetBake(scroll.offset, simulated, rest)
    const frozen = motion === 0 || isWindFrozen()
    windTimeRef.current = advanceWindTime(windTimeRef.current, delta, frozen)
    applyNetWind(simulated, rest, windTimeRef.current)
    for (let i = 0; i < NET_SIMULATED_COUNT; i++) live[NET_COLUMNS + i].copy(simulated[i])
    writeInstanceMatrices(live, cords, cordRef.current, knotRef.current, scratch)
  })

  return (
    <group>
      {/* frustumCulled={false} は必須。InstancedMeshの既定のバウンディングは
          「高さ1の円柱1個」なのでリング中心付近の極小球になり、ネット本体(半径3・
          長さ5.25)が画面内でもリング中心が画面外に出た瞬間に消える。
          drei <Clouds> で踏んだのと同種の事故([[feedback-drei-clouds-frustum-culling]]) */}
      <instancedMesh ref={cordRef} args={[undefined, undefined, NET_CORD_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[NET_CORD_RADIUS, NET_CORD_RADIUS, 1, 6, 1, true]} />
        <meshStandardMaterial color={NET_COLOR} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={knotRef} args={[undefined, undefined, NET_SIMULATED_COUNT]} frustumCulled={false}>
        <icosahedronGeometry args={[NET_KNOT_RADIUS, 0]} />
        <meshStandardMaterial color={NET_COLOR} roughness={0.85} />
      </instancedMesh>
    </group>
  )
}
