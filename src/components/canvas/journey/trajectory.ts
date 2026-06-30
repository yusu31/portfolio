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
