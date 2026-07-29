// Phase 4: 3Dスクロールジャーニー本体。
// Home(クリスタル球) → Projects(サッカー) → Skills(バスケ) → About(バレー) → Contact(プラザ) を
// 1本のスクロール空間として実装(設計書§4〜§8)。
// シーンの色支配: Lempens風の明るいパステル夕景(Phase 2で確立・ユーザー承認済み)。
import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ScrollControls, Environment, Sky, Clouds, Cloud } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import CameraRig from '../journey/CameraRig'
import CrystalBall from '../journey/CrystalBall'
import DiveCloudVeil from '../journey/DiveCloudVeil'
import SectionCards from '../journey/SectionCards'
import { SoccerVenue, BasketVenue, VolleyVenue, ContactVenue } from '../journey/venues'
import { Transit1, Transit2, Transit3 } from '../journey/Transit'
import { PAGES, type SectionId } from '../journey/path'
import { SUN_POSITION, KEY_LIGHT_POSITION } from '../journey/skyConfig'

// 道中に散らす淡い発光オーブ(ブランドの暖色のみ。青系はトーン支配を崩すため不使用)。
// Phase 5-5の世界3倍化(全長約200→253.5)に合わせてzを新全長へほぼ等間隔に再配分(x/y/scaleは踏襲)
const ORBS: Array<{ pos: [number, number, number]; scale: number }> = [
  { pos: [2.6, 2.0, -5], scale: 0.14 },
  { pos: [-1.2, 2.6, -13], scale: 0.18 },
  { pos: [3.4, 1.8, -30], scale: 0.15 },
  { pos: [-2.8, 2.4, -61], scale: 0.17 },
  { pos: [2.4, 2.2, -86], scale: 0.14 },
  { pos: [-3.0, 2.6, -122], scale: 0.16 },
  { pos: [3.2, 2.0, -150], scale: 0.13 },
  { pos: [-2.2, 2.8, -178], scale: 0.18 },
  { pos: [2.6, 2.2, -203], scale: 0.15 },
  { pos: [-1.8, 2.4, -221], scale: 0.14 },
]

function WarmOrbs() {
  return (
    <>
      {ORBS.map((orb, i) => (
        <mesh key={i} position={orb.pos} scale={orb.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#ff9a5c" emissive="#ff8c42" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

// 地面: 全セクションを貫く1枚(乾いたグレージュ・低彩度)。
// 終端カメラ(z≈-241.3)の正面で切れ目が見えないよう、Contactプラザの奥まで伸ばしてフォグに溶かす。
// Phase 5-5の世界3倍化(全長約200→253.5・3倍コートの横幅27)に合わせて[60,270]→[70,330]に拡張
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, -100]}>
      <planeGeometry args={[70, 330]} />
      <meshStandardMaterial color="#c8a9a3" roughness={0.9} metalness={0} envMapIntensity={0.28} />
    </mesh>
  )
}

export default function ScrollJourneyPoc() {
  const [activeSection, setActiveSection] = useState<SectionId | null>('home')

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f2b8a0' }}>
      {/* alpha:false は transmission 系マテリアルの既知制約(旧Crystal.tsxで実証済み) */}
      <Canvas camera={{ position: [0, 1, 10], fov: 50 }} gl={{ alpha: false }} dpr={[1, 2]}>
        {/* 物理夕焼け空: 太陽を地平線近くに置いてピーチ〜クリームのグラデーションを作る。
            位置はskyConfig.tsの共有定数(カメラ姿勢のグレア検証と単一ソース) */}
        <Sky
          distance={450000}
          sunPosition={SUN_POSITION}
          turbidity={7}
          rayleigh={4}
          mieCoefficient={0.012}
          mieDirectionalG={0.85}
        />
        {/* フォグは空の地平線色に合わせる → 遠くのヴェニューが夕靄から現れる。
            Phase 5-2でヴェニュー間隔が広がった(66→約200)ため、次のヴェニューが早めに滲み始めるよう46→65に再検証 */}
        <fog attach="fog" args={['#f2b8a0', 14, 65]} />
        <ambientLight intensity={0.55} color="#ffe0cf" />
        {/* 夕日: Skyの太陽位置と同方向の暖色キーライト(skyConfig.tsの共有定数) */}
        <directionalLight position={KEY_LIGHT_POSITION} intensity={1.6} color="#ffb185" />
        {/* 逆光のリムライト: 薄紫でシルエットを立てる(球の輪郭が背景ピーチに溶けるのを防ぐ) */}
        <directionalLight position={[5, 8, -10]} intensity={0.6} color="#c3b0ff" />
        <Suspense fallback={null}>
          <Environment preset="sunset" environmentIntensity={0.7} />
          <ScrollControls pages={PAGES} damping={0.25}>
            {/* 夕焼けの雲: 奥にゆっくり流れるパステルの雲塊。DiveCloudVeilがuseScroll()を
                使うためScrollControls内へ移動した(ScrollControlsはプレーンな子要素を
                transformでラップしないため、既存4つの装飾雲の位置には影響しない) */}
            <Clouds material={THREE.MeshBasicMaterial} frustumCulled={false}>
              <Cloud
                seed={2}
                segments={24}
                bounds={[14, 3, 6]}
                volume={10}
                position={[-6, 8, -18]}
                color="#ffd9c8"
                opacity={0.55}
                speed={0.08}
                growth={4}
              />
              {/* transit1(Projects→Skills)の空を埋める雲(Phase 5-5の3倍化で-34→-60へ再配分) */}
              <Cloud
                seed={7}
                segments={20}
                bounds={[12, 2.5, 5]}
                volume={8}
                position={[8, 9.5, -60]}
                color="#ffcdb8"
                opacity={0.45}
                speed={0.06}
                growth={3}
              />
              {/* 旅の中間(Skills〜About付近)を貫ける雲(Phase 5-5で-104→-137へ再配分) */}
              <Cloud
                seed={9}
                segments={20}
                bounds={[14, 2.5, 6]}
                volume={9}
                position={[-4, 8.5, -137]}
                color="#ffcdb8"
                opacity={0.45}
                speed={0.05}
                growth={3}
              />
              {/* Contactプラザの背景: 終着点の空が寂しくならないよう奥に雲を敷く(Phase 5-5で-195→-250) */}
              <Cloud
                seed={4}
                segments={20}
                bounds={[16, 3, 6]}
                volume={10}
                position={[0, 9, -250]}
                color="#ffd2be"
                opacity={0.5}
                speed={0.05}
                growth={4}
              />
              {/* ダイブ演出(#6): ボールに追従する密な雲ヴェール(DiveCloudVeil.tsx参照) */}
              <DiveCloudVeil />
            </Clouds>
            <CameraRig onSectionChange={setActiveSection} />
            <CrystalBall />
            <WarmOrbs />
            <Ground />
            <Transit1 />
            <Transit2 />
            <Transit3 />
            <SoccerVenue />
            <BasketVenue />
            <VolleyVenue />
            <ContactVenue />
          </ScrollControls>
          {/* 明るいシーン用: 閾値0.9で空の暴発を防ぎつつ、太陽と白熱コアの縁を柔らかく滲ませる */}
          <EffectComposer>
            <Bloom intensity={1.1} luminanceThreshold={0.9} luminanceSmoothing={0.7} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
      {/* カードUI: Canvasの外の画面固定オーバーレイ(設計書§4) */}
      <SectionCards active={activeSection} />
    </div>
  )
}
