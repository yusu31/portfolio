// ヴェニュー(コート)の配置: 道の左右に交互に置き、カメラは道なりに蛇行しながら通過する。
// 終着のContactだけは道の正面(x=0)に置き、フィニッシュゲートをくぐって着地する。
// この座標は経路(curves.ts)・セクション区間(sections.ts)・将来のボールリレー(Phase 5-3)の単一ソース
import * as THREE from 'three'

export const VENUES = {
  projects: { center: new THREE.Vector3(-4.5, 0, -17) },
  skills: { center: new THREE.Vector3(4.5, 0, -31) },
  about: { center: new THREE.Vector3(-4.5, 0, -45) },
  contact: { center: new THREE.Vector3(0, 0, -58) },
} as const
