import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

interface CourtSurfaceProps {
  width?: number
  depth?: number
  position?: [number, number, number]
}

export default function CourtSurface({
  width = 20,
  depth = 40,
  position = [0, -1.8, -10],
}: CourtSurfaceProps) {
  const [diffuse, normal, roughness] = useTexture([
    '/textures/leafy_grass_diff_1k.jpg',
    '/textures/leafy_grass_nor_gl_1k.jpg',
    '/textures/leafy_grass_rough_1k.jpg',
  ])

  ;[diffuse, normal, roughness].forEach((tex) => {
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(width / 4, depth / 4)
  })

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={diffuse}
        normalMap={normal}
        roughnessMap={roughness}
        roughness={1}
      />
    </mesh>
  )
}
