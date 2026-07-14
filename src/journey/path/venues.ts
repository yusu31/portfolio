// ヴェニュー(コート)の配置: 道の左右に交互に置き、カメラは道なりに蛇行しながら通過する。
// 終着のContactだけは道の正面(x=0)に置き、フィニッシュゲートをくぐって着地する。
// この座標は経路(curves.ts)・セクション区間(sections.ts)・将来のボールリレー(Phase 5-3)の単一ソース
// Phase 5-2で経路延長(66→約200ユニット)に合わせてz座標を再配置(x横幅・符号は据え置き)
import * as THREE from 'three'

export const VENUES = {
  projects: { center: new THREE.Vector3(-4.5, 0, -33) },
  skills: { center: new THREE.Vector3(4.5, 0, -80) },
  about: { center: new THREE.Vector3(-4.5, 0, -128) },
  contact: { center: new THREE.Vector3(0, 0, -191) },
} as const
