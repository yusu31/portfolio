// プロトタイプC: 箱庭カード / 浮島が手前に流れてくる (Issue #359)。
//
// **現行シーン(/scroll-poc)ともプロトタイプA(/proto/a)・B(/proto/b)とも完全に独立している。**
// journey/ も proto/a/ も proto/b/ も1つも import していない。
// 「1から作って比較する」方針なので、既存の資産を引き継がないことが要件そのもの。
//
// 参考例②(threejs assets / Railway パック)のモジュラー思想を、この試作では次のように実装した:
//   1. パレットを絞る    → palette.ts。②の Day / Golden / Misty / Night をそのまま4種
//   2. カメラを引く      → cards.ts。fov30 を距離58に置き、主役は画面高の約1/10
//   3. 地面に情報        → island.ts。目地・縁石・地面パッチ + rail の枕木/バラスト
//   4. 密度              → modules.ts。島1枚あたり250個超の低ポリを敷き詰める
//   5. 輪郭線は使わない  → ②③④に線は無い。俯瞰で島が空を背に浮くので縁が自然に立つ
//
// **C の骨子はカメラが動かないこと**。A はカット送り、B は連続移動、
// C は固定カメラの前をワールドが流れる。構図が常に同じになるので、
// 「決め打ちの良さ(A)」と「途切れない連続性(B)」を同時に取れるかを見る。
import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import * as THREE from 'three'
import ProtoCScene from '../proto/c/ProtoCScene'
import ProtoCCamera from '../proto/c/ProtoCCamera'
import ProtoCOverlay from '../proto/c/ProtoCOverlay'
import {
  CAMERA_FOV,
  CARDS,
  SHADOW_CENTER_Z,
  SHADOW_RADIUS,
  atmosphereAt,
  currentSearch,
  parseCardOverride,
  parseChainEnabled,
  parsePaletteOverride,
} from '../proto/c/cards'

/** スクロール1ページあたり1枚。カードの数だけページを用意する */
const PAGES = CARDS.length

/**
 * 空・フォグ・ライトを毎フレーム更新する。
 *
 * **色は state ではなく ref 経由で更新する**(B で確立)。
 * 更新するのは数個の色とフォグの距離だけなので、React を巻き込まずに済む。
 *
 * 影の色は `ambientLight` の色で作る。three.js では影の中に残るのは間接光だけなので
 * **ambient の色 = 影の色**になる(A で確立。hemisphereLight ではできない)。
 * 参考例③が「明るいパステル + 濃い影」で世界を作っていたのと同じ仕掛け。
 *
 * ライトは**ワールドに固定**する。カメラが動かないので、B のような追従が要らない
 */
function Atmosphere({
  progressRef,
  paletteOverride,
}: {
  progressRef: React.MutableRefObject<number>
  paletteOverride: number | null
}) {
  const { scene } = useThree()
  const ambient = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const target = useRef<THREE.Object3D>(null)

  // 使い回す色。毎フレーム new すると GC が回る
  const scratch = useMemo(() => ({ sky: new THREE.Color() }), [])
  const fog = useMemo(() => new THREE.Fog('#000000', 10, 100), [])

  useFrame(() => {
    const p = atmosphereAt(progressRef.current, paletteOverride)

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
      key.current.color.set(p.key.color)
      key.current.intensity = p.key.intensity
      key.current.shadow.intensity = p.shadowOpacity
      // key.position はステージ〜1枚先の中心からのオフセットとして持つ
      key.current.position.set(p.key.position[0], p.key.position[1], SHADOW_CENTER_Z + p.key.position[2])
      target.current.position.set(0, 0, SHADOW_CENTER_Z)
      target.current.updateMatrixWorld()
    }
  })

  return (
    <>
      {/* 影の色 = キーライトが届かない面に残る色 */}
      <ambientLight ref={ambient} intensity={1} />
      {/* 上下の差。空側だけ明るくして、屋根と地面が同じ明るさにならないようにする */}
      <hemisphereLight ref={hemi} intensity={0.5} />
      <object3D ref={target} />
      <directionalLight
        ref={key}
        castShadow
        target={target.current ?? undefined}
        // ステージのカードと1枚先のカードの両方を覆う(cards.test.ts で範囲を縛っている)
        shadow-camera-left={-SHADOW_RADIUS}
        shadow-camera-right={SHADOW_RADIUS}
        shadow-camera-top={SHADOW_RADIUS}
        shadow-camera-bottom={-SHADOW_RADIUS}
        shadow-camera-near={1}
        shadow-camera-far={160}
        // 範囲が広いぶん解像度を上げる。俯瞰なので影が画面の主要な面になる
        shadow-mapSize-width={3072}
        shadow-mapSize-height={3072}
        shadow-bias={-0.0012}
      />
    </>
  )
}

export default function ProtoC() {
  const [cardIndex, setCardIndex] = useState(0)
  // 進み `p`。Canvas の中だけで共有する(state にすると毎フレーム再レンダリングになる)
  const progressRef = useRef(0)

  const search = useMemo(() => currentSearch(), [])
  const paletteOverride = useMemo(() => parsePaletteOverride(search), [search])
  const chain = useMemo(() => parseChainEnabled(search), [search])
  // `?card=N` 指定時は浮島の揺れも止める。**動きが残るとQAの絵が収束しない**
  const frozen = useMemo(() => parseCardOverride(search) !== null, [search])

  const handleCardChange = useCallback((next: number) => setCardIndex(next), [])

  const initial = atmosphereAt(0, paletteOverride)

  return (
    <div style={{ width: '100vw', height: '100vh', background: initial.sky }}>
      <Canvas
        shadows
        // 狭い画角 = アイソメ寄り。B の fov55(広角・強い一点透視)と真逆に置いている
        camera={{ fov: CAMERA_FOV, position: [21, 32, 43], near: 1, far: 400 }}
        gl={{ alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[initial.sky]} />
        <Atmosphere progressRef={progressRef} paletteOverride={paletteOverride} />
        <Suspense fallback={null}>
          {/* 1カード = 1ページ。スクロールがそのままカードの送りになる */}
          {/* スクロールバーを消す。決め打ちの構図に縦線が1本入るだけで箱庭の切り取り感が壊れる */}
          <ScrollControls pages={PAGES} damping={0.18} style={{ scrollbarWidth: 'none' }}>
            <ProtoCCamera progressRef={progressRef} onCardChange={handleCardChange} />
            <ProtoCScene
              progressRef={progressRef}
              paletteOverride={paletteOverride}
              chain={chain}
              frozen={frozen}
            />
          </ScrollControls>
        </Suspense>
      </Canvas>
      <ProtoCOverlay index={cardIndex} paletteOverride={paletteOverride} chain={chain} />
    </div>
  )
}
