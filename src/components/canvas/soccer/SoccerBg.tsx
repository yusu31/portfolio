// src/components/canvas/soccer/SoccerBg.tsx
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

// チョークライン共通材質の設定（淡い白・控えめ発光。ネオンにしない）
const CHALK = { color: '#c8d8c8', emissive: '#c8d8c8', emissiveIntensity: 0.18, transparent: true, opacity: 0.75 } as const

// 芝のフロア — 実スタジアムの文法（刈り込みストライプ＋実ピッチのマーキング）
function GrassFloor() {
  return (
    <>
      {/* 芝ベース */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -10]} receiveShadow>
        <planeGeometry args={[30, 40]} />
        <meshStandardMaterial color="#0a1a06" roughness={0.95} metalness={0.0} />
      </mesh>
      {/* 刈り込みストライプ: 明るい帯を1本おきに重ねる（横方向・幅4） */}
      {[-28, -20, -12, -4, 4].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.195, z]} receiveShadow>
          <planeGeometry args={[30, 4]} />
          <meshStandardMaterial color="#16300c" roughness={0.95} metalness={0.0} />
        </mesh>
      ))}
      {/* タッチライン（左右） */}
      {[-12, 12].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.185, -5]}>
          <planeGeometry args={[0.08, 30]} />
          <meshStandardMaterial {...CHALK} />
        </mesh>
      ))}
      {/* ゴールライン */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.185, -20]}>
        <planeGeometry args={[24, 0.08]} />
        <meshStandardMaterial {...CHALK} />
      </mesh>
      {/* ハーフウェーライン（ボール定位置＝キックオフスポットを通る） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.185, 0]}>
        <planeGeometry args={[24, 0.08]} />
        <meshStandardMaterial {...CHALK} />
      </mesh>
      {/* センターサークル */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.185, 0]}>
        <ringGeometry args={[1.7, 1.78, 48]} />
        <meshStandardMaterial {...CHALK} side={THREE.DoubleSide} />
      </mesh>
      {/* ペナルティボックス（正面ライン＋左右サイド） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.185, -15]}>
        <planeGeometry args={[12, 0.08]} />
        <meshStandardMaterial {...CHALK} />
      </mesh>
      {[-6, 6].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.185, -17.5]}>
          <planeGeometry args={[0.08, 5]} />
          <meshStandardMaterial {...CHALK} />
        </mesh>
      ))}
      {/* ペナルティスポット */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.185, -16]}>
        <circleGeometry args={[0.09, 16]} />
        <meshStandardMaterial {...CHALK} />
      </mesh>
    </>
  )
}

// ゴールフレーム（チョーク化 — 実フレームの文法）
const GOAL_MAT = { color: '#e8f0e8', emissive: '#e8f0e8', emissiveIntensity: 0.18 } as const

function GoalNet() {
  const cols = 8
  const rows = 5
  const w = 7.32
  const h = 2.44
  const d = 1.5
  const lines: React.ReactElement[] = []
  // 縦ライン（幅方向）
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i / cols) * w
    lines.push(
      <mesh key={`v${i}`} position={[x, h / 2, -d / 2]}>
        <boxGeometry args={[0.01, h, 0.01]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.35} />
      </mesh>
    )
  }
  // 横ライン（高さ方向）
  for (let i = 0; i <= rows; i++) {
    const y = (i / rows) * h
    lines.push(
      <mesh key={`h${i}`} position={[0, y, -d / 2]}>
        <boxGeometry args={[w, 0.01, 0.01]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.35} />
      </mesh>
    )
  }
  // 奥ライン（奥行き方向・縦）
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i / cols) * w
    lines.push(
      <mesh key={`dv${i}`} position={[x, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.01, d, 0.01]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.25} />
      </mesh>
    )
  }
  return <group>{lines}</group>
}

function GoalFrame() {
  return (
    <group position={[0, -0.2, -20]}>
      {/* 左ポスト */}
      <mesh position={[-3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial {...GOAL_MAT} />
      </mesh>
      {/* 右ポスト */}
      <mesh position={[3.66, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 2.44, 8]} />
        <meshStandardMaterial {...GOAL_MAT} />
      </mesh>
      {/* クロスバー */}
      <mesh position={[0, 2.44, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 7.32, 8]} />
        <meshStandardMaterial {...GOAL_MAT} />
      </mesh>
      {/* 簡易ネット */}
      <GoalNet />
    </group>
  )
}

// スタジアム照明を模したサイドスポットライト（Shadowの主光源）
function StadiumLights({ li }: { li: number }) {
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
      <primitive object={targetLeft} />
      <spotLight
        position={[-15, 22, 0]}
        target={targetLeft}
        intensity={200 * li}
        angle={0.35}
        penumbra={0.5}
        color="#c0d8f0"
        castShadow={li > 0}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={60}
        shadow-bias={-0.001}
      />
      <primitive object={targetRight} />
      <spotLight
        position={[12, 18, -5]}
        target={targetRight}
        intensity={80 * li}
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

export default function SoccerBg({ visible = true }: { visible?: boolean }) {
  const li = visible ? 1 : 0
  const bgRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!bgRef.current) return
    const p = bgRef.current.position
    p.x += (state.pointer.x * 0.3 - p.x) * 0.03
    p.y += (state.pointer.y * 0.15 - p.y) * 0.03
  })

  return (
    <>
      {visible && <Environment preset="night" resolution={64} />}
      <ambientLight intensity={0.03 * li} />
      <directionalLight position={[0, 30, 20]} intensity={0.5 * li} color="#8ab4d0" />
      <StadiumLights li={li} />
      <group ref={bgRef} visible={visible}>
        <GrassFloor />
        <GoalFrame />
        <AudienceSilhouette />
      </group>
    </>
  )
}
