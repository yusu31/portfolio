import { EffectComposer, Bloom } from '@react-three/postprocessing'

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
      />
    </EffectComposer>
  )
}
