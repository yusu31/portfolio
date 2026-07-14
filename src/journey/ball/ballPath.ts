// クリスタル球の位置と視線ブレンド強度(focusWeight)をoffsetから導く純粋関数。
// カメラ(CameraRig)・カード(SectionCards)と同じ「offsetが唯一の真実」原則に従う。
import * as THREE from 'three'
import { CATCH_POINT, RING_CENTER } from './anchors'
import { DRIBBLE_START, DRIBBLE_END, CATCH_START, CATCH_END, RING_U, idlePose, catchPose, settlePose } from './beats'
import { dribblePosition } from './beats/dribble'
import { passPosition } from './beats/pass'
import { freeThrowPosition } from './beats/freeThrow'

export interface BallPose {
  position: THREE.Vector3
  /** 見せ場でLOOKAT_PATHとブレンドする重み(0〜0.85。上限<1.0でPhase 4の太陽回避を温存) */
  focusWeight: number
}

/**
 * offset(u, 0〜1)からボールの姿勢を返す。
 * Phase 5-3は前半(idle→freeThrow)まで。RING_U以降はPhase 5-4差し替え前提のプレースホルダー(settlePose)。
 */
export function getBallPose(u: number): BallPose {
  if (u < DRIBBLE_START) return { position: idlePose(u), focusWeight: 0 }
  if (u < DRIBBLE_END) {
    const t = (u - DRIBBLE_START) / (DRIBBLE_END - DRIBBLE_START)
    return { position: dribblePosition(t), focusWeight: 0.3 }
  }
  if (u < CATCH_START) {
    const t = (u - DRIBBLE_END) / (CATCH_START - DRIBBLE_END)
    return { position: passPosition(dribblePosition(1), CATCH_POINT, t), focusWeight: 0.5 }
  }
  if (u < CATCH_END) return { position: catchPose(u), focusWeight: 0.6 }
  if (u < RING_U) {
    const t = (u - CATCH_END) / (RING_U - CATCH_END)
    return { position: freeThrowPosition(CATCH_POINT, RING_CENTER, t), focusWeight: 0.8 }
  }
  return { position: settlePose(u), focusWeight: 0.4 }
}
