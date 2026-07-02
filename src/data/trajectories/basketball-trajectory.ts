// src/data/trajectories/basketball-trajectory.ts
//
// 実スペックベース再設計（v3）:
//   BasketballBg.tsx 読み取り結果:
//     Backboard group: position=[0, 3.0, -9]
//     Rim (torus): position=[0, -0.4, 0.23] relative → 世界座標 [0, 2.6, -8.77]
//     Rim radius: 0.225 (torus内径), Court floor: Y=-1.2
//     FLOOR_Y clamp: -1.2 (GlobalCanvas で 0.0 → -1.2 に変更済み)
//
//   射程: Z=0（コート中央）→ Z=-8.77（リム）= 8.77ユニット≒ミドルレンジジャンパー
//   入射角計算:
//     hotspot2[0,3.2,-8.3] → rim[0,2.6,-8.77]: tangent at rim ≈ [0,-0.75,-0.30]
//     angle = atan(0.75/0.30) ≈ 68° (NBA研究値 45-55°の外縁, high-arcとして有効)
//   バスケットカム:
//     rim[0,2.6,-8.77] + camOffset[0,-2.5,0] → camera[0,0.1,-8.77]
//     camera above visual floor (Y=-1.2) ✓, pointing straight up at rim ✓

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
  // ── Phase 1: Soccer→Basketball シーン遷移（高所左外から飛来） ────────────
  { progress: 0.00, pos: [-12, 12.0,  6], camOffset: [ 0.0,  1.0, 6.0], rotSpeed: 3.0 },
  { progress: 0.08, pos: [ -5,  5.0,  2], camOffset: [-0.3,  0.5, 5.5], rotSpeed: 2.5 },
  // キャッチ（hotspot 0: frontend）— コート中央付近・腰の高さ
  { progress: 0.16, pos: [  0, -0.2,  0], camOffset: [ 0.0,  0.5, 5.5], rotSpeed: 0.2, hotspotIndex: 0 },

  // ── Phase 2: シュート → リム [0, 2.6, -8.77] ────────────────────────────
  // 溜め（腰まで引き下げ）
  { progress: 0.22, pos: [  0, -0.5,  0], camOffset: [ 2.0,  0.5, 5.0], rotSpeed: 0.3 },
  // リリース（impact）
  { progress: 0.28, pos: [  0,  0.5,  0], camOffset: [ 2.5,  0.3, 5.5], rotSpeed: 0.4, impact: true },
  // 上昇
  { progress: 0.35, pos: [1.5,  3.5, -3], camOffset: [ 3.0,  0.0, 6.0], rotSpeed: 2.0 },
  // 上昇後半
  { progress: 0.42, pos: [2.0,  6.0, -5], camOffset: [ 3.0, -0.8, 6.5], rotSpeed: 1.5 },
  // 頂点（hotspot 1: backend）
  { progress: 0.47, pos: [2.5,  7.0, -6], camOffset: [ 3.0, -1.2, 6.5], rotSpeed: 0.3, hotspotIndex: 1 },
  // 下降（カメラをボール後方へ移行→リングが視野に入り始める）
  { progress: 0.53, pos: [1.5,  5.0, -7], camOffset: [ 2.0,  0.0, 6.0], rotSpeed: 1.2 },
  // リム接近（ボール後方カメラ確立・リング見える）
  { progress: 0.58, pos: [0.5,  3.5,-8.0], camOffset: [ 1.0,  0.5, 5.5], rotSpeed: 1.8 },
  // 急降下アプローチ制御点（CR入射角≈50°確保）
  { progress: 0.63, pos: [0.0,  3.2,-8.3], camOffset: [ 0.0,  0.5, 4.5], rotSpeed: 0.5 },
  // リム手前（hotspot 2: infrastructure）— カメラ後方上→リング・バックボード見える
  { progress: 0.68, pos: [0.0,  3.0,-8.5], camOffset: [ 0.0,  1.0, 4.0], rotSpeed: 0.3, hotspotIndex: 2 },

  // ── Phase 3: リング通過 → Classic Basket Cam → 落下 ──────────────────
  // Impact: リム通過。camera = rim + [0,-2.5,0] = [0, 0.1, -8.77] → 真下から真上を見る
  { progress: 0.74, pos: [0.0,  2.6,-8.8], camOffset: [ 0.0, -2.5,  0.0], rotSpeed: 4.5, impact: true },
  // ネット抜け落下（バスケットカム継続）
  { progress: 0.82, pos: [0.0, -0.5,-8.8], camOffset: [ 0.0, -0.5,  0.0], rotSpeed: 5.0 },
  // 床到達
  { progress: 0.89, pos: [0.0, -1.0,-8.8], camOffset: [ 1.5,  2.0,  3.5], rotSpeed: 3.0 },
  // バウンド
  { progress: 0.94, pos: [0.0,  0.5,-8.8], camOffset: [ 1.5,  0.5,  4.0], rotSpeed: 2.0 },
  // 落ち着く
  { progress: 1.00, pos: [0.0, -0.8,-8.8], camOffset: [ 1.0,  0.8,  4.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
