// `/city` の主役。オレンジ発光クリスタル球。
//
// ⚠ 設計書 §5.2 は「`journey/CrystalBall.tsx` をそのまま import する(書き換えゼロ)」と
//   書いていたが、**これは成立しない**。あのコンポーネントは
//   `getBallPose`(② の経路)・`roll.ts`・`useScroll()` を直に読んでいるので、
//   /city へ持ち込むと球は街の道ではなく ② の軌道を走ってしまう。
//   `src/journey/` は現行シーンなので触れない(禁止事項)。
//
// そこで**材質のレシピだけを移植した**。色・粗さ・透過・厚み・発光の数値は
// `CrystalBall.tsx` と1つも違わない(memory: feedback-crystal-original-recipe
// 「見た目は既存レシピが正解。新規発明せず移植する」)。
// 変えたのは「どこに居るか」と「どう回るか」の供給元だけ。
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ballAnchorAt, getCityBallRollQuaternion } from './ball'

export default function CityBall({ distanceRef }: { distanceRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const anchor = useRef(new THREE.Vector3())
  const rollQuat = useRef(new THREE.Quaternion())

  useFrame((state) => {
    const t = distanceRef.current
    // 位置も向きも「距離 t が唯一の真実」。スクラブ逆再生で逆回転し、リロードで再現する
    if (groupRef.current) {
      groupRef.current.position.copy(ballAnchorAt(t, anchor.current))
    }
    if (shellRef.current) {
      shellRef.current.quaternion.copy(getCityBallRollQuaternion(t, rollQuat.current))
    }
    // 発光パルスだけは時間ベース。アンビエント演出は「距離が唯一の真実」原則の例外(② と同じ扱い)
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 3.5 + Math.sin(state.clock.elapsedTime * 2.2) * 1.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* 外殻 — flatShading でサッカーボール風の細かい多角形面。
          320面あるので**面ごとの陰影で回転が読める**(§7.1 で確認済み) */}
      <mesh ref={shellRef} castShadow>
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

      {/* 内部光源 — 路面をオレンジに照らす(発光体としての存在感) */}
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
