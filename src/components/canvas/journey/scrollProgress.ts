/**
 * 指定セクションのドキュメント上の絶対top位置(sectionTop)・高さ(sectionHeight)・
 * 現在のスクロール量(scrollY)から、そのセクション内での進捗(0〜1)を計算する。
 */
export function computeSectionProgress(
  sectionTop: number,
  sectionHeight: number,
  scrollY: number,
): number {
  if (sectionHeight <= 0) return 0
  const raw = (scrollY - sectionTop) / sectionHeight
  return Math.min(1, Math.max(0, raw))
}
