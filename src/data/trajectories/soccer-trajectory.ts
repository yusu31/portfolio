// src/data/trajectories/soccer-trajectory.ts
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
  // Phase1: ドリブル開始
  { progress: 0.00, pos: [ 0,   0.0,   0], camOffset: [0,    0.3,  5.0], rotSpeed: 1.0 },
  { progress: 0.08, pos: [ 0,   0.0,  -6], camOffset: [0,   -0.1,  4.5], rotSpeed: 1.5 },

  // Phase2: ジグザグ×4（各折り返しにホットスポット）
  { progress: 0.18, pos: [-6,   0.2, -12], camOffset: [ 1.0, 0.4, 5.0], rotSpeed: 0.3, hotspotIndex: 0 },
  { progress: 0.26, pos: [-6,   0.0, -15], camOffset: [ 0.8, 0.3, 5.0], rotSpeed: 1.5 },
  { progress: 0.32, pos: [ 6,   0.2, -21], camOffset: [-1.0, 0.4, 5.0], rotSpeed: 0.3, hotspotIndex: 1 },
  { progress: 0.40, pos: [ 6,   0.0, -24], camOffset: [-0.8, 0.3, 5.0], rotSpeed: 1.5 },
  { progress: 0.48, pos: [-6,   0.2, -30], camOffset: [ 1.0, 0.4, 5.0], rotSpeed: 0.3, hotspotIndex: 2 },
  { progress: 0.56, pos: [-6,   0.0, -33], camOffset: [ 0.8, 0.3, 5.0], rotSpeed: 1.5 },
  { progress: 0.62, pos: [ 6,   0.2, -39], camOffset: [-1.0, 0.4, 5.0], rotSpeed: 0.3, hotspotIndex: 3 },
  { progress: 0.70, pos: [ 6,   0.0, -42], camOffset: [-0.8, 0.3, 5.0], rotSpeed: 1.5 },

  // Phase3: ゴール前→ロングパス
  { progress: 0.80, pos: [ 0,   0.0, -50], camOffset: [0,  0.8, 6.5], rotSpeed: 2.0 },
  { progress: 0.90, pos: [ 0,   1.0, -55], camOffset: [0,  0.6, 5.5], rotSpeed: 2.5 },
  { progress: 1.00, pos: [18,  10.0, -65], camOffset: [0,  0.5, 7.0], rotSpeed: 4.0 },
]

export const HOTSPOT_RADIUS = 0.025
