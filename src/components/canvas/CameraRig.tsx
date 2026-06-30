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
    // Hero(100vh)を65%スクロールした時点でクリスタルが画面上端から消える。
    // それ以降（JourneyZone以降）はCameraRigの制御を完全に停止し、SoccerScene等の
    // 後続シーンがcamera.positionを毎フレーム奪い合わないようにする。
    const heroScrollRange = window.innerHeight * 0.65
    if (scrollY.current > heroScrollRange) return

    const targetY = -(scrollY.current / window.innerHeight) * 4.8
    camera.position.y += (targetY - camera.position.y) * 0.15
  })

  return null
}
