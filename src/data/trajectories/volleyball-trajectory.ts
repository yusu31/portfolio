// src/data/trajectories/volleyball-trajectory.ts
//
// コート座標系（VolleyballBg.tsxに対応）:
//   床  Y = -1.2
//   ネット上辺 Y = 1.0, Z = -3.0（幅 X: -4〜4）
//   自コート後方 Z = +5、ネット Z = -3、相手コート後方 Z = -9
//   1ユニット ≈ 1.1m（ネット上辺2.2ユニット ≈ 2.43m）
//
// 動作座標:
//   選手立ち位置（後衛）: Z = +3, Y = -1.2（床）
//   選手頭上:             Y = 1.5〜2.0
//   セッター位置:         X = -2, Z = -1, Y = -1.2
//   スパイク打点:         Z = -3.5, Y = 3.0〜4.0（ネット上辺+2〜3ユニット）
//   相手コート落下点:     Z = -5〜-7, Y = -1.2
//
// 設計原則:
//   - 全フェーズで放物線弧を中間ウェイポイントで表現（直線補間を弧に見せる）
//   - impact: true のウェイポイントでShockwaveエフェクト発火
//   - hotspotスキップ方式: hotspotIndex or impact のないウェイポイントは通過点のみ

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
  // ── Phase 0: 相手アタック（相手コート後方から飛んでくる） ─────────────
  // 高い位置から放物線でネット越え → 自コートに落下
  // カメラ: サイドライン高所（コート全体俯瞰）
  { progress: 0.00, pos: [ 2,  4.0, -7], camOffset: [ 5.0,  3.0,  6.0], rotSpeed: 2.5 },
  // 通過点: ネット越え直後（放物線の中間）
  { progress: 0.06, pos: [ 1,  1.5, -2], camOffset: [ 4.0,  2.0,  5.5], rotSpeed: 2.0 },

  // ── レシーブ（ディグ） ─ hotspot 0 ───────────────────────────────────
  // 自コート後方で低い姿勢で受ける（床Y=-1.2から約0.5ユニット上）
  // カメラ: 低め横から（選手目線に近い）
  { progress: 0.12, pos: [ 0, -0.7,  3], camOffset: [ 3.5,  0.5,  4.5], rotSpeed: 0.3,
    hotspotIndex: 0, impact: true },

  // ── Phase 1: ディグ後 → セッターへ低い放物線 ──────────────────────────
  // 腕の台（プラットフォーム）で斜め上に弾く → 選手の頭上を越えてセッターへ
  // 放物線頂点: 選手頭上（Y ≈ 2.0）
  { progress: 0.21, pos: [-1,  2.0,  1], camOffset: [ 2.5,  0.5,  5.0], rotSpeed: 1.2 },
  // セッター位置に着地（アタックラインZ=-1付近）─ hotspot 1
  // カメラ: 斜め横（コートを広く見せる）
  { progress: 0.30, pos: [-2, -0.5, -1], camOffset: [ 3.0,  1.5,  5.5], rotSpeed: 0.3,
    hotspotIndex: 1, impact: true },

  // ── Phase 2: セット（高い放物線トス） ────────────────────────────────
  // セッターが両手でトス → ネット際のアタッカーへ
  // 上昇中（ほぼ垂直に高く上がる）
  { progress: 0.38, pos: [-2,  3.0, -2], camOffset: [ 2.0, -0.5,  5.5], rotSpeed: 0.6 },
  // トス頂点（ネット上辺Y=1の約4ユニット上 → Y=5）─ hotspot 2 ─ 無重力感
  // カメラ: 真下から見上げ（ボールの高さを強調）
  { progress: 0.46, pos: [-1,  5.0, -3], camOffset: [ 1.5, -3.0,  5.0], rotSpeed: 0.1,
    hotspotIndex: 2 },
  // 下降: アタッカーの手元へ（ネット際・高い打点）
  { progress: 0.54, pos: [ 2,  3.5, -3], camOffset: [-1.0, -0.5,  5.0], rotSpeed: 0.8 },

  // ── Phase 3: スパイク ─ impact ────────────────────────────────────────
  // ジャンプ最高点でインパクト（ネット上辺+2.5ユニット ≈ Y=3.5）
  // カメラ: ネット後方横（スパイクの打ち下ろしが見える）
  { progress: 0.62, pos: [ 3,  3.5, -3], camOffset: [-2.0,  1.0,  4.0], rotSpeed: 5.0,
    impact: true },

  // ── Phase 4: スパイク急降下（ぎゅーーーん） ──────────────────────────
  // トップスピンのMagnus効果で相手コートへ急落下
  // カメラ: トップダウンに切り替え → 落下点がコートに刺さるのを見下ろす
  // ネット越え直後（Y急下降開始）
  { progress: 0.71, pos: [ 4,  1.2, -5], camOffset: [ 0.0,  7.0,  2.0], rotSpeed: 6.5 },
  // 相手コート落下中（Magnus効果で一気に落ちる）
  { progress: 0.82, pos: [ 4, -0.5, -7], camOffset: [ 0.0,  6.0,  1.5], rotSpeed: 8.0 },
  // 床着地（impact: floor Y=-1.2）
  { progress: 0.91, pos: [ 4, -1.2, -7], camOffset: [ 0.0,  5.0,  1.5], rotSpeed: 9.0,
    impact: true },
  // 終点
  { progress: 1.00, pos: [ 4, -1.2, -7], camOffset: [ 0.0,  5.0,  1.5], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
