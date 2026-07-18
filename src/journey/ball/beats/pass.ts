// ロングパス: transit1を飛び越える大きな放物線。
import * as THREE from 'three'

const ARC_HEIGHT = 4.0

/** startからendへ進行度t(0〜1)で直線補間し、sin弧で高さを足す。t=0/1はビート境界でstart/endに一致 */
export function passPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y += Math.sin(t * Math.PI) * ARC_HEIGHT
  return pos
}
