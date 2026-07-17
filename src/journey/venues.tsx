// 道沿いのセクションヴェニュー(低ポリのスポーツコート)。
// Lempens分析の学び: 造形はローポリで良く、シーンの色支配(夕景1トーン)に従属させる。
// 各コートは彩度を落とした色にし、白(チョーク/ネット/ゴール)を共通言語にする。
//
// Phase 5-5でコート・構造物を3倍化(設計書§1)。スケール規約:
// - コート面寸法・チョークライン位置/長さ/幅・構造物の内部寸法: ×VENUE_SCALE(=3)
// - 構造物グループのy: STRUCTURE_GROUND_LIFT(0.8)で持ち上げて接地を保つ
// - 描画イプシロン(コート面y=-0.38/チョークy=-0.365): スケールしない(z-fighting回避の最小差分)
// - <group scale={3}>の一括スケールは不採用(イプシロンが地面下に沈む・単一ソース計算が監査不能)
import { Text } from '@react-three/drei'
import {
  VENUES,
  COURT_SIZES,
  SOCCER_GOAL_GROUP_OFFSET,
  SOCCER_GOAL_POST_Z,
  VOLLEY_NET_GROUP_OFFSET,
  VOLLEY_NET_POST_Z,
  FINISH_GATE_OFFSET_Z,
  FINISH_GATE_POLE_X,
} from './path'
import { HOOP_GROUP_OFFSET, HOOP_POST_LOCAL_OFFSET, RING_OFFSET, CONTACT_REST_OFFSET } from './ball/anchors'

const TITLE_COLOR = '#fffaf5'
const CHALK = '#f7f0ea'
/** 3倍コートに合わせたタイトルの高さ・サイズ(taste値、QAで再調整可) */
const TITLE_Y = 6.5
const TITLE_FONT_SIZE = 1.8

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
  const { width, depth } = COURT_SIZES.projects // 27 × 19.5
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* ピッチ(乾いた芝色。夕景に馴染む低彩度グリーン) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#a3b58c" roughness={0.95} />
      </mesh>
      {/* チョークライン: 外周+センターライン(細い白板で表現)。
          位置・長さ・幅とも旧値×3(幅0.09→0.27。QAで太すぎれば0.15〜0.2に個別調整) */}
      {[
        { pos: [0, -0.365, -9.6] as const, size: [27, 0.27] as const },
        { pos: [0, -0.365, 9.6] as const, size: [27, 0.27] as const },
        { pos: [-13.35, -0.365, 0] as const, size: [0.27, 19.5] as const },
        { pos: [13.35, -0.365, 0] as const, size: [0.27, 19.5] as const },
        { pos: [0, -0.365, 0] as const, size: [0.27, 19.5] as const },
      ].map((line, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[line.pos[0], line.pos[1], line.pos[2]]}>
          <planeGeometry args={[line.size[0], line.size[1]]} />
          <meshStandardMaterial color={CHALK} roughness={0.9} />
        </mesh>
      ))}
      {/* ゴール: 左奥(遠サイド)に白いフレーム。位置はpath/venues.tsの構造物定数と単一ソース
          (構造物クリアランステストとズレないため)。寸法は旧値×3 */}
      <group position={[SOCCER_GOAL_GROUP_OFFSET.x, SOCCER_GOAL_GROUP_OFFSET.y, SOCCER_GOAL_GROUP_OFFSET.z]}>
        <mesh position={[0, 1.35, -SOCCER_GOAL_POST_Z]}>
          <cylinderGeometry args={[0.15, 0.15, 5.1, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.35, SOCCER_GOAL_POST_Z]}>
          <cylinderGeometry args={[0.15, 0.15, 5.1, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 3.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 6.9, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
      </group>
      {/* サッカーボールの静的メッシュはPhase 5-3で撤去(旅の主人公=クリスタル球がドリブルして通過する) */}
      <SectionTitle text="PROJECTS" accent="#4fc3f7" position={[0, TITLE_Y, 0]} fontSize={TITLE_FONT_SIZE} />
    </group>
  )
}

// バスケットボール: コート + ゴール(Skills)
export function BasketVenue() {
  const c = VENUES.skills.center
  const { width, depth } = COURT_SIZES.skills // 21 × 15
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* コート(乾いたアンバー) + センターサークル(無地の床だとコートに見えないQA指摘対応) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#cfa477" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.365, 0]}>
        <ringGeometry args={[1.65, 1.89, 32]} />
        <meshStandardMaterial color={CHALK} roughness={0.9} />
      </mesh>
      {/* ゴール: 支柱 + バックボード + リング。
          コート横(+x)だと通過カメラのフレーム外、奥端センターだとSKILLSタイトルと同軸で埋没する。
          奥端の左寄りに置いてタイトルと視覚的に分離する(Phase 3 QAフォローアップ)。
          位置はball/anchors.tsのHOOP_GROUP_OFFSET/HOOP_POST_LOCAL_OFFSET/RING_OFFSETと単一ソース
          (フリースローの着弾点・構造物クリアランステストとズレないため)。寸法は旧値×3 */}
      <group position={[HOOP_GROUP_OFFSET.x, HOOP_GROUP_OFFSET.y, HOOP_GROUP_OFFSET.z]}>
        <mesh position={[HOOP_POST_LOCAL_OFFSET.x, HOOP_POST_LOCAL_OFFSET.y, HOOP_POST_LOCAL_OFFSET.z]}>
          <cylinderGeometry args={[0.21, 0.21, 9, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 7.5, 0]}>
          <boxGeometry args={[4.5, 2.7, 0.18]} />
          <meshStandardMaterial color={CHALK} roughness={0.4} />
        </mesh>
        <mesh position={[RING_OFFSET.x, RING_OFFSET.y, RING_OFFSET.z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.96, 0.105, 8, 24]} />
          <meshStandardMaterial color="#e8833a" roughness={0.45} />
        </mesh>
      </group>
      {/* バスケットボールの静的メッシュはPhase 5-3で撤去(クリスタル球がキャッチ→フリースローで通過する) */}
      <SectionTitle text="SKILLS" accent="#ffb300" position={[0, TITLE_Y, 0]} fontSize={TITLE_FONT_SIZE} />
    </group>
  )
}

// バレーボール: コート + ネット(About)
export function VolleyVenue() {
  const c = VENUES.about.center
  const { width, depth } = COURT_SIZES.about // 21 × 15
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* コート(低彩度ティール) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#8fb5a3" roughness={0.95} />
      </mesh>
      {/* ネット: 支柱2本 + 白帯 + 半透明ネット面。
          支柱位置はpath/venues.tsのVOLLEY_NET_POST_Zと単一ソース(構造物クリアランステスト共有)。
          寸法は旧値×3(ネット上帯はワールドy≈5.15になり、TOSS_PEAK(y8.5)が上を越える) */}
      <group position={[VOLLEY_NET_GROUP_OFFSET.x, VOLLEY_NET_GROUP_OFFSET.y, VOLLEY_NET_GROUP_OFFSET.z]}>
        <mesh position={[0, 1.8, -VOLLEY_NET_POST_Z]}>
          <cylinderGeometry args={[0.18, 0.18, 6.0, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.8, VOLLEY_NET_POST_Z]}>
          <cylinderGeometry args={[0.18, 0.18, 6.0, 8]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* 白帯(上端)と半透明ネット面 */}
        <mesh position={[0, 4.35, 0]}>
          <boxGeometry args={[0.09, 0.42, 14.4]} />
          <meshStandardMaterial color={CHALK} roughness={0.7} />
        </mesh>
        <mesh position={[0, 3.0, 0]}>
          <planeGeometry args={[0.03, 2.28]} />
          <meshStandardMaterial color="#f2ece6" transparent opacity={0.35} side={2} />
        </mesh>
        <mesh position={[0, 3.0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[14.4, 2.28]} />
          <meshStandardMaterial color="#f2ece6" transparent opacity={0.3} side={2} />
        </mesh>
      </group>
      {/* バレーボールの静的メッシュはPhase 5-4で撤去(クリスタル球がレシーブ→トス→アタックで通過する) */}
      <SectionTitle text="ABOUT" accent="#69f0ae" position={[0, TITLE_Y, 0]} fontSize={TITLE_FONT_SIZE} />
    </group>
  )
}

// Contact: ジャーニーの終着点(設計書§8「静止したまとめ画面」)。
// フィニッシュゲートをくぐると円形プラザに着地し、旅を終えたクリスタル球が台座に収まる。
// 「体育教師→エンジニアの旅がゴールテープを切る」メタファー。
// Phase 5-5でも1x据え置き(ゲートくぐりの体感とQA済み構図の保護を優先。ユーザー承認済み)
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
          タイトルをプラザ中央に浮かせると終端カメラで上端見切れするため、ゲートのバナーとして掲げる。
          ポール位置はpath/venues.tsのFINISH_GATE定数と単一ソース(構造物クリアランステスト共有) */}
      <group position={[0, 0, FINISH_GATE_OFFSET_Z]}>
        <mesh position={[-FINISH_GATE_POLE_X, 0.92, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.6, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[FINISH_GATE_POLE_X, 0.92, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.6, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 5.3, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <SectionTitle text="CONTACT" accent="#ff6b2b" position={[0, 2.85, 0]} fontSize={0.62} />
      </group>
      {/* 台座: 旅を終えたクリスタル球(演者、半径1.5)が転がり込んで静止する場所。
          「旅路のミニチュアジオラマ」の本実装はPhase 6-5、ここでは円柱のプレースホルダーのみ置く。
          位置はball/anchors.tsのCONTACT_REST_OFFSETと単一ソース(球の着地点とズレないため)。
          当初半径1.1〜1.3・高さ0.4で設計したが、QAで「球に埋もれて台座に見えない」と判明した
          (球の半径1.5に対して小さすぎた)。半径・高さとも打ち上げ、球の下半分が乗る見た目にした */}
      <mesh position={[CONTACT_REST_OFFSET.x, -0.18 + 0.6, CONTACT_REST_OFFSET.z]}>
        <cylinderGeometry args={[2.0, 2.3, 1.2, 24]} />
        <meshStandardMaterial color="#e6dbcd" roughness={0.7} />
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
