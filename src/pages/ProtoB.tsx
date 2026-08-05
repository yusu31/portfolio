// プロトタイプB: 背面追従 + 強い一点透視 (Issue #355)。
//
// **現行シーン(/scroll-poc)とも プロトタイプA(/proto/a)とも完全に独立している。**
// journey/ も proto/a/ も1つも import していない。NPRのretrofitを打ち切って
// 「1から作って比較する」方針に転換したので、既存の資産を引き継がないことが要件そのもの。
//
// 参考例①(probiex007 / messenger.abeto.co)の観察を、この試作では次のように実装している:
//   1. パレットを絞る    → palette.ts。**区間をまたいで補間する**(A はカット送りなので切替だった)
//   2. 強い一点透視      → route.ts。fov55 の広角 + 消失点が画面中央から12度以内(テストで固定)
//   3. 囲む構図          → street.ts。両側の建物が画面上端を越え、上部を歩道橋が横切る
//   4. 地面に情報        → roadSurface.ts。白線・マンホール・横断歩道を150件以上
//   5. 密度              → street.ts。1ユニットあたり0.85個以上の小物
//   6. 輪郭線            → outline.ts。**①は4例中唯一線がある例**なので入れ、`?ol=0` で外して比べられる
import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import * as THREE from 'three'
import ProtoBScene from '../proto/b/ProtoBScene'
import ProtoBCamera from '../proto/b/ProtoBCamera'
import ProtoBOverlay from '../proto/b/ProtoBOverlay'
import { paletteAt } from '../proto/b/palette'
import {
  CAMERA_FOV,
  LEGS,
  TOTAL_LENGTH,
  currentSearch,
  heroPose,
  parseOutlineEnabled,
} from '../proto/b/route'

/** スクロール1ページあたりの距離。区間の数だけページを用意する */
const PAGES = LEGS.length

/**
 * 空・フォグ・ライトを毎フレーム更新する。
 *
 * **色は state ではなく ref 経由で更新する**。B はカメラが連続移動してパレットも連続に変わるので、
 * state にすると毎フレーム React 全体が再レンダリングされてしまう。
 * ここで直接 three.js のオブジェクトを書き換えれば、更新するのは数個の色と位置だけで済む。
 *
 * 影の色は `ambientLight` の色で作る。three.js では影の中に残るのは間接光だけなので
 * **ambient の色 = 影の色**になる(A で確立した知見。hemisphereLight ではできない)。
 */
function Atmosphere({ distanceRef }: { distanceRef: React.MutableRefObject<number> }) {
  const { scene } = useThree()
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const target = useRef<THREE.Object3D>(null)

  // 使い回す色。毎フレーム new すると GC が回る
  const scratch = useMemo(
    () => ({ sky: new THREE.Color(), shadow: new THREE.Color(), skyLight: new THREE.Color(), keyColor: new THREE.Color() }),
    []
  )
  const fog = useMemo(() => new THREE.Fog('#000000', 10, 100), [])

  useFrame(() => {
    const t = distanceRef.current
    const p = paletteAt(t)

    scratch.sky.set(p.sky)
    scene.background = scratch.sky
    fog.color.copy(scratch.sky)
    fog.near = p.fogNear
    fog.far = p.fogFar
    scene.fog = fog

    if (ambient.current) {
      ambient.current.color.set(p.shadowColor)
      ambient.current.intensity = p.ambientIntensity
    }
    if (hemi.current) {
      hemi.current.color.set(p.skyColor)
      hemi.current.groundColor.set(p.shadowColor)
      hemi.current.intensity = p.ambientIntensity * 0.5
    }
    if (key.current && target.current) {
      const hero = heroPose(t).position
      key.current.color.set(p.key.color)
      key.current.intensity = p.key.intensity
      key.current.shadow.intensity = p.shadowOpacity
      // ライトを主役に追従させる。道が長いので固定位置だと影が付いてくれない
      key.current.position.set(hero[0] + p.key.offset[0], hero[1] + p.key.offset[1], hero[2] + p.key.offset[2])
      // シャドウカメラの中心は主役の少し前。**カメラが見ているのは前方なので、
      // 主役に合わせると画面の手前3割にしか影が落ちない**
      const ahead = heroPose(t + 16).position
      target.current.position.set(ahead[0], ahead[1], ahead[2])
      target.current.updateMatrixWorld()
    }
  })

  return (
    <>
      {/* 影の色 = キーライトが届かない面に残る色 */}
      <ambientLight ref={ambient} intensity={1} />
      {/* 上下の差。空側だけ明るくして、屋上と地面が同じ明るさにならないようにする */}
      <hemisphereLight ref={hemi} intensity={0.5} />
      <object3D ref={target} />
      <directionalLight
        ref={key}
        castShadow
        target={target.current ?? undefined}
        // 追従するので範囲は主役の周りだけでよい。狭いほど影が鮮明になる
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0012}
      />
    </>
  )
}

export default function ProtoB() {
  const [legIndex, setLegIndex] = useState(0)
  // 進んだ距離。Canvas の中だけで共有する(state にすると毎フレーム再レンダリングになる)
  const distanceRef = useRef(0)
  const outline = useMemo(() => parseOutlineEnabled(currentSearch()), [])
  const handleLegChange = useCallback((next: number) => setLegIndex(next), [])

  const initial = paletteAt(0)

  return (
    <div style={{ width: '100vw', height: '100vh', background: initial.sky }}>
      <Canvas
        shadows
        // **広角。これが「強い一点透視」の実体**で、A の fov28 と真逆になっている
        camera={{ fov: CAMERA_FOV, position: [0, 3, 8], near: 0.3, far: TOTAL_LENGTH * 1.6 }}
        gl={{ alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[initial.sky]} />
        <Atmosphere distanceRef={distanceRef} />
        <Suspense fallback={null}>
          {/* 1区間 = 1ページ。スクロールがそのまま道に沿った前進になる */}
          {/* スクロールバーを消す。一点透視の画に縦線が1本入るだけで構図が濁る */}
          <ScrollControls pages={PAGES} damping={0.16} style={{ scrollbarWidth: 'none' }}>
            <ProtoBCamera
              distanceRef={distanceRef}
              outline={outline}
              legIndex={legIndex}
              onLegChange={handleLegChange}
            />
            {/* 街は1回だけ作られる。区間で出し分けない(A と違って世界がつながっているため) */}
            <ProtoBScene outline={outline} />
          </ScrollControls>
        </Suspense>
      </Canvas>
      <ProtoBOverlay index={legIndex} outline={outline} />
    </div>
  )
}
