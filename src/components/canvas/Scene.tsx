import CameraRig from './CameraRig'
import Crystal from './Crystal'

export default function Scene() {
  return (
    <>
      {/* ダーク背景映えのドラマティックライティング */}
      <ambientLight intensity={0.15} />
      <pointLight position={[4, 4, 6]} intensity={40} color="#fb923c" />
      <pointLight position={[-4, -3, -4]} intensity={20} color="#fbbf24" />
      <pointLight position={[0, 0, 8]} intensity={8} color="#ffffff" />
      <CameraRig />
      <Crystal />
    </>
  )
}
