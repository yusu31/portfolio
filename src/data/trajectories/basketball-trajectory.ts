// src/data/trajectories/basketball-trajectory.ts
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
  // Phase1: 左上から飛んでくる → キャッチ
  { progress: 0.00, pos: [-10,  10.0,  5], camOffset: [0,  0.5,  5.5], rotSpeed: 2.5 },
  { progress: 0.12, pos: [ -5,   5.0,  0], camOffset: [0,  0.3,  5.0], rotSpeed: 2.0 },
  { progress: 0.20, pos: [  0,   0.2,  0], camOffset: [0, -0.2,  4.5], rotSpeed: 0.2 },

  // Phase2: シュートモーション → 放物線 → リング付近
  { progress: 0.30, pos: [  0,   0.5,  0], camOffset: [0, -0.2, 4.5], rotSpeed: 0.3, hotspotIndex: 0 },
  { progress: 0.40, pos: [  3,   8.0, -8], camOffset: [-0.8, 0.3, 5.5], rotSpeed: 1.5 },
  { progress: 0.50, pos: [  5,  15.0,-14], camOffset: [-0.8, 0.0, 6.0], rotSpeed: 0.1, hotspotIndex: 1 },
  { progress: 0.60, pos: [  3,  12.0,-20], camOffset: [ 0.8, 0.6, 5.5], rotSpeed: 2.0 },
  { progress: 0.68, pos: [  0,   8.0,-24], camOffset: [ 0.8, 1.0, 5.0], rotSpeed: 0.2, hotspotIndex: 2 },

  // Phase3: リング通過 → 落下
  { progress: 0.78, pos: [  0,   4.0,-24], camOffset: [0, 1.2, 4.0], rotSpeed: 3.0 },
  { progress: 0.88, pos: [  0,   0.5,-24], camOffset: [0, 1.8, 4.0], rotSpeed: 3.5 },
  { progress: 1.00, pos: [  0,   0.5,-24], camOffset: [0, 1.8, 4.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
