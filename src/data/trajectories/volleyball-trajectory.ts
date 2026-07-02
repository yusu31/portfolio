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

// バレーボール軌道：
//  落下（斜め手前から） → レシーブ（低い弾道で左へ） → セット（高い垂直トス） → スパイク（急斜め下）
export const VOLLEYBALL_WAYPOINTS: Waypoint[] = [
  // Phase1: 斜め上から落下 → レシーブ
  { progress: 0.00, pos: [  6,  14.0, -2], camOffset: [-0.5,  0.5, 5.5], rotSpeed: 2.0 },
  { progress: 0.10, pos: [  3,   6.0,  1], camOffset: [-0.3,  0.3, 5.0], rotSpeed: 1.5 },
  { progress: 0.20, pos: [  0,  -1.0,  3], camOffset: [ 0.0, -0.2, 4.5], rotSpeed: 0.2, hotspotIndex: 0 },

  // Phase2: レシーブ弾道（低い放物線）→ セッターへ → 高いトス
  { progress: 0.35, pos: [ -5,   5.0, -2], camOffset: [ 0.8,  0.4, 5.0], rotSpeed: 1.5 },
  { progress: 0.48, pos: [ -6,  11.0, -6], camOffset: [ 0.8,  0.2, 5.5], rotSpeed: 0.3, hotspotIndex: 1 },
  { progress: 0.60, pos: [ -4,  17.0, -8], camOffset: [ 0.6,  0.0, 6.0], rotSpeed: 0.1, hotspotIndex: 2 },

  // Phase3: スパイク（急斜め下 / ネット方向へ突き刺さる）
  { progress: 0.70, pos: [  2,   9.0,-14], camOffset: [-0.5,  0.6, 5.0], rotSpeed: 3.5 },
  { progress: 0.82, pos: [  6,   2.0,-20], camOffset: [-0.5,  1.2, 4.5], rotSpeed: 5.0 },
  { progress: 0.92, pos: [  7,  -2.0,-22], camOffset: [-0.5,  1.8, 4.0], rotSpeed: 6.0 },
  { progress: 1.00, pos: [  7,  -2.0,-22], camOffset: [-0.5,  1.8, 4.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
