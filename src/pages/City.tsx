// `/city` — 街を貫く1本道とスポーツ施設(リビルド)。
// 設計書: docs/plans/2026-08-07-rebuild-city-journey.md
//
// **PR 2 まで完了**。道 + カメラ + パレット(PR 1)に**街**が乗った状態で、施設はまだ無い。
// この時点で見えるのは「B と同じ街を球が下っていき、各章の敷地で街の壁だけが途切れる」ところまで。
// 縁石の消滅・フェンス・上部構造の差し替え(§1.2 装置2〜4)は PR 3。
//
// 現行シーン `/scroll-poc` と並走させ、**超えたと確認できるまで ② を壊さない**(§5.1)。
import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import CityAtmosphere from '../city/CityAtmosphere'
import CityBall from '../city/CityBall'
import CityCamera from '../city/CityCamera'
import type { CityLocation } from '../city/CityCamera'
import CityOverlay from '../city/CityOverlay'
import CityRoad from '../city/CityRoad'
import CityStreet from '../city/CityStreet'
import { paletteAt } from '../city/palette'
import {
  CAMERA_FOV,
  PAGES,
  TOTAL_LENGTH,
  currentSearch,
  parseLandmarksEnabled,
  parseOutlineEnabled,
  parseWarpEnabled,
} from '../city/route'

export default function City() {
  const [location, setLocation] = useState<CityLocation>({ chapter: 0, phase: 'street' })
  // 進んだ距離。Canvas の中だけで共有する(state にすると毎フレーム再レンダリングになる)
  const distanceRef = useRef(0)

  // QA ノブ。`?ol=0` は PR 2 で実際に効くようになった(輪郭線の**採否**を決めるのは PR 5)。
  // `?warp=0` は PR 10、`?land=0` は PR 6 で効く。
  // **ノブ自体は最初から入れておく**のが A/B/C で確立した運用(§11)
  const flags = useMemo(() => {
    const search = currentSearch()
    return {
      outline: parseOutlineEnabled(search),
      warp: parseWarpEnabled(search),
      landmarks: parseLandmarksEnabled(search),
    }
  }, [])

  const handleLocationChange = useCallback((next: CityLocation) => setLocation(next), [])

  const initial = paletteAt(0)

  return (
    <div style={{ width: '100vw', height: '100vh', background: initial.sky }}>
      <Canvas
        shadows
        // **広角。これが「強い一点透視」の実体**。縦長画面での補償は CityCamera が行う
        camera={{ fov: CAMERA_FOV, position: [0, 3, 8], near: 0.3, far: TOTAL_LENGTH * 1.6 }}
        gl={{ alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[initial.sky]} />
        <CityAtmosphere distanceRef={distanceRef} />
        <Suspense fallback={null}>
          {/* スクロールバーを消す。一点透視の画に縦線が1本入るだけで構図が濁る */}
          <ScrollControls pages={PAGES} damping={0.16} style={{ scrollbarWidth: 'none' }}>
            <CityCamera
              distanceRef={distanceRef}
              location={location}
              onLocationChange={handleLocationChange}
            />
            {/* 世界は静的。位置ごとに色を焼いてあるので毎フレームの更新が要らない */}
            <CityRoad />
            <CityStreet outline={flags.outline} />
            <CityBall distanceRef={distanceRef} />
          </ScrollControls>
        </Suspense>
      </Canvas>
      <CityOverlay location={location} flags={flags} />
    </div>
  )
}
