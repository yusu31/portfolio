import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { MathUtils } from 'three'

export default function CameraRig() {
  const { camera } = useThree()
  const progress = useScrollProgress()
  const targetY = useRef(0)

  useFrame(() => {
    targetY.current = MathUtils.lerp(targetY.current, -progress * 8, 0.05)
    camera.position.y = MathUtils.lerp(camera.position.y, targetY.current, 0.1)
  })

  return null
}
