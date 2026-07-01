import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

export default function CameraRig() {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })

  useFrame(() => {
    camera.position.x += (mouse.current.x * 0.5 - camera.position.x) * 0.05
    camera.position.y += (mouse.current.y * 0.3 - camera.position.y) * 0.05
  })

  return null
}
