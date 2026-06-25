import CameraRig from './CameraRig'
import Crystal from './Crystal'

export default function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <CameraRig />
      <Crystal />
    </>
  )
}
