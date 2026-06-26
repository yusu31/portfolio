import { Environment } from '@react-three/drei'
import CameraRig from './CameraRig'
import Crystal from './Crystal'
import Effects from './Effects'

export default function Scene() {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />

      {/* sunset = clearcoat が暖色オレンジを反射してくれる */}
      <Environment preset="sunset" resolution={64} />

      {/* 暖色メイン + 寒色アクセントでファセット間の輝度差を出す */}
      <ambientLight intensity={0.06} />
      <pointLight position={[4, 5, 5]} intensity={35} color="#fff5e0" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#fb923c" />
      <pointLight position={[0, 4, -5]} intensity={18} color="#c0d8ff" />
      <pointLight position={[2, -5, -3]} intensity={20} color="#ffd090" />

      <CameraRig />
      <group position={[0, 0, 0]}>
        <Crystal />
      </group>
      <Effects />
    </>
  )
}
