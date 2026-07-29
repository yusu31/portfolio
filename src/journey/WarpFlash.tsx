// ワープVFX(#5): キック軌道中間点(WARP_PEAK_U)で放射状の色収差+Bloomフラッシュを発生させ、
// サッカー→バスケの背景切り替えを隠す(GitHub調査で確認した「postprocessingで画面全体を
// 覆って誤魔化す」パターン、stateless-crunching-wand.mdステップ3設計)。
// DiveCloudVeil.tsxと同じ「u駆動・imperative」パターン: useScroll()でuを取得し、
// ChromaticAberration/Bloomのエフェクトインスタンスへ毎フレーム直接書き込む
// (ScrollJourneyPoc.tsxがuseRefで保持するエフェクトインスタンス参照を props で受け取る。
// EffectComposerはScrollControlsの外にあるため、状態共有はrefで行う)。
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { warpVfxEnvelope } from './warpVfxEnvelope'

// 'postprocessing'はpackage.json直下の依存ではなく@react-three/postprocessing経由の
// 間接依存のため、pnpmのstrict node_modules下では直接importできない。ここで使う
// プロパティ(offset/intensity)だけの最小構造型を自前定義し、実体(ChromaticAberrationEffect/
// BloomEffect)とはダックタイピングで結びつける
export interface ChromaticAberrationEffectLike {
  offset: THREE.Vector2
}
export interface BloomEffectLike {
  intensity: number
}

/** Bloom intensityのベース値。ScrollJourneyPoc.tsxの<Bloom intensity>もこの値を使う */
export const BLOOM_BASE_INTENSITY = 1.1
/**
 * 色収差offsetのピーク量。初回QA(u≈0.29が既に太陽方向を向いていて画面全体が明るい)で
 * 0.006では視認できなかったため2.5倍に引き上げ、実機再確認済み
 */
const CA_PEAK_OFFSET = 0.015
/**
 * Bloom intensityのフラッシュピーク値。CA_PEAK_OFFSETと同じ理由で3.5→6へ引き上げ、
 * 実機再確認済み(ベース値1.1に対し約5.5倍)
 */
const BLOOM_PEAK_INTENSITY = 6

interface WarpFlashProps {
  chromaticAberrationRef: RefObject<ChromaticAberrationEffectLike | null>
  bloomRef: RefObject<BloomEffectLike | null>
}

export default function WarpFlash({ chromaticAberrationRef, bloomRef }: WarpFlashProps) {
  const scroll = useScroll()

  useFrame(() => {
    const env = warpVfxEnvelope(scroll.offset)

    const ca = chromaticAberrationRef.current
    if (ca) ca.offset.set(env * CA_PEAK_OFFSET, env * CA_PEAK_OFFSET)

    const bloom = bloomRef.current
    if (bloom) bloom.intensity = THREE.MathUtils.lerp(BLOOM_BASE_INTENSITY, BLOOM_PEAK_INTENSITY, env)
  })

  return null
}
