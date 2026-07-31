// 自由落下: リング通過後、そのまま下へ落ちてバレーコートへ。
//
// Phase6: pass.ts/freeThrow.ts/spike.tsと同じ物理弾道(arcHeightAt)へ移行(Issue #320)。
// 水平(x,z)は等速直線(実物の自由落下は空気抵抗を無視すれば水平方向は等速)、
// 垂直(y)はRING_Uで鉛直速度ゼロから自由落下する設定(中間点b=0.75·start.y+0.25·end.y、
// arcHeightAtの導出式にa=start.y,c=end.yを代入しvy(0)=0を解くとこの値になる)。
//
// 旧設計(水平easeIn/垂直easeOut)で「中間点を実測一致させる」フィットも試したが、
// 3次easing由来のカーブは2次のarcHeightAtでは中間点を合わせても着地直前(t≈0.75〜0.9)で
// 着地高さより一瞬下にめり込むオーバーシュートが残り、かつこの区間はdiveVeilEnvelope(u)が
// 0.5を切り雲ヴェールでは隠しきれない(envelope(t=0.9)≈0.058)ため採用しなかった。
// 本設定は始点・終点間で単調減少になりオーバーシュートが起きないことを数値検証済み。
import * as THREE from 'three'
import { arcHeightAt } from '../physics/ballistic-trajectory'

export function fallPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const x = THREE.MathUtils.lerp(start.x, end.x, t)
  const z = THREE.MathUtils.lerp(start.z, end.z, t)
  const midHeight = 0.75 * start.y + 0.25 * end.y
  const y = arcHeightAt(start.y, midHeight, end.y, t)
  return new THREE.Vector3(x, y, z)
}
