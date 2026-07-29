// ダイブ演出(#6)の雲ヴェール・地面フェード共通の包絡線。offset(u)の純関数。
// camera.tsのdiveBlendT・cameraAttitude.tsのdiveWobbleEnvelopeと同一idiom
// (RING_U→DIVE_PEAK_U→FALL_ENDで0→1→0のsmootherstep)をこのコードベース4例目として再利用する。
import * as THREE from 'three'
import { RING_U, FALL_END } from './ball/beats'
import { DIVE_PEAK_U } from './cameraAttitude'

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³) */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/**
 * RING_U→DIVE_PEAK_U→FALL_ENDで0→1→0の包絡線。区間外は厳密に0
 * (サッカー区間・About以降に一切影響しない)
 */
export function diveVeilEnvelope(u: number): number {
  if (u < RING_U || u >= FALL_END) return 0
  if (u < DIVE_PEAK_U) return smootherstep((u - RING_U) / (DIVE_PEAK_U - RING_U))
  return smootherstep((FALL_END - u) / (FALL_END - DIVE_PEAK_U))
}

/** 完全な0だとCloudのbillboard法線が特異点になるリスクを避ける下限スケール */
const MIN_SCALE = 0.001

/** 雲ヴェールのグループscale(MIN_SCALE〜1)。DiveCloudVeil.tsxで使用 */
export function diveVeilScale(u: number): number {
  return THREE.MathUtils.lerp(MIN_SCALE, 1, diveVeilEnvelope(u))
}

/** 地面フェード(ground-hole)の強さ(0〜1)。ボールのXZ位置と組み合わせてuniformを構成する */
export function diveHoleStrength(u: number): number {
  return diveVeilEnvelope(u)
}
