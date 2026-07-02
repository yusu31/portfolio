// src/data/trajectories/soccer-trajectory.ts
import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface SoccerHotspot {
  index: number
  categoryId: string   // PROJECT_CATEGORIESのidと対応
  cardSide: 'left' | 'right'
}

export const SOCCER_HOTSPOTS: SoccerHotspot[] = [
  { index: 0, categoryId: 'webapp',   cardSide: 'right' },
  { index: 1, categoryId: 'game',     cardSide: 'left'  },
  { index: 2, categoryId: 'website',  cardSide: 'right' },
  { index: 3, categoryId: 'tool',     cardSide: 'left'  },
]

// 300vh スクロール全体が progress 0→1
export const SOCCER_WAYPOINTS: Waypoint[] = [
  // Phase1: ドリブル開始
  { progress: 0.00, pos: [0,  0.0,  0],  camOffset: [0,    0.3,  4.5], rotSpeed: 1.0 },
  { progress: 0.08, pos: [0,  0.0, -2],  camOffset: [0,   -0.1,  4.0], rotSpeed: 1.2 },

  // Phase2: ジグザグ×4（各折り返しにホットスポット）
  { progress: 0.18, pos: [-2.5, 0.1, -4],  camOffset: [ 0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 0 },
  { progress: 0.26, pos: [-2.5, 0.0, -5],  camOffset: [ 0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.32, pos: [ 2.5, 0.1, -7],  camOffset: [-0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 1 },
  { progress: 0.40, pos: [ 2.5, 0.0, -8],  camOffset: [-0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.48, pos: [-2.5, 0.1, -10], camOffset: [ 0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 2 },
  { progress: 0.56, pos: [-2.5, 0.0, -11], camOffset: [ 0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.62, pos: [ 2.5, 0.1, -13], camOffset: [-0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 3 },
  { progress: 0.70, pos: [ 2.5, 0.0, -14], camOffset: [-0.5, 0.3, 4.0], rotSpeed: 1.0 },

  // Phase3: ゴール前→ロングパス
  { progress: 0.80, pos: [0,   0.0, -16], camOffset: [0, 0.8, 6.0], rotSpeed: 1.5 },
  { progress: 0.90, pos: [0,   0.3, -17], camOffset: [0, 0.6, 5.0], rotSpeed: 2.0 },
  { progress: 1.00, pos: [8,   5.0, -22], camOffset: [0, 0.5, 7.0], rotSpeed: 3.0 },
]

export const HOTSPOT_RADIUS = 0.025
