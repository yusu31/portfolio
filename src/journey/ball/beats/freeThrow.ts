// フリースロー: キャッチ地点からリング中心へ向かうシュート弧。
//
// Phase 6-2: sin弧 → 等重力の物理放物線へ移行(passと同じlib_fts lateral解の閉形式)。
// t=1で放物線項が厳密に0になるため、リング通過判定(end一致)は構造的に保証される。
import * as THREE from 'three'

const ARC_HEIGHT = 3.2

/** startからendへ進行度t(0〜1)で直線補間し、等重力放物線で高さを足す。t=1でちょうどendに一致する(リング通過判定の要) */
export function freeThrowPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y += 4 * ARC_HEIGHT * t * (1 - t)
  return pos
}
