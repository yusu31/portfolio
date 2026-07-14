// トス: レシーブしたボールをコート中央上空高くへ持ち上げる。
import * as THREE from 'three'
import { easeOutCubic } from './easing'

/** startからendへ進行度t(0〜1)で移動。easeOutで上昇が減速し、頂点でふわりと収まる */
export function setTossPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  return start.clone().lerp(end, easeOutCubic(t))
}
