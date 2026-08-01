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
  SOCCER_GOAL_POST_RADIUS,
  SOCCER_GOAL_BOTTOM_Y,
  SOCCER_GOAL_CROSSBAR_Y,
  SOCCER_GOAL_POST_HEIGHT,
  SOCCER_GOAL_CROSSBAR_LENGTH,
  SOCCER_NET_DEPTH_TOP,
  SOCCER_NET_DEPTH_BOTTOM,
  VOLLEY_NET_GROUP_OFFSET,
  VOLLEY_NET_POST_Z,
  VOLLEY_NET_POST_RADIUS,
  VOLLEY_NET_POST_HEIGHT,
  VOLLEY_NET_BAND_Y,
  VOLLEY_NET_BAND_THICKNESS,
  VOLLEY_NET_LENGTH,
  FINISH_GATE_OFFSET_Z,
  FINISH_GATE_POLE_X,
} from './path'
import {
  HOOP_GROUP_OFFSET,
  HOOP_POST_LOCAL_OFFSET,
  HOOP_POST_RADIUS,
  HOOP_POST_HEIGHT,
  HOOP_ARM_Y,
  RING_OFFSET,
  RING_RADIUS,
  RING_TUBE_RADIUS,
  BACKBOARD_WIDTH,
  BACKBOARD_HEIGHT,
  BACKBOARD_THICKNESS,
  BACKBOARD_LOCAL_OFFSET,
  SHOOTER_SQUARE_WIDTH,
  SHOOTER_SQUARE_HEIGHT,
  CONTACT_REST_OFFSET,
} from './ball/anchors'
import { BasketNet } from './nets/BasketNet'
import { CordNet } from './nets/CordNet'
import {
  GOAL_NET_COLOR,
  SOCCER_NET_SPEC,
  SOCCER_WIND_AMPLITUDE,
  VOLLEY_NET_SPEC,
  VOLLEY_WIND_AMPLITUDE,
} from './nets/goalNets'

const TITLE_COLOR = '#fffaf5'
const CHALK = '#f7f0ea'
/** 3倍コートに合わせたタイトルの高さ・サイズ(taste値、QAで再調整可) */
const TITLE_Y = 6.5
const TITLE_FONT_SIZE = 1.8

/** 各コートの色(Contactジオラマ(ContactDiorama)と単一ソース共有。統一感を色定数の共有で担保する) */
const SOCCER_COURT_COLOR = '#a3b58c'
const BASKET_COURT_COLOR = '#cfa477'
const VOLLEY_COURT_COLOR = '#8fb5a3'

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

/**
 * シューターズスクエア(バックボード内側の白枠)。実物では下辺がリング高さに揃う。
 * 枠線4辺を細い板でバックボード前面のすぐ手前に置く(同一平面だとz-fightingするため
 * コートのチョークラインと同じ「描画イプシロン」の作法に倣う)。
 * 「バックボードらしさ」に最も効く記号なので、ベベル化(Blender)より先に入れる
 */
const SQUARE_LINE_WIDTH = 0.34
const SQUARE_EPSILON = 0.04

function ShooterSquare() {
  const w = SHOOTER_SQUARE_WIDTH
  const h = SHOOTER_SQUARE_HEIGHT
  // 枠の下辺をリング高さに合わせる
  const bottomY = RING_OFFSET.y
  const centerY = bottomY + h / 2
  const z = BACKBOARD_LOCAL_OFFSET.z + BACKBOARD_THICKNESS / 2 + SQUARE_EPSILON
  const bars: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, bottomY, z], size: [w, SQUARE_LINE_WIDTH, SQUARE_EPSILON] },
    { pos: [0, bottomY + h, z], size: [w, SQUARE_LINE_WIDTH, SQUARE_EPSILON] },
    { pos: [-w / 2, centerY, z], size: [SQUARE_LINE_WIDTH, h, SQUARE_EPSILON] },
    { pos: [w / 2, centerY, z], size: [SQUARE_LINE_WIDTH, h, SQUARE_EPSILON] },
  ]
  return (
    <group>
      {bars.map((bar, i) => (
        <mesh key={i} position={bar.pos}>
          <boxGeometry args={bar.size} />
          <meshStandardMaterial color="#e8833a" roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** ゴール枠・バックステーの中心y(足元とクロスバーの中点)。cylinderは中心基準のため */
const GOAL_MID_Y = (SOCCER_GOAL_BOTTOM_Y + SOCCER_GOAL_CROSSBAR_Y) / 2
/** 背面フレームの管半径。前面の枠(0.15)より細くして主役を前面に残す */
const GOAL_BACK_BAR_RADIUS = 0.12
/** バックステーの長さ(背面上端 → 地面) */
const GOAL_STAY_LENGTH = Math.hypot(
  SOCCER_NET_DEPTH_BOTTOM - SOCCER_NET_DEPTH_TOP,
  SOCCER_GOAL_CROSSBAR_Y - SOCCER_GOAL_BOTTOM_Y
)
/** バックステーの傾き(鉛直からの角度)。cylinderの軸(+Y)をz軸まわりに -この角度 回すと後傾する */
const GOAL_STAY_TILT = Math.atan2(
  SOCCER_NET_DEPTH_BOTTOM - SOCCER_NET_DEPTH_TOP,
  SOCCER_GOAL_CROSSBAR_Y - SOCCER_GOAL_BOTTOM_Y
)

// サッカー: 芝のピッチ + チョークライン + ゴール(Projects)
export function SoccerVenue() {
  const c = VENUES.projects.center
  const { width, depth } = COURT_SIZES.projects // 27 × 19.5
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* ピッチ(乾いた芝色。夕景に馴染む低彩度グリーン) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={SOCCER_COURT_COLOR} roughness={0.95} />
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
        {/* ゴール枠(前面): 支柱2本 + クロスバー。寸法はpath/venues.tsと単一ソース */}
        {[-SOCCER_GOAL_POST_Z, SOCCER_GOAL_POST_Z].map((z) => (
          <mesh key={z} position={[0, GOAL_MID_Y, z]}>
            <cylinderGeometry
              args={[SOCCER_GOAL_POST_RADIUS, SOCCER_GOAL_POST_RADIUS, SOCCER_GOAL_POST_HEIGHT, 8]}
            />
            <meshStandardMaterial color={CHALK} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, SOCCER_GOAL_CROSSBAR_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[SOCCER_GOAL_POST_RADIUS, SOCCER_GOAL_POST_RADIUS, SOCCER_GOAL_CROSSBAR_LENGTH, 8]}
          />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        {/* 背面フレーム(Phase6 #335で追加): 上端バー + バックステー2本。
            ネットをケージ状に張るには吊る先が要る。旧実装は前面の枠しか無く、ネットを足すと
            天面と背面が空中に浮いてしまう。実物のゴールと同じ骨格を最小構成で足す */}
        <mesh position={[-SOCCER_NET_DEPTH_TOP, SOCCER_GOAL_CROSSBAR_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[GOAL_BACK_BAR_RADIUS, GOAL_BACK_BAR_RADIUS, SOCCER_GOAL_CROSSBAR_LENGTH, 8]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        {[-SOCCER_GOAL_POST_Z, SOCCER_GOAL_POST_Z].map((z) => (
          <mesh
            key={z}
            position={[-(SOCCER_NET_DEPTH_TOP + SOCCER_NET_DEPTH_BOTTOM) / 2, GOAL_MID_Y, z]}
            rotation={[0, 0, -GOAL_STAY_TILT]}
          >
            <cylinderGeometry args={[GOAL_BACK_BAR_RADIUS, GOAL_BACK_BAR_RADIUS, GOAL_STAY_LENGTH, 8]} />
            <meshStandardMaterial color={CHALK} roughness={0.6} />
          </mesh>
        ))}
        {/* ネット(Phase6 #335): 天面・背面・側面2枚のコード実体ケージ。風は頂点シェーダー。
            設計書 docs/plans/2026-08-01-net-geometry-and-physics.md §4 */}
        <CordNet spec={SOCCER_NET_SPEC} color={GOAL_NET_COLOR} windAmplitude={SOCCER_WIND_AMPLITUDE} />
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
        <meshStandardMaterial color={BASKET_COURT_COLOR} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.365, 0]}>
        <ringGeometry args={[1.65, 1.89, 32]} />
        <meshStandardMaterial color={CHALK} roughness={0.9} />
      </mesh>
      {/* ゴール: 支柱 + アーム + バックボード + シューターズスクエア + リング + ネット。
          コート横(+x)だと通過カメラのフレーム外、奥端センターだとSKILLSタイトルと同軸で埋没する。
          奥端の左寄りに置いてタイトルと視覚的に分離する(Phase 3 QAフォローアップ)。
          位置・寸法はすべてball/anchors.tsと単一ソース(フリースローの着弾点・構造物
          クリアランステストとズレないため)。
          Phase6(Issue #330)でバックボードを実物比へ作り直し、支柱を板の後方へ移してアームを追加した */}
      <group position={[HOOP_GROUP_OFFSET.x, HOOP_GROUP_OFFSET.y, HOOP_GROUP_OFFSET.z]}>
        {/* 支柱: 板の背面より後方に立てる(旧z=-1.8はネットを貫通していた・Issue #330) */}
        <mesh position={[HOOP_POST_LOCAL_OFFSET.x, HOOP_POST_LOCAL_OFFSET.y, HOOP_POST_LOCAL_OFFSET.z]}>
          <cylinderGeometry args={[HOOP_POST_RADIUS, HOOP_POST_RADIUS, HOOP_POST_HEIGHT, 12]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* 張り出しアーム: 支柱とバックボード背面を繋ぐ。旧実装には存在せず板が空中に浮いていた */}
        <mesh
          position={[0, HOOP_ARM_Y, (HOOP_POST_LOCAL_OFFSET.z + BACKBOARD_LOCAL_OFFSET.z) / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry
            args={[0.28, 0.28, Math.abs(BACKBOARD_LOCAL_OFFSET.z - HOOP_POST_LOCAL_OFFSET.z) + 0.6, 10]}
          />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* バックボード: 実物比(1.83×1.05m → 24.02×13.78)。リング内側近端から板面まで実物0.15m規格 */}
        <mesh
          position={[BACKBOARD_LOCAL_OFFSET.x, BACKBOARD_LOCAL_OFFSET.y, BACKBOARD_LOCAL_OFFSET.z]}
        >
          <boxGeometry args={[BACKBOARD_WIDTH, BACKBOARD_HEIGHT, BACKBOARD_THICKNESS]} />
          <meshStandardMaterial color={CHALK} roughness={0.4} />
        </mesh>
        {/* シューターズスクエア(内側の白枠4辺)。下辺をリング高さに揃える実物の作法。
            「バックボードに見える」ことに一番効く記号なので枠線として描く */}
        <ShooterSquare />
        <mesh position={[RING_OFFSET.x, RING_OFFSET.y, RING_OFFSET.z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RING_RADIUS, RING_TUBE_RADIUS, 8, 32]} />
          <meshStandardMaterial color="#e8833a" roughness={0.45} />
        </mesh>
        {/* ネット(Phase6): リングから吊り下がる実体コードのダイヤモンド網。
            設計書 docs/plans/2026-08-01-net-geometry-and-physics.md §3 */}
        <group position={[RING_OFFSET.x, RING_OFFSET.y, RING_OFFSET.z]}>
          <BasketNet />
        </group>
      </group>
      {/* バスケットボールの静的メッシュはPhase 5-3で撤去(クリスタル球がキャッチ→フリースローで通過する) */}
      <SectionTitle text="SKILLS" accent="#ffb300" position={[0, TITLE_Y, 0]} fontSize={TITLE_FONT_SIZE} />
    </group>
  )
}

/** バレー支柱の中心y。足元は地面(グループ相対-1.2)、天はy=4.8 */
const VOLLEY_POST_MID_Y = -1.2 + VOLLEY_NET_POST_HEIGHT / 2

// バレーボール: コート + ネット(About)
export function VolleyVenue() {
  const c = VENUES.about.center
  const { width, depth } = COURT_SIZES.about // 21 × 15
  return (
    <group position={[c.x, c.y, c.z]}>
      {/* コート(低彩度ティール) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.38, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={VOLLEY_COURT_COLOR} roughness={0.95} />
      </mesh>
      {/* ネット: 支柱2本 + 白帯 + 半透明ネット面。
          支柱位置はpath/venues.tsのVOLLEY_NET_POST_Zと単一ソース(構造物クリアランステスト共有)。
          寸法は旧値×3(ネット上帯はワールドy≈5.15になり、TOSS_PEAK(y8.5)が上を越える) */}
      <group position={[VOLLEY_NET_GROUP_OFFSET.x, VOLLEY_NET_GROUP_OFFSET.y, VOLLEY_NET_GROUP_OFFSET.z]}>
        {[-VOLLEY_NET_POST_Z, VOLLEY_NET_POST_Z].map((z) => (
          <mesh key={z} position={[0, VOLLEY_POST_MID_Y, z]}>
            <cylinderGeometry
              args={[VOLLEY_NET_POST_RADIUS, VOLLEY_NET_POST_RADIUS, VOLLEY_NET_POST_HEIGHT, 8]}
            />
            <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        {/* 白帯(上端) */}
        <mesh position={[0, VOLLEY_NET_BAND_Y, 0]}>
          <boxGeometry args={[0.09, VOLLEY_NET_BAND_THICKNESS, VOLLEY_NET_LENGTH]} />
          <meshStandardMaterial color={CHALK} roughness={0.7} />
        </mesh>
        {/* ネット面(Phase6 #335): 半透明の板2枚からコード実体の網へ置き換えた。
            板のままだとバスケネットだけが実体でネット3種の質がちぐはぐになる。
            設計書 docs/plans/2026-08-01-net-geometry-and-physics.md §4 */}
        <CordNet spec={VOLLEY_NET_SPEC} color={GOAL_NET_COLOR} windAmplitude={VOLLEY_WIND_AMPLITUDE} />
      </group>
      {/* バレーボールの静的メッシュはPhase 5-4で撤去(クリスタル球がレシーブ→トス→アタックで通過する) */}
      <SectionTitle text="ABOUT" accent="#69f0ae" position={[0, TITLE_Y, 0]} fontSize={TITLE_FONT_SIZE} />
    </group>
  )
}

// Contact台座: 3ヴェニューのミニチュアジオラマ(Issue #304)。
// 実機QAで判明: 最終カメラは球の真横をほぼアイレベルで見ており、球の足元に水平に置いた模型は
// 球本体に隠れて見えない(ハブ&スポーク型の初期案を却下・詳細はObsidian Decisions/
// 2026-07-13-journey-ending-diorama.md追記部分)。そのため3コートは水平タイルではなく、
// 球のシルエットの外側(左右・後方)に立てる「小さな展示パネル」として配置する。
// SoccerVenue等の縮小再利用ではなく専用の簡略ジオメトリで新規作成する(理由は同ノート参照:
// Phase5-5でコートが3倍化済みのため一律scale groupだとディテールが視認できないため)。
// 数値は叩き台(他Anchor同様、Playwright実機QAで個別調整する前提)。
const DIORAMA_BASE_Y = -0.18 // 旧円柱台座の底面yを踏襲(球の静止位置を変えないため)
const DIORAMA_RISER_RADIUS_TOP = 0.55
const DIORAMA_RISER_RADIUS_BOTTOM = 0.7
const DIORAMA_RISER_HEIGHT = 1.0
const DIORAMA_TABLETOP_RADIUS = 1.7
const DIORAMA_TABLETOP_HEIGHT = 0.2
/** テーブル天面y。旧円柱台座の上面y=1.02と一致させ、球の見え方を変えない */
const DIORAMA_TOP_SURFACE_Y = DIORAMA_BASE_Y + DIORAMA_RISER_HEIGHT + DIORAMA_TABLETOP_HEIGHT

const DIORAMA_PANEL_WIDTH = 0.6
const DIORAMA_PANEL_HEIGHT = 1.0
/** パネル中心の高さ。球の上半分(CONTACT_REST_OFFSET.y=1.0+半径1.5)と横並びになる目安 */
const DIORAMA_PANEL_CENTER_Y = 2.2
/** ハブ中心からパネルまでの水平距離。球の半径1.5+余裕を確保しシルエット外に出す */
const DIORAMA_PANEL_RADIUS = 2.1
const DIORAMA_POST_RADIUS = 0.025
/** パネル支柱の高さ(地面からパネル下端まで) */
const DIORAMA_POST_HEIGHT = DIORAMA_PANEL_CENTER_Y - DIORAMA_PANEL_HEIGHT / 2 - DIORAMA_BASE_Y

type MiniCourtKind = 'soccer' | 'basket' | 'volley'

/** 構造物の簡易記号。縮尺が小さすぎて実物形状(支柱+バックボード+ネット等)は視認できないため、
    輪郭だけのシンボルに簡略化する(本編ジオメトリの流用はしない)。パネル手前の地面に置く */
function MiniStructureSymbol({ kind }: { kind: MiniCourtKind }) {
  if (kind === 'soccer') {
    return (
      <group position={[0, DIORAMA_BASE_Y, 0.22]}>
        <mesh position={[-0.1, 0.08, 0]}>
          <boxGeometry args={[0.018, 0.16, 0.018]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0.1, 0.08, 0]}>
          <boxGeometry args={[0.018, 0.16, 0.018]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.22, 0.018, 0.018]} />
          <meshStandardMaterial color={CHALK} roughness={0.6} />
        </mesh>
      </group>
    )
  }
  if (kind === 'basket') {
    return (
      <group position={[0, DIORAMA_BASE_Y, 0.22]}>
        <mesh position={[0, 0.09, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.18, 6]} />
          <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.065, 0.011, 6, 16]} />
          <meshStandardMaterial color="#e8833a" roughness={0.45} />
        </mesh>
      </group>
    )
  }
  return (
    <group position={[0, DIORAMA_BASE_Y, 0.22]}>
      <mesh position={[-0.12, 0.09, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.18, 6]} />
        <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.12, 0.09, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.18, 6]} />
        <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <planeGeometry args={[0.22, 0.09]} />
        <meshStandardMaterial color="#f2ece6" transparent opacity={0.35} side={2} />
      </mesh>
    </group>
  )
}

/** 1コート分の立て看板(支柱+額縁パネル+手前の構造物記号)。
    positionAngleでハブを中心に配置する。facingはパネル自体の向き(position angleと分離): 実測で
    チェイスカムの進行方向は経路依存で計算予測できないと判明したため、position angleをそのまま
    向きに使うと配置によっては真横(エッジオン)になり細い線にしか見えなくなる。
    実測で良好だった向きを別のpositionへ使い回せるようにする */
function MiniCourtPanel({
  positionAngle,
  facing,
  color,
  kind,
}: {
  positionAngle: number
  facing: number
  color: string
  kind: MiniCourtKind
}) {
  const x = DIORAMA_PANEL_RADIUS * Math.sin(positionAngle)
  const z = DIORAMA_PANEL_RADIUS * Math.cos(positionAngle)
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      <mesh position={[0, DIORAMA_BASE_Y + DIORAMA_POST_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[DIORAMA_POST_RADIUS, DIORAMA_POST_RADIUS, DIORAMA_POST_HEIGHT, 8]} />
        <meshStandardMaterial color="#8d8d94" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* コート色パネル本体。1枚板+side={2}(両面描画)にする: 額縁boxを手前に重ねる旧案は、
          チェイスカムの実際の進行方向が経路の向きに従い単純な世界座標軸の想定と合わないため、
          パネルを裏側から見る角度でboxがcolor面を完全に隠す実測不具合が出た(奥行きのある
          重なりは片側からしか正しく見えない)。奥行きを持たせず1枚板にすることで解消する */}
      <mesh position={[0, DIORAMA_PANEL_CENTER_Y, 0]}>
        <planeGeometry args={[DIORAMA_PANEL_WIDTH, DIORAMA_PANEL_HEIGHT]} />
        <meshStandardMaterial color={color} roughness={0.85} side={2} />
      </mesh>
      <MiniStructureSymbol kind={kind} />
    </group>
  )
}

/** ハブ(支柱+テーブル天面、球の着地面)+3コートの立て看板。
    位置はCONTACT_REST_OFFSETと単一ソース(球の着地点直下) */
function ContactDiorama() {
  return (
    <group position={[CONTACT_REST_OFFSET.x, 0, CONTACT_REST_OFFSET.z]}>
      <mesh position={[0, DIORAMA_BASE_Y + DIORAMA_RISER_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[DIORAMA_RISER_RADIUS_TOP, DIORAMA_RISER_RADIUS_BOTTOM, DIORAMA_RISER_HEIGHT, 20]} />
        <meshStandardMaterial color="#c9beae" roughness={0.7} />
      </mesh>
      <mesh position={[0, DIORAMA_BASE_Y + DIORAMA_RISER_HEIGHT + DIORAMA_TABLETOP_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[DIORAMA_TABLETOP_RADIUS, DIORAMA_TABLETOP_RADIUS, DIORAMA_TABLETOP_HEIGHT, 32]} />
        <meshStandardMaterial color="#e6dbcd" roughness={0.6} />
      </mesh>
      {/* 実機QA実測(位置角度→画面上の見え方、チェイスカムの進行方向は経路依存のため計算では
          予測できず実測で決めた): position 90°=球の左脇に視認(良好)/330°=右脇に視認(良好)/
          210°=ContactCard裏に完全に隠れる(不採用)/0°=球の正面を塞ぐ(不採用、隠れるより悪い)。
          さらにfacingをposition角度と同じ値にすると、位置によってはパネルがカメラにほぼ真横
          (エッジオン)になり細い線にしか見えない実測不具合が出たため、facingは90°/330°の
          実測良好値を使い回す(向きと位置を分離)。バスケは330°側とのカード脇での重なりを
          減らすため位置を65°に置き、向きだけ実測良好な90°(soccerと同じ)を流用する */}
      <MiniCourtPanel positionAngle={Math.PI / 2} facing={Math.PI / 2} color={SOCCER_COURT_COLOR} kind="soccer" />
      <MiniCourtPanel positionAngle={(13 * Math.PI) / 36} facing={Math.PI / 2} color={BASKET_COURT_COLOR} kind="basket" />
      <MiniCourtPanel positionAngle={(11 * Math.PI) / 6} facing={(11 * Math.PI) / 6} color={VOLLEY_COURT_COLOR} kind="volley" />
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
          「旅路のミニチュアジオラマ」本実装(Issue #304)。高さスタックは旧円柱台座(上面y=1.02)を
          踏襲し球の見え方は変えていない。位置はball/anchors.tsのCONTACT_REST_OFFSETと単一ソース */}
      <ContactDiorama />
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
