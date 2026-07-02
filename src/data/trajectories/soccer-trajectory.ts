// src/data/trajectories/soccer-trajectory.ts
//
// 実スペックベース再設計（v3）:
//   SoccerBg.tsx 読み取り結果:
//     GrassFloor: position=[0,-1.2,-10], size=[30,40] → Z: +10〜-30, X: ±15
//     GoalFrame: position=[0,-0.2,-20]
//       左ポスト  [-3.66, 1.02, -20], 右ポスト [3.66, 1.02, -20]
//       クロスバー [0, 2.24, -20]  高さ 2.24ユニット = 2.44m (FIFA規格)
//     1ユニット ≈ 1m（クロスバー幅 7.32ユニット = FIFA規格 7.32m）
//     フィールド中央 Z=-10, ペナルティエリア端 Z≈-3.5 (16.5m from goal)
//     観客シルエット: Z=-28〜-32
//
//   軌道設計:
//     - 開始: Z=+6（自陣ゴール付近 = ゴールから26m地点）
//     - ドリブル: Z=+6→Z=-4 (10m, 自陣→中盤)
//     - ジグザグ×4: Z=-5〜-14 (中盤〜アタッキングサード)
//     - キック: Z=-15〜-16（ペナルティエリア内、ゴールから5m）
//     - 放物線: ゴール(Z=-20)を越えフィールド外へ飛ぶ
//
//   カメラ方針:
//     - ドリブル: 「若干斜め上」= camOffset Y=+0.8 で前方も見える
//     - キック: 「進行方向を見る」= ボール後方から前方を向く (camOffset Z=+5〜6)
//     - 放物線: サイドビューで弧の形状を見せる（弦を後方から見ると弧が見えない）

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
  // ── Phase 1: 自陣からドリブル開始（ゴールから26m地点）────────────────
  // カメラ: 「若干斜め上」= 前方のフィールドが見える (Y=+0.8 = slightly above ball)
  { progress: 0.00, pos: [ 0, 0.0, +6], camOffset: [0,  0.8, 4.0], rotSpeed: 1.5 },
  // バウンス頂点1
  { progress: 0.03, pos: [ 0, 0.4, +4], camOffset: [0,  0.8, 4.0], rotSpeed: 1.8 },
  // 着地1
  { progress: 0.06, pos: [ 0, 0.0, +2], camOffset: [0,  0.8, 4.0], rotSpeed: 1.5 },
  // バウンス頂点2（中盤越え）
  { progress: 0.09, pos: [ 0, 0.4, -0], camOffset: [0,  0.8, 4.2], rotSpeed: 1.8 },
  // 着地2
  { progress: 0.12, pos: [ 0, 0.0, -2], camOffset: [0,  0.8, 4.0], rotSpeed: 1.5 },
  // バウンス頂点3
  { progress: 0.15, pos: [ 0, 0.4, -4], camOffset: [0,  0.8, 4.2], rotSpeed: 1.8 },
  // 着地3（ジグザグ開始地点）
  { progress: 0.18, pos: [ 0, 0.0, -5], camOffset: [0,  0.8, 4.0], rotSpeed: 1.5 },

  // ── Phase 2: ジグザグ×4（中盤〜アタッキングサード） ───────────────────
  // カメラ: 折り返しの外側に振ってダイナミクス + 前方視野を維持

  // 左への助走
  { progress: 0.22, pos: [-2, 0.3, -7], camOffset: [ 0.5, 0.8, 4.5], rotSpeed: 1.6 },
  // 左折り返し（hotspot 0）─ ゴールから13m地点
  { progress: 0.27, pos: [-4, 0.0, -9], camOffset: [ 1.2, 0.8, 5.0], rotSpeed: 0.4,
    hotspotIndex: 0, impact: true },
  // 右へ切り返し
  { progress: 0.31, pos: [-1, 0.3,-10], camOffset: [-0.3, 0.8, 4.8], rotSpeed: 1.8 },

  // 右への助走
  { progress: 0.35, pos: [ 2, 0.0,-11], camOffset: [-0.8, 0.8, 4.5], rotSpeed: 1.6 },
  // 右折り返し（hotspot 1）─ フィールド中央付近
  { progress: 0.40, pos: [ 4, 0.0,-12], camOffset: [-1.2, 0.8, 5.0], rotSpeed: 0.4,
    hotspotIndex: 1, impact: true },
  // 左へ切り返し
  { progress: 0.44, pos: [ 1, 0.3,-13], camOffset: [ 0.3, 0.8, 4.8], rotSpeed: 1.8 },

  // 左への助走
  { progress: 0.47, pos: [-2, 0.0,-13], camOffset: [ 0.8, 0.8, 4.5], rotSpeed: 1.6 },
  // 左折り返し（hotspot 2）─ アタッキングサード
  { progress: 0.52, pos: [-4, 0.0,-14], camOffset: [ 1.2, 0.8, 5.0], rotSpeed: 0.4,
    hotspotIndex: 2, impact: true },
  // 右へ切り返し
  { progress: 0.55, pos: [-1, 0.3,-14], camOffset: [-0.3, 0.8, 4.8], rotSpeed: 1.8 },

  // 右折り返し（hotspot 3）─ ペナルティエリア内
  { progress: 0.60, pos: [ 3, 0.0,-15], camOffset: [-1.2, 0.8, 5.0], rotSpeed: 0.4,
    hotspotIndex: 3, impact: true },

  // ── Phase 3: ゴール前ロングボール放出 ────────────────────────────────
  // カメラ: 「進行方向を見る」= ボール後方(Z+) からゴール方向(-Z)を向く
  // ゴールへ走り込み（wind-up）
  { progress: 0.64, pos: [ 0, 0.0,-16], camOffset: [0,  0.5, 5.5], rotSpeed: 2.0 },
  // キック（impact）─ ゴールから4m・ペナルティエリア内
  // 「進行方向を見る」= camOffset Z=+5.5 でボール後方 → ゴール方向が視野正面に来る
  { progress: 0.70, pos: [-1, 0.5,-17], camOffset: [0,  0.5, 5.5], rotSpeed: 4.5, impact: true },

  // ── Phase 4: ロングパス放物線（ゴール(Z=-20)を越えてフィールド外へ） ──
  // カメラ: サイドビューで弧の形状を見せる
  // 上昇（ゴール(Z=-20)をクロスバー(Y=2.24)越えで通過）
  { progress: 0.77, pos: [-4, 5.0,-21], camOffset: [2.5,  0.0, 5.5], rotSpeed: 4.0 },
  // 頂点（フィールド外, ゴールの奥）
  { progress: 0.84, pos: [-7, 9.0,-24], camOffset: [3.5, -0.5, 6.0], rotSpeed: 3.0 },
  // 下降（観客エリア上空, Basketballへの橋渡し）
  { progress: 0.92, pos: [-10, 11.0,-28], camOffset: [3.0, -0.5, 5.5], rotSpeed: 2.5 },
  // 終点（フィールド外）
  { progress: 1.00, pos: [-12, 12.0,-32], camOffset: [2.5,  0.5, 5.5], rotSpeed: 2.0 },
]

export const HOTSPOT_RADIUS = 0.025
