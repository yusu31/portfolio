// src/components/canvas/basketball/BasketballBg.tsx
import { Environment } from '@react-three/drei'

// 体育館床
function CourtFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -4]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2a1800" roughness={0.8} />
      </mesh>
    </>
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
          <meshStandardMaterial color="#c87000" emissive="#c87000" emissiveIntensity={0.1} />
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
        <meshStandardMaterial color="#0d0a02" emissive="#2a1800" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
      {/* リム（オレンジのリング） */}
      <mesh position={[0, -0.4, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.225, 0.02, 8, 24]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.5} />
      </mesh>
      {/* バックボード枠 */}
      {[[-0.915, 0], [0.915, 0]].map(([x], i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 1.07, 0.05]} />
          <meshStandardMaterial color="#2a1800" emissive="#2a1800" emissiveIntensity={0.3} />
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
      <pointLight position={[0, 8, 0]} intensity={30} color="#ffb300" />
      <pointLight position={[-5, 4, 0]} intensity={15} color="#c87000" />
      <fog attach="fog" args={['#0d0a02', 10, 35]} />
      <CourtFloor />
      <CourtLines />
      <Backboard />
    </>
  )
}
