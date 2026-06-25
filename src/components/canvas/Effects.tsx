import { EffectComposer, Bloom } from '@react-three/postprocessing'

export default function Effects() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
    </EffectComposer>
  )
}
