import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'

interface OrbData {
  id: number
  color: string
  radius: number
  speed: number
  phase: number
  tilt: number
}

const ORB_COLORS = ['#f97316', '#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24']

function Orb({ orb }: { orb: OrbData }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const angle = t * orb.speed + orb.phase
    ref.current.position.x = Math.cos(angle) * orb.radius
    ref.current.position.z = Math.sin(angle) * orb.radius
    ref.current.position.y = Math.sin(t * orb.speed * 0.3) * 0.5 + orb.tilt
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color={orb.color}
        emissive={orb.color}
        emissiveIntensity={4}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function Crystal() {
  const floatRef    = useRef<THREE.Group>(null)
  const shellRef    = useRef<THREE.Mesh>(null)
  const coreGrpRef  = useRef<THREE.Group>(null)
  const coreRef     = useRef<THREE.Mesh>(null)
  const t = useRef(0)
  const [orbs, setOrbs] = useState<OrbData[]>([])

  const handleClick = () => {
    const newOrb: OrbData = {
      id: Date.now(),
      color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
      radius: 2.2 + Math.random() * 0.6,
      speed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 0.8,
    }
    setOrbs(prev => [...prev.slice(-5), newOrb])
  }

  useFrame((state, delta) => {
    t.current += delta

    // 浮遊
    if (floatRef.current) {
      floatRef.current.position.y = Math.sin(t.current * 0.65) * 0.14
    }

    // 外殻：自転 + マウスによる傾き
    if (shellRef.current) {
      shellRef.current.rotation.y += delta * 0.18
      shellRef.current.rotation.x +=
        (state.pointer.y * -0.3 - shellRef.current.rotation.x) * 0.04
    }

    // 内部コア：カーソルに追従（外殻の回転とは独立）
    if (coreGrpRef.current) {
      coreGrpRef.current.position.x = MathUtils.lerp(
        coreGrpRef.current.position.x,
        state.pointer.x * 0.55,
        0.06
      )
      coreGrpRef.current.position.y = MathUtils.lerp(
        coreGrpRef.current.position.y,
        state.pointer.y * 0.55,
        0.06
      )
    }

    // 発光パルス
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 3.5 + Math.sin(t.current * 2.2) * 1.2
    }
  })

  return (
    <group ref={floatRef}>
      {/* 外殻クリスタル — 自転のみ */}
      <mesh ref={shellRef} onClick={handleClick}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshPhysicalMaterial
          color="#ffe8cc"
          roughness={0.01}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.01}
          transmission={0.70}
          ior={1.5}
          thickness={1.5}
          flatShading={true}
        />
      </mesh>

      {/* 内部コア — カーソルに追従する発光体 */}
      <group ref={coreGrpRef}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.80, 32, 32]} />
          <meshStandardMaterial
            color="#fb923c"
            emissive="#f97316"
            emissiveIntensity={3.5}
            roughness={0.08}
            transparent
            opacity={0.90}
          />
        </mesh>

        {/* 中心白熱点 */}
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial
            color="#fff"
            emissive="#fbbf24"
            emissiveIntensity={9}
          />
        </mesh>
      </group>

      {/* クリックオービット — クリスタルと一緒に浮遊する */}
      {orbs.map(orb => <Orb key={orb.id} orb={orb} />)}
    </group>
  )
}
