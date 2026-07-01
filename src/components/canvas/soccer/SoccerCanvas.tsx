import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { Mesh } from 'three'

function SoccerBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.z = Math.sin(t * 0.4) * 1.5
    ref.current.position.x = Math.sin(t * 0.25) * 0.6
    ref.current.position.y = Math.abs(Math.sin(t * 2.8)) * 0.35 - 0.3
    ref.current.rotation.x = t * 1.8
    ref.current.rotation.z = t * 0.9
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#fdba74"
        emissive="#f97316"
        emissiveIntensity={1.6}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

function GoalFrame() {
  const W = 3.6, H = 1.8, T = 0.06
  const mat = (
    <meshStandardMaterial
      color="white"
      emissive="white"
      emissiveIntensity={2.5}
      roughness={0.1}
    />
  )
  return (
    <group position={[0, -0.2, -7]}>
      <mesh position={[0, H, 0]} castShadow><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[-W / 2, H / 2, 0]} castShadow><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[W / 2, H / 2, 0]} castShadow><boxGeometry args={[T, H, T]} />{mat}</mesh>
    </group>
  )
}

function GrassFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#0d2210" roughness={0.95} metalness={0} />
    </mesh>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.12) * 0.5
    camera.position.y = -0.3 + Math.sin(t * 0.08) * 0.15
    camera.position.z = 4.5 + Math.sin(t * 0.06) * 0.3
    camera.lookAt(0, 0.3, -3)
  })
  return null
}

export default function SoccerCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, -0.3, 4.5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#050b1a']} />
      <fog attach="fog" args={['#0a1128', 8, 35]} />
      <ambientLight intensity={0.04} />
      <directionalLight position={[0, 10, 5]} intensity={1.2} color="#8ab4d0" castShadow shadow-mapSize={[1024, 1024] as [number, number]} />
      <pointLight position={[-4, 4, 2]} intensity={20} color="#4fc3f7" />
      <pointLight position={[4, 4, -4]} intensity={15} color="#1a3a5c" />
      <Environment preset="night" resolution={64} />
      <CameraDrift />
      <SoccerBall />
      <GoalFrame />
      <GrassFloor />
      <EffectComposer>
        <Bloom intensity={1.4} luminanceThreshold={0.65} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
