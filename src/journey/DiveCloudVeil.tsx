// ダイブ演出(#6)でボールを包む密な雲。カメラとボールの間の空間を埋め、地面が見えないように
// する主役の視覚効果(ground-holeによる地面フェードは補助的な安全網)。
// ボールの現在位置に毎フレーム追従する(RING_CENTER→FALL_LANDINGの水平移動51ユニットに対し、
// 静止した雲塊では区間全体を覆えないため)。
//
// 注意: 親の<Clouds>にfrustumCulled={false}が必須(ScrollJourneyPoc.tsx参照)。
// instancedMeshの既定バウンディングスフィアはベースジオメトリ(原点付近の小さい平面)基準のままで、
// 個々のCloudインスタンスがワールド上の離れた位置(ここではボール追従で±150ユニット規模)に
// 散らばっていることを考慮しないため、frustumCulled=trueのままだと大半のカメラ位置から
// 「視錐台外」と誤判定されて何も描画されない(実機QAで発見・特定済み)。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useScroll, Cloud } from '@react-three/drei'
import * as THREE from 'three'
import { getBallPose } from './ball/ballPath'
import { getCameraOffset } from './camera'
import { diveVeilScale } from './diveVeilEnvelope'

export default function DiveCloudVeil() {
  const groupRef = useRef<THREE.Group>(null)
  const scroll = useScroll()

  useFrame(() => {
    if (!groupRef.current) return
    const u = scroll.offset
    const ballPos = getBallPose(u).position
    const { dUp } = getCameraOffset(u)
    groupRef.current.position.copy(ballPos)
    groupRef.current.position.y += dUp / 2 // カメラとボールのちょうど中間に雲の重心を置く
    groupRef.current.scale.setScalar(diveVeilScale(u))
  })

  return (
    <Cloud
      ref={groupRef}
      seed={21}
      segments={50}
      bounds={[9, 6, 9]}
      volume={16}
      growth={4}
      speed={0.15}
      fade={2}
      opacity={0.92}
      color="#ffe4d1"
    />
  )
}
