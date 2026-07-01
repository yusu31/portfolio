import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { Mesh } from 'three'

function BasketballBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.y = 0.8 + Math.sin(t * 1.8) * 0.6
    ref.current.position.x = Math.sin(t * 0.3) * 0.4
    ref.current.rotation.z = t * 1.2
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.32, 32, 32]} />
      <meshStandardMaterial
        color="#c45200"
        emissive="#ff7c00"
        emissiveIntensity={1.0}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

function BackboardFrame() {
  const W = 1.8, H = 1.1, T = 0.07
  const mat = (
    <meshStandardMaterial
      color="white"
      emissive="white"
      emissiveIntensity={2.0}
      roughness={0.1}
    />
  )
  return (
    <group position={[0, 3.0, -5]}>
      <mesh position={[0, H / 2, 0]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[0, -H / 2, 0]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[-W / 2, 0, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[W / 2, 0, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
    </group>
  )
}

function GymFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={512}
        mixBlur={0.9}
        mixStrength={1.8}
        roughness={0.85}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#1a0800"
        metalness={0.1}
      />
    </mesh>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.1) * 0.6
    camera.position.y = 0.5 + Math.sin(t * 0.07) * 0.2
    camera.position.z = 5 + Math.sin(t * 0.05) * 0.3
    camera.lookAt(0, 1.5, -2)
  })
  return null
}

export default function BasketballCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0.5, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#100600']} />
      <fog attach="fog" args={['#b35a00', 10, 30]} />
      <ambientLight intensity={0.05} />
      <directionalLight position={[0, 8, 3]} intensity={1.5} color="#ffb74d" castShadow shadow-mapSize={[1024, 1024] as [number, number]} />
      <pointLight position={[-3, 5, 2]} intensity={25} color="#ffb300" />
      <pointLight position={[3, 3, -3]} intensity={15} color="#7c4a00" />
      <Environment preset="warehouse" resolution={64} />
      <CameraDrift />
      <BasketballBall />
      <BackboardFrame />
      <GymFloor />
      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.65} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
