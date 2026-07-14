// セクション定義: スクロールoffset(0〜1)が唯一の真実の状態で、カード表示はここから導出する。
// offsetは弧長ベース(getPointAt)なので境界値は「経路上の距離の割合」。
// 旧getPoint(t)時代の境界を「同じカメラz座標になるu」で逆算して再導出した(構図の同等性を維持)
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
  { id: 'home', start: 0.0, end: 0.105 }, // クリスタル球接近前にフェードアウト(見出しとの重なり回避)
  { id: 'projects', start: 0.164, end: 0.424 },
  { id: 'skills', start: 0.424, end: 0.618 },
  { id: 'about', start: 0.618, end: 0.873 },
  { id: 'contact', start: 0.873, end: 1.01 }, // 終端はContactプラザで着地(設計書§8)
]

export function sectionAt(offset: number): SectionId | null {
  for (const r of SECTION_RANGES) {
    if (offset >= r.start && offset < r.end) return r.id
  }
  return null
}
