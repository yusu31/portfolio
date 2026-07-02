import { Vector3 } from 'three'

/**
 * start→end間を進む放物線軌道上の、進捗t(0〜1)時点の座標を返す。
 * peakHeightはt=0.5時点でのY方向の盛り上がり量。
 */
export function parabolaPoint(
  t: number,
  start: Vector3,
  end: Vector3,
  peakHeight: number,
): Vector3 {
  const x = start.x + (end.x - start.x) * t
  const z = start.z + (end.z - start.z) * t
  const baseY = start.y + (end.y - start.y) * t
  const arc = peakHeight * 4 * t * (1 - t)
  return new Vector3(x, baseY + arc, z)
}

/**
 * ドリブル中のバウンド高さ。t(0〜1)の全区間でbounces回バウンドする。
 * 戻り値は常にbaseY以上。
 */
export function dribbleBounceY(
  t: number,
  baseY: number,
  bounceHeight: number,
  bounces: number,
): number {
  const phase = t * bounces * Math.PI
  return baseY + Math.abs(Math.sin(phase)) * bounceHeight
}

/**
 * ジャーニー内での経由地点を表す型。
 * 進捗値(0〜1)に対応する3D位置、カメラオフセット、回転速度、ホットスポットインデックスを保持。
 */
export interface Waypoint {
  progress: number
  pos: [number, number, number]
  camOffset: [number, number, number]
  rotSpeed: number
  hotspotIndex?: number
  impact?: boolean   // 通過時にShockwaveを発火（打つ・蹴る・受ける瞬間）
}

/**
 * 進捗値に基づいてwaypointsを補間し、位置・カメラオフセット・回転速度・ホットスポットインデックスを返す。
 * progressが範囲外の場合は端点を返す。
 */
export function interpolateWaypoints(
  progress: number,
  waypoints: Waypoint[],
): { pos: Vector3; camOffset: Vector3; rotSpeed: number; hotspotIndex: number | undefined } {
  const none = { pos: new Vector3(), camOffset: new Vector3(0, 0, 5), rotSpeed: 1, hotspotIndex: undefined }
  if (waypoints.length === 0) return none

  const first = waypoints[0]
  if (progress <= first.progress) {
    return {
      pos: new Vector3(...first.pos),
      camOffset: new Vector3(...first.camOffset),
      rotSpeed: first.rotSpeed,
      hotspotIndex: first.hotspotIndex,
    }
  }

  const last = waypoints[waypoints.length - 1]
  if (progress >= last.progress) {
    return {
      pos: new Vector3(...last.pos),
      camOffset: new Vector3(...last.camOffset),
      rotSpeed: last.rotSpeed,
      hotspotIndex: last.hotspotIndex,
    }
  }

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    if (progress >= a.progress && progress < b.progress) {
      const t = (progress - a.progress) / (b.progress - a.progress)
      const lerp = (x: number, y: number) => x + (y - x) * t
      return {
        pos: new Vector3(
          lerp(a.pos[0], b.pos[0]),
          lerp(a.pos[1], b.pos[1]),
          lerp(a.pos[2], b.pos[2]),
        ),
        camOffset: new Vector3(
          lerp(a.camOffset[0], b.camOffset[0]),
          lerp(a.camOffset[1], b.camOffset[1]),
          lerp(a.camOffset[2], b.camOffset[2]),
        ),
        rotSpeed: lerp(a.rotSpeed, b.rotSpeed),
        hotspotIndex: a.hotspotIndex,
      }
    }
  }

  return {
    pos: new Vector3(...last.pos),
    camOffset: new Vector3(...last.camOffset),
    rotSpeed: last.rotSpeed,
    hotspotIndex: last.hotspotIndex,
  }
}
