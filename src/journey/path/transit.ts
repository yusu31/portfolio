// transit区間(ヴェニュー間の道)の座標定義。Phase 5-2では骨格(プレースホルダー地面)のみ。
// 並木/観客席/雲などの装飾はPhase 6-4で追加する(この単一ソースにアンカーをぶら下げる想定)。
export interface TransitSpan {
  /** 区間中心のz座標 */
  centerZ: number
  /** 区間のz方向の長さ */
  length: number
}

export const TRANSIT_SPANS = {
  // Projects(サッカー) → Skills(バスケ): ロングパスの飛距離に相当する区間(Phase 5-3で使用)
  transit1: { centerZ: -48, length: 33 },
  // Skills(バスケ) → About(バレー): リングを通過したボールが落下する区間
  transit2: { centerZ: -96, length: 34 },
  // About(バレー) → Contact: レシーブ〜アタック〜ゴールまでの最終区間(旅の締め括り)
  transit3: { centerZ: -154, length: 50 },
} as const satisfies Record<string, TransitSpan>
