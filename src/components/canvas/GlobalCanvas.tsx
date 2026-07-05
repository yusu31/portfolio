// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect, useContext } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
import SoccerBg from './soccer/SoccerBg'
import BasketballBg from './basketball/BasketballBg'
import VolleyballBg from './volleyball/VolleyballBg'
import { useSceneContext } from '../../contexts/SceneContext'
import { SOCCER_HOTSPOTS_3D, SOCCER_FINALE } from '../../data/hotspots/soccer-hotspots'
import { BASKETBALL_HOTSPOTS_3D, BASKETBALL_FINALE } from '../../data/hotspots/basketball-hotspots'
import { VOLLEYBALL_HOTSPOTS_3D, VOLLEYBALL_FINALE } from '../../data/hotspots/volleyball-hotspots'
import type { SceneHotspot } from '../../data/hotspots/types'

const BG_COLORS: Record<string, string> = {
  '/': '#0a0a0f',
  '/soccer': '#050b1a',
  '/basketball': '#0d0a02',
  '/volleyball': '#021a12',
  '/contact': '#0a0a0f',
}

const FOG_DENSITY: Record<string, number> = {
  '/soccer':     0.028,
  '/basketball': 0.028,
  '/volleyball': 0.030,
}

// シーン別カメラ設定
const SCENE_CAMERAS: Record<string, { position: [number, number, number]; fov: number; lookAt: [number, number, number] }> = {
  '/':           { position: [0, 0, 5],    fov: 60, lookAt: [0, 0, 0]     },
  '/soccer':     { position: [0, 2.0, 6],  fov: 52, lookAt: [0, -0.2, -20] },
  '/basketball': { position: [0, 2.5, 5],  fov: 50, lookAt: [0, 2.6, -9]  },
  '/volleyball': { position: [0, 1.8, 3.5],fov: 58, lookAt: [0, 0.5, -3]  },
  '/contact':    { position: [0, 0, 5],    fov: 60, lookAt: [0, 0, 0]     },
}

// クリック移動のフィールド境界
const BOUNDS: Record<string, { xMin: number; xMax: number; zMin: number; zMax: number }> = {
  '/soccer':     { xMin: -6, xMax: 6, zMin: -16, zMax: 4  },
  '/basketball': { xMin: -5, xMax: 5, zMin: -7,  zMax: 3  },
  '/volleyball': { xMin: -4, xMax: 4, zMin: -2,  zMax: 3  },
}

// シーン別のホットスポットリスト
const HOTSPOT_MAP: Record<string, SceneHotspot[]> = {
  '/soccer':     SOCCER_HOTSPOTS_3D,
  '/basketball': BASKETBALL_HOTSPOTS_3D,
  '/volleyball': VOLLEYBALL_HOTSPOTS_3D,
}

const FINALE_MAP: Record<string, SceneHotspot> = {
  '/soccer':     SOCCER_FINALE,
  '/basketball': BASKETBALL_FINALE,
  '/volleyball': VOLLEYBALL_FINALE,
}

// カメラを固定位置に設定する（JourneyCameraRig の代替）
function FixedCameraRig() {
  const { camera } = useThree()
  const { pathname } = useLocation()
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    const cfg = SCENE_CAMERAS[pathname] ?? SCENE_CAMERAS['/']
    const pcam = camera as THREE.PerspectiveCamera
    lookAtRef.current.set(...cfg.lookAt)
    gsap.to(camera.position, {
      x: cfg.position[0], y: cfg.position[1], z: cfg.position[2],
      duration: 0.9, ease: 'power2.out',
    })
    gsap.to(pcam, {
      fov: cfg.fov, duration: 0.9, ease: 'power2.out',
      onUpdate: () => pcam.updateProjectionMatrix(),
    })
  }, [pathname, camera])

  useFrame(() => {
    camera.lookAt(lookAtRef.current)
  })

  return null
}

// ホットスポット発光球（フィールド上に配置）
function HotspotMarker({ hotspot, isActive, isVisited }: {
  hotspot: SceneHotspot
  isActive: boolean
  isVisited: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.15
    meshRef.current.scale.setScalar(isActive ? pulse * 1.4 : pulse)
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = isActive ? 6 : (isVisited ? 0.8 : 3)
    mat.opacity = isVisited ? 0.35 : 0.9
  })

  return (
    <group position={hotspot.pos}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={hotspot.color}
          emissive={hotspot.color}
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.36, 32]} />
        <meshStandardMaterial
          color={hotspot.color}
          emissive={hotspot.color}
          emissiveIntensity={1.5}
          transparent
          opacity={isVisited ? 0.15 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function HotspotMarkers({ pathname }: { pathname: string }) {
  const { activeHotspotId, visitedHotspotIds, showFinale } = useSceneContext()
  const hotspots = HOTSPOT_MAP[pathname] ?? []
  const finale = FINALE_MAP[pathname]

  return (
    <>
      {hotspots.map(hs => (
        <HotspotMarker
          key={hs.id}
          hotspot={hs}
          isActive={activeHotspotId === hs.id}
          isVisited={visitedHotspotIds.has(hs.id)}
        />
      ))}
      {finale && showFinale && (
        <HotspotMarker
          hotspot={finale}
          isActive={activeHotspotId === 'finale'}
          isVisited={false}
        />
      )}
    </>
  )
}

// ボールをクリック位置へ lerp で移動させる（CrystalJourneyMover の代替）
function ClickBallMover({
  groupRef,
  isEnteringRef,
  journeyRotRef,
  journeySpeedRef,
}: {
  groupRef: React.RefObject<THREE.Group | null>
  isEnteringRef: React.RefObject<boolean>
  journeyRotRef: React.RefObject<{ dirX: number; dirZ: number; rotSpeed: number }>
  journeySpeedRef: React.RefObject<number>
}) {
  const { pathname } = useLocation()
  const { setActiveHotspotId, markVisited, showFinale, forceTarget } = useSceneContext()
  const ballTargetRef = useRef(new THREE.Vector3(0, -1.2, 0))
  const prevPosRef = useRef(new THREE.Vector3(0, -1.2, 0))
  const prevActiveRef = useRef<string | null>(null)

  // forceTarget（finale 演出）が設定されたら ballTarget を上書き
  useEffect(() => {
    if (forceTarget) {
      ballTargetRef.current.set(...forceTarget)
    }
  }, [forceTarget])

  // シーン切替時にボール位置をリセット
  useEffect(() => {
    ballTargetRef.current.set(0, -1.2, 0)
    prevPosRef.current.set(0, -1.2, 0)
    if (groupRef.current) {
      groupRef.current.position.set(0, -1.2, 0)
    }
  }, [pathname, groupRef])

  useFrame((_, delta) => {
    if (isEnteringRef.current || !groupRef.current) return
    const bounds = BOUNDS[pathname]
    if (!bounds) return

    const current = groupRef.current.position
    const alpha = 1 - Math.pow(1 - 0.055, delta * 60)
    current.x = THREE.MathUtils.lerp(current.x, ballTargetRef.current.x, alpha)
    current.z = THREE.MathUtils.lerp(current.z, ballTargetRef.current.z, alpha)
    current.y = -1.2

    // 移動ベクトル → journeyRotRef に書き込みでボールが転がる
    const dx = current.x - prevPosRef.current.x
    const dz = current.z - prevPosRef.current.z
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len > 0.0005) {
      journeyRotRef.current.dirX = dx / len
      journeyRotRef.current.dirZ = dz / len
      journeySpeedRef.current = Math.min(len / (delta + 0.001) * 0.08, 2.5)
    } else {
      journeySpeedRef.current = 0
    }
    prevPosRef.current.copy(current)

    // ホットスポット近接検知
    const hotspots = HOTSPOT_MAP[pathname] ?? []
    const finale = FINALE_MAP[pathname]
    const allHotspots = showFinale && finale ? [...hotspots, finale] : hotspots

    let nearest: string | null = null
    let nearestDist = Infinity
    for (const hs of allHotspots) {
      const d = Math.sqrt(
        Math.pow(current.x - hs.pos[0], 2) + Math.pow(current.z - hs.pos[2], 2)
      )
      if (d < hs.radius && d < nearestDist) {
        nearest = hs.id
        nearestDist = d
      }
    }

    if (nearest !== prevActiveRef.current) {
      prevActiveRef.current = nearest
      setActiveHotspotId(nearest)
      if (nearest && nearest !== 'finale') markVisited(nearest)
    }
  })

  const handleFieldClick = (e: ThreeEvent<PointerEvent>) => {
    if (isEnteringRef.current) return
    const bounds = BOUNDS[pathname]
    if (!bounds) return
    e.stopPropagation()
    const x = THREE.MathUtils.clamp(e.point.x, bounds.xMin, bounds.xMax)
    const z = THREE.MathUtils.clamp(e.point.z, bounds.zMin, bounds.zMax)
    ballTargetRef.current.set(x, -1.2, z)
  }

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.19, -6]}
      onPointerDown={handleFieldClick}
      renderOrder={-1}
    >
      <planeGeometry args={[24, 44]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
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
    if (!grpRef.current || isHome) return
    isEnteringRef.current = true
    gsap.killTweensOf(grpRef.current.position)
    if (ballEntry) {
      grpRef.current.position.set(ballEntry.x, ballEntry.y, ballEntry.z)
    } else {
      grpRef.current.position.set(0, -1.2, 0)
    }
    gsap.to(grpRef.current.position, {
      x: 0, y: -1.2, z: 0,
      duration: 0.8, ease: 'power2.out',
      onComplete: () => { isEnteringRef.current = false },
    })
  }, [ballEntry, isHome, pathname])

  return (
    <>
      <group
        ref={grpRef}
        position={[0, isHome ? -0.4 : -1.0, 0]}
        scale={isHome ? 1 : 0.45}
      >
        <Crystal
          mode={isHome ? 'interactive' : 'click-drive'}
          journeySpeedRef={journeySpeedRef}
          journeyRotRef={journeyRotRef}
        />
      </group>
      {!isHome && (
        <ClickBallMover
          groupRef={grpRef}
          isEnteringRef={isEnteringRef}
          journeyRotRef={journeyRotRef}
          journeySpeedRef={journeySpeedRef}
        />
      )}
    </>
  )
}

function BgColor({ pathname }: { pathname: string }) {
  const color = BG_COLORS[pathname] ?? '#0a0a0f'
  return <color attach="background" args={[color as THREE.ColorRepresentation]} />
}

function SceneAtmosphere({ pathname }: { pathname: string }) {
  const fogColor = BG_COLORS[pathname] ?? '#0a0a0f'
  const density = FOG_DENSITY[pathname]
  return (
    <>
      {density && <fogExp2 attach="fog" args={[fogColor, density]} />}
    </>
  )
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
        <SceneAtmosphere pathname={pathname} />
        {isHome && <HomeBg />}
        {pathname === '/soccer' && <SoccerBg />}
        {pathname === '/basketball' && <BasketballBg />}
        {pathname === '/volleyball' && <VolleyballBg />}
        <CrystalRoot isHome={isHome} pathname={pathname} ballEntry={ballEntry} />
        <FixedCameraRig />
        {!isHome && pathname !== '/contact' && <HotspotMarkers pathname={pathname} />}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
