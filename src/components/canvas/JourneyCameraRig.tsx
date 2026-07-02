// src/components/canvas/JourneyCameraRig.tsx
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { Vector3 } from 'three'
import { scrollProgressRef } from '../../hooks/useScrollProgress'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'

// 各スポーツシーンのウェイポイントはPhase B〜Dで import する
// Phase Aではスポーツシーンでカメラが初期位置のままになる（OK）
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer': [],
  '/basketball': [],
  '/volleyball': [],
}

const _targetPos = new Vector3()
const _targetCamPos = new Vector3()

export default function JourneyCameraRig() {
  const { camera } = useThree()
  const { pathname } = useLocation()

  useFrame(() => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints || waypoints.length === 0) return

    const progress = scrollProgressRef.current
    const { pos, camOffset } = interpolateWaypoints(progress, waypoints)

    _targetPos.copy(pos)
    _targetCamPos.copy(pos).add(camOffset)

    camera.position.lerp(_targetCamPos, 0.05)
    camera.lookAt(_targetPos)
  })

  return null
}
