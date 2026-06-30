import { EffectComposer, Bloom, GodRays } from '@react-three/postprocessing'
import type { Mesh } from 'three'

interface EffectsProps {
  sunMesh?: Mesh | null
}

export default function Effects({ sunMesh }: EffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      {sunMesh ? (
        <GodRays
          sun={sunMesh}
          samples={30}
          density={0.9}
          decay={0.9}
          weight={0.4}
          exposure={0.5}
          blur
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}
