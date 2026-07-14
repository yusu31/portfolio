// サッカーピッチでのドリブル: バウンド弧の連結+左右ウィーブ。
import * as THREE from 'three'
import { DRIBBLE_BASE_X, DRIBBLE_GROUND_Y, DRIBBLE_Z_ENTRY, DRIBBLE_Z_EXIT } from '../anchors'

const BOUNCE_CYCLES = 5
const BOUNCE_HEIGHT = 0.45
const WEAVE_CYCLES = 2.5
const WEAVE_AMPLITUDE = 1.0

/** ドリブル区間内の進行度t(0〜1)から位置を返す。t=0/1はビート境界(idle/passの受け渡し点) */
export function dribblePosition(t: number): THREE.Vector3 {
  const z = THREE.MathUtils.lerp(DRIBBLE_Z_ENTRY, DRIBBLE_Z_EXIT, t)
  const bounce = Math.abs(Math.sin(t * Math.PI * BOUNCE_CYCLES)) * BOUNCE_HEIGHT + DRIBBLE_GROUND_Y
  const weave = Math.sin(t * Math.PI * WEAVE_CYCLES) * WEAVE_AMPLITUDE
  return new THREE.Vector3(DRIBBLE_BASE_X + weave, bounce, z)
}
