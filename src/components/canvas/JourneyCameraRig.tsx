// src/components/canvas/JourneyCameraRig.tsx
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { Vector3, MathUtils, PerspectiveCamera } from 'three'
import { scrollProgressRef } from '../../hooks/useScrollProgress'
import { fovRef } from '../../hooks/useSceneTransition'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'

const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': VOLLEYBALL_WAYPOINTS,
}

// module-level Vector3 でGC圧を避ける
const _targetPos    = new Vector3()
const _targetCamPos = new Vector3()
const _lookAt       = new Vector3()  // smoothed lookAt（lerp済み）

export default function JourneyCameraRig() {
  const { camera } = useThree()
  const { pathname } = useLocation()

  useFrame((state) => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints || waypoints.length === 0) return

    const { pos, camOffset } = interpolateWaypoints(scrollProgressRef.current, waypoints)

    _targetPos.copy(pos)
    _targetCamPos.copy(pos).add(camOffset)

    // ── FOV ワープ適用（useSceneTransition が制御）──────────────────
    const pcam = camera as PerspectiveCamera
    if (Math.abs(pcam.fov - fovRef.current) > 0.05) {
      pcam.fov = fovRef.current
      pcam.updateProjectionMatrix()
    }

    // ── マウスパララックス ──────────────────────────────────────────
    // state.pointer は正規化済み (-1 ~ 1)。係数は ohzi.io 目視計測値。
    const mx = state.pointer.x
    const my = state.pointer.y

    // カメラ位置: waypoint基準 + マウスオフセット を lerp で追従
    // X/Y はぬるっと遅らせる（0.06）、Z はボール追跡を優先（0.10）
    camera.position.x = MathUtils.lerp(camera.position.x, _targetCamPos.x + mx * 0.4, 0.06)
    camera.position.y = MathUtils.lerp(camera.position.y, _targetCamPos.y + my * 0.25, 0.06)
    camera.position.z = MathUtils.lerp(camera.position.z, _targetCamPos.z, 0.10)

    // lookAt ターゲット: ボール位置 + マウス微ズレ → 視線が揺れる体験
    _lookAt.x = MathUtils.lerp(_lookAt.x, _targetPos.x + mx * 0.12, 0.05)
    _lookAt.y = MathUtils.lerp(_lookAt.y, _targetPos.y + my * 0.06, 0.05)
    _lookAt.z = MathUtils.lerp(_lookAt.z, _targetPos.z, 0.10)
    camera.lookAt(_lookAt)
  })

  return null
}
