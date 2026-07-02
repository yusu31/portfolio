// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { Vector3 } from 'three'
import type * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
// import JourneyCameraRig from './JourneyCameraRig'  // Task 7で追加
import { scrollProgressRef, scrollVelocityRef } from '../../hooks/useScrollProgress'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'

const BG_COLORS: Record<string, string> = {
  '/': '#0a0a0f',
  '/soccer': '#050b1a',
  '/basketball': '#0d0a02',
  '/volleyball': '#021a12',
  '/contact': '#0a0a0f',
}

const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer': [],
  '/basketball': [],
  '/volleyball': [],
}

const _lerpTarget = new Vector3()

function CrystalJourneyMover({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { pathname } = useLocation()
  useFrame(() => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints?.length || !groupRef.current) return
    const { pos } = interpolateWaypoints(scrollProgressRef.current, waypoints)
    _lerpTarget.set(pos.x, pos.y, pos.z)
    groupRef.current.position.lerp(_lerpTarget, 0.08)
  })
  return null
}

function CrystalRoot({ isHome, pathname }: { isHome: boolean; pathname: string }) {
  const grpRef = useRef<THREE.Group>(null)
  const journeySpeedRef = useRef(1)

  useEffect(() => {
    if (!isHome) return
    const onExplore = () => {
      if (!grpRef.current) return
      gsap.to(grpRef.current.position, { x: 5, duration: 1.1, ease: 'power2.in' })
      gsap.to(grpRef.current.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.7, delay: 0.45, ease: 'power2.in',
        onComplete: () => {
          if (!grpRef.current) return
          grpRef.current.position.x = 0
          grpRef.current.scale.set(1, 1, 1)
        },
      })
    }
    window.addEventListener('explore-click', onExplore)
    return () => window.removeEventListener('explore-click', onExplore)
  }, [isHome])

  useFrame(() => {
    if (!isHome) {
      journeySpeedRef.current = Math.min(scrollVelocityRef.current * 2 + 0.3, 4)
    }
  })

  return (
    <>
      <group ref={grpRef} position={[0, isHome ? -0.4 : 0, 0]}>
        <Crystal mode={isHome ? 'interactive' : 'journey'} journeySpeedRef={journeySpeedRef} />
      </group>
      {!isHome && <CrystalJourneyMover groupRef={grpRef} />}
    </>
  )
}

function BgColor({ pathname }: { pathname: string }) {
  const color = BG_COLORS[pathname] ?? '#0a0a0f'
  return <color attach="background" args={[color as THREE.ColorRepresentation]} />
}

export default function GlobalCanvas() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <BgColor pathname={pathname} />
        {isHome && <HomeBg />}
        {/* Phase B以降: SoccerBg / BasketballBg / VolleyballBg をここに追加 */}
        <CrystalRoot isHome={isHome} pathname={pathname} />
        {/* {!isHome && <JourneyCameraRig />} */}  {/* Task 7で追加 */}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
