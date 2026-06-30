import { EffectComposer, Bloom, GodRays } from '@react-three/postprocessing'
import type { Mesh } from 'three'

interface EffectsProps {
  sunMesh?: Mesh | null
}

// GodRaysはBloomと組み合わせると、density/weight/exposureをどう調整しても
// 画面を覆う巨大な発光ブロブになり、手前のサッカーボールが隠れてしまうことが
// Task 11の統合検証で判明した。sunMeshの配線（Floodlights → BallJourney →
// Scene → Effects）はそのまま残し、今後ポストプロセッシングを個別に
// 再チューニングするタスクで有効化する。
const GOD_RAYS_ENABLED = false

export default function Effects({ sunMesh }: EffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      {GOD_RAYS_ENABLED && sunMesh ? (
        <GodRays
          sun={sunMesh}
          samples={30}
          density={0.3}
          decay={0.9}
          weight={0.05}
          exposure={0.04}
          blur
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}
