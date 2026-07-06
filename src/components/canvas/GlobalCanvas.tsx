// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect, useCallback, useContext, useState } from 'react'
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
import { fovRef } from '../../hooks/useSceneTransition'
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
  '/basketball': { position: [0, 3.2, 8],  fov: 55, lookAt: [0, 0.6, -7.5] },
  '/volleyball': { position: [0, 2.0, 4.4],fov: 58, lookAt: [0, 0.3, -3]  },
  '/contact':    { position: [0, 0, 5],    fov: 60, lookAt: [0, 0, 0]     },
}

// クリック移動のフィールド境界
const BOUNDS: Record<string, { xMin: number; xMax: number; zMin: number; zMax: number }> = {
  '/soccer':     { xMin: -6, xMax: 6, zMin: -16, zMax: 4  },
  '/basketball': { xMin: -5, xMax: 5, zMin: -7,  zMax: 2  },
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

// クリック波紋の色（シーンのアクセント色）
const RIPPLE_COLORS: Record<string, string> = {
  '/soccer':     '#4fc3f7',
  '/basketball': '#ffb300',
  '/volleyball': '#69f0ae',
}

// クリック受理地点に広がる発光リング（メイン＋遅れて追うエコー）
const RIPPLE_LIFE = 0.9
function ClickRipple({ x, z, color, onDone }: { x: number; z: number; color: string; onDone: () => void }) {
  const mainRef = useRef<THREE.Mesh>(null)
  const echoRef = useRef<THREE.Mesh>(null)
  const age = useRef(0)
  const done = useRef(false)

  useFrame((_, delta) => {
    age.current += delta
    const p = Math.min(age.current / RIPPLE_LIFE, 1)
    if (p >= 1) {
      if (!done.current) { done.current = true; onDone() }
      return
    }
    const easeOut = 1 - Math.pow(1 - p, 3)
    if (mainRef.current) {
      mainRef.current.scale.setScalar(0.25 + easeOut * 2.4)
      ;(mainRef.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.9
    }
    // エコーは 0.18秒 遅れて同じ軌跡を小さく追う
    const p2 = Math.max((age.current - 0.18) / RIPPLE_LIFE, 0)
    const ease2 = 1 - Math.pow(1 - Math.min(p2, 1), 3)
    if (echoRef.current) {
      echoRef.current.scale.setScalar(0.15 + ease2 * 1.6)
      ;(echoRef.current.material as THREE.MeshBasicMaterial).opacity = p2 > 0 ? (1 - p2) * 0.5 : 0
    }
  })

  return (
    <group position={[x, -1.17, z]}>
      <mesh ref={mainRef} rotation={[-Math.PI / 2, 0, 0]} scale={0.25}>
        <ringGeometry args={[0.82, 0.92, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={echoRef} rotation={[-Math.PI / 2, 0, 0]} scale={0.15}>
        <ringGeometry args={[0.84, 0.9, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// 縦画面では水平視野の欠けを垂直FOV拡大で部分補償する（上限78°）
const BASE_ASPECT = 16 / 9
function responsiveFov(baseFov: number, aspect: number): number {
  if (aspect >= BASE_ASPECT) return baseFov
  const t = Math.tan((baseFov * Math.PI) / 360) * Math.sqrt(BASE_ASPECT / aspect)
  return Math.min((Math.atan(t) * 360) / Math.PI, 78)
}

// カメラを固定位置に設定する（JourneyCameraRig の代替）
function FixedCameraRig() {
  const { camera, size } = useThree()
  const { pathname } = useLocation()
  const lookAtRef = useRef(new THREE.Vector3(0, 0, 0))
  const baseFovRef = useRef(60)

  useEffect(() => {
    const cfg = SCENE_CAMERAS[pathname] ?? SCENE_CAMERAS['/']
    lookAtRef.current.set(...cfg.lookAt)
    gsap.to(camera.position, {
      x: cfg.position[0], y: cfg.position[1], z: cfg.position[2],
      duration: 0.9, ease: 'power2.out',
    })
    gsap.to(baseFovRef, {
      current: responsiveFov(cfg.fov, size.width / size.height),
      duration: 0.9, ease: 'power2.out',
    })
  }, [pathname, camera, size])

  useFrame(() => {
    // シーン基準fov + ワープオフセット（fovRef は warpNavigate/warpIn が 60↔92 で駆動）
    const pcam = camera as THREE.PerspectiveCamera
    const fov = baseFovRef.current + (fovRef.current - 60)
    if (Math.abs(pcam.fov - fov) > 0.01) {
      pcam.fov = fov
      pcam.updateProjectionMatrix()
    }
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
  const curveRef = useRef<THREE.QuadraticBezierCurve3 | null>(null)
  const progressRef = useRef({ t: 0 })
  const prevPosRef = useRef(new THREE.Vector3(0, -1.2, 0))
  const prevActiveRef = useRef<string | null>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; z: number }[]>([])
  const rippleId = useRef(0)

  // 現在位置→目標のベジェ曲線を生成して GSAP で進行させる（ohzi.io 的な曲線移動）
  const startMove = useCallback((x: number, z: number) => {
    if (!groupRef.current) return
    const from = groupRef.current.position.clone()
    const to = new THREE.Vector3(x, -1.2, z)
    const dist = from.distanceTo(to)
    if (dist < 0.05) return
    // 制御点: 中点を進行方向の寄りの側へ横オフセット → 現在の勢いを引き継いで膨らむ
    const dir = to.clone().sub(from).normalize()
    const perp = new THREE.Vector3(-dir.z, 0, dir.x)
    const heading = new THREE.Vector3(journeyRotRef.current.dirX, 0, journeyRotRef.current.dirZ)
    const side = Math.sign(perp.dot(heading)) || 1
    const mid = from.clone().add(to).multiplyScalar(0.5)
      .add(perp.multiplyScalar(side * dist * 0.25))
    mid.y = -1.2
    curveRef.current = new THREE.QuadraticBezierCurve3(from, mid, to)
    progressRef.current.t = 0
    gsap.killTweensOf(progressRef.current)
    gsap.to(progressRef.current, {
      t: 1,
      duration: THREE.MathUtils.clamp(dist * 0.22, 0.7, 1.8),
      ease: 'power2.out',
    })
  }, [groupRef, journeyRotRef])

  // forceTarget（finale 演出）も同じ曲線移動を使う
  useEffect(() => {
    if (forceTarget) {
      startMove(forceTarget[0], forceTarget[2])
    }
  }, [forceTarget, startMove])

  // シーン切替時にボール位置をリセット
  useEffect(() => {
    gsap.killTweensOf(progressRef.current)
    curveRef.current = null
    progressRef.current.t = 0
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
    if (curveRef.current) {
      curveRef.current.getPoint(progressRef.current.t, current)
      current.y = -1.2
    }

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
    // カメラ移動中のレイは視覚上のクリック位置とズレるため無視
    if (gsap.isTweening(e.camera.position)) return
    const bounds = BOUNDS[pathname]
    if (!bounds) return
    e.stopPropagation()
    const x = THREE.MathUtils.clamp(e.point.x, bounds.xMin, bounds.xMax)
    const z = THREE.MathUtils.clamp(e.point.z, bounds.zMin, bounds.zMax)
    // 受理されたクリックだけに波紋を出す（ガードで無視した操作に偽の手応えを与えない）
    setRipples(prev => [...prev.slice(-5), { id: rippleId.current++, x, z }])
    startMove(x, z)
  }

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.19, -6]}
        onPointerDown={handleFieldClick}
        renderOrder={-1}
      >
        <planeGeometry args={[24, 44]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {ripples.map(r => (
        <ClickRipple
          key={r.id}
          x={r.x}
          z={r.z}
          color={RIPPLE_COLORS[pathname] ?? '#ffffff'}
          onDone={() => setRipples(prev => prev.filter(p => p.id !== r.id))}
        />
      ))}
    </>
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
