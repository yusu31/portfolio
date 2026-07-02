// src/data/trajectories/volleyball-trajectory.ts
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
  // Phase1: 上から落下 → レシーブ
  { progress: 0.00, pos: [ 0,  12.0,  0], camOffset: [0,  0.5, 5.5], rotSpeed: 2.0 },
  { progress: 0.10, pos: [ 0,   5.0,  0], camOffset: [0,  0.3, 5.0], rotSpeed: 1.5 },
  { progress: 0.20, pos: [ 0,  -1.0,  0], camOffset: [0, -0.2, 4.5], rotSpeed: 0.2, hotspotIndex: 0 },

  // Phase2: セッターへのパス → 高いトス
  { progress: 0.35, pos: [ 3,   3.0, -5], camOffset: [ 0.8, 0.4, 5.0], rotSpeed: 1.5 },
  { progress: 0.48, pos: [ 4,   9.0, -8], camOffset: [-0.8, 0.3, 5.5], rotSpeed: 0.3, hotspotIndex: 1 },
  { progress: 0.60, pos: [ 5,  14.0, -8], camOffset: [-0.8, 0.0, 6.0], rotSpeed: 0.1, hotspotIndex: 2 },

  // Phase3: スパイク急降下
  { progress: 0.70, pos: [ 8,   7.0,-12], camOffset: [0.8, 0.6, 5.0], rotSpeed: 3.0 },
  { progress: 0.85, pos: [10,   1.0,-16], camOffset: [0.8, 1.2, 4.5], rotSpeed: 4.0 },
  { progress: 0.95, pos: [10,  -2.0,-16], camOffset: [0.8, 1.8, 4.0], rotSpeed: 5.0 },
  { progress: 1.00, pos: [10,  -2.0,-16], camOffset: [0.8, 1.8, 4.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
