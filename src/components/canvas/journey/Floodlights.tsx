import { useRef, useEffect } from 'react'
import type { Mesh } from 'three'

interface FloodlightsProps {
  onSunReady?: (mesh: Mesh) => void
}

const POLE_POSITIONS: [number, number, number][] = [
  [-8, 6, -10],
  [8, 6, -10],
  [-8, 6, 10],
  [8, 6, 10],
]

export default function Floodlights({ onSunReady }: FloodlightsProps) {
  const primarySunRef = useRef<Mesh>(null)

  useEffect(() => {
    if (primarySunRef.current && onSunReady) {
      onSunReady(primarySunRef.current)
    }
  }, [onSunReady])

  return (
    <group>
      {POLE_POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          {/* ポール */}
          <mesh position={[0, -y / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, y, 8]} />
            <meshStandardMaterial color="#222226" roughness={0.8} />
          </mesh>
          {/* ライトフィクスチャ（発光ディスク） */}
          <mesh ref={i === 0 ? primarySunRef : undefined}>
            <circleGeometry args={[0.6, 16]} />
            <meshStandardMaterial
              color="#fff5e0"
              emissive="#fff5e0"
              emissiveIntensity={6}
              toneMapped={false}
            />
          </mesh>
          <pointLight color="#fff5e0" intensity={60} distance={30} decay={2} />
        </group>
      ))}
    </group>
  )
}
