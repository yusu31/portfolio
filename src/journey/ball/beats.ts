// ボールリレーのビート境界(offset u)と、単純な区間(idle/catch)の姿勢関数。
// ドリブル/パス/フリースロー/fall以降の軌道計算は beats/*.ts に分離している。
import * as THREE from 'three'
import { SECTION_RANGES, PATH_END_OFFSET } from '../path'
import { HOME_REST, CATCH_POINT } from './anchors'
import { dribblePosition } from './beats/dribble'

const homeRange = SECTION_RANGES.find((r) => r.id === 'home')!
const projectsRange = SECTION_RANGES.find((r) => r.id === 'projects')!
const skillsRange = SECTION_RANGES.find((r) => r.id === 'skills')!
const aboutRange = SECTION_RANGES.find((r) => r.id === 'about')!

export const HOME_HOLD_END = homeRange.end // 0.047
export const DRIBBLE_START = projectsRange.start // 0.122
export const DRIBBLE_END = projectsRange.end // 0.202
export const CATCH_START = skillsRange.start // 0.384
export const CATCH_END = CATCH_START + 0.01
/**
 * フリースローがリングを通過するu(skills区間終端のわずかに手前 ≈0.4575)。
 * Phase 5-3ではカメラ-リング間の接写距離(3.3程度)を確保するためのオフセットだったが、
 * Phase 5-5の3倍化でリングはy=7.4の頭上になり、通過直後(u≈0.458〜0.464)にボールが
 * カメラ頭上を抜けてフレーム上端を一瞬外れる「見上げの構図」に変わった(実測カメラ-リング
 * 距離8.03)。これは後続のカメラ姿勢反転演出(バスケ=見上げ→見下ろし)と整合する意図的な
 * 許容点(設計書§数値検証)。オフセット量は据え置きで実測確認済み
 */
export const RING_U = skillsRange.end - 0.0065 // ≈0.4575

// 以下Phase 5-4(ボールリレー後半)で導入した境界。Phase 5-5(世界の3倍化)で
// スクラッチパッドの使い捨てスクリプトにより再実測し、全境界でカメラ-ボール間距離が
// 4ユニット以上(Phase 5-3の教訓で危険域とわかった2〜3ユニットから十分離れている)に
// なることを確認して選定した(詳細はObsidian Decisions/2026-07-15-ball-camera-proximity-design.md)。
/** 自由落下でバレーコートへ向かう終端u。about区間開始(0.647)とほぼ同時に着地する(実測距離4.34) */
export const FALL_END = 0.648
/** レシーブでコート中央上空へ持ち上げる終端u(実測距離5.04) */
export const RECEIVE_END = 0.69
/** トスの頂点に達する終端u。about区間終了と一致させる(実測距離10.19) */
export const TOSS_END = aboutRange.end // 0.727
/** アタックでContact手前まで飛ぶ終端u。contact区間開始と同時にrestへ移る(実測距離5.63) */
export const SPIKE_END = 0.955
/** 最終静止u。PATH_END_OFFSETと一致させ、カメラ静止と同時にボールも静止する(実測距離5.56) */
export const REST_END = PATH_END_OFFSET

const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1)
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * Home区間の静止から、ドリブル開始地点(dribblePosition(0))へ受け渡す。
 * easeOut(急発進)を使う: ease-in-outだと立ち上がりが遅く、序盤でカメラの前進に
 * 追い抜かれてボールとカメラがほぼ同じz座標ですれ違う瞬間ができ、近接歪みでNDCが
 * フレーム外に吹き飛んだ(実測: u=0.09で|x|=21.7)。急発進にしてカメラより早くz方向へ
 * 抜け出すことで、この「すれ違い」区間を実質なくす(QAで確認済み)
 */
export function idlePose(u: number): THREE.Vector3 {
  if (u < HOME_HOLD_END) return HOME_REST.clone()
  const t = easeOutCubic(clamp01((u - HOME_HOLD_END) / (DRIBBLE_START - HOME_HOLD_END)))
  return HOME_REST.clone().lerp(dribblePosition(0), t)
}

/** キャッチの衝撃を吸収する軽い沈み込み。t=0/1でCATCH_POINTに一致する */
export function catchPose(u: number): THREE.Vector3 {
  const t = clamp01((u - CATCH_START) / (CATCH_END - CATCH_START))
  const dip = Math.sin(t * Math.PI) * -0.15
  return CATCH_POINT.clone().add(new THREE.Vector3(0, dip, 0))
}
