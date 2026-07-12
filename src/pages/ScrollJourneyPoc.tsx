// Phase 2: R3Fプリミティブ質感テスト。
// Phase 1のスクロール前進POCを土台に、①クリスタル球(既存Crystal.tsxレシピ移植)と
// ②シーン全体の色支配(Lempens風の明るい夕景: Sky+Clouds+フォグ+夕日ライト)を検証する。
// 参考サイト分析(docs/analysis/2026-07-11-lempens-site-analysis.md)の学び:
// 質感はマテリアル単体でなく「1シーン1色支配」とセットで初めて成立する。
// 明るい夕景への刷新はユーザー承認済み(2026-07-11「暗くなくていいよ」)。
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ScrollControls, Scroll, useScroll, Environment, Sky, Clouds, Cloud } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const SECTION_COUNT = 2 // Home / Projects

function CameraRig() {
  const scroll = useScroll()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame((state) => {
    const offset = scroll.offset // 0〜1
    const z = 10 - offset * 16 // 前進: z=10 → z=-6 (Projectsマーカー手前で止める)
    state.camera.position.set(0, 1, z)
    lookAtTarget.current.set(0, 1, z - 10)
    state.camera.lookAt(lookAtTarget.current)
  })

  return null
}

// 質感テスト対象: 既存Crystal.tsx(一番最初の頃の球体)のマテリアルレシピをそのまま移植。
// ユーザー確認済み(2026-07-11): 新規に発明したマテリアルよりオリジナルの透明感・発光が好み。
// 変えたのは配置(カメラの通り道から横にずらす)と、クリック系インタラクションの除去のみ。
function CrystalTest() {
  const shellRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    // Crystal.tsx interactiveモードのidle回転と発光パルスを再現
    if (shellRef.current) shellRef.current.rotation.y += delta * 0.18
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 3.5 + Math.sin(state.clock.elapsedTime * 2.2) * 1.2
    }
  })

  return (
    <group position={[-2.3, 1, 0]}>
      {/* 外殻 — flatShadingでサッカーボール風の細かい多角形面(Crystal.tsxと同値) */}
      <mesh ref={shellRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshPhysicalMaterial
          color="#ffe8cc"
          roughness={0.01}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.01}
          transmission={0.7}
          ior={1.5}
          thickness={1.5}
          flatShading
          transparent
          opacity={1.0}
        />
      </mesh>

      {/* 内部光源 — 床をオレンジに照らす(発光体としての存在感) */}
      <pointLight color="#ff8c42" intensity={2.4} distance={6} decay={2} />

      {/* 内部コア — ガラス面越しのオレンジ発光 + 白熱センター */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#f97316"
          emissiveIntensity={2.2}
          roughness={0.08}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fff" emissive="#fbbf24" emissiveIntensity={6} />
      </mesh>
    </group>
  )
}

// クリスタル越しの屈折が見えるように、進行方向の奥へ淡い発光オーブを散らす。
// 手前はオレンジ(ブランド色)、Projects区間に近づくほど青(セクションテーマ色)へ寄せる
const BACKDROP_ORBS: Array<{ pos: [number, number, number]; color: string; scale: number }> = [
  { pos: [-3.5, 2.2, -5], color: '#ff6b2b', scale: 0.16 },
  { pos: [2.6, 0.6, -3.5], color: '#ff9a5c', scale: 0.12 },
  { pos: [-0.6, 2.8, -8], color: '#ff6b2b', scale: 0.2 },
  { pos: [4.2, 2.4, -11], color: '#4fc3f7', scale: 0.22 },
  { pos: [-4.0, 1.2, -13], color: '#4fc3f7', scale: 0.18 },
]

function BackdropOrbs() {
  return (
    <>
      {BACKDROP_ORBS.map((orb, i) => (
        <mesh key={i} position={orb.pos} scale={orb.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={orb.color}
            emissive={orb.color}
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  )
}

// クリスタルの発光を受け止める地面。ライトの色が地面に落ちて初めて「発光している」と感じる
function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, -3]}>
      <planeGeometry args={[40, 60]} />
      {/* 乾いたグレージュ: 彩度を落として空・雲のピンクを主役に立てる(design-review指摘①) */}
      <meshStandardMaterial color="#c8a9a3" roughness={0.9} metalness={0} envMapIntensity={0.28} />
    </mesh>
  )
}

function ProjectsMarker() {
  return (
    <mesh position={[0, 0, -10]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#4fc3f7" emissive="#4fc3f7" emissiveIntensity={0.3} />
    </mesh>
  )
}

function SectionLabels() {
  return (
    <Scroll html>
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          color: '#fff',
          fontSize: '2rem',
          textShadow: '0 2px 16px rgba(96, 40, 28, 0.55)',
        }}
      >
        Home
      </div>
      <div
        style={{
          position: 'absolute',
          top: '45%',
          left: '10%',
          transform: 'translateY(100vh)',
          color: '#fff',
          fontSize: '2rem',
          textShadow: '0 2px 16px rgba(96, 40, 28, 0.55)',
        }}
      >
        Projects
      </div>
    </Scroll>
  )
}

export default function ScrollJourneyPoc() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f2b8a0' }}>
      {/* alpha:false は transmission 系マテリアルの既知制約(旧Crystal.tsxで実証済み) */}
      {/* シーンの色支配: Lempens風の明るいパステル夕景。空も地面も同じ暖色1トーンに染める */}
      <Canvas camera={{ position: [0, 1, 10], fov: 50 }} gl={{ alpha: false }} dpr={[1, 2]}>
        {/* 物理夕焼け空: 太陽を地平線近くに置いてピーチ〜クリームのグラデーションを作る */}
        <Sky
          distance={450000}
          sunPosition={[-8, 1.5, 6]}
          turbidity={7}
          rayleigh={4}
          mieCoefficient={0.012}
          mieDirectionalG={0.85}
        />
        {/* フォグは空の地平線色に合わせる → 遠景が夕焼けに溶ける */}
        <fog attach="fog" args={['#f2b8a0', 14, 55]} />
        <ambientLight intensity={0.55} color="#ffe0cf" />
        {/* 夕日: Skyの太陽位置と同方向の暖色キーライト */}
        <directionalLight position={[-8, 3, 6]} intensity={1.6} color="#ffb185" />
        {/* 逆光のリムライト: 薄紫でシルエットを立てる(0.6: 球の輪郭が背景ピーチに溶けるのを防ぐ) */}
        <directionalLight position={[5, 8, -10]} intensity={0.6} color="#c3b0ff" />
        <Suspense fallback={null}>
          {/* 夕焼けの雲: 奥にゆっくり流れるパステルの雲塊 */}
          <Clouds material={THREE.MeshBasicMaterial}>
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
            <Cloud
              seed={7}
              segments={20}
              bounds={[12, 2.5, 5]}
              volume={8}
              position={[8, 9.5, -26]}
              color="#ffcdb8"
              opacity={0.45}
              speed={0.06}
              growth={3}
            />
          </Clouds>
          <Environment preset="sunset" environmentIntensity={0.7} />
          <ScrollControls pages={SECTION_COUNT} damping={0.25}>
            <CameraRig />
            <CrystalTest />
            <BackdropOrbs />
            <Ground />
            <ProjectsMarker />
            <SectionLabels />
          </ScrollControls>
          {/* 明るいシーン用: 閾値0.9で空の暴発を防ぎつつ、太陽と白熱コアの縁を柔らかく滲ませる */}
          <EffectComposer>
            <Bloom intensity={1.1} luminanceThreshold={0.9} luminanceSmoothing={0.7} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
