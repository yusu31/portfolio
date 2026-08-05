// 背面追従カメラ + 主役の運搬。**カメラは補間なしで連続に動く**(道の式から直接決まる)。
//
// A の `ProtoACamera` は「章を解いてカメラをその場に置き直す」= カットだったが、
// B はスクロールoffsetを道に沿った距離に写すだけで、位置も向きも `route.ts` が決める。
// ここには演出の判断を持たせない(構図の定義は全部 route.ts にあってテストで縛られている)。
//
// 進んだ距離は **ref で共有する**。空とライトは毎フレーム色が変わるが、
// それをReactのstateでやると毎フレーム全体が再レンダリングされるので、
// 描画側(`Atmosphere`)が同じrefを読んで命令的に更新する。
// stateで持つのは区間(4回しか変わらない)だけにとどめる。
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useScroll } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Hero from './Hero'
import { cameraPose, currentSearch, distanceAt, heroPose, overrideDistance, resolveLeg } from './route'

export default function ProtoBCamera({
  distanceRef,
  outline,
  legIndex,
  onLegChange,
}: {
  /** 進んだ距離の共有先。空・フォグ・ライトがこれを読む */
  distanceRef: MutableRefObject<number>
  outline: boolean
  legIndex: number
  onLegChange: (index: number) => void
}) {
  const scroll = useScroll()
  const { camera } = useThree()
  const hero = useRef<THREE.Group>(null)
  const lastLeg = useRef(-1)

  // クエリは実行中に変わらない前提なので1回だけ読む
  const override = useMemo(() => overrideDistance(currentSearch()), [])

  // `?leg=N` 固定時はスクロールを見ないので、区間の通知も1回で済ませる
  useEffect(() => {
    if (override !== null) {
      distanceRef.current = override
      onLegChange(resolveLeg(override).index)
    }
  }, [override, onLegChange, distanceRef])

  useFrame(() => {
    const t = override !== null ? override : distanceAt(scroll.offset)
    distanceRef.current = t

    const pose = cameraPose(t)
    camera.position.set(pose.position[0], pose.position[1], pose.position[2])
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2])

    if (hero.current) {
      const h = heroPose(t)
      hero.current.position.set(h.position[0], h.position[1], h.position[2])
      hero.current.rotation.y = h.rotY
    }

    // 区間が変わったときだけReactに知らせる(道全体で3回しか起きない)
    if (override === null) {
      const { index } = resolveLeg(t)
      if (index !== lastLeg.current) {
        lastLeg.current = index
        onLegChange(index)
      }
    }
  })

  return (
    <group ref={hero}>
      <Hero legIndex={legIndex} frozen={override !== null} outline={outline} />
    </group>
  )
}
