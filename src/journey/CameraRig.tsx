// スクロールoffsetに応じてカメラをボール追従(チェイスカム)で駆動するリグ。
// Phase 1の直線前進(独立経路)を経て、チェイスカム化(PR-2)でボールのBallFrameに
// 一本化した(設計書§2)。位置・視線・姿勢の組み立ては全てposeJourneyCamera(camera.ts)に集約し、
// CameraRig.tsxはScrollControlsのoffset取得とセクション切替通知だけを担う。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import { sectionAt, type SectionId } from './path'
import { poseJourneyCamera } from './camera'
import { useReducedMotion } from './useReducedMotion'

interface CameraRigProps {
  /** アクティブセクションが変わった瞬間だけ呼ばれる(カードUIの切替用) */
  onSectionChange?: (section: SectionId | null) => void
}

export default function CameraRig({ onSectionChange }: CameraRigProps) {
  const scroll = useScroll()
  const lastSection = useRef<SectionId | null | undefined>(undefined)
  const reducedMotionScale = useReducedMotion()

  useFrame((state) => {
    const offset = scroll.offset // 0〜1

    // 位置・視線・姿勢の組み立てはposeJourneyCameraに一本化(終端静止のoffsetクランプも内部で行う)
    poseJourneyCamera(state.camera, offset, reducedMotionScale)

    // セクション切替はuseFrame内で検知し、変化した瞬間だけReactへ通知する
    // (毎フレームsetStateするとDOM側が60fpsで再レンダリングされるため)。
    // カード表示は生offsetで判定する(contactの区間は1.01まである)
    const section = sectionAt(offset)
    if (section !== lastSection.current) {
      lastSection.current = section
      onSectionChange?.(section)
    }
  })

  return null
}
