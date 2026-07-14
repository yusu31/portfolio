// 自由落下: リング通過後、そのまま下へ落ちてバレーコートへ。
import * as THREE from 'three'
import { easeInCubic, easeOutCubic } from './easing'

/**
 * startからendへ進行度t(0〜1)で移動。
 * 水平(x,z)はeaseOutで序盤に素早く進める: 当初は線形だったが、序盤でカメラの前進速度に
 * 対して水平移動が追いつかず、カメラとほぼ並走してしまい極端な接写になった
 * (実測: u=0.48で画面の9割以上を占有)。idle→dribble(Phase 5-3)と同じ「序盤で素早く
 * カメラを引き離す」パターンで解消する。鉛直(y)はeaseInのまま(自由落下の加速感)
 */
export function fallPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const horizontalT = easeOutCubic(t)
  const x = THREE.MathUtils.lerp(start.x, end.x, horizontalT)
  const z = THREE.MathUtils.lerp(start.z, end.z, horizontalT)
  const y = THREE.MathUtils.lerp(start.y, end.y, easeInCubic(t))
  return new THREE.Vector3(x, y, z)
}
