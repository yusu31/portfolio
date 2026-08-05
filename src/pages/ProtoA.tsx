// プロトタイプA: ジオラマ / 決め打ち構図 (Issue #353)。
//
// **現行シーン(/scroll-poc)とは完全に独立している。** 共有しているのは React と R3F だけで、
// journey/ 配下のファイルは1つも import していない。NPRのretrofitを打ち切って
// 「1から作って比較する」方針に転換したので、既存の資産を引き継がないことが要件そのもの
// (docs/HANDOFF_PHASE6_SESSION5.md)。
//
// 参考例②③④に共通していた4点を、この試作では次のように実装している:
//   1. パレットを絞る    → palette.ts。章ごとに4種を切り替え、小物の色はこの4色からしか取らない
//   2. カメラを引く      → chapters.ts。fov28 を距離35〜45に置き、主役は画面高の約1/9
//   3. 地面に情報を乗せる → groundMarks.ts + groundTexture.ts。白線・木目・目地・ひび
//   4. 密度を上げる      → scatter.ts。章あたり58〜78個をシード付き乱数で散布
// 輪郭線は使っていない(共通原則6)。影の色は ambientLight の色で作る(下記)。
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls } from '@react-three/drei'
import Diorama from '../proto/a/Diorama'
import ProtoACamera from '../proto/a/ProtoACamera'
import ProtoAOverlay from '../proto/a/ProtoAOverlay'
import { CAMERA_FOV, CHAPTERS, DIORAMA_SIZE } from '../proto/a/chapters'
import { getPalette, type Palette } from '../proto/a/palette'
import { buildGroundMarks } from '../proto/a/groundMarks'
import { createGroundTexture } from '../proto/a/groundTexture'

/**
 * ライト。**影の色をどう作るかがこの試作の核心のひとつ**。
 *
 * 参考例③(McGreenBeats)は「明るいパステル + 濃い紫の影」で世界を作っていた。
 * three.js では影の中に残るのは間接光だけなので、`ambientLight` の色 = 影の色になる。
 * hemisphereLight ではダメで、あれは上向き面に skyColor を当てるので
 * 床の影も skyColor に染まってしまい「濃い紫の影」にならない。
 * だから **ambientLight に shadowColor を入れ、hemisphereLight は上下の差だけを足す**構成にした。
 */
function Lights({ palette }: { palette: Palette }) {
  return (
    <>
      {/* 影の色。キーライトが届かない面はこの色だけになる */}
      <ambientLight color={palette.shadowColor} intensity={palette.ambientIntensity} />
      {/* 上下の差。空側だけ明るくして、地面と壁の上面が沈まないようにする */}
      <hemisphereLight
        color={palette.skyColor}
        groundColor={palette.shadowColor}
        intensity={palette.ambientIntensity * 0.55}
      />
      <directionalLight
        color={palette.key.color}
        intensity={palette.key.intensity}
        position={palette.key.position as unknown as [number, number, number]}
        castShadow
        // 箱庭はワールド原点に固定してあるので、シャドウカメラを1箱庭ぶんに絞れる。
        // 狭いほど影が鮮明になり、ジオラマの立体感がそのぶん強く出る
        shadow-camera-left={-DIORAMA_SIZE}
        shadow-camera-right={DIORAMA_SIZE}
        shadow-camera-top={DIORAMA_SIZE}
        shadow-camera-bottom={-DIORAMA_SIZE}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        // 影が真っ黒になると ambientLight で作った影色が見えなくなるので明示的に緩める
        shadow-intensity={palette.shadowOpacity}
        shadow-bias={-0.0012}
      />
    </>
  )
}

export default function ProtoA() {
  const [index, setIndex] = useState(0)
  const palette = getPalette(CHAPTERS[index].paletteIndex)

  // 地面テクスチャは4章ぶんを最初に1回だけ焼く。
  // カットのたびに1024²のCanvasへ200本以上の線を描き直すとカット送りが引っかかるため
  const textures = useMemo(
    () => CHAPTERS.map((c) => createGroundTexture(buildGroundMarks(c.id), getPalette(c.paletteIndex))),
    []
  )
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures])

  const handleCutChange = useCallback((next: number) => setIndex(next), [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: palette.background }}>
      <Canvas
        shadows
        // fovを絞って遠くから見るとアイソメトリックに近い見え方になる(参考例②③④の構図)
        camera={{ fov: CAMERA_FOV, position: [24, 22, 30], near: 0.5, far: 220 }}
        gl={{ alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[palette.background]} />
        {/* 背景と同色のフォグ。箱庭の外周を溶かして「切り取られた世界」に見せる */}
        <fog attach="fog" args={[palette.background, palette.fogNear, palette.fogFar]} />
        <Lights palette={palette} />
        <Suspense fallback={null}>
          {/* 1章 = 1ページ。ページ内でスクロールするとカメラが微小ドリフトし、
              ページをまたぐとカットが切り替わる */}
          {/* スクロールバーを消す。決め打ち構図の画に縦線が1本入るだけで箱庭の切り取り感が壊れる */}
          <ScrollControls pages={CHAPTERS.length} damping={0.18} style={{ scrollbarWidth: 'none' }}>
            <ProtoACamera onCutChange={handleCutChange} />
            {/* アクティブな章だけを描画する。箱庭は全章ワールド原点にあるので、
                これをしないと4つの箱庭が同じ場所で重なる */}
            <Diorama chapter={CHAPTERS[index]} palette={palette} groundTexture={textures[index]} />
          </ScrollControls>
        </Suspense>
      </Canvas>
      <ProtoAOverlay index={index} palette={palette} />
    </div>
  )
}
