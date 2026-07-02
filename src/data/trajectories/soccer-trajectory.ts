// src/data/trajectories/soccer-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - ドリブル: バウンスしながら転がる（Y軸に小さな弧の連続）
//              実際のサッカーボールバウンス高さ: 地面から15〜30cm → Y=0.3〜0.5
//   - ジグザグ: 実際のスラロームドリブル（コーン間隔1〜2m相当）
//              折り返し時に速度が落ちる → progressの間隔を広く
//              折り返し瞬間はボールが地面に近い（バウンス谷）
//   - ロングパス: 打ち出し角30〜45度、弧の後半がなだらかに落ちる
//              終点をBasketballシーン開始点（X=-12, Y=12）に合わせる
//   - カメラ: ドリブル中はボール真後ろ低め（スプリント感・地面の流れが見える）
//             ジグザグ折り返しは外側に振ってダイナミズム追加
//             ロングパスは引き気味で弧全体を見せる
//   - Z軸範囲: SoccerBgのフォグ範囲（fog: 12〜40）内に収める
//              GrassFloor: Z=-30まで、AudienceSilhouette: Z=-32まで

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
  // カメラ: 低め真後ろ、スプリント感（地面の流れが見える）
  { progress: 0.00, pos: [ 0, 0.0,  0], camOffset: [0,  -0.3, 4.5], rotSpeed: 1.5 },
  // バウンス頂点1（実際のサッカーボール: 30cm程度の低いバウンス）
  { progress: 0.03, pos: [ 0, 0.4, -2], camOffset: [0,  -0.4, 4.3], rotSpeed: 1.8 },
  // 着地1
  { progress: 0.06, pos: [ 0, 0.0, -4], camOffset: [0,  -0.5, 4.2], rotSpeed: 1.5 },
  // バウンス頂点2
  { progress: 0.09, pos: [ 0, 0.4, -6], camOffset: [0,  -0.4, 4.3], rotSpeed: 1.8 },
  // 着地2（ジグザグへの助走開始点）
  { progress: 0.12, pos: [ 0, 0.0, -8], camOffset: [0,  -0.5, 4.2], rotSpeed: 1.5 },

  // ── Phase 2: ジグザグ×4（折り返しにホットスポット） ──────────────────
  // カメラ: 折り返し点は外側に大きく振って迫力を出す
  // 左折り返しへの助走（バウンスしながら斜め前進）
  { progress: 0.17, pos: [-2, 0.3,-11], camOffset: [ 0.5, -0.3, 4.5], rotSpeed: 1.6 },

  // 左折り返し（hotspot 0）─ 地面近く・速度が落ちる瞬間
  { progress: 0.22, pos: [-4, 0.0,-13], camOffset: [ 1.2,  0.0, 5.0], rotSpeed: 0.4, hotspotIndex: 0, impact: true },
  // 右へ切り返し（バウンスしながら加速）
  { progress: 0.27, pos: [-1, 0.4,-16], camOffset: [-0.3, -0.3, 4.8], rotSpeed: 1.8 },

  // 右折り返しへの助走
  { progress: 0.31, pos: [ 2, 0.0,-18], camOffset: [-0.8, -0.3, 4.5], rotSpeed: 1.6 },

  // 右折り返し（hotspot 1）
  { progress: 0.36, pos: [ 4, 0.0,-20], camOffset: [-1.2,  0.0, 5.0], rotSpeed: 0.4, hotspotIndex: 1, impact: true },
  // 左へ切り返し（バウンスしながら加速）
  { progress: 0.41, pos: [ 1, 0.4,-23], camOffset: [ 0.3, -0.3, 4.8], rotSpeed: 1.8 },

  // 左折り返しへの助走
  { progress: 0.45, pos: [-2, 0.0,-25], camOffset: [ 0.8, -0.3, 4.5], rotSpeed: 1.6 },

  // 左折り返し（hotspot 2）
  { progress: 0.50, pos: [-4, 0.0,-27], camOffset: [ 1.2,  0.0, 5.0], rotSpeed: 0.4, hotspotIndex: 2, impact: true },
  // 右へ切り返し
  { progress: 0.55, pos: [-1, 0.4,-29], camOffset: [-0.3, -0.3, 4.8], rotSpeed: 1.8 },

  // 右折り返し（hotspot 3）─ パスモーション開始直前
  { progress: 0.60, pos: [ 4, 0.0,-31], camOffset: [-1.2,  0.0, 5.0], rotSpeed: 0.4, hotspotIndex: 3, impact: true },

  // ── Phase 3: ゴール前センタリング → ロングパス放物線 ─────────────────
  // カメラ: 引き気味で放物線の弧全体を見せる
  // センター軸に戻りながら助走（蹴る体勢）
  { progress: 0.65, pos: [ 0, 0.0,-33], camOffset: [0,   0.2, 6.5], rotSpeed: 2.0 },
  // キック瞬間（impact）─ 打ち出し直後・低空で水平に出る
  { progress: 0.70, pos: [-3, 0.5,-35], camOffset: [0,   0.0, 7.5], rotSpeed: 4.5, impact: true },
  // 上昇（弧の前半 — 急な立ち上がり）
  // 制御点: CR曲線を上向きに引っ張る
  { progress: 0.77, pos: [-6, 5.0,-37], camOffset: [0,  -0.3, 8.0], rotSpeed: 4.0 },
  // 放物線頂点（Y=10程度: リアルな高さ感）
  { progress: 0.84, pos: [-9, 9.5,-39], camOffset: [0,  -0.8, 9.0], rotSpeed: 3.0 },
  // 下降（なだらか — 放物線後半・重力加速）
  { progress: 0.92, pos: [-11, 12.0,-41], camOffset: [0, -0.3, 8.5], rotSpeed: 2.5 },
  // Basketball開始点へ接続（X=-12, Y=12 近傍で終了）
  { progress: 1.00, pos: [-12, 12.0,-43], camOffset: [0,  0.5, 7.0], rotSpeed: 2.0 },
]

export const HOTSPOT_RADIUS = 0.025
