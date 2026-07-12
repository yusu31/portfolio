// ブランドの象徴: オレンジ発光クリスタル球。
// 見た目は既存Crystal.tsxのレシピを移植したもの(ユーザー確認済み 2026-07-11)。
// 詳細は memory: feedback-crystal-original-recipe / docs/analysis/2026-07-11-lempens-site-analysis.md
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CrystalBall({ position = [-2.3, 1, 0] as [number, number, number] }) {
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
    <group position={position}>
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
