// 自由落下: リング通過後、そのまま下へ落ちてバレーコートへ。
import * as THREE from 'three'
import { easeInCubic, easeOutCubic } from './easing'

/**
 * startからendへ進行度t(0〜1)で移動。
 * 鉛直(y)はeaseOutで序盤に一気に落ちる(自由落下の「まず落ちる」感)、水平(x,z)はeaseInで
 * 序盤は足踏みし終盤で着地点へ滑り込む。
 *
 * 旧設計(水平easeOut/垂直easeIn、序盤に水平移動を済ませる)は、当時カメラが固定オフセットで
 * ボール後方を追走しており、水平方向に素早くカメラを引き離さないと極端な接写になる問題
 * (実測: u=0.48で画面の9割以上を占有)への対応だった。PR-1(ダイブオフセットブレンド)で
 * この区間のカメラはボール直上をホバーする設計(camera.tsのgetCameraOffset)に変わり、
 * 「後方から追走」という前提が消えたため、この制約はもう当てはまらない。
 *
 * この反転は一度、既存のバックボードクリアランス安全テストに抵触して断念したが、
 * DiveCloudVeil(雲ヴェール)実装後に再検証したところ、危険域(u≈0.51〜0.53)は
 * ちょうど雲が画面をほぼ完全に覆っている区間(diveVeilEnvelope(u)高値)と重なっており、
 * 視覚的には無関係と判断できたため再度採用した(src/journey/path/path.test.ts参照)。
 */
export function fallPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const horizontalT = easeInCubic(t)
  const x = THREE.MathUtils.lerp(start.x, end.x, horizontalT)
  const z = THREE.MathUtils.lerp(start.z, end.z, horizontalT)
  const y = THREE.MathUtils.lerp(start.y, end.y, easeOutCubic(t))
  return new THREE.Vector3(x, y, z)
}
