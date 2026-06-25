import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

export default function Crystal() {
  const meshRef = useRef<Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.1
    }
  })

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[1.2, 0]} />
      <meshStandardMaterial
        color="#fb923c"
        roughness={0.1}
        metalness={0.8}
        wireframe={false}
      />
    </mesh>
  )
}
