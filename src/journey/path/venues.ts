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
 * venues.tsxのplaneGeometryとpath.test.tsの視線AABBテストが共有する単一ソース
 */
export const COURT_SIZES = {
  projects: { width: 27, depth: 19.5 },
  skills: { width: 21, depth: 15 },
  about: { width: 21, depth: 15 },
} as const

/**
 * 構造物(ゴール/フープ/ネット)グループのy持ち上げ量。
 * 構造物の足元は地面(y=-0.4)に接地しており、内部寸法を3倍すると足が地面下に沈むため
 * グループごと持ち上げて接地を保つ: -GROUND_PLANE_Y * (VENUE_SCALE - 1) = 0.8(3構造物共通)
 */
export const STRUCTURE_GROUND_LIFT = 0.8

// 各座標の根拠(近サイドライン=x=0):
// projects: 半幅13.5 → 東タッチラインがx=0。コートz∈[-49.75, -30.25]
// skills:   半幅10.5 → 西サイドラインがx=0。コートz∈[-112.5, -97.5]
// about:    半幅10.5 → 東サイドラインがx=0。コートz∈[-177.5, -162.5]
// contact:  プラザは1x据え置き(終着の儀式空間に広さは不要・QA済み構図の保護。ユーザー承認済み)
export const VENUES = {
  projects: { center: new THREE.Vector3(-13.5, 0, -40) },
  skills: { center: new THREE.Vector3(10.5, 0, -105) },
  about: { center: new THREE.Vector3(-10.5, 0, -170) },
  contact: { center: new THREE.Vector3(0, 0, -245) },
} as const

// ---- 構造物の配置定数(venues.tsxの描画とpath.test.tsの構造物クリアランステストが共有) ----
// 3倍化で構造物が道に迫るため、「カメラ経路と構造物の水平距離」をテストで担保する。
// フープ(バスケゴール)はボールアンカーと結合するため ball/anchors.ts 側で定義する

/** サッカーゴールグループのvenue相対オフセット(旧(-4.4,0,0)×3+接地補正) */
export const SOCCER_GOAL_GROUP_OFFSET = new THREE.Vector3(-13.2, STRUCTURE_GROUND_LIFT, 0)
/** サッカーゴールポストのグループ相対z(旧±1.1×3) */
export const SOCCER_GOAL_POST_Z = 3.3
/** バレーネットグループのvenue相対オフセット(接地補正のみ) */
export const VOLLEY_NET_GROUP_OFFSET = new THREE.Vector3(0, STRUCTURE_GROUND_LIFT, 0)
/** バレーネット支柱のグループ相対z(旧±2.4×3) */
export const VOLLEY_NET_POST_Z = 7.2
/** フィニッシュゲートグループのvenue相対z(プラザ1x据え置きのため不変) */
export const FINISH_GATE_OFFSET_Z = 3.6
/** フィニッシュゲートポールのグループ相対x(不変) */
export const FINISH_GATE_POLE_X = 2.6
