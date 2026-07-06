import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'

interface OrbData {
  id: number
  color: string
  radius: number
  speed: number
  phase: number
  tilt: number
  size: number
  birthTime: number  // clock.elapsedTime at spawn → float-out animation の基点
}

const ORB_COLORS = ['#f97316', '#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24', '#ffffff']
const ORB_BIRTH_DURATION = 1.4  // 中心から軌道半径まで展開する秒数
const DRAG_DAMPING = 0.93       // ohzi.io 調査値（指数減衰係数）

// 中心からふわーっと浮き出るOrb
function Orb({ orb }: { orb: OrbData }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    const progress = Math.min((t - orb.birthTime) / ORB_BIRTH_DURATION, 1)
    const eased = 1 - Math.pow(1 - progress, 3)  // easeOutCubic: ふわっと展開
    const r = orb.radius * eased

    const angle = t * orb.speed + orb.phase
    ref.current.position.x = Math.cos(angle) * r
    ref.current.position.z = Math.sin(angle) * r
    ref.current.position.y = (Math.sin(t * orb.speed * 0.3) * 0.5 + orb.tilt) * eased
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[orb.size, 16, 16]} />
      <meshStandardMaterial
        color={orb.color}
        emissive={orb.color}
        emissiveIntensity={5}
        toneMapped={false}
      />
    </mesh>
  )
}

interface CrystalProps {
  mode?: 'interactive' | 'journey' | 'click-drive'
  journeySpeedRef?: React.RefObject<number>
  journeyRotRef?: React.RefObject<{ dirX: number; dirZ: number; rotSpeed: number }>
}

export default function Crystal({ mode = 'interactive', journeySpeedRef, journeyRotRef }: CrystalProps) {
  const floatRef   = useRef<THREE.Group>(null)
  const shellRef   = useRef<THREE.Mesh>(null)
  const coreGrpRef = useRef<THREE.Group>(null)
  const coreRef    = useRef<THREE.Mesh>(null)
  const clockRef   = useRef(0)  // useFrame外でelapsedTimeを参照するためのref
  const [orbs, setOrbs] = useState<OrbData[]>([])

  // ドラッグ回転
  const isDragging  = useRef(false)
  const lastPtr     = useRef({ x: 0, y: 0 })
  const angularVel  = useRef({ x: 0, y: 0 })
  const totalDrag   = useRef(0)

  // バウンス物理（クリック時のバネシミュレーション）
  const bounceY   = useRef(0)
  const bounceVel = useRef(0)

  const spawnOrbs = useCallback(() => {
    const birthTime = clockRef.current
    const count = 2 + Math.floor(Math.random() * 2)  // 2〜3個ずつ増える
    setOrbs(prev => {
      const newOrbs: OrbData[] = Array.from({ length: count }, () => ({
        id: Date.now() + Math.random(),
        color: ORB_COLORS[Math.floor(Math.random() * ORB_COLORS.length)],
        radius: 1.9 + Math.random() * 1.0,
        speed: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.0,
        size: 0.05 + Math.random() * 0.10,  // 大中小混在（max 0.15 に抑える）
        birthTime,
      }))
      return [...prev.slice(-(10 - count)), ...newOrbs]  // 最大10個
    })
    // バウンス発動
    bounceVel.current = 2.5
  }, [])

  // ドラッグ回転 + クリック判定（windowレベルで捕捉）
  useEffect(() => {
    if (mode === 'journey' || mode === 'click-drive') return  // journey/click-drive modeではポインターイベント無効
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastPtr.current.x
      const dy = e.clientY - lastPtr.current.y
      totalDrag.current += Math.abs(dx) + Math.abs(dy)
      if (shellRef.current) {
        shellRef.current.rotation.y += dx * 0.008
        shellRef.current.rotation.x += dy * 0.008
      }
      // 慣性用に最後のフレーム速度を保存
      angularVel.current = { x: dy * 0.008, y: dx * 0.008 }
      lastPtr.current = { x: e.clientX, y: e.clientY }
    }

    const onUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      // ドラッグ距離が短い = クリック判定
      if (totalDrag.current < 6) {
        spawnOrbs()
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [spawnOrbs, mode])

  useFrame((state, delta) => {
    clockRef.current = state.clock.elapsedTime

    // バウンス物理（重力 9、バウンド減衰 40%）
    if (bounceVel.current !== 0 || bounceY.current > 0.001) {
      bounceVel.current -= 9 * delta
      bounceY.current += bounceVel.current * delta
      if (bounceY.current <= 0) {
        bounceY.current = 0
        bounceVel.current = Math.abs(bounceVel.current) * 0.4
        if (bounceVel.current < 0.05) bounceVel.current = 0
      }
    }

    // 浮遊 + バウンス合成（journey / click-drive では浮遊を無効化 → 床接地が安定する）
    if (floatRef.current) {
      if (mode === 'interactive') {
        floatRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.14 + bounceY.current
      }
    }

    // 外殻: ドラッグ中はuseFrameの回転を停止、リリース後は慣性で滑走
    if (shellRef.current) {
      if (!isDragging.current) {
        if (mode === 'journey' || mode === 'click-drive') {
          // 移動方向ベースのローリング回転
          const rot = journeyRotRef?.current ?? { dirX: 0, dirZ: -1, rotSpeed: 1 }
          const animSpeed = journeySpeedRef?.current ?? 1
          const base = delta * animSpeed * 0.35
          shellRef.current.rotation.x -= rot.dirZ * rot.rotSpeed * base
          shellRef.current.rotation.z -= rot.dirX * rot.rotSpeed * base
        } else {
          shellRef.current.rotation.y += delta * 0.18 + angularVel.current.y
          shellRef.current.rotation.x = MathUtils.lerp(
            shellRef.current.rotation.x,
            state.pointer.y * -0.3,
            0.04
          ) + angularVel.current.x
          // 慣性を DAMPING 0.93 で指数減衰（ohzi.io 調査値）
          angularVel.current.x *= DRAG_DAMPING
          angularVel.current.y *= DRAG_DAMPING
        }
      }
    }

    // 内部コア：カーソル追従
    if (coreGrpRef.current) {
      coreGrpRef.current.position.x = MathUtils.lerp(
        coreGrpRef.current.position.x, state.pointer.x * 0.55, 0.06
      )
      coreGrpRef.current.position.y = MathUtils.lerp(
        coreGrpRef.current.position.y, state.pointer.y * 0.55, 0.06
      )
    }

    // 発光パルス
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 3.5 + Math.sin(state.clock.elapsedTime * 2.2) * 1.2
    }
  })

  return (
    // click-drive ではシェル半径ぶんリフトして接地（y=-1.2 のままだと半埋まりの岩に見える）
    <group ref={floatRef} position={[0, mode === 'click-drive' ? 1.5 : 0, 0]}>
      {/* 外殻 — flatShading=true でサッカーボール風の多角形面を復元 */}
      <mesh
        ref={shellRef}
        onPointerDown={mode === 'interactive' ? (e: React.PointerEvent) => {
          isDragging.current = true
          lastPtr.current = { x: e.clientX, y: e.clientY }
          totalDrag.current = 0
          angularVel.current = { x: 0, y: 0 }
        } : undefined}
      >
        <icosahedronGeometry args={[1.5, 2]} />
        <meshPhysicalMaterial
          color="#ffe8cc"
          roughness={0.01}
          metalness={0.0}
          clearcoat={1.0}
          clearcoatRoughness={0.01}
          transmission={mode === 'click-drive' ? 0.85 : 0.70}
          ior={1.5}
          thickness={1.5}
          flatShading={true}
          transparent
          opacity={mode === 'click-drive' ? 0.9 : 1.0}
          emissive={mode === 'click-drive' ? '#f97316' : '#000000'}
          emissiveIntensity={mode === 'click-drive' ? 0.12 : 0}
        />
      </mesh>

      {/* 内部光源 — 転がる場所の床をオレンジに照らす（発光体としての存在感） */}
      {mode === 'click-drive' && (
        <pointLight color="#ff8c42" intensity={2.4} distance={6} decay={2} />
      )}

      {/* 内部コア — オレンジ発光（ガラス面越しに見える）*/}
      <group ref={coreGrpRef}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.80, 32, 32]} />
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

      {/* クリックで中心から浮き出るOrb */}
      {orbs.map(orb => <Orb key={orb.id} orb={orb} />)}
    </group>
  )
}
