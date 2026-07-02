// src/data/trajectories/volleyball-trajectory.ts
import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface VolleyballHotspot {
  index: number
  aboutId: string     // ABOUT_POINTSのidと対応
  cardSide: 'left' | 'right'
}

export const VOLLEYBALL_HOTSPOTS: VolleyballHotspot[] = [
  { index: 0, aboutId: 'background', cardSide: 'right' },  // レシーブ位置
  { index: 1, aboutId: 'style',      cardSide: 'left'  },  // セッター位置
  { index: 2, aboutId: 'seeking',    cardSide: 'right' },  // トス頂点
]

// 250vh スクロール全体が progress 0→1
export const VOLLEYBALL_WAYPOINTS: Waypoint[] = [
  // Phase1: 上から落下→レシーブ
  { progress: 0.00, pos: [ 0,  5.0,  0], camOffset: [0,  0.5, 5.0], rotSpeed: 1.5 },
  { progress: 0.10, pos: [ 0,  2.0,  0], camOffset: [0,  0.3, 4.5], rotSpeed: 1.2 },
  { progress: 0.20, pos: [ 0, -0.5,  0], camOffset: [0, -0.2, 4.0], rotSpeed: 0.2, hotspotIndex: 0 },

  // Phase2: セッターへのパス→高いトス
  { progress: 0.35, pos: [ 1,  1.0, -1], camOffset: [ 0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.48, pos: [ 1,  3.5, -2], camOffset: [-0.5, 0.2, 4.5], rotSpeed: 0.3, hotspotIndex: 1 },
  { progress: 0.60, pos: [ 2,  5.5, -2], camOffset: [-0.5, 0.0, 5.0], rotSpeed: 0.1, hotspotIndex: 2 },

  // Phase3: スパイク急降下
  { progress: 0.70, pos: [ 2,  3.0, -3], camOffset: [0.5, 0.5, 4.0], rotSpeed: 2.5 },
  { progress: 0.85, pos: [ 3,  0.5, -4], camOffset: [0.5, 1.0, 3.5], rotSpeed: 3.5 },
  { progress: 0.95, pos: [ 3, -0.8, -4], camOffset: [0.5, 1.5, 3.0], rotSpeed: 4.0 },
  { progress: 1.00, pos: [ 3, -0.8, -4], camOffset: [0.5, 1.5, 3.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
