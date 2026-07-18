// フリースロー: キャッチ地点からリング中心へ向かうシュート弧。
import * as THREE from 'three'

const ARC_HEIGHT = 3.2

/** startからendへ進行度t(0〜1)で直線補間し、sin弧で高さを足す。t=1でちょうどendに一致する(リング通過判定の要) */
export function freeThrowPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y += Math.sin(t * Math.PI) * ARC_HEIGHT
  return pos
}
