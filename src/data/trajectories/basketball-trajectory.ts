// src/data/trajectories/basketball-trajectory.ts
//
// 実スペックベース再設計（v4）:
//   非対称構図: カメラを常に左上に寄せ、ボールが「右下」に見える ohzi.io 的レイアウト
//   → 画面左の暗闇にスキルカードが浮かぶ構図
//   → basket cam (progress 0.74) の「真下から見上げる」ショットは維持
//
//   rotSpeed 負値 = バックスピン（シュートフェーズ 0.22〜0.68）

import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface BasketballHotspot {
  index: number
  skillCategory: string
  cardSide: 'left' | 'right'
}

export const BASKETBALL_HOTSPOTS: BasketballHotspot[] = [
  { index: 0, skillCategory: 'frontend',       cardSide: 'left' },  // 暗闇の余白にカードを浮かせる
  { index: 1, skillCategory: 'backend',        cardSide: 'left' },
  { index: 2, skillCategory: 'infrastructure', cardSide: 'left' },
]

export const BASKETBALL_WAYPOINTS: Waypoint[] = [
  // ── Phase 1: Soccer→Basketball シーン遷移（高所左外から飛来） ────────────
  { progress: 0.00, pos: [-12, 12.0,  6], camOffset: [ 2.5,  0.5, 5.5], rotSpeed: 3.0 },
  { progress: 0.08, pos: [ -5,  5.0,  2], camOffset: [ 0.5,  0.3, 5.5], rotSpeed: 2.5 },
  // キャッチ（hotspot 0: frontend）─ 非対称構図 v2: X を1.7倍に拡大 (-4.5 → -7.5)
  { progress: 0.16, pos: [  0, -0.2,  0], camOffset: [-7.5,  2.8, 5.0], rotSpeed: 0.2, hotspotIndex: 0 },

  // ── Phase 2: シュート → リム [0, 2.6, -8.77] ────────────────────────────
  // rotSpeed 負値 = バックスピン
  { progress: 0.22, pos: [  0, -0.5,  0], camOffset: [-4.0,  1.5, 5.0], rotSpeed: -0.5 },
  { progress: 0.28, pos: [  0,  0.5,  0], camOffset: [-3.5,  1.2, 5.5], rotSpeed: -3.5, impact: true },
  { progress: 0.35, pos: [1.5,  3.5, -3], camOffset: [-3.5,  0.0, 6.0], rotSpeed: -4.0 },
  { progress: 0.42, pos: [2.0,  6.0, -5], camOffset: [-2.5, -0.5, 6.5], rotSpeed: -3.5 },
  // 頂点（hotspot 1: backend）─ 非対称 v2: -3.5 → -6.0
  { progress: 0.47, pos: [2.5,  7.0, -6], camOffset: [-6.0,  0.8, 6.5], rotSpeed: -2.5, hotspotIndex: 1 },
  { progress: 0.53, pos: [1.5,  5.0, -7], camOffset: [-3.5,  0.0, 6.0], rotSpeed: -3.5 },
  { progress: 0.58, pos: [0.5,  3.5,-8.0], camOffset: [-1.8,  0.5, 5.5], rotSpeed: -4.0 },
  { progress: 0.63, pos: [0.0,  3.2,-8.3], camOffset: [ 0.0,  0.5, 4.5], rotSpeed: -4.5 },
  // リム手前（hotspot 2: infrastructure）─ 非対称 v2: -2.5 → -4.5
  { progress: 0.68, pos: [0.0,  3.0,-8.5], camOffset: [-4.5,  1.8, 4.5], rotSpeed: -4.0, hotspotIndex: 2 },

  // ── Phase 3: リング通過 → Classic Basket Cam → 落下 ──────────────────
  // Impact: camera = rim + [0,-2.5,0] = [0, 0.1, -8.77] → 真下から真上を見る
  { progress: 0.74, pos: [0.0,  2.6,-8.8], camOffset: [ 0.0, -2.5,  0.0], rotSpeed: 4.5, impact: true },
  { progress: 0.82, pos: [0.0, -0.5,-8.8], camOffset: [ 0.0, -0.5,  0.0], rotSpeed: 5.0 },
  { progress: 0.89, pos: [0.0, -1.0,-8.8], camOffset: [-2.0,  2.5,  4.0], rotSpeed: 3.0 },
  { progress: 0.94, pos: [0.0,  0.5,-8.8], camOffset: [-1.5,  1.0,  4.5], rotSpeed: 2.0 },
  { progress: 1.00, pos: [0.0, -0.8,-8.8], camOffset: [-1.5,  1.5,  5.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
