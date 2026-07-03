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
const _lookAt       = new Vector3()

export default function JourneyCameraRig() {
  const { camera } = useThree()
  const { pathname } = useLocation()

  useFrame(() => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints || waypoints.length === 0) return

    const { pos, camOffset } = interpolateWaypoints(scrollProgressRef.current, waypoints)

    _targetPos.copy(pos)
    _targetCamPos.copy(pos).add(camOffset)

    // FOV ワープ適用
    const pcam = camera as PerspectiveCamera
    if (Math.abs(pcam.fov - fovRef.current) > 0.05) {
      pcam.fov = fovRef.current
      pcam.updateProjectionMatrix()
    }

    // カメラはwaypointのみに追従（マウスパララックスなし）
    // 理由: カメラ・ボール・背景の3つが同時に動くと酔いやすい
    camera.position.x = MathUtils.lerp(camera.position.x, _targetCamPos.x, 0.08)
    camera.position.y = MathUtils.lerp(camera.position.y, _targetCamPos.y, 0.08)
    camera.position.z = MathUtils.lerp(camera.position.z, _targetCamPos.z, 0.10)

    // lookAt もマウスオフセットなし — カメラがボールだけを静かに見つめる
    _lookAt.x = MathUtils.lerp(_lookAt.x, _targetPos.x, 0.08)
    _lookAt.y = MathUtils.lerp(_lookAt.y, _targetPos.y, 0.08)
    _lookAt.z = MathUtils.lerp(_lookAt.z, _targetPos.z, 0.10)
    camera.lookAt(_lookAt)
  })

  return null
}
