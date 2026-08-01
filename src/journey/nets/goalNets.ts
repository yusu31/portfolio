// サッカーゴールネットとバレーネットの形状定義(純粋モジュール)。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §4
// 骨格寸法は path/venues.ts と単一ソース。ネットは骨格の面に張るので、片方だけ動かすと
// ネットがフレームから外れる(バスケ側で「支柱がネットを貫通する」#330を踏んだのと同じ事故)。
import * as THREE from 'three'
import {
  SOCCER_GOAL_POST_Z,
  SOCCER_GOAL_BOTTOM_Y,
  SOCCER_GOAL_CROSSBAR_Y,
  SOCCER_NET_DEPTH_TOP,
  SOCCER_NET_DEPTH_BOTTOM,
  VOLLEY_NET_POST_Z,
  VOLLEY_NET_TOP_Y,
  VOLLEY_NET_BOTTOM_Y,
} from '../path'
import {
  frameDistanceWeight,
  type CordNetPanel,
  type CordNetSpec,
  type FrameSegment,
} from './cordNetGeometry'

/** ネットの色。venues.tsxのCHALK / バスケネットのNET_COLORと同系で統一する */
export const GOAL_NET_COLOR = '#f2ece6'

/**
 * サッカー/バレーのコード半径。設計書§4.2の実測根拠:
 * チェイスカメラはクロスバーの3.40ユニットまで接近するので、直径0.044は縦FOVの1.5%
 * ≒1080pで16px。バスケ(0.033)より細いのは、こちらは実物比のスケールに縛られないため
 */
export const GOAL_NET_CORD_RADIUS = 0.022

/**
 * 網目のセル寸法。設計書§4.2はサッカー0.30と書いているが、そのままだとコード本数が
 * 約1,700本(三角形20,400)になり、同じ§4.2が掲げるコード約1,200本・三角形約14,400の
 * 予算を超える。予算のほうを拘束条件として採り、セルを0.36に緩めて本数を合わせた
 * (見た目の密度は実機QAで再調整可能)
 */
const SOCCER_CELL = 0.36
const VOLLEY_CELL = 0.4

/** 風がフレームからどれだけ離れると最大振幅になるか(ユニット)。ネットの奥行きに合わせる */
const SOCCER_WIND_REACH = 1.6
const VOLLEY_WIND_REACH = 1.5

/** 風の振幅。ケージの大きいサッカーは大きく、高さ2.28しかないバレーは控えめにする */
export const SOCCER_WIND_AMPLITUDE = 0.26
export const VOLLEY_WIND_AMPLITUDE = 0.13

/** セル寸法から分割数を出す(最低1分割) */
function segmentsFor(length: number, cell: number): number {
  return Math.max(1, Math.round(length / cell))
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

// ---- サッカーゴールネット ----

const HALF_WIDTH = SOCCER_GOAL_POST_Z
const TOP_Y = SOCCER_GOAL_CROSSBAR_Y
const BOTTOM_Y = SOCCER_GOAL_BOTTOM_Y
const D_TOP = SOCCER_NET_DEPTH_TOP
const D_BOTTOM = SOCCER_NET_DEPTH_BOTTOM

/** 背面(後方へ倒れる斜面)の長さ。天面・側面と分割数を揃えるために使う */
const BACK_SLANT = Math.hypot(D_BOTTOM - D_TOP, TOP_Y - BOTTOM_Y)

/** ゴール幅方向(z)の分割数。天面・背面で共有する */
const SOCCER_SEG_Z = segmentsFor(HALF_WIDTH * 2, SOCCER_CELL)
/** 奥行き方向(天面)の分割数。天面と側面上辺で共有する */
const SOCCER_SEG_DEPTH = segmentsFor(D_TOP, SOCCER_CELL)
/** 背面斜面方向の分割数。背面と側面後辺で共有する */
const SOCCER_SEG_SLANT = segmentsFor(BACK_SLANT, SOCCER_CELL)

/**
 * ケージ4面(天面・背面・側面2枚)。
 *
 * **共有辺の分割数を必ず揃える**: 揃っていないと結び目位置が一致せず、
 * cordNetSegments の重複除去も効かないうえ、風で継ぎ目が裂ける
 */
export function soccerNetPanels(): CordNetPanel[] {
  // 天面: クロスバー(x=0)から背面上端(x=-D_TOP)まで
  const top: CordNetPanel = {
    corners: [
      v(0, TOP_Y, -HALF_WIDTH),
      v(-D_TOP, TOP_Y, -HALF_WIDTH),
      v(-D_TOP, TOP_Y, HALF_WIDTH),
      v(0, TOP_Y, HALF_WIDTH),
    ],
    segU: SOCCER_SEG_DEPTH,
    segV: SOCCER_SEG_Z,
  }
  // 背面: 上端(-D_TOP, TOP)から地面(-D_BOTTOM, BOTTOM)へ倒れる
  const back: CordNetPanel = {
    corners: [
      v(-D_TOP, TOP_Y, -HALF_WIDTH),
      v(-D_BOTTOM, BOTTOM_Y, -HALF_WIDTH),
      v(-D_BOTTOM, BOTTOM_Y, HALF_WIDTH),
      v(-D_TOP, TOP_Y, HALF_WIDTH),
    ],
    segU: SOCCER_SEG_SLANT,
    segV: SOCCER_SEG_Z,
  }
  // 側面2枚: 支柱・天面・背面・地面に囲まれた四角形
  const side = (z: number): CordNetPanel => ({
    corners: [v(0, BOTTOM_Y, z), v(-D_BOTTOM, BOTTOM_Y, z), v(-D_TOP, TOP_Y, z), v(0, TOP_Y, z)],
    segU: SOCCER_SEG_DEPTH,
    segV: SOCCER_SEG_SLANT,
  })
  return [top, back, side(-HALF_WIDTH), side(HALF_WIDTH)]
}

/**
 * ネットが固定される骨格の線分(ゴール枠・背面バー・バックステー・地面の縁)。
 * この全部から等しく離れるほど風で大きく動く
 */
export function soccerFrameSegments(): FrameSegment[] {
  const segments: FrameSegment[] = [
    // クロスバー
    [v(0, TOP_Y, -HALF_WIDTH), v(0, TOP_Y, HALF_WIDTH)],
    // 背面上端バー
    [v(-D_TOP, TOP_Y, -HALF_WIDTH), v(-D_TOP, TOP_Y, HALF_WIDTH)],
    // 背面の接地縁
    [v(-D_BOTTOM, BOTTOM_Y, -HALF_WIDTH), v(-D_BOTTOM, BOTTOM_Y, HALF_WIDTH)],
  ]
  for (const z of [-HALF_WIDTH, HALF_WIDTH]) {
    // 支柱
    segments.push([v(0, BOTTOM_Y, z), v(0, TOP_Y, z)])
    // バックステー(背面上端から地面へ)
    segments.push([v(-D_TOP, TOP_Y, z), v(-D_BOTTOM, BOTTOM_Y, z)])
    // 側面の接地縁
    segments.push([v(0, BOTTOM_Y, z), v(-D_BOTTOM, BOTTOM_Y, z)])
  }
  return segments
}

export function soccerNetSpec(): CordNetSpec {
  return {
    panels: soccerNetPanels(),
    cordRadius: GOAL_NET_CORD_RADIUS,
    windWeightAt: frameDistanceWeight(soccerFrameSegments(), SOCCER_WIND_REACH),
  }
}

// ---- バレーネット ----

const VOLLEY_HALF_LENGTH = VOLLEY_NET_POST_Z

/** 支柱間に張る1枚の垂直面(x=0のyz平面) */
export function volleyNetPanels(): CordNetPanel[] {
  return [
    {
      corners: [
        v(0, VOLLEY_NET_BOTTOM_Y, -VOLLEY_HALF_LENGTH),
        v(0, VOLLEY_NET_BOTTOM_Y, VOLLEY_HALF_LENGTH),
        v(0, VOLLEY_NET_TOP_Y, VOLLEY_HALF_LENGTH),
        v(0, VOLLEY_NET_TOP_Y, -VOLLEY_HALF_LENGTH),
      ],
      segU: segmentsFor(VOLLEY_HALF_LENGTH * 2, VOLLEY_CELL),
      segV: segmentsFor(VOLLEY_NET_TOP_Y - VOLLEY_NET_BOTTOM_Y, VOLLEY_CELL),
    },
  ]
}

/**
 * 固定は白帯(上端)と支柱2本だけ。**下端は固定しない**のは実物どおりで、
 * 下辺のケーブルは張ってあっても中央は自由に揺れるため。
 * 結果として下端中央が最も大きくはためき、バレーネットらしい動きになる。
 *
 * 支柱の線分はネット面と同じy範囲だけ取る。ネットの結び目はこの範囲にしか無いので、
 * 支柱の実長(VOLLEY_NET_POST_HEIGHT)まで伸ばしても最近傍距離は変わらない
 */
export function volleyFrameSegments(): FrameSegment[] {
  return [
    [v(0, VOLLEY_NET_TOP_Y, -VOLLEY_HALF_LENGTH), v(0, VOLLEY_NET_TOP_Y, VOLLEY_HALF_LENGTH)],
    [v(0, VOLLEY_NET_BOTTOM_Y, -VOLLEY_HALF_LENGTH), v(0, VOLLEY_NET_TOP_Y, -VOLLEY_HALF_LENGTH)],
    [v(0, VOLLEY_NET_BOTTOM_Y, VOLLEY_HALF_LENGTH), v(0, VOLLEY_NET_TOP_Y, VOLLEY_HALF_LENGTH)],
  ]
}

export function volleyNetSpec(): CordNetSpec {
  return {
    panels: volleyNetPanels(),
    cordRadius: GOAL_NET_CORD_RADIUS,
    windWeightAt: frameDistanceWeight(volleyFrameSegments(), VOLLEY_WIND_REACH),
  }
}

// 仕様は完全に静的なのでモジュール初期化時に1回だけ組む。
// CordNetのuseMemoキーとして安定する(毎レンダーで作り直すとジオメトリが再生成される)
export const SOCCER_NET_SPEC: CordNetSpec = soccerNetSpec()
export const VOLLEY_NET_SPEC: CordNetSpec = volleyNetSpec()
