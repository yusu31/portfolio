// バスケットネットのトポロジーと静止形状(純粋モジュール)。
//
// 設計書: docs/plans/2026-08-01-net-geometry-and-physics.md §3
// 既決判断4(Lathe回転体+アルファ透過テクスチャ)は撤回済み。最接近カメラ距離8.03・縦FOV50°で
// コードが約10px幅で映るため、厚みと自己陰影のないアルファ切り抜きでは必ずチープに見える。
// 代わりに実物のダイヤモンド網をそのまま写した「コード実体ジオメトリ」にする。
//
// このモジュールは形状とトポロジーだけを持ち、描画(BasketNet.tsx)と物理(Phase後半のu軸ベイク)
// の両方がここを単一ソースとして参照する。物理の粒子格子は「段1〜5の結び目」そのもので、
// 描画されるコードは「拘束」そのものになる(格子と見た目が同一なので二重管理が起きない)。
import * as THREE from 'three'
import { RING_RADIUS } from '../ball/anchors'

/** 円周方向の列数。実物のバスケットネットがリングに掛けるループ数と同じ */
export const NET_COLUMNS = 12
/** リング下の結び目段数(段0=リング上のピン留めは含まない) */
export const NET_ROWS = 5
/**
 * ネット全長。実物0.40m × 世界スケール13.1倍 = 5.25ユニット。
 * リング半径3.0が実物0.2286mに対応することから導出した(設計書§1.1)
 */
export const NET_LENGTH = 5.25

/**
 * 各段の半径。段0はリング(RING_RADIUS)に一致させ、下へ向かって絞る。
 *
 * **下端半径がボール半径(1.5)より小さいことが要件**: ボールが必ずネットを押し広げないと
 * 通れないため、スイッシュの「開いて閉じる」動きが物理側で自動的に発生する。
 * 壺型のわずかなフレアは段4→5の半径差を詰めることで表現している(0.25→0.15)
 */
const ROW_RADII: readonly number[] = [RING_RADIUS, 2.55, 2.05, 1.65, 1.4, 1.25]

/** 段の高さ(リング平面を0とし下向きが負)。等間隔 NET_LENGTH / NET_ROWS = 1.05 */
const ROW_STEP = NET_LENGTH / NET_ROWS

/** 結び目の総数(段0のピン留め12個を含む)。= 72 */
export const NET_KNOT_TOTAL = (NET_ROWS + 1) * NET_COLUMNS
/** 物理で積分する結び目数(段1〜5)。= 60。段0はリングに固定されるので動かさない */
export const NET_SIMULATED_COUNT = NET_ROWS * NET_COLUMNS
/** 描画されるコード本数。段の遷移5回 × 各段12結び目 × 下向き2本 = 120 */
export const NET_CORD_COUNT = NET_ROWS * NET_COLUMNS * 2

/** 結び目の通し番号。段(0〜NET_ROWS) × 列(0〜NET_COLUMNS-1) */
export function knotIndex(row: number, column: number): number {
  const c = ((column % NET_COLUMNS) + NET_COLUMNS) % NET_COLUMNS // 円周方向のラップ
  return row * NET_COLUMNS + c
}

/**
 * 結び目の静止位置(リング中心をローカル原点とする座標系)。
 *
 * 段ごとに角度を半ステップ(π/NET_COLUMNS)ずつ交互にずらす。これにより各結び目が
 * 次段の両隣2点へ繋がり、実物と同じダイヤモンド網になる(単純な縦糸+横糸の格子にすると
 * 実物に無い横糸が必要になり、かつ円周方向に伸びなくなってネットが開かない)
 */
export function netRestPositions(): THREE.Vector3[] {
  const positions: THREE.Vector3[] = new Array(NET_KNOT_TOTAL)
  for (let row = 0; row <= NET_ROWS; row++) {
    const radius = ROW_RADII[row]
    const y = -ROW_STEP * row
    // 奇数段だけ半ステップずらす(偶数段と交互 → ダイヤモンド)
    const stagger = (row % 2) * 0.5
    for (let c = 0; c < NET_COLUMNS; c++) {
      const theta = ((c + stagger) / NET_COLUMNS) * Math.PI * 2
      positions[knotIndex(row, c)] = new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta))
    }
  }
  return positions
}

/**
 * コード(=物理拘束)の結び目インデックス対。
 *
 * 段rの結び目が繋がる次段の2列は、千鳥のずれ方向で決まる:
 * - 偶数段(ずれ無し、角度 c·30°)の直下には奇数段(角度 (c+0.5)·30°)があり、隣接するのは c と c-1
 * - 奇数段(角度 (c+0.5)·30°)の直下には偶数段(角度 c·30°)があり、隣接するのは c と c+1
 *
 * これで次段の各結び目がちょうど2本ずつ受けるため、網目が均一になる(テストで担保)
 */
export function netCords(): [number, number][] {
  const cords: [number, number][] = []
  for (let row = 0; row < NET_ROWS; row++) {
    const secondOffset = row % 2 === 0 ? -1 : 1
    for (let c = 0; c < NET_COLUMNS; c++) {
      const from = knotIndex(row, c)
      cords.push([from, knotIndex(row + 1, c)])
      cords.push([from, knotIndex(row + 1, c + secondOffset)])
    }
  }
  return cords
}

/** コード(円柱)の半径。実物のネット紐径4.5mm × 13.1 = 直径0.059相当を少し太らせた値 */
export const NET_CORD_RADIUS = 0.033
/** 結び目(球)の半径。円柱の継ぎ目を埋め、実物にある結び目のディテールも兼ねる */
export const NET_KNOT_RADIUS = 0.042
/** ネットの色。venues.tsxのCHALK(#f7f0ea)と同系。細線の鏡面エイリアシングを避けroughnessは高めにする */
export const NET_COLOR = '#f7f0ea'
