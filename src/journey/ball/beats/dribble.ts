// サッカーピッチでのドリブル: バウンド弧の連結+左右ウィーブ。
// Phase 5-5+: 真のバウンド物理に移行。反発係数で減衰を再現。
import * as THREE from 'three'
import { bouncePosition, RESTITUTION } from '../physics'
import { DRIBBLE_BASE_X, DRIBBLE_GROUND_Y, DRIBBLE_Z_ENTRY, DRIBBLE_Z_EXIT } from '../anchors'

const BOUNCE_CYCLES = 9
const BOUNCE_HEIGHT = 1.3
const WEAVE_CYCLES = 3.5
const WEAVE_AMPLITUDE = 3.0

/** ドリブル区間内の進行度t(0〜1)から位置を返す。t=0/1はビート境界(idle/passの受け渡し点)
 * 物理ベース: バウンドは反発係数で減衰、ウィーブはそのまま。 */
export function dribblePosition(t: number): THREE.Vector3 {
  const z = THREE.MathUtils.lerp(DRIBBLE_Z_ENTRY, DRIBBLE_Z_EXIT, t)

  // バウンス: t内で何回バウンスするかから減衰倍数を算出
  // t=0~1 の間に BOUNCE_CYCLES 回バウンス → 各バウンスは t / BOUNCE_CYCLES の時間
  const bouncePhase = t * BOUNCE_CYCLES
  const bounceIndex = Math.floor(bouncePhase)
  const bounceLocalT = bouncePhase - bounceIndex

  // 反発係数で減衰（バウンド回数が多いほど低くなる）
  const dampingFactor = Math.pow(RESTITUTION.ball, bounceIndex)
  const bounce = Math.abs(Math.sin(bounceLocalT * Math.PI)) * BOUNCE_HEIGHT * dampingFactor + DRIBBLE_GROUND_Y

  // ウィーブ（左右揺れ: 反発に影響しない）
  const weave = Math.sin(t * Math.PI * WEAVE_CYCLES) * WEAVE_AMPLITUDE

  return new THREE.Vector3(DRIBBLE_BASE_X + weave, bounce, z)
}
