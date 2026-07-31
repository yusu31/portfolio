// バスケットネットの描画。リング中心をローカル原点として吊り下がる。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §3.3
// 実装順序①(静止ジオメトリのみ)の段階。物理(u軸ベイクVerlet)と風は後続で
// `positions` の供給元を差し替えるだけで載る構造にしてある。
//
// コードをLineSegmentsではなくInstancedMeshの円柱にするのは、厚みゼロの線が確実に
// チープに見えるため。結び目の球は円柱の継ぎ目を埋めつつ実物のディテールにもなる。
import { useLayoutEffect, useMemo, useRef } from 'react'
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

/** 円柱の軸(+Y)を線分方向へ向けるための基準ベクトル */
const CYLINDER_AXIS = new THREE.Vector3(0, 1, 0)

/**
 * 結び目位置の配列からコード(円柱)と結び目(球)のインスタンス行列を書き込む。
 * 物理を載せたあとも毎フレームこの関数を呼ぶだけで済むよう、副作用を行列書き込みに限定している
 */
function writeInstanceMatrices(
  positions: THREE.Vector3[],
  cords: readonly [number, number][],
  cordMesh: THREE.InstancedMesh,
  knotMesh: THREE.InstancedMesh
) {
  const matrix = new THREE.Matrix4()
  const mid = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scale = new THREE.Vector3()

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
  const identityQuat = new THREE.Quaternion()
  const unitScale = new THREE.Vector3(1, 1, 1)
  for (let i = 0; i < NET_SIMULATED_COUNT; i++) {
    knotMesh.setMatrixAt(i, matrix.compose(positions[NET_COLUMNS + i], identityQuat, unitScale))
  }
  knotMesh.instanceMatrix.needsUpdate = true
}

export function BasketNet() {
  const cordRef = useRef<THREE.InstancedMesh>(null)
  const knotRef = useRef<THREE.InstancedMesh>(null)

  const { positions, cords } = useMemo(() => ({ positions: netRestPositions(), cords: netCords() }), [])

  useLayoutEffect(() => {
    if (!cordRef.current || !knotRef.current) return
    writeInstanceMatrices(positions, cords, cordRef.current, knotRef.current)
  }, [positions, cords])

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
