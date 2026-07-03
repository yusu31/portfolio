// src/components/canvas/basketball/BasketballBg.tsx
import { Environment, MeshReflectorMaterial } from '@react-three/drei'

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
      {[[-0.915, 0], [0.915, 0]].map(([x], i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 1.07, 0.05]} />
          <meshStandardMaterial color="#2a1800" emissive="#ff4400" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export default function BasketballBg() {
  return (
    <>
      <Environment preset="warehouse" resolution={64} />
      <ambientLight intensity={0.04} />
      {/* 上空のメインライト（床への反射に貢献）*/}
      <pointLight position={[0, 8, 0]} intensity={40} color="#ffb300" />
      <pointLight position={[-5, 4, 0]} intensity={20} color="#c87000" />
      {/* リム周辺のスポット感を出す補助ライト */}
      <pointLight position={[0, 3, -8.5]} intensity={25} color="#ff6600" />
      <fog attach="fog" args={['#0d0a02', 10, 35]} />
      <CourtFloor />
      <CourtLines />
      <Backboard />
    </>
  )
}
