// src/components/canvas/soccer/SoccerBg.tsx
import { useRef, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

// 芝のフロア
function GrassFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -10]} receiveShadow>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial color="#0a1a06" roughness={0.95} />
      </mesh>
      {/* ラインマーキング（わずかに光る） */}
      {[-5, 0, 5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -10]}>
          <planeGeometry args={[0.06, 40]} />
          <meshStandardMaterial color="#1a3a10" emissive="#1a3a10" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  )
}

// ゴールフレーム（Bloomの主役 — emissiveを大幅強化）
function GoalFrame() {
  return (
    <group position={[0, -0.2, -20]}>
      {/* 左ポスト */}
      <mesh position={[-3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3.5} />
      </mesh>
      {/* 右ポスト */}
      <mesh position={[3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3.5} />
      </mesh>
      {/* クロスバー */}
      <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 7.32, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={3.5} />
      </mesh>
    </group>
  )
}

// スタジアム照明を模したサイドスポットライト（Shadowの主光源）
function StadiumLights() {
  // SpotLightのターゲット（ゴール付近を照らす）
  const targetLeft = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 1, -20)
    return obj
  }, [])
  const targetRight = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 1, -15)
    return obj
  }, [])

  return (
    <>
      {/* 左斜め上からの主光源（影を作る） */}
      <primitive object={targetLeft} />
      <spotLight
        position={[-15, 22, 0]}
        target={targetLeft}
        intensity={200}
        angle={0.35}
        penumbra={0.5}
        color="#c0d8f0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={60}
        shadow-bias={-0.001}
      />
      {/* 右後ろからのリムライト（輪郭を際立たせる） */}
      <primitive object={targetRight} />
      <spotLight
        position={[12, 18, -5]}
        target={targetRight}
        intensity={80}
        angle={0.4}
        penumbra={0.7}
        color="#4488aa"
        castShadow={false}
      />
    </>
  )
}

// 観客シルエット（遠景）
function AudienceSilhouette() {
  const rows = [
    { z: -28, y: 1.5, w: 24, h: 2.0 },
    { z: -30, y: 3.0, w: 26, h: 2.5 },
    { z: -32, y: 5.0, w: 28, h: 3.0 },
  ]
  return (
    <group>
      {rows.map((r, i) => (
        <mesh key={i} position={[0, r.y, r.z]}>
          <boxGeometry args={[r.w, r.h, 0.1]} />
          <meshStandardMaterial color="#0a1520" emissive="#0a1520" emissiveIntensity={0.05} />
        </mesh>
      ))}
    </group>
  )
}

export default function SoccerBg() {
  return (
    <>
      <Environment preset="night" resolution={64} />
      {/* 夜のスタジアム: ambient はほぼ暗闇 */}
      <ambientLight intensity={0.03} />
      {/* フィールド全体への薄い青白い光（空の反射） */}
      <directionalLight position={[0, 30, 20]} intensity={0.5} color="#8ab4d0" />
      {/* スタジアムのスポットライト */}
      <StadiumLights />
      <fog attach="fog" args={['#050b1a', 12, 40]} />
      <GrassFloor />
      <GoalFrame />
      <AudienceSilhouette />
    </>
  )
}
