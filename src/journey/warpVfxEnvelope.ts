// ワープVFX(#5)のキック軌道中間点フラッシュ用包絡線。offset(u)の純関数。
// camera.tsのdiveBlendT/arcBlendT・cameraAttitude.tsのdiveWobbleEnvelope・
// diveVeilEnvelope.tsのdiveVeilEnvelopeと同一idiomをこのコードベース5例目として実装する
// (詳細設計: stateless-crunching-wand.mdステップ3)。
import * as THREE from 'three'
import { DRIBBLE_END, CATCH_START } from './ball/beats'

/** 両端で値・傾きゼロのsmootherstep(6t⁵-15t⁴+10t³) */
const smootherstep = (t: number): number => {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** arc区間(DRIBBLE_END〜CATCH_START、キック軌道)の中央。ワープVFXのピークu */
export const WARP_PEAK_U = (DRIBBLE_END + CATCH_START) / 2

/**
 * WARP_PEAK_U前後の半幅(u)。「短いフラッシュ」の叩き台値でQAでの実測調整が前提
 * (postprocessは自動テスト不可のため、包絡線の形だけを先に確定する)
 */
const WARP_HALF_WIDTH = 0.02

/**
 * WARP_PEAK_U±WARP_HALF_WIDTHで0→1→0のsmootherstep包絡線。区間外は厳密に0
 * (dribble本編・freeThrow以降に一切影響しない)
 */
export function warpVfxEnvelope(u: number): number {
  const dist = Math.abs(u - WARP_PEAK_U)
  if (dist >= WARP_HALF_WIDTH) return 0
  return smootherstep(1 - dist / WARP_HALF_WIDTH)
}
