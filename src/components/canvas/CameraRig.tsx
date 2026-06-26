import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export default function CameraRig() {
  const { camera } = useThree()
  const scrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => { scrollY.current = window.scrollY }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame(() => {
    // スクロールするほどカメラを下に動かす → クリスタルが上へスクロールアウト
    // 1vh ≈ window.innerHeight px を 1 world-unit にマップ
    const targetY = -(scrollY.current / window.innerHeight) * 2.9
    camera.position.y += (targetY - camera.position.y) * 0.08
  })

  return null
}
