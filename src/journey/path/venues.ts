// ヴェニュー(コート)の配置: 道の左右に交互に置き、カメラは道なりに蛇行しながら通過する。
// 終着のContactだけは道の正面(x=0)に置き、フィニッシュゲートをくぐって着地する。
// この座標は経路(curves.ts)・セクション区間(sections.ts)・ボールリレー(ball/anchors.ts)の単一ソース。
//
// Phase 5-5でコートを3倍化(設計書: docs/plans/2026-07-17-phase5-5-court-expansion.md)。
// 配置方針は「近サイドラインを道の中心線(x=0)に一致させる」: カメラは引かない(ユーザー明言)ため、
// ヴェニュー中心をコート半幅ぶん外へ出し、カメラのwiggle(±1.9)がそのまま
// 「サイドライン内側すれすれの並走(タッチライン際カメラ)」になるようにする。
import * as THREE from 'three'

/** コート・構造物の拡大率(Phase 5-5)。コート面と構造物の内部寸法に適用する */
export const VENUE_SCALE = 3

/**
 * 拡大後のコート寸法(width=x方向, depth=z方向)。
 * PR-3スケール調整(scratchpad実測 2026-07-19):
 * - skills/about: 旧21×15に×1.9倍を適用。短辺/球比 5→9.5(目標9〜10)
 * - projects: 旧27×19.5に×1.5倍を適用(完全追従は不可能・ドリブルレーン体感優先)
 * venues.tsxのplaneGeometryとpath.test.tsの視線AABBテストが共有する単一ソース
 */
export const COURT_SIZES = {
  projects: { width: 40.5, depth: 29.25 },
  skills: { width: 39.9, depth: 28.5 },
  about: { width: 39.9, depth: 28.5 },
} as const

/**
 * 構造物(ゴール/フープ/ネット)グループのy持ち上げ量。
 * 構造物の足元は地面(y=-0.4)に接地しており、内部寸法を3倍すると足が地面下に沈むため
 * グループごと持ち上げて接地を保つ: -GROUND_PLANE_Y * (VENUE_SCALE - 1) = 0.8(3構造物共通)
 */
export const STRUCTURE_GROUND_LIFT = 0.8

// 各座標の根拠(近サイドライン=x=0):
// PR-3スケール調整で幅が変更:
// projects: 幅27→40.5、半幅13.5→20.25 → 東タッチラインがx=0。コートz∈[-49.75, -30.25]
// skills:   幅21→39.9、半幅10.5→19.95 → 西サイドラインがx=0。コートz∈[-112.5, -97.5]
// about:    幅21→39.9、半幅10.5→19.95 → 東サイドラインがx=0。コートz∈[-177.5, -162.5]
// contact:  プラザは1x据え置き(終着の儀式空間に広さは不要・QA済み構図の保護。ユーザー承認済み)
export const VENUES = {
  projects: { center: new THREE.Vector3(-20.25, 0, -40) },
  skills: { center: new THREE.Vector3(19.95, 0, -105) },
  about: { center: new THREE.Vector3(-19.95, 0, -170) },
  contact: { center: new THREE.Vector3(0, 0, -245) },
} as const

// ---- 構造物の配置定数(venues.tsxの描画とpath.test.tsの構造物クリアランステストが共有) ----
// 3倍化で構造物が道に迫るため、「カメラ経路と構造物の水平距離」をテストで担保する。
// フープ(バスケゴール)はボールアンカーと結合するため ball/anchors.ts 側で定義する

/** サッカーゴールグループのvenue相対オフセット(旧(-4.4,0,0)×3+接地補正) */
export const SOCCER_GOAL_GROUP_OFFSET = new THREE.Vector3(-13.2, STRUCTURE_GROUND_LIFT, 0)
/** サッカーゴールポストのグループ相対z(旧±1.1×3) */
export const SOCCER_GOAL_POST_Z = 3.3

// ---- サッカーゴールの骨格寸法(venues.tsxの描画とnets/goalNets.tsのネットが共有) ----
// Phase6(#335)でネットを実体化するにあたり、venues.tsxにベタ書きだった値をここへ移した。
// ネットはこの骨格の面に張るので、片方だけ動くとネットがフレームから外れる

/** ゴール枠の管半径 */
export const SOCCER_GOAL_POST_RADIUS = 0.15
/** ゴール枠の足元y(グループ相対)。地面(world -0.4)に接地する */
export const SOCCER_GOAL_BOTTOM_Y = -1.2
/** クロスバーのy(グループ相対)。支柱の天 */
export const SOCCER_GOAL_CROSSBAR_Y = 3.9
/** 支柱の長さ(足元→クロスバー)。旧venues.tsxのcylinderGeometry高さ5.1と一致 */
export const SOCCER_GOAL_POST_HEIGHT = SOCCER_GOAL_CROSSBAR_Y - SOCCER_GOAL_BOTTOM_Y
/** クロスバーの長さ。支柱間(6.6)+両端に管半径ぶんの張り出し */
export const SOCCER_GOAL_CROSSBAR_LENGTH = SOCCER_GOAL_POST_Z * 2 + SOCCER_GOAL_POST_RADIUS * 2
/**
 * ネットケージの天面の奥行き(-x方向)。ゴール前面はKICK_POINT側(+x)なのでネットは-xへ張る。
 * 実物の規格(上部2m/ゴール幅7.32m)をこのゴール幅6.6へ当てると1.80だが、このゴールは
 * 実物比で2.3倍縦長(#328)なので浅すぎて窮屈に見える。縦長ぶんを少し補って2.1にした
 */
export const SOCCER_NET_DEPTH_TOP = 2.1
/** ネットケージの地面側の奥行き。背面が後方へ倒れる実物のシルエットを作る */
export const SOCCER_NET_DEPTH_BOTTOM = 3.6

/** バレーネットグループのvenue相対オフセット(接地補正のみ) */
export const VOLLEY_NET_GROUP_OFFSET = new THREE.Vector3(0, STRUCTURE_GROUND_LIFT, 0)
/** バレーネット支柱のグループ相対z(旧±2.4×3) */
export const VOLLEY_NET_POST_Z = 7.2

// ---- バレーネットの寸法(venues.tsxの描画とnets/goalNets.tsのネットが共有) ----

/** 支柱の半径 */
export const VOLLEY_NET_POST_RADIUS = 0.18
/** 支柱の長さ。足元-1.2(接地)〜天4.8 */
export const VOLLEY_NET_POST_HEIGHT = 6.0
/** 白帯の中心y(グループ相対)。ワールドではy≈5.15でTOSS_PEAK(8.5)がその上を越える */
export const VOLLEY_NET_BAND_Y = 4.35
/** 白帯の厚み(y方向) */
export const VOLLEY_NET_BAND_THICKNESS = 0.42
/** ネット面のz方向の長さ。支柱間にちょうど張る */
export const VOLLEY_NET_LENGTH = VOLLEY_NET_POST_Z * 2
/** ネット面の上端y。白帯の下辺に一致させる */
export const VOLLEY_NET_TOP_Y = VOLLEY_NET_BAND_Y - VOLLEY_NET_BAND_THICKNESS / 2
/** ネット面の高さ */
export const VOLLEY_NET_HEIGHT = 2.28
/** ネット面の下端y */
export const VOLLEY_NET_BOTTOM_Y = VOLLEY_NET_TOP_Y - VOLLEY_NET_HEIGHT
/** フィニッシュゲートグループのvenue相対z(プラザ1x据え置きのため不変) */
export const FINISH_GATE_OFFSET_Z = 3.6
/** フィニッシュゲートポールのグループ相対x(不変) */
export const FINISH_GATE_POLE_X = 2.6
