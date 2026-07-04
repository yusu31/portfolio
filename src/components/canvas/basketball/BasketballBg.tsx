// src/components/canvas/basketball/BasketballBg.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ワックス仕上げ体育館床（反射マテリアル）
function CourtFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -4]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={512}
        mixBlur={0.8}
        mixStrength={0.5}
        roughness={0.4}
        color="#2a1800"
      />
    </mesh>
  )
}

// バスケットコートのライン
function CourtLines() {
  const lines = [
    { pos: [0, -1.19, -4] as [number, number, number], w: 14, d: 0.06 },
    { pos: [0, -1.19, -4] as [number, number, number], w: 0.06, d: 14 },
  ]
  return (
    <>
      {lines.map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={l.pos}>
          <planeGeometry args={[l.w, l.d]} />
          <meshStandardMaterial color="#c87000" emissive="#c87000" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  )
}

// バックボード + リング
function Backboard() {
  return (
    <group position={[0, 3.0, -9]}>
      {/* バックボード */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.83, 1.07, 0.05]} />
        <meshStandardMaterial color="#0d0a02" emissive="#ff6600" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {/* リム（暗闇で光るオレンジリング）*/}
      <mesh position={[0, -0.4, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.225, 0.02, 8, 24]} />
        <meshStandardMaterial color="#ff7700" emissive="#ff5500" emissiveIntensity={3.5} />
      </mesh>
      {/* バックボード枠 */}
      {[[-0.915], [0.915]].map(([x], i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 1.07, 0.05]} />
          <meshStandardMaterial color="#2a1800" emissive="#ff4400" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export default function BasketballBg({ visible = true }: { visible?: boolean }) {
  const li = visible ? 1 : 0
  const bgRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!bgRef.current) return
    const p = bgRef.current.position
    p.x += (state.pointer.x * 0.3 - p.x) * 0.03
    p.y += (state.pointer.y * 0.15 - p.y) * 0.03
  })

  return (
    <>
      {visible && <Environment preset="warehouse" resolution={64} />}
      <ambientLight intensity={0.04 * li} />
      <pointLight position={[0, 8, 0]} intensity={40 * li} color="#ffb300" />
      <pointLight position={[-5, 4, 0]} intensity={20 * li} color="#c87000" />
      <pointLight position={[0, 3, -8.5]} intensity={25 * li} color="#ff6600" />
      <group ref={bgRef} visible={visible}>
        <CourtFloor />
        <CourtLines />
        <Backboard />
      </group>
    </>
  )
}
