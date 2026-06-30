import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import { Mesh, Vector3 } from 'three'
import { useJourneySectionProgress } from './useJourneySectionProgress'
import { dribbleBounceY, parabolaPoint } from './trajectory'
import CourtSurface from './CourtSurface'
import GrassField from './GrassField'
import Floodlights from './Floodlights'

interface SoccerSceneProps {
  onSunReady?: (mesh: Mesh) => void
}

const DRIBBLE_END = 0.7 // progress 0〜0.7: ドリブル、0.7〜1.0: ロングパス
const DRIBBLE_START = new Vector3(0, 0, 4)
const DRIBBLE_END_POS = new Vector3(0, 0, -6)
const PASS_END_POS = new Vector3(0, 0, -30)

export default function SoccerScene({ onSunReady }: SoccerSceneProps) {
  const progressRef = useJourneySectionProgress('journey-soccer')
  const ballRef = useRef<Mesh>(null)
  const { camera } = useThree()

  useFrame(() => {
    const p = progressRef.current
    if (!ballRef.current) return

    if (p <= 0 || p >= 1) {
      ballRef.current.visible = false
      return
    }
    ballRef.current.visible = true

    if (p < DRIBBLE_END) {
      const t = p / DRIBBLE_END
      const x = DRIBBLE_START.x + (DRIBBLE_END_POS.x - DRIBBLE_START.x) * t
      const z = DRIBBLE_START.z + (DRIBBLE_END_POS.z - DRIBBLE_START.z) * t
      const y = dribbleBounceY(t, 0.3, 0.35, 8)
      ballRef.current.position.set(x, y, z)
    } else {
      const t = (p - DRIBBLE_END) / (1 - DRIBBLE_END)
      const point = parabolaPoint(t, DRIBBLE_END_POS, PASS_END_POS, 3.5)
      ballRef.current.position.copy(point)
    }

    // カメラはボールの少し後方・上方から追従するドリー
    const camTarget = new Vector3(
      ballRef.current.position.x,
      ballRef.current.position.y + 1.5,
      ballRef.current.position.z + 4,
    )
    camera.position.lerp(camTarget, 0.08)
    camera.lookAt(ballRef.current.position)
  })

  return (
    <group>
      <CourtSurface />
      <GrassField />
      <Floodlights onSunReady={onSunReady} />
      <Trail width={2} length={6} color="#fb923c" attenuation={(t) => t * t}>
        <mesh ref={ballRef}>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial
            color="#fdba74"
            emissive="#f97316"
            emissiveIntensity={1.4}
          />
        </mesh>
      </Trail>
    </group>
  )
}
