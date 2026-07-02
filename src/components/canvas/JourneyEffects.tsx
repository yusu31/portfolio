import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import * as THREE from 'three'
import { scrollProgressRef, impactTriggerRef } from '../../hooks/useScrollProgress'
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'

interface ShockwaveState {
  active: boolean
  progress: number
  x: number; y: number; z: number
  axis: 'horizontal' | 'vertical'
  color: string
}

const NUM_RINGS = 3

const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': VOLLEYBALL_WAYPOINTS,
}

const RING_COLORS: Record<string, string> = {
  '/soccer':     '#4fc3f7',
  '/basketball': '#ffb300',
  '/volleyball': '#69f0ae',
}

export default function JourneyEffects() {
  const { pathname } = useLocation()
  const { camera } = useThree()
  const ringRefs = useRef<(THREE.Mesh | null)[]>(Array(NUM_RINGS).fill(null))
  const states = useRef<ShockwaveState[]>(
    Array(NUM_RINGS).fill(null).map(() => ({
      active: false, progress: 0, x: 0, y: 0, z: 0,
      axis: 'horizontal' as const, color: '#ffffff',
    }))
  )
  const prevProgress = useRef(0)
  const cameraShake = useRef(0)

  const maybeFireEffect = (current: number) => {
    const prev = prevProgress.current
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints) return

    const color = RING_COLORS[pathname] ?? '#ffffff'

    // hotspotIndex のみ到着検出（コンテンツカード連動）
    // impact:true は navigate() 開始時に impactTriggerRef 経由で即時発火するため除外
    for (const wp of waypoints) {
      if (wp.hotspotIndex === undefined) continue
      if (
        (prev < wp.progress && current >= wp.progress) ||
        (prev > wp.progress && current <= wp.progress)
      ) {
        const { pos } = interpolateWaypoints(wp.progress, waypoints)
        const slot = states.current.findIndex(s => !s.active)
        if (slot < 0) break
        const isVertical = pathname === '/basketball' && wp.hotspotIndex === 2
        states.current[slot] = {
          active: true, progress: 0,
          x: pos.x, y: pos.y, z: pos.z,
          axis: isVertical ? 'vertical' : 'horizontal',
          color,
        }
        if (pathname === '/volleyball' && wp.hotspotIndex === 2) {
          cameraShake.current = 0.3
        }
      }
    }
    prevProgress.current = current
  }

  // impact:true ウェイポイントへの移動が始まった瞬間（スクロール開始時）に即時発火
  const fireImmediateImpact = () => {
    const triggerProgress = impactTriggerRef.current
    if (triggerProgress === null) return
    impactTriggerRef.current = null

    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints) return
    const color = RING_COLORS[pathname] ?? '#ffffff'

    const { pos } = interpolateWaypoints(triggerProgress, waypoints)
    const slot = states.current.findIndex(s => !s.active)
    if (slot < 0) return
    states.current[slot] = {
      active: true, progress: 0,
      x: pos.x, y: pos.y, z: pos.z,
      axis: 'horizontal',
      color,
    }
    cameraShake.current = 0.2
  }

  useFrame((_, delta) => {
    fireImmediateImpact()
    const current = scrollProgressRef.current
    maybeFireEffect(current)

    if (cameraShake.current > 0) {
      camera.position.x += (Math.random() - 0.5) * 0.04
      camera.position.y += (Math.random() - 0.5) * 0.04
      cameraShake.current = Math.max(0, cameraShake.current - delta)
    }

    states.current.forEach((s, i) => {
      if (!s.active) return
      s.progress += delta * 1.8
      const mesh = ringRefs.current[i]
      if (!mesh) return
      const scale = s.progress * 2.5 + 0.1
      mesh.scale.setScalar(scale)
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity = Math.max(0, 1 - s.progress)
      mat.emissiveIntensity = (1 - s.progress) * 4
      mesh.position.set(s.x, s.y, s.z)
      mesh.rotation.x = s.axis === 'horizontal' ? Math.PI / 2 : 0
      mesh.visible = true
      if (s.progress >= 1) {
        s.active = false
        mesh.visible = false
      }
    })
  })

  return (
    <>
      {Array.from({ length: NUM_RINGS }, (_, i) => (
        <mesh
          key={i}
          ref={el => { ringRefs.current[i] = el }}
          visible={false}
        >
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={4}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
