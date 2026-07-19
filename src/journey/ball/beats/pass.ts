// ロングパス: transit1を飛び越える大きな放物線。
// Phase 5-5+: 真の放物線物理に移行。既存 ARC_HEIGHT 4.0 の見栄えを保証。
import * as THREE from 'three'
import { calcVelocityForArc } from '../physics'

const ARC_HEIGHT = 4.0

/** startからendへ進行度t(0〜1)で放物線軌道を計算。真の物理エンジン使用。t=0/1はビート境界でstart/endに一致 */
export function passPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  // 放物線: 最高点 = start.y + ARC_HEIGHT、着地 = end.y
  const peakHeight = start.y + ARC_HEIGHT - end.y
  const velocity = calcVelocityForArc(start, end, peakHeight)

  // 物理ベースの放物線軌道（t正規化：0~1）
  return new THREE.Vector3(
    start.x + velocity.x * t,
    start.y + velocity.y * t - 0.5 * 12.0 * t * t,
    start.z + velocity.z * t
  )
}
