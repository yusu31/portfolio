import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Crystal() {
  const groupRef = useRef<THREE.Group>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  // IcosahedronGeometry(r, 1) のエッジ = サッカーボール風パネルライン
  const edgeGeo = useMemo(
    () => new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.52, 1)),
    []
  )

  useFrame((state, delta) => {
    t.current += delta
    if (!groupRef.current) return

    // 浮遊
    groupRef.current.position.y = Math.sin(t.current * 0.65) * 0.14

    // 自転
    groupRef.current.rotation.y += delta * 0.18

    // マウス視差（X 軸傾き）
    groupRef.current.rotation.x +=
      (state.pointer.y * -0.4 - groupRef.current.rotation.x) * 0.05

    // コアの発光パルス
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 2.8 + Math.sin(t.current * 2.2) * 1.4
    }
  })

  return (
    <group ref={groupRef}>
      {/* 外殻クリスタル球 */}
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          color="#fb923c"
          roughness={0.06}
          metalness={0.25}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* サッカーボール風パネルライン（発光） */}
      <lineSegments geometry={edgeGeo}>
        <lineBasicMaterial color="#fbbf24" transparent opacity={0.88} />
      </lineSegments>

      {/* 内部クリスタルコア */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.95, 1]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#f97316"
          emissiveIntensity={2.8}
          roughness={0.12}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* 中心の白熱点 */}
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial
          color="#fff"
          emissive="#fbbf24"
          emissiveIntensity={12}
        />
      </mesh>
    </group>
  )
}
