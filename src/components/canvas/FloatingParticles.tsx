// src/components/canvas/FloatingParticles.tsx
// 遠景に浮遊する微細パーティクル（埃・光の粒）
// マウスパララックスで多層奥行き感を視覚化する

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Points } from 'three'

interface Props {
  count?: number
  color?: string
  spread?: [number, number, number]
  depth?: number
}

export default function FloatingParticles({
  count = 200,
  color = '#ffffff',
  spread = [24, 12, 18],
  depth = -8,
}: Props) {
  const ref = useRef<Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * spread[0]
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread[2] + depth
    }
    return arr
  }, [count, spread, depth])

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    // ゆっくり回転
    ref.current.rotation.y = t * 0.008
    // サイン波で Y 方向に浮遊 + X/Z 軸に微小な揺らぎ（液体感・空気感）
    ref.current.position.y = Math.sin(t * 0.04) * 0.4
    ref.current.position.x = Math.sin(t * 0.031) * 0.12
    ref.current.position.z = Math.cos(t * 0.027) * 0.10
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color={color}
        transparent
        opacity={0.35}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
