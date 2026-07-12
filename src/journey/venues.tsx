// 道沿いのセクションヴェニュー(低ポリのスポーツコート)。
// Lempens分析の学び: 造形はローポリで良く、シーンの色支配(夕景1トーン)に従属させる。
// 各コートは彩度を落とした色にし、白(チョーク/ネット/ゴール)を共通言語にする。
import { Text } from '@react-three/drei'
import { VENUES } from './sections'

const TITLE_COLOR = '#fffaf5'
const CHALK = '#f7f0ea'

function SectionTitle({
  text,
  accent,
  position,
  fontSize = 0.85,
}: {
  text: string
  accent: string
  position: [number, number, number]
  fontSize?: number
}) {
  return (
    <group position={position}>
      <Text fontSize={fontSize} color={TITLE_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={accent}>
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
      {/* コート(乾いたアンバー) + センターサークル(無地の床だとコートに見えないQA指摘対応) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshStandardMaterial color="#cfa477" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.365, 0]}>
        <ringGeometry args={[0.55, 0.63, 32]} />
        <meshStandardMaterial color={CHALK} roughness={0.9} />
      </mesh>
      {/* ゴール: 支柱 + バックボード + リング。
          コート横(+x)だと通過カメラのフレーム外、奥端センターだとSKILLSタイトルと同軸で埋没する。
          奥端の左寄りに置いてタイトルと視覚的に分離する(Phase 3 QAフォローアップ) */}
      <group position={[-1.7, 0, -1.9]}>
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

// Contact: ジャーニーの終着点(設計書§8「静止したまとめ画面」)。
// フィニッシュゲートをくぐると円形プラザに着地し、3ヴェニューのボールが集う表彰台を正面に見る。
// 「体育教師→エンジニアの旅がゴールテープを切る」メタファー
export function ContactVenue() {
  const c = VENUES.contact.center
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* 円形プラザ(乾いたサンド色) + 外周チョークリング */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <circleGeometry args={[4.2, 48]} />
        <meshStandardMaterial color="#d9b9a4" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.365, 0]}>
        <ringGeometry args={[3.85, 3.98, 56]} />
        <meshStandardMaterial color={CHALK} roughness={0.9} />
      </mesh>
      {/* フィニッシュゲート(プラザ入口・カメラがくぐり抜ける): 白ポール2本 + クロスバー + CONTACTバナー。
          タイトルをプラザ中央に浮かせると終端カメラで上端見切れするため、ゲートのバナーとして掲げる */}
      <group position={[0, 0, 3.6]}>
        <mesh position={[-2.6, 0.92, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.6, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[2.6, 0.92, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.6, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 5.3, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <SectionTitle text="CONTACT" accent="#ff6b2b" position={[0, 2.85, 0]} fontSize={0.62} />
      </group>
      {/* 表彰台: 終端カメラの正面は中央固定のContactカードが占めるため、
          カードに隠れない右サイドに奥行き方向の階段として置く(手前3位→中央1位→奥2位) */}
      <mesh position={[1.6, -0.245, -0.55]}>
        <boxGeometry args={[1.0, 0.27, 1.0]} />
        <meshStandardMaterial color="#e6dbcd" roughness={0.7} />
      </mesh>
      <mesh position={[1.6, -0.105, -1.6]}>
        <boxGeometry args={[1.0, 0.55, 1.0]} />
        <meshStandardMaterial color="#f3ebe2" roughness={0.7} />
      </mesh>
      <mesh position={[1.6, -0.19, -2.65]}>
        <boxGeometry args={[1.0, 0.38, 1.0]} />
        <meshStandardMaterial color="#ece2d6" roughness={0.7} />
      </mesh>
      {/* 3ヴェニューのボールが表彰台に集合(各コートのボールと同じレシピ) */}
      <mesh position={[1.6, 0.17, -0.55]}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color="#f0e6c8" roughness={0.5} flatShading />
      </mesh>
      <mesh position={[1.6, 0.49, -1.6]}>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color="#fdfdfb" roughness={0.35} flatShading />
      </mesh>
      <mesh position={[1.6, 0.3, -2.65]}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color="#d97e42" roughness={0.6} flatShading />
      </mesh>
      {/* 祝祭の暖色オーブ(道中のWarmOrbsと同レシピ・プラザ上空に散らす) */}
      {[
        { pos: [-2.2, 2.6, -1.2] as const, scale: 0.12 },
        { pos: [2.4, 2.9, -0.6] as const, scale: 0.1 },
        { pos: [0.6, 3.3, -2.2] as const, scale: 0.13 },
      ].map((orb, i) => (
        <mesh key={i} position={[orb.pos[0], orb.pos[1], orb.pos[2]]} scale={orb.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial color="#ff9a5c" emissive="#ff8c42" emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
