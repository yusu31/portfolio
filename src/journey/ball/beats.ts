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

export const HOME_HOLD_END = homeRange.end // 0.06
export const DRIBBLE_START = projectsRange.start // 0.1285
export const DRIBBLE_END = projectsRange.end // 0.2085
export const CATCH_START = skillsRange.start // 0.3715
export const CATCH_END = CATCH_START + 0.01
/**
 * フリースローがリングを通過するu。
 * 当初「カメラ経路がRING_CENTERのz座標に到達するu」で算出したところ0.46付近になったが、
 * その時点はカメラがリングとほぼ同じz座標(距離1程度)まで肉薄しており、近接歪みでNDCが
 * フレーム外に出た(実測: |x|=0.98)。次にskillsセクション終端(0.4515、Phase 5-2で
 * venue近傍の良好な構図として検証済みのu)を試したが、それでもカメラ-リング間距離が
 * 2.1程度まで縮まり、球が画面のほぼ全面を占める極端な接写になった(QA実測)。
 * 終端よりわずかに手前(距離3.3程度)に戻し、ダイナミックな接写を保ちつつ
 * リングも視認できる構図にした
 */
export const RING_U = skillsRange.end - 0.0065 // ≈0.445

// 以下Phase 5-4(ボールリレー後半)の境界。各値はCAMERA_PATHの実座標をスクラッチパッドの
// 使い捨てスクリプトで実測し、カメラ-ボール間距離が4ユニット以上(Phase 5-3の教訓で危険域と
// わかった2〜3ユニットから十分離れている)になることを確認して選定した(詳細はObsidian
// Decisions/2026-07-15-ball-camera-proximity-design.md)。
/** 自由落下でバレーコートへ向かう終端u。about区間開始(0.619)手前で着地体勢に入る(実測距離8.93) */
export const FALL_END = 0.6
/** レシーブでコート中央上空へ持ち上げる終端u(実測距離4.48) */
export const RECEIVE_END = 0.645
/** トスの頂点に達する終端u。about区間終了と一致させる(実測距離4.00) */
export const TOSS_END = aboutRange.end // 0.699
/** アタックでContact手前まで飛ぶ終端u(実測距離7.97) */
export const SPIKE_END = 0.93
/** 最終静止u。PATH_END_OFFSETと一致させ、カメラ静止と同時にボールも静止する(実測距離4.92) */
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
