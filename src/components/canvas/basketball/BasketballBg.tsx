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

// バックボード + リング + ネット + 支柱
function Backboard() {
  // ネット: リング下に垂れる逆円錐（10本の縦ライン + 3段の横リング）
  const NET_STRANDS = 10
  const netStrands = Array.from({ length: NET_STRANDS }, (_, i) => {
    const angle = (i / NET_STRANDS) * Math.PI * 2
    const rx = Math.cos(angle) * 0.23
    const rz = Math.sin(angle) * 0.23
    // 上端: リング半径、下端: 約半分に絞り込む
    const bx = Math.cos(angle) * 0.1
    const bz = Math.sin(angle) * 0.1
    const midX = (rx + bx) / 2
    const midZ = (rz + bz) / 2
    return { key: i, x: midX, z: midZ, angle }
  })

  return (
    <group position={[0, 3.0, -9]}>
      {/* バックボード本体: 暗い半透明 */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.83, 1.07, 0.05]} />
        <meshStandardMaterial color="#1a1a1f" transparent opacity={0.85} roughness={0.6} />
      </mesh>
      {/* シューターズスクエア枠線（上辺・下辺・左辺・右辺）*/}
      {/* 上辺 */}
      <mesh position={[0, 0.155, 0.03]}>
        <boxGeometry args={[0.59, 0.025, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.16} />
      </mesh>
      {/* 下辺 */}
      <mesh position={[0, -0.155, 0.03]}>
        <boxGeometry args={[0.59, 0.025, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.16} />
      </mesh>
      {/* 左辺 */}
      <mesh position={[-0.295, 0, 0.03]}>
        <boxGeometry args={[0.025, 0.31, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.16} />
      </mesh>
      {/* 右辺 */}
      <mesh position={[0.295, 0, 0.03]}>
        <boxGeometry args={[0.025, 0.31, 0.01]} />
        <meshStandardMaterial color="#e8e8e8" emissive="#ffffff" emissiveIntensity={0.16} />
      </mesh>

      {/* リング: バックボード前面下端 */}
      <mesh position={[0, -0.4, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.02, 8, 32]} />
        <meshStandardMaterial color="#ff6d00" emissive="#ff6d00" emissiveIntensity={0.2} roughness={0.5} />
      </mesh>

      {/* ネット: 縦ストランド（逆円錐形） */}
      {netStrands.map(({ key, x, z }) => (
        <mesh key={key} position={[x, -0.59, z + 0.26]}>
          <cylinderGeometry args={[0.005, 0.003, 0.38, 4, 1, true]} />
          <meshStandardMaterial color="#dddddd" transparent opacity={0.5} side={2} />
        </mesh>
      ))}
      {/* ネット: 横リング3段 */}
      {[0.1, 0.22, 0.34].map((drop, i) => (
        <mesh key={i} position={[0, -0.4 - drop, 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.23 - drop * 0.3, 0.005, 4, 20]} />
          <meshStandardMaterial color="#cccccc" transparent opacity={0.4} />
        </mesh>
      ))}

      {/* 支柱: バックボード背後→床まで */}
      <mesh position={[0, -2.8, -0.15]}>
        <cylinderGeometry args={[0.06, 0.08, 3.6, 8]} />
        <meshStandardMaterial color="#222222" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* リング直下の光だまり */}
      <pointLight position={[0, -0.6, 0.26]} color="#ff6d00" intensity={4} distance={3} decay={2} />
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
