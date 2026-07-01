import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { Mesh } from 'three'

function VolleyballBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.y = 0.5 + Math.sin(t * 1.2) * 0.8
    ref.current.position.x = Math.sin(t * 0.35) * 0.5
    ref.current.rotation.x = t * 0.8
    ref.current.rotation.y = t * 1.1
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.28, 32, 32]} />
      <meshStandardMaterial
        color="#e8f0e8"
        emissive="#69f0ae"
        emissiveIntensity={0.8}
        roughness={0.4}
        metalness={0.05}
      />
    </mesh>
  )
}

function VolleyballNet() {
  const W = 5.5, T = 0.07
  const mat = (
    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.8} roughness={0.1} />
  )
  return (
    <group position={[0, 0.4, -4]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[W, T * 2, T]} />{mat}</mesh>
      <mesh position={[-W / 2, -0.5, 0]}><boxGeometry args={[T, 1.0, T]} />{mat}</mesh>
      <mesh position={[W / 2, -0.5, 0]}><boxGeometry args={[T, 1.0, T]} />{mat}</mesh>
    </group>
  )
}

function GridFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#001a12" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[20, 24, '#004d40', '#004d40']} position={[0, -0.64, 0]} />
    </>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.09) * 0.7
    camera.position.y = 0.3 + Math.sin(t * 0.06) * 0.2
    camera.position.z = 4.8 + Math.sin(t * 0.05) * 0.4
    camera.lookAt(0, 0.5, -2)
  })
  return null
}

export default function VolleyballCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0.3, 4.8], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#001410']} />
      <fog attach="fog" args={['#004d40', 10, 30]} />
      <ambientLight intensity={0.04} />
      <directionalLight position={[0, 8, 3]} intensity={1.0} color="#80cbc4" castShadow shadow-mapSize={[1024, 1024] as [number, number]} />
      <pointLight position={[-3, 4, 2]} intensity={20} color="#26a69a" />
      <pointLight position={[3, 3, -3]} intensity={12} color="#00695c" />
      <Environment preset="dawn" resolution={64} />
      <CameraDrift />
      <VolleyballBall />
      <VolleyballNet />
      <GridFloor />
      <EffectComposer>
        <Bloom intensity={1.3} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
