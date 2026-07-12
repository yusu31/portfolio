// スクロールoffsetに応じてカメラをCatmull-Rom経路上で前進させるリグ。
// Phase 1の直線前進を、道なりに蛇行しながらヴェニューへ視線を振る動きに拡張(設計書§6)。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { CAMERA_PATH, LOOKAT_PATH, sectionAt, type SectionId } from './sections'

interface CameraRigProps {
  /** アクティブセクションが変わった瞬間だけ呼ばれる(カードUIの切替用) */
  onSectionChange?: (section: SectionId | null) => void
}

export default function CameraRig({ onSectionChange }: CameraRigProps) {
  const scroll = useScroll()
  const pos = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const lastSection = useRef<SectionId | null | undefined>(undefined)

  useFrame((state) => {
    const offset = scroll.offset // 0〜1

    CAMERA_PATH.getPoint(offset, pos.current)
    LOOKAT_PATH.getPoint(offset, target.current)
    state.camera.position.copy(pos.current)
    state.camera.lookAt(target.current)

    // セクション切替はuseFrame内で検知し、変化した瞬間だけReactへ通知する
    // (毎フレームsetStateするとDOM側が60fpsで再レンダリングされるため)
    const section = sectionAt(offset)
    if (section !== lastSection.current) {
      lastSection.current = section
      onSectionChange?.(section)
    }
  })

  return null
}
