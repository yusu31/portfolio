// 自由落下: リング通過後、そのまま下へ落ちてバレーコートへ。
// Phase 5-5+: 水平移動は easing のまま。鉛直は真の自由落下物理。
import * as THREE from 'three'
import { easeInCubic, easeOutCubic } from './easing'

/**
 * startからendへ進行度t(0〜1)で移動。
 * 水平(x,z)はeaseOutで序盤に素早く進める: 当初は線形だったが、序盤でカメラの前進速度に
 * 対して水平移動が追いつかず、カメラとほぼ並走してしまい極端な接写になった
 * (実測: u=0.48で画面の9割以上を占有)。idle→dribble(Phase 5-3)と同じ「序盤で素早く
 * カメラを引き離す」パターンで解消する。鉛直(y)は真の自由落下(重力)で再現。
 */
export function fallPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const horizontalT = easeOutCubic(t)
  const x = THREE.MathUtils.lerp(start.x, end.x, horizontalT)
  const z = THREE.MathUtils.lerp(start.z, end.z, horizontalT)

  // 鉛直: 自由落下（初速 = 0）の物理式。
  // start.y から end.y へ落下する時間を逆算し、その中での位置を計算。
  const fallDistance = start.y - end.y
  // 落下時間: y = 0.5 * g * t^2 → t = sqrt(2*y/g)
  const fallTime = Math.sqrt(2 * fallDistance / 12.0)
  // 現在時刻（正規化）
  const currentTime = t * fallTime
  // 現在高さ（自由落下式）: y = y0 - 0.5*g*t^2
  const y = start.y - 0.5 * 12.0 * currentTime * currentTime

  return new THREE.Vector3(x, Math.max(y, end.y), z)
}
