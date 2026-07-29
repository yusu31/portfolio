// アタック(#9): トスされたボールをネット奥側の床へ叩きつけ、短くバウンドしてから
// Contactへ向けて大きく弧を描いて舞い上がる3段構成。
import * as THREE from 'three'
import { easeInCubic, easeOutCubic } from './easing'
import { arcHeightAt } from '../physics/ballistic-trajectory'
import { SPIKE_FLOOR, SPIKE_BOUNCE_PEAK } from '../anchors'

/** 叩きつけ(TOSS_PEAK→SPIKE_FLOOR)が終わる進行度。トス頂点での一瞬の静止から加速して床へ */
const SLAM_END_T = 0.12
/** 短いバウンド(SPIKE_FLOOR→SPIKE_BOUNCE_PEAK)が終わる進行度 */
const BOUNCE_PEAK_T = 0.22
/**
 * 第3セグメント(SPIKE_BOUNCE_PEAK→Contact手前)の弧の頂点高さ。pass.ts(PR-4)の
 * ARC_PEAK_HEIGHT=15と同様、Contactまでの長距離(worldでz方向約50ユニット超)を
 * 大きく舞い上がる弧で繋ぐための値。座標同様、実機QAで調整する叩き台
 */
const LANDING_ARC_PEAK_HEIGHT = 12

/**
 * startからendへ進行度t(0〜1)で移動。3段構成:
 * ①t∈[0,SLAM_END_T]: TOSS_PEAK→SPIKE_FLOORへeaseInCubicで加速しながら叩きつけ
 *   (fall.tsと同idiom。トス頂点での一瞬の静止からの打撃なので加速度重視)
 * ②t∈[SLAM_END_T,BOUNCE_PEAK_T]: SPIKE_FLOOR→SPIKE_BOUNCE_PEAKへeaseOutCubic直線lerp
 *   (receive.tsと同idiom。短い跳ね上がり)
 * ③t∈[BOUNCE_PEAK_T,1]: SPIKE_BOUNCE_PEAK→endへarcHeightAt(pass.tsと同idiom)で
 *   大きく弧を描いて舞い上がる。XZは直線lerp、YだけarcHeightAtが担う
 */
export function spikePosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  if (t < SLAM_END_T) {
    const segT = t / SLAM_END_T
    return start.clone().lerp(SPIKE_FLOOR, easeInCubic(segT))
  }
  if (t < BOUNCE_PEAK_T) {
    const segT = (t - SLAM_END_T) / (BOUNCE_PEAK_T - SLAM_END_T)
    return SPIKE_FLOOR.clone().lerp(SPIKE_BOUNCE_PEAK, easeOutCubic(segT))
  }
  const segT = (t - BOUNCE_PEAK_T) / (1 - BOUNCE_PEAK_T)
  const pos = SPIKE_BOUNCE_PEAK.clone().lerp(end, segT)
  pos.y = arcHeightAt(SPIKE_BOUNCE_PEAK.y, LANDING_ARC_PEAK_HEIGHT, end.y, segT)
  return pos
}
