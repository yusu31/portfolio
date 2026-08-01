// スイッシュ: リングを通過した直後、ネットの内側を垂直に抜けていく短い区間。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §6
//
// **なぜ必要か**: 旧`fall`はRING_Uからの退出角が0.1°(実質水平発射)で、リング半径3.0の外へ
// 出るまでにわずか0.020しか落下しない。ネット(全長5.25)を吊った瞬間、ボールが最上段の
// コードを真横に突き抜ける新しい破綻が生まれる。ネットを短く様式化しても解決しない
// (落下2.0でも水平29.87必要)ため、軌道側にスイッシュ区間を足すのが唯一の解。
//
// 垂直の式は`fall`と同一(始点で鉛直速度ゼロの自由落下)。設計書§6.3の
// 「swish自体はarcHeightAtの自由落下をそのまま使う(新しい物理は要らない)」に従う。
// ビート間は「位置のみ一致、速度は繋がない」という全ビート共通の規約(beats.ts)のまま。
import * as THREE from 'three'
import { arcHeightAt } from '../physics/ballistic-trajectory'

/**
 * リング中心(start)からスイッシュ終端(end)へ。水平は等速直線、垂直は自由落下。
 *
 * `fallPosition`と同じ式だが別関数にしているのは、この区間だけが
 * **「ネットの内側を通る」という幾何学的制約**を負っているため(swish.test.tsで担保)。
 * fallの水平ドリフトは55ユニットでネットとは無関係
 */
export function swishPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const x = THREE.MathUtils.lerp(start.x, end.x, t)
  const z = THREE.MathUtils.lerp(start.z, end.z, t)
  // b = 0.75a + 0.25c を arcHeightAt に入れると vy(0)=0 の自由落下 y = a + (c-a)t² になる
  const midHeight = 0.75 * start.y + 0.25 * end.y
  const y = arcHeightAt(start.y, midHeight, end.y, t)
  return new THREE.Vector3(x, y, z)
}
