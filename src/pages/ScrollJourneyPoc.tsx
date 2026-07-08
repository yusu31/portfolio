// Phase 1 POC: ScrollControls でカメラがスクロールに応じて3D空間を前進する感覚を検証する。
// 既存の GlobalCanvas / Crystal 実装とは独立した、ゼロベースの最小構成。
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ScrollControls, Scroll, useScroll } from '@react-three/drei'
import * as THREE from 'three'

const SECTION_COUNT = 2 // Home / Projects

function CameraRig() {
  const scroll = useScroll()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame((state) => {
    const offset = scroll.offset // 0〜1
    const z = 10 - offset * 16 // 前進: z=10 → z=-6 (Projectsマーカー手前で止める)
    state.camera.position.set(0, 1, z)
    lookAtTarget.current.set(0, 1, z - 10)
    state.camera.lookAt(lookAtTarget.current)
  })

  return null
}

function HomeMarker() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1.2, 32, 32]} />
      <meshStandardMaterial color="#ff6b2b" emissive="#ff6b2b" emissiveIntensity={0.4} />
    </mesh>
  )
}

function ProjectsMarker() {
  return (
    <mesh position={[0, 0, -10]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4fc3f7" emissive="#4fc3f7" emissiveIntensity={0.3} />
    </mesh>
  )
}

function SectionLabels() {
  return (
    <Scroll html>
      <div style={{ position: 'absolute', top: '45%', left: '10%', color: '#fff', fontSize: '2rem' }}>
        Home
      </div>
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          transform: 'translateY(100vh)',
          color: '#fff',
          fontSize: '2rem',
        }}
      >
        Projects
      </div>
    </Scroll>
  )
}

export default function ScrollJourneyPoc() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f' }}>
      <Canvas camera={{ position: [0, 1, 10], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <ScrollControls pages={SECTION_COUNT} damping={0.25}>
            <CameraRig />
            <HomeMarker />
            <ProjectsMarker />
            <SectionLabels />
          </ScrollControls>
        </Suspense>
      </Canvas>
    </div>
  )
}
