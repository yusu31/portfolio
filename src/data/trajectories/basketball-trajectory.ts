// src/data/trajectories/basketball-trajectory.ts
//
// 設計原則（スーパープレイ集 + 物理リサーチ）:
//   - 飛んでくる弧: Soccer最終フェーズの続き（斜め左上から右下へ）
//   - シュート放物線: 打ち出し角45〜51度 / 頂点はリング(Y≈8.5)の約1.8倍（Y≈15.5）
//   - バックスピン(Magnus): 弧の頂点からリングへの落下が急になる
//   - カメラ: シュート中は横から弧全体を見せる
//             リング通過: バスケット後方から見上げるダンカム視点（Y-4.0で強調）
//
// 改善履歴:
//   - 頂点Y=20→Y=15.5: リングY≈8.5の1.8倍で物理リサーチに基づく自然なアーク
//   - 上昇〜頂点〜リング間に中間ウェイポイントを追加してCR曲線を滑らか化
//   - rotSpeedをシュート動作のリズムに再設計
//     （溜め低速→リリースで激増→空中バックスピン中速→ダンカム激増→バウンド減衰）
//   - ダンカムcamOffset Y=-4.0で強い見上げ感
//   - バウンド・終点のカメラをボール前方に戻し落ち着きを表現

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
  // カメラ: 斜め前方から迫ってくるボールを捉える（ボール前方やや上）
  { progress: 0.00, pos: [-12, 12.0,  6], camOffset: [ 0.0,  0.8, 6.0], rotSpeed: 3.0 },
  // 落下中（放物線下降・スピード感）
  { progress: 0.08, pos: [ -6,  5.5,  2], camOffset: [-0.3,  0.4, 5.5], rotSpeed: 2.5 },
  // キャッチ（hotspot 0）─ 静止・決断の瞬間・カメラ引きで全体像
  { progress: 0.16, pos: [  0,  0.2,  0], camOffset: [ 0.0, -0.2, 5.5], rotSpeed: 0.2, hotspotIndex: 0 },

  // ── Phase 2: シュートモーション（45〜51度放物線） ──────────────────────
  // カメラ: 横から弧全体を捉える（サイドライン高所視点）
  // 溜め（ボールを腰まで引き下ろす — トリプルスレット→ジャンプシュート準備）
  { progress: 0.22, pos: [  0, -0.8,  0], camOffset: [ 1.5,  0.5, 5.5], rotSpeed: 0.3 },
  // ジャンプ開始・リリース瞬間（impact: 打ち出しの衝撃）
  { progress: 0.28, pos: [  0,  1.5,  0], camOffset: [ 3.0,  0.3, 6.0], rotSpeed: 0.4, impact: true },
  // 上昇前半（強い打ち出し角でZ軸奥へ飛ぶ）
  { progress: 0.34, pos: [  2,  7.0, -7], camOffset: [ 3.5,  0.0, 6.5], rotSpeed: 2.0 },
  // 上昇後半〜頂点直前（バックスピンで浮遊感）
  { progress: 0.40, pos: [  4, 13.0,-12], camOffset: [ 3.5, -0.8, 7.0], rotSpeed: 1.5 },
  // 頂点（リングY≈8.5の約1.8倍・ドラマチックだが物理的に自然）─ hotspot 1
  { progress: 0.45, pos: [  5, 15.5,-15], camOffset: [ 3.5, -1.8, 7.0], rotSpeed: 0.3, hotspotIndex: 1 },
  // 下降前半（重力加速・弧の後半）
  { progress: 0.51, pos: [  3, 10.5,-19], camOffset: [ 2.5, -0.5, 6.5], rotSpeed: 1.2 },
  // 下降後半（リムへ向かう急落下）
  { progress: 0.56, pos: [  1,  9.0,-22], camOffset: [ 1.8,  0.2, 5.5], rotSpeed: 1.8 },
  // リング手前（入射角45度で落下中）─ hotspot 2
  { progress: 0.61, pos: [  0,  8.5,-24], camOffset: [ 1.5,  0.5, 5.0], rotSpeed: 0.3, hotspotIndex: 2 },

  // ── Phase 3: リング通過 → ダンカム視点 → 落下 ──────────────────────────
  // カメラ: バスケット後方から強く見上げる（ネットが揺れる瞬間を演出）
  // リング通過（衝撃: リムにボールが当たり抜ける瞬間）
  { progress: 0.67, pos: [  0,  5.5,-24], camOffset: [ 0.0, -4.0, -4.5], rotSpeed: 4.5, impact: true },
  // ネット抜け落下（急加速・ダンカム継続）
  { progress: 0.76, pos: [  0,  1.5,-24], camOffset: [ 0.0, -2.5, -4.0], rotSpeed: 5.0 },
  // 着地直前（カメラが低い位置でバウンドを待つ）
  { progress: 0.84, pos: [  0,  0.2,-24], camOffset: [ 1.5, -0.5, -2.5], rotSpeed: 3.0 },
  // バウンド（反発係数0.85: 着地高さの約85%に跳ね返る）
  { progress: 0.91, pos: [  0,  2.2,-24], camOffset: [ 1.5,  0.0, -2.0], rotSpeed: 2.0 },
  // 終点（ボールが落ち着く・カメラが前方に回り込む）
  { progress: 1.00, pos: [  0,  0.4,-24], camOffset: [ 1.0,  0.8,  4.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
