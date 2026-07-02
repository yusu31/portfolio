// src/data/trajectories/basketball-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - 飛んでくる弧: Soccer最終フェーズの続き（斜め左上から右下へ）
//   - シュート放物線: 打ち出し角45度 / 頂点はリング(Y≈8)より2〜3ユニット高い
//   - バックスピン(Magnus): 弧の頂点からリングへの落下が急になる
//   - カメラ: シュート中は横から弧全体を見せる
//             リング通過: バスケット後方から見上げるダンカム視点

import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface BasketballHotspot {
  index: number
  skillCategory: string
  cardSide: 'left' | 'right'
}

export const BASKETBALL_HOTSPOTS: BasketballHotspot[] = [
  { index: 0, skillCategory: 'frontend',       cardSide: 'right' },
  { index: 1, skillCategory: 'backend',        cardSide: 'left'  },
  { index: 2, skillCategory: 'infrastructure', cardSide: 'right' },
]

export const BASKETBALL_WAYPOINTS: Waypoint[] = [
  // ── Phase 1: Soccerの弧の続きで左上から飛んでくる ────────────────────
  // カメラ: 斜め前方から迫ってくるボールを捉える
  { progress: 0.00, pos: [-12, 12.0,  6], camOffset: [ 0.0,  0.8, 6.0], rotSpeed: 3.0 },
  // 落下中（放物線下降）
  { progress: 0.08, pos: [ -6,  5.5,  2], camOffset: [-0.3,  0.4, 5.5], rotSpeed: 2.5 },
  // キャッチ（hotspot 0）─ 静止・決断の瞬間
  { progress: 0.16, pos: [  0,  0.2,  0], camOffset: [ 0.0, -0.2, 5.0], rotSpeed: 0.2, hotspotIndex: 0 },

  // ── Phase 2: シュートモーション（45度放物線） ──────────────────────────
  // カメラ: 横から弧全体を捉える（サイドライン高所視点）
  // 溜め（ボールを腰まで引き下ろす — トリプルスレット→ジャンプシュート）
  { progress: 0.22, pos: [  0, -1.2,  0], camOffset: [ 1.5,  0.3, 5.0], rotSpeed: 0.3 },
  // ジャンプ開始・打ち出し体制
  { progress: 0.28, pos: [  0,  1.5,  0], camOffset: [ 3.0,  0.4, 6.0], rotSpeed: 0.4 },
  // 上昇（45度で力強く打ち出す）
  { progress: 0.37, pos: [  3, 10.0, -8], camOffset: [ 3.5, -0.2, 6.5], rotSpeed: 1.5 },
  // 頂点（リングより高い位置・バックスピンの浮力）─ hotspot 1
  { progress: 0.42, pos: [  5, 20.0,-14], camOffset: [ 3.5, -1.5, 7.0], rotSpeed: 0.2, hotspotIndex: 1 },
  // 下降（弧の後半・重力加速）
  { progress: 0.51, pos: [  3, 11.0,-20], camOffset: [ 2.5, -0.5, 6.0], rotSpeed: 1.0 },
  // リング手前 ─ hotspot 2
  { progress: 0.58, pos: [  0,  8.5,-24], camOffset: [ 1.5,  0.5, 5.5], rotSpeed: 0.3, hotspotIndex: 2 },

  // ── Phase 3: リング通過 → ダンカム視点 → 落下 ──────────────────────────
  // カメラ: バスケット後方下方からリング通過を見上げる（ダンカム）
  // リング通過（リングの向こう側へ）
  { progress: 0.66, pos: [  0,  5.5,-24], camOffset: [ 0.0, -2.5, -4.0], rotSpeed: 3.0 },
  // ネット抜け落下（急加速）
  { progress: 0.78, pos: [  0,  1.5,-24], camOffset: [ 0.0, -1.5, -3.5], rotSpeed: 4.0 },
  // バウンド
  { progress: 0.88, pos: [  0,  3.0,-24], camOffset: [ 0.0, -0.5, -3.0], rotSpeed: 2.0 },
  // 終点
  { progress: 1.00, pos: [  0,  0.5,-24], camOffset: [ 0.0,  0.5,  4.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
