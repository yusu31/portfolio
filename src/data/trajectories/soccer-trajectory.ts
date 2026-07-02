// src/data/trajectories/soccer-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - ドリブル: バウンスしながら転がる（Y軸に小さな弧の連続）
//   - ジグザグ: 折り返しで速度が落ち、直線で加速（Y値の変化で表現）
//   - ロングパス: 大きな放物線（上昇急 / 下降なだらか）
//   - カメラ: ドリブル中はボール真後ろ低め（スプリント感）
//             ジグザグ折り返しは左右に振ってダイナミズム追加
//             ロングパスは引き気味で弧全体を見せる

import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface SoccerHotspot {
  index: number
  categoryId: string
  cardSide: 'left' | 'right'
}

export const SOCCER_HOTSPOTS: SoccerHotspot[] = [
  { index: 0, categoryId: 'webapp',   cardSide: 'right' },
  { index: 1, categoryId: 'game',     cardSide: 'left'  },
  { index: 2, categoryId: 'website',  cardSide: 'right' },
  { index: 3, categoryId: 'tool',     cardSide: 'left'  },
]

export const SOCCER_WAYPOINTS: Waypoint[] = [
  // ── Phase 1: ドリブル開始（バウンスしながら前進） ─────────────────────
  // カメラ: 低め真後ろ、スプリント感
  { progress: 0.00, pos: [ 0, 0.0,  0], camOffset: [0,  0.1, 4.5], rotSpeed: 1.2 },
  // バウンス頂点
  { progress: 0.04, pos: [ 0, 1.5, -3], camOffset: [0,  0.0, 4.2], rotSpeed: 1.5 },
  // 着地
  { progress: 0.08, pos: [ 0, 0.0, -6], camOffset: [0, -0.1, 4.0], rotSpeed: 1.2 },

  // ── Phase 2: ジグザグ×4（折り返しにホットスポット） ──────────────────
  // カメラ: 折り返し点は外側に大きく振って迫力を出す

  // 左折り返し（hotspot 0）─ バウンスしながら到達
  { progress: 0.13, pos: [-4, 1.0,-10], camOffset: [ 1.2, 0.3, 5.0], rotSpeed: 0.5 },
  { progress: 0.18, pos: [-6, 0.0,-13], camOffset: [ 1.4, 0.4, 5.2], rotSpeed: 0.3, hotspotIndex: 0, impact: true },
  // 右へ加速（バウンス頂点）
  { progress: 0.23, pos: [-2, 1.8,-17], camOffset: [-0.5, 0.2, 5.0], rotSpeed: 2.0 },

  // 右折り返し（hotspot 1）
  { progress: 0.27, pos: [ 4, 1.0,-20], camOffset: [-1.2, 0.3, 5.0], rotSpeed: 0.5 },
  { progress: 0.32, pos: [ 6, 0.0,-23], camOffset: [-1.4, 0.4, 5.2], rotSpeed: 0.3, hotspotIndex: 1, impact: true },
  // 左へ加速（バウンス頂点）
  { progress: 0.37, pos: [ 2, 1.8,-27], camOffset: [ 0.5, 0.2, 5.0], rotSpeed: 2.0 },

  // 左折り返し（hotspot 2）
  { progress: 0.41, pos: [-4, 1.0,-30], camOffset: [ 1.2, 0.3, 5.0], rotSpeed: 0.5 },
  { progress: 0.46, pos: [-6, 0.0,-33], camOffset: [ 1.4, 0.4, 5.2], rotSpeed: 0.3, hotspotIndex: 2, impact: true },
  // 右へ加速（バウンス頂点）
  { progress: 0.51, pos: [-2, 1.8,-37], camOffset: [-0.5, 0.2, 5.0], rotSpeed: 2.0 },

  // 右折り返し（hotspot 3）
  { progress: 0.55, pos: [ 4, 1.0,-40], camOffset: [-1.2, 0.3, 5.0], rotSpeed: 0.5 },
  { progress: 0.60, pos: [ 6, 0.0,-43], camOffset: [-1.4, 0.4, 5.2], rotSpeed: 0.3, hotspotIndex: 3, impact: true },

  // ── Phase 3: ゴール前突進 → ロングパス放物線 ─────────────────────────
  // カメラ: 引き気味で放物線の弧全体を見せる
  // ゴール前センタリング
  { progress: 0.68, pos: [ 0, 0.0,-50], camOffset: [0,  0.5, 7.0], rotSpeed: 2.5 },
  // 蹴り出し（上昇急 — 放物線前半）
  { progress: 0.76, pos: [ 6, 6.0,-56], camOffset: [0,  0.2, 8.0], rotSpeed: 3.0 },
  // 放物線頂点（高い弧）
  { progress: 0.85, pos: [12,12.0,-62], camOffset: [0, -0.5, 9.0], rotSpeed: 3.5 },
  // 下降（なだらか — 放物線後半）
  { progress: 0.93, pos: [16, 8.0,-67], camOffset: [0,  0.0, 8.5], rotSpeed: 4.0 },
  { progress: 1.00, pos: [18, 2.0,-70], camOffset: [0,  0.5, 7.5], rotSpeed: 4.5 },
]

export const HOTSPOT_RADIUS = 0.025
