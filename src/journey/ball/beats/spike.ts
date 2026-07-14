// アタック: トスされたボールを強く打ち込み、Contactへ向けて鋭く飛ばす。
import * as THREE from 'three'
import { easeOutCubic } from './easing'

/**
 * startからendへ進行度t(0〜1)で移動。打撃の初速が最大でその後減速するeaseOutを使う
 * (バレーのスパイクは叩いた瞬間が最速)。当初easeInで検討したが、序盤の低速区間で
 * カメラの前進とほぼ同じペースになり、途中でカメラとほぼ並走してしまい近接歪みが
 * 発生した(実測: u=0.914で距離1.24)。easeOutで序盤に一気にカメラを引き離すことで解消した
 */
export function spikePosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  return start.clone().lerp(end, easeOutCubic(t))
}
