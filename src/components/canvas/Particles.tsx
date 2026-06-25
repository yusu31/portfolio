import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Object3D, MathUtils } from 'three'

const COUNT = 200

export default function Particles() {
  const meshRef = useRef<InstancedMesh>(null)

  const particles = useMemo(() => {
    return Array.from({ length: COUNT }, () => ({
      x: MathUtils.randFloatSpread(20),
      y: MathUtils.randFloatSpread(20),
      z: MathUtils.randFloatSpread(20),
      speed: MathUtils.randFloat(0.002, 0.008),
    }))
  }, [])

  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    if (!meshRef.current) return
    particles.forEach((p, i) => {
      p.y += p.speed
      if (p.y > 10) p.y = -10
      dummy.position.set(p.x, p.y, p.z)
      dummy.scale.setScalar(0.05)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial color="#fdba74" roughness={0.5} />
    </instancedMesh>
  )
}
