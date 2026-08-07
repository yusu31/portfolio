// スクロール → 距離 → カメラ姿勢。
//
// 姿勢そのものは `camera.ts` の `poseCityCamera` が持つ(描画とテストが同じ実装を共有する)。
// このコンポーネントの役目は3つだけ:
//   1. スクロール offset を距離 `t` に変換して `distanceRef` へ流す(全員がここを読む)
//   2. `?leg=N` などの QA オーバーライドを効かせる
//   3. アスペクト比に応じて fov を補償する
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useScroll } from '@react-three/drei'
import * as THREE from 'three'
import { poseCityCamera } from './camera'
import { currentSearch, distanceAt, overrideDistance, resolvePhase, responsiveFov } from './route'
import type { PhaseId } from './route'

/** いま世界のどこにいるか。オーバーレイの表示だけに使う */
export type CityLocation = { chapter: number; phase: PhaseId }

type Props = {
  distanceRef: React.MutableRefObject<number>
  location: CityLocation
  onLocationChange: (next: CityLocation) => void
}

export default function CityCamera({ distanceRef, location, onLocationChange }: Props) {
  const { camera, size } = useThree()
  const scroll = useScroll()

  // `?leg=N&at=M&ph=P` があればスクロールを見ない。カメラが最初のフレームから静止するので
  // スクリーンショットが2回目のポーリングで収束する(この開発機で唯一収束する手順)
  const override = useMemo(() => overrideDistance(currentSearch()), [])

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (!cam.isPerspectiveCamera) return
    cam.fov = responsiveFov(size.width / size.height)
    cam.updateProjectionMatrix()
  }, [camera, size])

  useFrame(() => {
    const t = override ?? distanceAt(scroll.offset)
    distanceRef.current = t
    poseCityCamera(camera, t)

    // 章・フェーズが変わったときだけ React へ知らせる(旅の全体で15回。再描画は事実上ゼロ)
    const p = resolvePhase(t)
    if (p.chapterIndex !== location.chapter || p.phase !== location.phase) {
      onLocationChange({ chapter: p.chapterIndex, phase: p.phase })
    }
  })

  return null
}
