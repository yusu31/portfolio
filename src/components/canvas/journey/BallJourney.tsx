import type { Mesh } from 'three'
import SoccerScene from './SoccerScene'

interface BallJourneyProps {
  onSunReady?: (mesh: Mesh) => void
}

export default function BallJourney({ onSunReady }: BallJourneyProps) {
  return (
    <group>
      <SoccerScene onSunReady={onSunReady} />
    </group>
  )
}
