// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import type * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
import JourneyCameraRig from './JourneyCameraRig'
import JourneyEffects from './JourneyEffects'
import SoccerBg from './soccer/SoccerBg'
import BasketballBg from './basketball/BasketballBg'
import VolleyballBg from './volleyball/VolleyballBg'
import { scrollProgressRef, scrollIsAnimatingRef } from '../../hooks/useScrollProgress'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'

const BG_COLORS: Record<string, string> = {
  '/': '#0a0a0f',
  '/soccer': '#050b1a',
  '/basketball': '#0d0a02',
  '/volleyball': '#021a12',
  '/contact': '#0a0a0f',
}

const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': VOLLEYBALL_WAYPOINTS,
}

// CR補間が床を突き抜けないようにするクランプ値
// basketball: BasketballBg floor mesh Y=-1.2 に合わせて変更（旧: 0.0）
const FLOOR_Y: Record<string, number> = {
  '/soccer':     -1.2,
  '/basketball': -1.2,
  '/volleyball': -1.2,
}

function CrystalJourneyMover({
  groupRef,
  isEnteringRef,
}: {
  groupRef: React.RefObject<THREE.Group | null>
  isEnteringRef: React.RefObject<boolean>
}) {
  const { pathname } = useLocation()
  useFrame(() => {
    if (isEnteringRef.current) return  // 入場アニメーション中は GSAP に制御を渡す
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints?.length || !groupRef.current) return
    const { pos } = interpolateWaypoints(scrollProgressRef.current, waypoints)
    const floorY = FLOOR_Y[pathname] ?? -99
    groupRef.current.position.set(pos.x, Math.max(floorY, pos.y), pos.z)
  })
  return null
}

interface BallEntry { x: number; y: number; z: number }

function CrystalRoot({ isHome, pathname, ballEntry }: { isHome: boolean; pathname: string; ballEntry?: BallEntry }) {
  const grpRef = useRef<THREE.Group>(null)
  const journeySpeedRef = useRef(1)
  const journeyRotRef = useRef({ dirX: 0, dirZ: -1, rotSpeed: 1 })
  const isEnteringRef = useRef(false)

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

  useEffect(() => {
    if (!grpRef.current || !ballEntry || isHome) return
    const waypoints = SCENE_WAYPOINTS[pathname]
    const wp0 = waypoints?.[0]
    if (!wp0) return
    isEnteringRef.current = true
    gsap.killTweensOf(grpRef.current.position)
    grpRef.current.position.set(ballEntry.x, ballEntry.y, ballEntry.z)
    gsap.to(grpRef.current.position, {
      x: wp0.pos[0], y: wp0.pos[1], z: wp0.pos[2],
      duration: 0.8,
      ease: 'power2.out',
      onComplete: () => { isEnteringRef.current = false },
    })
  }, [ballEntry, isHome])

  useFrame(() => {
    if (!isHome) {
      journeySpeedRef.current = scrollIsAnimatingRef.current ? 2.5 : 0.3

      // 移動方向ベクトルを progress ± ε の差分から計算して journeyRotRef に書き込む
      const waypoints = SCENE_WAYPOINTS[pathname]
      if (waypoints?.length) {
        const p = scrollProgressRef.current
        const curr = interpolateWaypoints(p, waypoints)
        const next = interpolateWaypoints(Math.min(1, p + 0.003), waypoints)
        const dx = next.pos.x - curr.pos.x
        const dz = next.pos.z - curr.pos.z
        const len = Math.sqrt(dx * dx + dz * dz)
        if (len > 0.0001) {
          journeyRotRef.current.dirX = dx / len
          journeyRotRef.current.dirZ = dz / len
        }
        journeyRotRef.current.rotSpeed = curr.rotSpeed
      }
    }
  })

  return (
    <>
      <group ref={grpRef} position={[0, isHome ? -0.4 : 0, 0]} scale={isHome ? 1 : 0.45}>
        <Crystal mode={isHome ? 'interactive' : 'journey'} journeySpeedRef={journeySpeedRef} journeyRotRef={journeyRotRef} />
      </group>
      {!isHome && <CrystalJourneyMover groupRef={grpRef} isEnteringRef={isEnteringRef} />}
    </>
  )
}

function BgColor({ pathname }: { pathname: string }) {
  const color = BG_COLORS[pathname] ?? '#0a0a0f'
  return <color attach="background" args={[color as THREE.ColorRepresentation]} />
}

export default function GlobalCanvas() {
  const { pathname, state } = useLocation()
  const isHome = pathname === '/'
  const ballEntry = (state as { ballEntry?: BallEntry } | null)?.ballEntry

  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <Suspense fallback={null}>
        <BgColor pathname={pathname} />
        {isHome && <HomeBg />}
        {pathname === '/soccer' && <SoccerBg />}
        {pathname === '/basketball' && <BasketballBg />}
        {pathname === '/volleyball' && <VolleyballBg />}
        <CrystalRoot isHome={isHome} pathname={pathname} ballEntry={ballEntry} />
        {!isHome && <JourneyCameraRig />}
        {!isHome && <JourneyEffects />}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
