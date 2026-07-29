// ロングキック(#4): サッカーゴールを越えてバスケコートまで飛ぶ長距離弾道。
//
// Phase 5-5 SESSION2/3ショットリスト設計。PR-4以前は始点・終点の高さを無視した対称放物線
// (4*H*t*(1-t)、H=4.0固定)で、ゴールにすら近づいていなかった。KICK_POINT(ゴール正面)を
// 新設し、arcHeightAtの非対称弾道(頂点高さ十数ユニット規模)でCATCH_POINTまで一続きに飛ばす。
import * as THREE from 'three'
import { arcHeightAt } from '../physics/ballistic-trajectory'

/**
 * 弾道の頂点高さ。スクラッチパッドシミュレーション(2026-07-29)でu≈0.218(arc内8.9%)で
 * クロスバー(世界y=4.7)を越えることを確認。頂点自体はt=0.5(arc内u≈0.293)に来る
 * (arcHeightAtの数式上の必然)。PR-5で計画中のワープVFX予定地点(u≈0.29)と一致する
 */
const ARC_PEAK_HEIGHT = 15

/** startからendへ進行度t(0〜1)で直線補間(XZ)し、arcHeightAtで高さ(Y)を計算する非対称弾道 */
export function passPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y = arcHeightAt(start.y, ARC_PEAK_HEIGHT, end.y, t)
  return pos
}
