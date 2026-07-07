// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect, useCallback, useState } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
import SoccerBg from './soccer/SoccerBg'
import BasketballBg from './basketball/BasketballBg'
import VolleyballBg from './volleyball/VolleyballBg'
import { fovRef, warpNavigate } from '../../hooks/useSceneTransition'
import { useSceneStateMachine } from '../../hooks/useSceneStateMachine'
import type { JourneyState } from '../../hooks/useSceneStateMachine'
import { PROJECT_CATEGORIES } from '../../data/projects'
import { SKILL_CATEGORIES } from '../../data/skills'
import { ABOUT_POINTS } from '../../data/about'

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

// 状態→カードデータ対応
type CardDef = { type: 'project' | 'skill' | 'about'; categoryId: string; label: string; color: string }
const STATE_CARD_DATA: Partial<Record<JourneyState, CardDef>> = {
  dribble_1:  { type: 'project', categoryId: 'webapp',         label: 'Webアプリ',       color: '#4fc3f7' },
  cut_1:      { type: 'project', categoryId: 'game',           label: 'ゲーム',           color: '#ffb300' },
  cut_2:      { type: 'project', categoryId: 'website',        label: 'Webサイト / LP',  color: '#69f0ae' },
  long_pass:  { type: 'project', categoryId: 'tool',           label: 'ツール / 自動化',  color: '#ce93d8' },
  shoot_rise: { type: 'skill',   categoryId: 'frontend',       label: 'Frontend',        color: '#4fc3f7' },
  apex:       { type: 'skill',   categoryId: 'backend',        label: 'Backend',         color: '#ffb300' },
  drop:       { type: 'skill',   categoryId: 'infrastructure', label: 'Infrastructure',  color: '#69f0ae' },
  receive:    { type: 'about',   categoryId: 'background',     label: 'バックグラウンド', color: '#69f0ae' },
  toss:       { type: 'about',   categoryId: 'style',          label: '仕事スタイル',     color: '#a0ffd0' },
  spike:      { type: 'about',   categoryId: 'seeking',        label: '求める環境',       color: '#69f0ae' },
}

// 終端状態 → 遷移先
const NEXT_SCENE: Partial<Record<JourneyState, string>> = {
  long_pass: '/basketball',
  through:   '/volleyball',
  spike:     '/contact',
}

// 状態別ボール Y 座標（接地 = -1.2）
const STATE_Y: Record<JourneyState, number> = {
  idle:         -1.2,
  dribble_1:    -1.2,
  cut_1:        -1.2,
  cut_2:        -1.2,
  long_pass:     0.6,
  catch_wait:   -1.2,
  shoot_rise:    1.2,
  apex:          2.8,
  drop:          0.5,
  through:      -1.2,
  receive_wait: -1.2,
  receive:      -0.3,
  toss:          1.0,
  spike:        -1.2,
}

// クリック波紋の色（シーンのアクセント色）
const RIPPLE_COLORS: Record<string, string> = {
  '/soccer':     '#4fc3f7',
  '/basketball': '#ffb300',
  '/volleyball': '#69f0ae',
}

// 状態別カメラオフセット（ball.position に加算）
const CAMERA_OFFSETS: Record<JourneyState, [number, number, number]> = {
  idle:         [0,   2.5,  5.0],
  dribble_1:    [0,   2.5,  5.0],
  cut_1:        [0,   2.5,  4.5],
  cut_2:        [0,   2.5,  4.5],
  long_pass:    [0,   4.0,  8.0],
  catch_wait:   [0,   3.0,  6.0],
  shoot_rise:   [-2,  3.0,  6.0],
  apex:         [0,   2.0,  5.0],
  drop:         [0,   1.5,  4.0],
  through:      [0,   0.5,  2.0],
  receive_wait: [0,   2.5,  5.0],
  receive:      [0,   2.0,  4.0],
  toss:         [0,   4.0,  4.0],
  spike:        [2,   5.0,  3.0],
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

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

// Journey シーン専用: ボールを追従するカメラ
function BallFollowCameraRig({
  ballPosRef,
  currentState,
  pathname,
}: {
  ballPosRef: RefObject<THREE.Vector3>
  currentState: JourneyState
  pathname: string
}) {
  const { camera, size } = useThree()
  const baseFovRef = useRef(55)
  const targetCamPos = useRef(new THREE.Vector3())

  useEffect(() => {
    const cfg = SCENE_CAMERAS[pathname]
    if (cfg) baseFovRef.current = responsiveFov(cfg.fov, size.width / size.height)
  }, [pathname, size])

  useFrame(() => {
    const ballPos = ballPosRef.current
    const off = CAMERA_OFFSETS[currentState]
    targetCamPos.current.set(
      ballPos.x + off[0],
      ballPos.y + off[1],
      ballPos.z + off[2],
    )
    camera.position.lerp(targetCamPos.current, 0.06)
    camera.lookAt(ballPos)

    const pcam = camera as THREE.PerspectiveCamera
    const fov = baseFovRef.current + (fovRef.current - 60)
    if (Math.abs(pcam.fov - fov) > 0.01) {
      pcam.fov = fov
      pcam.updateProjectionMatrix()
    }
  })

  return null
}

// クリックごとにボールの奥・上に浮かぶ 3D カード
function JourneyCardBillboard({ currentState }: { currentState?: JourneyState }) {
  const [visible, setVisible] = useState(false)
  const prevStateRef = useRef<JourneyState | undefined>(undefined)

  useEffect(() => {
    if (currentState === prevStateRef.current) return
    prevStateRef.current = currentState
    setVisible(false)
    if (!currentState || !STATE_CARD_DATA[currentState]) return
    const t = setTimeout(() => setVisible(true), 350)
    return () => clearTimeout(t)
  }, [currentState])

  if (!currentState) return null
  const cardDef = STATE_CARD_DATA[currentState]
  if (!cardDef) return null

  const projCat = cardDef.type === 'project' ? PROJECT_CATEGORIES.find(c => c.id === cardDef.categoryId) : null
  const skillCat = cardDef.type === 'skill'   ? SKILL_CATEGORIES.find(c => c.id === cardDef.categoryId)   : null
  const aboutPt  = cardDef.type === 'about'   ? ABOUT_POINTS.find(p => p.id === cardDef.categoryId)       : null

  const description = projCat
    ? projCat.projects.map(p => p.name).join(' / ')
    : skillCat
    ? skillCat.skills.slice(0, 3).map(s => s.name).join(' · ')
    : aboutPt
    ? aboutPt.body.slice(0, 55) + '…'
    : ''

  const onExplore = () => {
    window.dispatchEvent(new CustomEvent('journey-explore', {
      detail: { type: cardDef.type, categoryId: cardDef.categoryId },
    }))
  }

  return (
    <Html position={[0, 2.2, -2.5]} center transform>
      <div style={{
        width: '240px',
        background: 'rgba(8,8,18,0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${cardDef.color}55`,
        borderRadius: '14px',
        padding: '1rem 1.1rem',
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        boxShadow: `0 0 28px ${cardDef.color}20, 0 8px 24px rgba(0,0,0,0.5)`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        pointerEvents: visible ? 'auto' : 'none',
        userSelect: 'none',
      }}>
        <p style={{
          fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: cardDef.color, margin: '0 0 0.4rem',
        }}>
          {cardDef.type === 'project' ? 'PROJECTS' : cardDef.type === 'skill' ? 'SKILLS' : 'ABOUT'}
        </p>
        <h3 style={{
          fontSize: '0.95rem', fontWeight: 800, color: '#fff',
          margin: '0 0 0.45rem', letterSpacing: '-0.02em', lineHeight: 1.2,
        }}>
          {cardDef.label}
        </h3>
        <p style={{
          fontSize: '0.62rem', color: 'rgba(255,255,255,0.48)',
          lineHeight: 1.6, margin: '0 0 0.8rem',
        }}>
          {description}
        </p>
        <button onClick={onExplore} style={{
          fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em',
          padding: '0.35rem 0.85rem', borderRadius: '999px',
          border: `1px solid ${cardDef.color}88`,
          color: cardDef.color, background: `${cardDef.color}12`,
          cursor: 'pointer',
        }}>
          EXPLORE →
        </button>
      </div>
    </Html>
  )
}

// ボールをクリック位置へ lerp で移動させる（CrystalJourneyMover の代替）
function ClickBallMover({
  groupRef,
  isEnteringRef,
  journeyRotRef,
  journeySpeedRef,
  ballPosRef,
  onAdvanceState,
  currentState,
}: {
  groupRef: React.RefObject<THREE.Group | null>
  isEnteringRef: React.RefObject<boolean>
  journeyRotRef: React.RefObject<{ dirX: number; dirZ: number; rotSpeed: number }>
  journeySpeedRef: React.RefObject<number>
  ballPosRef?: RefObject<THREE.Vector3>
  onAdvanceState?: () => void
  currentState?: JourneyState
}) {
  const { pathname } = useLocation()
  const curveRef = useRef<THREE.QuadraticBezierCurve3 | null>(null)
  const progressRef = useRef({ t: 0 })
  const prevPosRef = useRef(new THREE.Vector3(0, -1.2, 0))
  const currentYRef = useRef(-1.2)
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

  // シーン切替時にボール位置をリセット
  useEffect(() => {
    gsap.killTweensOf(progressRef.current)
    curveRef.current = null
    progressRef.current.t = 0
    prevPosRef.current.set(0, -1.2, 0)
    currentYRef.current = -1.2
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
    }
    const targetY = currentState ? (STATE_Y[currentState] ?? -1.2) : -1.2
    currentYRef.current = THREE.MathUtils.lerp(currentYRef.current, targetY, 0.04)
    current.y = currentYRef.current

    // カメラ追従用にボール位置を共有 ref へ書き込む
    if (ballPosRef) ballPosRef.current.copy(current)

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
    if (!REDUCED_MOTION) setRipples(prev => [...prev.slice(-5), { id: rippleId.current++, x, z }])
    onAdvanceState?.()
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

function CrystalRoot({
  isHome,
  pathname,
  ballEntry,
  ballPosRef,
  onAdvanceState,
  currentState,
}: {
  isHome: boolean
  pathname: string
  ballEntry?: BallEntry
  ballPosRef?: RefObject<THREE.Vector3>
  onAdvanceState?: () => void
  currentState?: JourneyState
}) {
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
    const isContact = pathname === '/contact'
    const targetX = isContact ? 2.5 : 0
    const targetY = isContact ? 0.3 : -1.2
    if (ballEntry) {
      grpRef.current.position.set(ballEntry.x, ballEntry.y, ballEntry.z)
    } else {
      grpRef.current.position.set(isContact ? 4 : 0, targetY, 0)
    }
    gsap.to(grpRef.current.position, {
      x: targetX, y: targetY, z: 0,
      duration: 0.8, ease: 'power2.out',
      onComplete: () => { isEnteringRef.current = false },
    })
  }, [ballEntry, isHome, pathname])

  return (
    <>
      <group
        ref={grpRef}
        position={[0, isHome ? -0.4 : -1.0, 0]}
        scale={isHome ? 1 : pathname === '/contact' ? 0.6 : 0.45}
      >
        <Crystal
          mode={isHome ? 'interactive' : 'click-drive'}
          journeySpeedRef={journeySpeedRef}
          journeyRotRef={journeyRotRef}
          currentState={currentState}
        />
        {!isHome && pathname !== '/contact' && (
          <JourneyCardBillboard currentState={currentState} />
        )}
      </group>
      {!isHome && (
        <ClickBallMover
          groupRef={grpRef}
          isEnteringRef={isEnteringRef}
          journeyRotRef={journeyRotRef}
          journeySpeedRef={journeySpeedRef}
          ballPosRef={ballPosRef}
          onAdvanceState={onAdvanceState}
          currentState={currentState}
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

const JOURNEY_SCENES = new Set(['/soccer', '/basketball', '/volleyball'])

export default function GlobalCanvas() {
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'
  const isJourney = JOURNEY_SCENES.has(pathname)
  const ballEntry = (state as { ballEntry?: BallEntry } | null)?.ballEntry

  const ballPosRef = useRef(new THREE.Vector3(0, -1.2, 0))
  const { currentState, advance } = useSceneStateMachine()
  const terminalFiredRef = useRef<JourneyState | null>(null)

  // pathname 変更時に終端ガードをリセット
  useEffect(() => { terminalFiredRef.current = null }, [pathname])

  // 終端状態で自動シーン遷移
  useEffect(() => {
    if (!isJourney) return
    const next = NEXT_SCENE[currentState]
    if (!next || terminalFiredRef.current === currentState) return
    terminalFiredRef.current = currentState
    const hasCard = !!STATE_CARD_DATA[currentState]
    const delay = hasCard ? 3000 : 1500
    const color = currentState === 'long_pass' ? '#ff8c00'
                : currentState === 'through'   ? '#00e5ff'
                : '#b0aaff'
    const t = setTimeout(() => warpNavigate(() => navigate(next), color), delay)
    return () => clearTimeout(t)
  }, [currentState, isJourney, navigate])

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
        <CrystalRoot
          isHome={isHome}
          pathname={pathname}
          ballEntry={ballEntry}
          ballPosRef={isJourney ? ballPosRef : undefined}
          onAdvanceState={isJourney ? advance : undefined}
          currentState={isJourney ? currentState : undefined}
        />
        {isJourney
          ? <BallFollowCameraRig ballPosRef={ballPosRef} currentState={currentState} pathname={pathname} />
          : <FixedCameraRig />
        }
        <Effects />
      </Suspense>
    </Canvas>
  )
}
