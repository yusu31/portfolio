// レシーブ: 低い姿勢で受け止め、コート中央上空へ持ち上げる。
import * as THREE from 'three'
import { easeOutCubic } from './easing'

/** startからendへ進行度t(0〜1)で移動。easeOutで素早く持ち上げてから緩やかに頂点へ収まる */
export function receivePosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  return start.clone().lerp(end, easeOutCubic(t))
}
