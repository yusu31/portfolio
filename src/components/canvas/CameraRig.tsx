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
    // Hero(100vh)を75%スクロールした時点でクリスタルが画面上端から消える
    const targetY = -(scrollY.current / window.innerHeight) * 3.8
    camera.position.y += (targetY - camera.position.y) * 0.10
  })

  return null
}
