// セクション定義: スクロールoffset(0〜1)が唯一の真実の状態で、カード表示はここから導出する。
// offsetは弧長ベース(getPointAt)なので境界値は「経路上の距離の割合」。
// Phase 5-5(世界の3倍化)で再導出(手法はPhase 5-2確立のまま): 各ヴェニューについて
// 視線経路が最接近するu(実測: projects=0.162 / skills=0.424 / about=0.687 / contact=0.984)を
// 中心に幅0.08(全長253.5で約20ユニット=コート縦断+助走)で区間を切り、
// カメラ経路のz到達判定(venue近傍性テスト)を満たすことを実測確認した。
// ヴェニュー間の広い隙間はtransit区間(骨格のみ・カード非表示)に対応する
export type SectionId = 'home' | 'projects' | 'skills' | 'about' | 'contact'

export interface SectionRange {
  id: SectionId
  /** カードを表示するoffset区間 [start, end) */
  start: number
  end: number
}

// 区間は連続させる(隙間が広いと「カードが何もない区間」が長く感じられ、
// dampingの遅延も相まってカードの出現が遅れて見える)。切替自体が離散なのでフェードは保たれる
export const SECTION_RANGES: SectionRange[] = [
  { id: 'home', start: 0.0, end: 0.047 }, // クリスタル球接近前にフェードアウト(見出しとの重なり回避)
  { id: 'projects', start: 0.122, end: 0.202 },
  { id: 'skills', start: 0.384, end: 0.464 },
  { id: 'about', start: 0.647, end: 0.727 },
  { id: 'contact', start: 0.955, end: 1.01 }, // 終端はContactプラザで着地(設計書§8)
]

export function sectionAt(offset: number): SectionId | null {
  for (const r of SECTION_RANGES) {
    if (offset >= r.start && offset < r.end) return r.id
  }
  return null
}
