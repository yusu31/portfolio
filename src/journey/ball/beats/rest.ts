// Contact着地: 旅の終着点、プラザ中央の台座へ静かに収まる。
import * as THREE from 'three'
import { easeOutCubic } from './easing'

/** startからendへ進行度t(0〜1)で移動。easeOutで減速し、台座へ静かに着地する */
export function restPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  return start.clone().lerp(end, easeOutCubic(t))
}
