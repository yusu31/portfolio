// src/components/canvas/basketball/BasketballBg.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial } from '@react-three/drei'
import * as THREE from 'three'

// ワックス仕上げ体育館床（反射マテリアル）
function CourtFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -4]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={512}
        mixBlur={0.8}
        mixStrength={0.5}
        roughness={0.4}
        color="#2a1800"
      />
    </mesh>
  )
}

// バスケットコートのライン（実コートの文法: ハーフコート・センターサークル・3Pアーク・ペイント）
const LINE = { color: '#c87000', emissive: '#c87000', emissiveIntensity: 0.3 } as const

function CourtLines() {
  return (
    <>
      {/* サイドライン（左右）とエンドライン（ゴール裏） */}
      {[-7, 7].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -2]}>
          <planeGeometry args={[0.06, 15]} />
          <meshStandardMaterial {...LINE} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, -9.5]}>
        <planeGeometry args={[14, 0.06]} />
        <meshStandardMaterial {...LINE} />
      </mesh>
      {/* ハーフコートライン＋センターサークル（ボール定位置を通る） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, 0]}>
        <planeGeometry args={[14, 0.06]} />
        <meshStandardMaterial {...LINE} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, 0]}>
        <ringGeometry args={[1.5, 1.56, 48]} />
        <meshStandardMaterial {...LINE} side={THREE.DoubleSide} />
      </mesh>
      {/* スリーポイントアーク（リング位置 z=-9 中心・手前側半円） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, -9]}>
        <ringGeometry args={[5.44, 5.5, 64, 1, Math.PI, Math.PI]} />
        <meshStandardMaterial {...LINE} side={THREE.DoubleSide} />
      </mesh>
      {/* ペイントエリア（キー）＋フリースローサークル */}
      {[-1.8, 1.8].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -6.9]}>
          <planeGeometry args={[0.06, 4.2]} />
          <meshStandardMaterial {...LINE} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, -4.8]}>
        <planeGeometry args={[3.66, 0.06]} />
        <meshStandardMaterial {...LINE} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, -4.8]}>
        <ringGeometry args={[1.1, 1.16, 48]} />
        <meshStandardMaterial {...LINE} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// バックボード + リング
function Backboard() {
  return (
    <group position={[0, 3.0, -9]}>
      {/* バックボード */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.83, 1.07, 0.05]} />
        <meshStandardMaterial color="#0d0a02" emissive="#ff6600" emissiveIntensity={0.8} transparent opacity={0.7} />
      </mesh>
      {/* リム（暗闇で光るオレンジリング）*/}
      <mesh position={[0, -0.4, 0.23]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.225, 0.02, 8, 24]} />
        <meshStandardMaterial color="#ff7700" emissive="#ff5500" emissiveIntensity={3.5} />
      </mesh>
      {/* バックボード枠 */}
      {[[-0.915], [0.915]].map(([x], i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.05, 1.07, 0.05]} />
          <meshStandardMaterial color="#2a1800" emissive="#ff4400" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

export default function BasketballBg({ visible = true }: { visible?: boolean }) {
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
      {/* warehouse は明るすぎて反射床が白飛びする → night で発光体主体の反射に */}
      {visible && <Environment preset="night" resolution={64} />}
      <ambientLight intensity={0.04 * li} />
      <pointLight position={[0, 8, 0]} intensity={40 * li} color="#ffb300" />
      <pointLight position={[-5, 4, 0]} intensity={20 * li} color="#c87000" />
      <pointLight position={[0, 3, -8.5]} intensity={25 * li} color="#ff6600" />
      <group ref={bgRef} visible={visible}>
        <CourtFloor />
        <CourtLines />
        <Backboard />
      </group>
    </>
  )
}
