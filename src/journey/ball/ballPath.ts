// クリスタル球の位置と視線ブレンド強度(focusWeight)をoffsetから導く純粋関数。
// カメラ(CameraRig)・カード(SectionCards)と同じ「offsetが唯一の真実」原則に従う。
import * as THREE from 'three'
import { CATCH_POINT, RING_CENTER, FALL_LANDING, RECEIVE_PEAK, TOSS_PEAK, SPIKE_LANDING, CONTACT_REST } from './anchors'
import {
  DRIBBLE_START,
  DRIBBLE_END,
  CATCH_START,
  CATCH_END,
  RING_U,
  FALL_END,
  RECEIVE_END,
  TOSS_END,
  SPIKE_END,
  REST_END,
  idlePose,
  catchPose,
} from './beats'
import { dribblePosition } from './beats/dribble'
import { passPosition } from './beats/pass'
import { freeThrowPosition } from './beats/freeThrow'
import { fallPosition } from './beats/fall'
import { receivePosition } from './beats/receive'
import { setTossPosition } from './beats/setToss'
import { spikePosition } from './beats/spike'
import { restPosition } from './beats/rest'

export interface BallPose {
  position: THREE.Vector3
  /** 見せ場でLOOKAT_PATHとブレンドする重み(0〜0.85。上限<1.0でPhase 4の太陽回避を温存) */
  focusWeight: number
}

/** offset(u, 0〜1)からボールの姿勢を返す。ストーリーボード全区間(idle→rest)をここでdispatchする */
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
  if (u < FALL_END) {
    // 落下直後は見せ場ではないため注視を弱める(Phase 5-3のidle→dribble遷移と同じ扱い)
    const t = (u - RING_U) / (FALL_END - RING_U)
    return { position: fallPosition(RING_CENTER, FALL_LANDING, t), focusWeight: 0.2 }
  }
  if (u < RECEIVE_END) {
    const t = (u - FALL_END) / (RECEIVE_END - FALL_END)
    return { position: receivePosition(FALL_LANDING, RECEIVE_PEAK, t), focusWeight: 0.7 }
  }
  if (u < TOSS_END) {
    const t = (u - RECEIVE_END) / (TOSS_END - RECEIVE_END)
    return { position: setTossPosition(RECEIVE_PEAK, TOSS_PEAK, t), focusWeight: 0.6 }
  }
  if (u < SPIKE_END) {
    const t = (u - TOSS_END) / (SPIKE_END - TOSS_END)
    return { position: spikePosition(TOSS_PEAK, SPIKE_LANDING, t), focusWeight: 0.75 }
  }
  // REST_END(=PATH_END_OFFSET)を超えるu(offsetの生値が1.0まで続く)でも
  // オーバーシュートしないようclampする
  const t = THREE.MathUtils.clamp((u - SPIKE_END) / (REST_END - SPIKE_END), 0, 1)
  return { position: restPosition(SPIKE_LANDING, CONTACT_REST, t), focusWeight: 0.35 }
}
