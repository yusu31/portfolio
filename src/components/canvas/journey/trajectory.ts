import { Vector3 } from 'three'

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

export function dribbleBounceY(
  t: number,
  baseY: number,
  bounceHeight: number,
  bounces: number,
): number {
  const phase = t * bounces * Math.PI
  return baseY + Math.abs(Math.sin(phase)) * bounceHeight
}

export interface Waypoint {
  progress: number
  pos: [number, number, number]
  camOffset: [number, number, number]
  rotSpeed: number
  hotspotIndex?: number
  impact?: boolean
}

// Catmull-Romスプライン（端点は直線外挿。直線上の点では線形補間と一致する）
function cr(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    2 * p1 +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  )
}

// 配列インデックスを範囲内にクランプし、端点は直線外挿で仮想点を生成
function getPos(waypoints: Waypoint[], i: number): [number, number, number] {
  if (i >= 0 && i < waypoints.length) return waypoints[i].pos
  if (i < 0) {
    const a = waypoints[0].pos, b = waypoints[1].pos
    return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]]
  }
  const n = waypoints.length
  const a = waypoints[n - 1].pos, b = waypoints[n - 2].pos
  return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]]
}

function getCam(waypoints: Waypoint[], i: number): [number, number, number] {
  if (i >= 0 && i < waypoints.length) return waypoints[i].camOffset
  if (i < 0) {
    const a = waypoints[0].camOffset, b = waypoints[1].camOffset
    return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]]
  }
  const n = waypoints.length
  const a = waypoints[n - 1].camOffset, b = waypoints[n - 2].camOffset
  return [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]]
}

/**
 * 進捗値に基づいてウェイポイントをCatmull-Romスプライン補間する。
 * 各ウェイポイントを滑らかな曲線で結ぶため、放物線軌道がカクカクせずなめらかになる。
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

      const p0 = getPos(waypoints, i - 1)
      const p1 = a.pos
      const p2 = b.pos
      const p3 = getPos(waypoints, i + 2)

      const c0 = getCam(waypoints, i - 1)
      const c1 = a.camOffset
      const c2 = b.camOffset
      const c3 = getCam(waypoints, i + 2)

      return {
        pos: new Vector3(
          cr(p0[0], p1[0], p2[0], p3[0], t),
          cr(p0[1], p1[1], p2[1], p3[1], t),
          cr(p0[2], p1[2], p2[2], p3[2], t),
        ),
        camOffset: new Vector3(
          cr(c0[0], c1[0], c2[0], c3[0], t),
          cr(c0[1], c1[1], c2[1], c3[1], t),
          cr(c0[2], c1[2], c2[2], c3[2], t),
        ),
        rotSpeed: a.rotSpeed + (b.rotSpeed - a.rotSpeed) * t,
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
