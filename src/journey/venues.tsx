// 道沿いのセクションヴェニュー(低ポリのスポーツコート)。
// Lempens分析の学び: 造形はローポリで良く、シーンの色支配(夕景1トーン)に従属させる。
// 各コートは彩度を落とした色にし、白(チョーク/ネット/ゴール)を共通言語にする。
import { Text } from '@react-three/drei'
import { VENUES } from './sections'

const TITLE_COLOR = '#fffaf5'
const CHALK = '#f7f0ea'

function SectionTitle({ text, accent, position }: { text: string; accent: string; position: [number, number, number] }) {
  return (
    <group position={position}>
      <Text fontSize={0.85} color={TITLE_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={accent}>
        {text}
      </Text>
    </group>
  )
}

// サッカー: 芝のピッチ + チョークライン + ゴール(Projects)
export function SoccerVenue() {
  const c = VENUES.projects.center
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* ピッチ(乾いた芝色。夕景に馴染む低彩度グリーン) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[9, 6.5]} />
        <meshStandardMaterial color="#a3b58c" roughness={0.95} />
      </mesh>
      {/* チョークライン: 外周+センターライン(細い白板で表現) */}
      {[
        { pos: [0, -0.365, -3.2] as const, size: [9, 0.09] as const },
        { pos: [0, -0.365, 3.2] as const, size: [9, 0.09] as const },
        { pos: [-4.45, -0.365, 0] as const, size: [0.09, 6.5] as const },
        { pos: [4.45, -0.365, 0] as const, size: [0.09, 6.5] as const },
        { pos: [0, -0.365, 0] as const, size: [0.09, 6.5] as const },
      ].map((line, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[line.pos[0], line.pos[1], line.pos[2]]}>
          <planeGeometry args={[line.size[0], line.size[1]]} />
          <meshStandardMaterial color={CHALK} roughness={0.9} />
        </mesh>
      ))}
      {/* ゴール: 左奥に白いフレーム */}
      <group position={[-4.4, 0, 0]}>
        <mesh position={[0, 0.45, -1.1]}>
          <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.45, 1.1]}>
          <cylinderGeometry args={[0.05, 0.05, 1.7, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 2.3, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
      </group>
      {/* サッカーボール(白の低ポリ球) */}
      <mesh position={[1.2, -0.05, 0.8]}>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color="#fdfdfb" roughness={0.35} flatShading />
      </mesh>
      <SectionTitle text="PROJECTS" accent="#4fc3f7" position={[0, 2.2, 0]} />
    </group>
  )
}

// バスケットボール: コート + ゴール(Skills)
export function BasketVenue() {
  const c = VENUES.skills.center
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* コート(乾いたアンバー) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial color="#cfa477" roughness={0.95} />
      </mesh>
      {/* ゴール: 支柱 + バックボード + リング */}
      <group position={[2.8, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 1.1, -0.6]}>
          <cylinderGeometry args={[0.07, 0.07, 3, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <boxGeometry args={[1.5, 0.9, 0.06]} />
          <meshStandardMaterial color={CHALK} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.2, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.035, 8, 24]} />
          <meshStandardMaterial color="#e8833a" roughness={0.45} />
        </mesh>
      </group>
      {/* バスケットボール */}
      <mesh position={[-1.0, -0.06, 0.9]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color="#d97e42" roughness={0.6} flatShading />
      </mesh>
      <SectionTitle text="SKILLS" accent="#ffb300" position={[0, 2.2, 0]} />
    </group>
  )
}

// バレーボール: コート + ネット(About)
export function VolleyVenue() {
  const c = VENUES.about.center
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* コート(低彩度ティール) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial color="#8fb5a3" roughness={0.95} />
      </mesh>
      {/* ネット: 支柱2本 + 白帯 */}
      <group>
        <mesh position={[0, 0.6, -2.4]}>
          <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.6, 2.4]}>
          <cylinderGeometry args={[0.06, 0.06, 2.0, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* 白帯(上端)と半透明ネット面 */}
        <mesh position={[0, 1.45, 0]}>
          <boxGeometry args={[0.03, 0.14, 4.8]} />
          <meshStandardMaterial color={CHALK} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <planeGeometry args={[0.01, 0.76]} />
          <meshStandardMaterial color="#f2ece6" transparent opacity={0.35} side={2} />
        </mesh>
        <mesh position={[0, 1.0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[4.8, 0.76]} />
          <meshStandardMaterial color="#f2ece6" transparent opacity={0.3} side={2} />
        </mesh>
      </group>
      {/* バレーボール */}
      <mesh position={[1.1, -0.08, -0.7]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="#f0e6c8" roughness={0.5} flatShading />
      </mesh>
      <SectionTitle text="ABOUT" accent="#69f0ae" position={[0, 2.2, 0]} />
    </group>
  )
}
