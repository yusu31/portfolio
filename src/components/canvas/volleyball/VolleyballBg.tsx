// src/components/canvas/volleyball/VolleyballBg.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

function Net() {
  return (
    <group position={[0, 0, -3]}>
      {/* 上部白帯 */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[8, 0.04, 0.02]} />
        <meshStandardMaterial color="#c8d8c8" emissive="#ffffff" emissiveIntensity={0.18} />
      </mesh>
      {/* 下部白帯 */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[8, 0.03, 0.02]} />
        <meshStandardMaterial color="#c8d8c8" emissive="#ffffff" emissiveIntensity={0.15} />
      </mesh>
      {/* 縦線: クロームメタリック → 光を反射してシャープに見える */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-3.5 + i * 0.875, 0.3, 0]}>
          <boxGeometry args={[0.015, 1.4, 0.01]} />
          <meshStandardMaterial
            color="#aaaaaa"
            metalness={0.9}
            roughness={0.05}
            emissive="#69f0ae"
            emissiveIntensity={0.08}
          />
        </mesh>
      ))}
    </group>
  )
}

function Antennas() {
  const colors = ['#ff2222', '#ffffff']
  return (
    <>
      {[-4, 4].map((x) => (
        <group key={x} position={[x, 0.5, -3]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, -0.5 + i * 0.2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
              <meshStandardMaterial
                color={colors[i % 2]}
                emissive={colors[i % 2]}
                emissiveIntensity={i % 2 === 0 ? 1.5 : 2.0}
                metalness={0.6}
                roughness={0.2}
              />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

function GridFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -2]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#012010" roughness={0.9} />
      </mesh>
      {/* コートライン（ライム発光） */}
      {[-5, 5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -2]}>
          <planeGeometry args={[0.04, 20]} />
          <meshStandardMaterial color="#69f0ae" emissive="#69f0ae" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  )
}


export default function VolleyballBg({ visible = true }: { visible?: boolean }) {
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
      {visible && <Environment preset="night" resolution={64} />}
      <ambientLight intensity={0.03 * li} />
      <pointLight position={[0, 6, 0]} intensity={25 * li} color="#69f0ae" />
      <pointLight position={[-5, 3, -3]} intensity={15 * li} color="#005533" />
      <pointLight position={[0, 2, -1]} intensity={10 * li} color="#a0ffd0" />
      <group ref={bgRef} visible={visible}>
        <GridFloor />
        <Net />
        <Antennas />
      </group>
    </>
  )
}
