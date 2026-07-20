// ロングパス: transit1を飛び越える大きな放物線。
//
// Phase 6-2: sin弧 → 等重力の物理放物線へ移行。
// 4*H*t*(1-t) は lib_fts solve_ballistic_arc_lateral（始点a・中間時刻で頂点b・終点cを
// 通る放物線の閉形式解）を正規化時間で表現したもので、キャッシュ・状態なしの純関数のまま
// 本物の弾道になる。sin(πt)*H との差は最大5.6%(≈0.22u)で頂点・端点は完全一致。
// sin弧は端点で垂直加速度が0になり「ふわっと浮く」が、放物線は全区間で一定の重力感が出る。
import * as THREE from 'three'

const ARC_HEIGHT = 4.0

/** startからendへ進行度t(0〜1)で直線補間し、等重力放物線で高さを足す。t=0/1はビート境界でstart/endに一致 */
export function passPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y += 4 * ARC_HEIGHT * t * (1 - t)
  return pos
}
