// src/components/canvas/soccer/SoccerBg.tsx
import { Environment } from '@react-three/drei'

// 芝のフロア
function GrassFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -10]} receiveShadow>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial color="#0a1a06" roughness={0.9} />
      </mesh>
      {/* ラインマーキング */}
      {[-5, 0, 5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -10]}>
          <planeGeometry args={[0.06, 40]} />
          <meshStandardMaterial color="#1a3a10" emissive="#1a3a10" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </>
  )
}

// ゴールフレーム
function GoalFrame() {
  return (
    <group position={[0, -0.2, -20]}>
      {/* 左ポスト */}
      <mesh position={[-3.66, 1.22, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.6} />
      </mesh>
      {/* 右ポスト */}
      <mesh position={[3.66, 1.22, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.6} />
      </mesh>
      {/* クロスバー */}
      <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 7.32, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

// 観客シルエット（遠景）
function AudienceSilhouette() {
  const rows = [
    { z: -28, y: 1.5, w: 24, h: 2.0 },
    { z: -30, y: 3.0, w: 26, h: 2.5 },
    { z: -32, y: 5.0, w: 28, h: 3.0 },
  ]
  return (
    <group>
      {rows.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]}>
          <boxGeometry args={[r.w, r.h, 0.1]} />
          <meshStandardMaterial color="#0a1520" emissive="#0a1520" emissiveIntensity={0.05} />
        </mesh>
      ))}
    </group>
  )
}

export default function SoccerBg() {
  return (
    <>
      <Environment preset="night" resolution={64} />
      <ambientLight intensity={0.03} />
      <directionalLight position={[0, 10, 5]} intensity={1.0} color="#8ab4d0" />
      <pointLight position={[-4, 4, 2]} intensity={18} color="#4fc3f7" />
      <pointLight position={[4, 4, -4]} intensity={12} color="#1a3a5c" />
      <fog attach="fog" args={['#050b1a', 12, 40]} />
      <GrassFloor />
      <GoalFrame />
      <AudienceSilhouette />
    </>
  )
}
