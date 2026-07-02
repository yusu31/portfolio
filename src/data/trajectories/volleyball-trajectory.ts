// src/data/trajectories/volleyball-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - 全フェーズで放物線弧を中間ウェイポイントで表現
//   - レシーブ → セッターへ: 低い放物線
//   - セット(トス): 低速・無回転 → 高くきれいな放物線
//   - スパイク: Magnus効果再現（ネット越え後に急落下）
//   - カメラ: スパイク落下時のみトップダウン（真上から落下点を見せる）
//   - 緩急: スパイク落下ウェイポイント間距離を大きくして「ぎゅーーーん」感

import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface VolleyballHotspot {
  index: number
  aboutId: string
  cardSide: 'left' | 'right'
}

export const VOLLEYBALL_HOTSPOTS: VolleyballHotspot[] = [
  { index: 0, aboutId: 'background', cardSide: 'right' },
  { index: 1, aboutId: 'style',      cardSide: 'left'  },
  { index: 2, aboutId: 'seeking',    cardSide: 'right' },
]

export const VOLLEYBALL_WAYPOINTS: Waypoint[] = [
  // ── Phase 1: 相手アタック落下（斜め奥上から手前へ） ──────────────────
  // カメラ: サイドライン高所からコート全体を捉える
  { progress: 0.00, pos: [10,  9.0, 12], camOffset: [ 0.0,  1.0, 8.0], rotSpeed: 2.5 },
  // 放物線の中間（下降中）
  { progress: 0.07, pos: [ 5,  2.5,  5], camOffset: [-0.3,  0.5, 6.5], rotSpeed: 2.0 },
  // レシーブ地点（ディグ） hotspot 0 ─ 低い位置で受ける
  { progress: 0.14, pos: [ 0, -0.5,  0], camOffset: [ 0.0, -0.3, 5.0], rotSpeed: 0.3, hotspotIndex: 0 },

  // ── Phase 2: ディグ → セッターへ低い放物線 ───────────────────────────
  // カメラ: 斜め横からコートを見渡す
  // 放物線頂点（斜め上に弾いた頂点）
  { progress: 0.23, pos: [-4,  4.5, -3], camOffset: [ 0.6,  0.2, 6.0], rotSpeed: 1.5 },
  // セッター着地 hotspot 1
  { progress: 0.32, pos: [-6,  0.5, -7], camOffset: [ 0.8,  0.4, 5.5], rotSpeed: 0.4, hotspotIndex: 1 },

  // ── Phase 3: セット（トス）高い放物線 ────────────────────────────────
  // カメラ: 下から見上げてボールの高さを強調
  // 上昇中
  { progress: 0.40, pos: [-3,  8.0, -9], camOffset: [ 0.5, -0.8, 5.5], rotSpeed: 0.8 },
  // トス頂点 hotspot 2 ─ ほぼ静止する無重力感
  { progress: 0.48, pos: [ 0, 16.0,-10], camOffset: [ 0.0, -2.0, 5.5], rotSpeed: 0.1, hotspotIndex: 2 },
  // 下降（アタッカーの手元へ）
  { progress: 0.56, pos: [ 4, 10.0, -9], camOffset: [-0.5, -0.5, 5.0], rotSpeed: 0.6 },

  // ── Phase 4: スパイク急降下（ぎゅーーーん） ──────────────────────────
  // カメラ: 真上トップダウンに切り替え → 落下点がコートに刺さるのを見下ろす
  // ジャンプしてネット越え（まだ高い位置）
  { progress: 0.65, pos: [ 6,  4.0,-15], camOffset: [ 0.0,  7.0, 2.5], rotSpeed: 5.0 },
  // Magnus効果: ネット越え後に急落下（距離大 → ぎゅーーん感）
  { progress: 0.78, pos: [ 9,  0.0,-22], camOffset: [ 0.0,  6.0, 2.0], rotSpeed: 7.0 },
  // コート着地直前（トップダウンカメラが落下点を捉える）
  { progress: 0.90, pos: [10, -2.0,-25], camOffset: [ 0.0,  5.5, 1.5], rotSpeed: 8.0 },
  // 終点（インパクト後静止）
  { progress: 1.00, pos: [10, -2.0,-25], camOffset: [ 0.0,  5.5, 1.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
