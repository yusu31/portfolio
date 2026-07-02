// src/data/trajectories/basketball-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - 飛んでくる弧: Soccer最終フェーズの続き（斜め左上から右下へ）
//   - シュート放物線: 打ち出し角45〜51度 / 頂点はリング(Y≈8.5)の約1.8倍（Y≈15.5）
//   - 入射角: 下降後半でY値を高く維持し最終区間で急落下 → ≈45〜63度（研究値範囲内）
//   - カメラ: 上昇中はサイドビューで弧全体を見せる
//             下降中はボール後方へ移行してリングを視野に収める
//             リング通過: リング真下から真上を見るバスケットカム（Classic basket cam）
//
// 改善履歴:
//   - v2: 入射角修正（12.5°→≈45〜63°）: 下降ウェイポイントのY値を引き上げ
//         下降カメラをサイドビューからボール後方（リングが視野に入る）に変更
//         バスケットカム修正: camOffset[0,-4,-4.5]（リング後方）→[0,-6,0]（リング真下）
//         新ウェイポイント追加（0.59）: 急落下アプローチの制御点

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
  { progress: 0.00, pos: [-12, 12.0,  6], camOffset: [ 0.0,  0.8, 6.0], rotSpeed: 3.0 },
  { progress: 0.08, pos: [ -6,  5.5,  2], camOffset: [-0.3,  0.4, 5.5], rotSpeed: 2.5 },
  // キャッチ（hotspot 0）
  { progress: 0.16, pos: [  0,  0.2,  0], camOffset: [ 0.0, -0.2, 5.5], rotSpeed: 0.2, hotspotIndex: 0 },

  // ── Phase 2: シュートモーション（45〜51度放物線） ──────────────────────
  // 上昇中: サイドビューで弧全体を見せる
  { progress: 0.22, pos: [  0, -0.8,  0], camOffset: [ 1.5,  0.5, 5.5], rotSpeed: 0.3 },
  // リリース瞬間（impact）
  { progress: 0.28, pos: [  0,  1.5,  0], camOffset: [ 3.0,  0.3, 6.0], rotSpeed: 0.4, impact: true },
  // 上昇前半
  { progress: 0.34, pos: [  2,  7.0, -7], camOffset: [ 3.5,  0.0, 6.5], rotSpeed: 2.0 },
  // 上昇後半
  { progress: 0.40, pos: [  4, 13.0,-12], camOffset: [ 3.5, -0.8, 7.0], rotSpeed: 1.5 },
  // 頂点（hotspot 1）
  { progress: 0.45, pos: [  5, 15.5,-15], camOffset: [ 3.5, -1.8, 7.0], rotSpeed: 0.3, hotspotIndex: 1 },
  // 下降前半: Y値を高く維持 → ボール後方カメラでリングが視野に入り始める
  { progress: 0.51, pos: [  3, 12.5,-19], camOffset: [ 1.5,  0.5, 6.0], rotSpeed: 1.2 },
  // 下降後半: まだ高い位置（Y=12）→ ボール後方カメラ確立・リング見える
  { progress: 0.56, pos: [  1, 12.0,-21], camOffset: [ 0.5,  1.0, 6.5], rotSpeed: 1.8 },
  // 急落下アプローチ（入射角≈63度確保のための制御点）
  { progress: 0.59, pos: [  0, 10.5,-23], camOffset: [ 0.0,  1.5, 5.5], rotSpeed: 2.5 },
  // リング（hotspot 2）─ ボール真後ろ下方からリングが上方に見える
  { progress: 0.61, pos: [  0,  8.5,-24], camOffset: [ 0.0, -3.0, 4.0], rotSpeed: 0.3, hotspotIndex: 2 },

  // ── Phase 3: リング通過 → バスケットカム → 落下 ──────────────────────
  // バスケットカム（Classic basket cam: リング真下から真上を見る）
  // 旧: camOffset[0,-4,-4.5] = リング後方Z=-28.5から見ていた（誤り）
  // 新: camOffset[0,-6,0]   = リング真下Y=-0.5から真上を見る（正しい）
  { progress: 0.67, pos: [  0,  5.5,-24], camOffset: [ 0.0, -6.0,  0.0], rotSpeed: 4.5, impact: true },
  // ネット抜け落下（バスケットカム継続・ボールが上から降ってくる）
  { progress: 0.76, pos: [  0,  1.5,-24], camOffset: [ 0.0, -3.0,  0.0], rotSpeed: 5.0 },
  // 着地直前
  { progress: 0.84, pos: [  0,  0.2,-24], camOffset: [ 1.5, -0.5, -2.5], rotSpeed: 3.0 },
  // バウンド
  { progress: 0.91, pos: [  0,  2.2,-24], camOffset: [ 1.5,  0.0, -2.0], rotSpeed: 2.0 },
  // 終点
  { progress: 1.00, pos: [  0,  0.4,-24], camOffset: [ 1.0,  0.8,  4.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
