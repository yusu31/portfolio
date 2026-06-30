import { useEffect, useRef } from 'react'
import { computeSectionProgress } from './scrollProgress'

/**
 * 指定idのDOMセクション内での縦スクロール進捗(0〜1)をrefで返す。
 * useFrame内で `.current` を読むことを想定（Reactの再レンダリングを発生させない）。
 */
export function useJourneySectionProgress(sectionId: string) {
  const progressRef = useRef(0)

  useEffect(() => {
    // フォント・画像読み込みやLoader消失によるレイアウトシフトでセクション位置が
    // ずれるため、scroll/resizeのたびに毎回 getBoundingClientRect() で測り直す
    // （キャッシュした位置を使い回すと進捗計算が実スクロール位置とズレる）。
    const update = () => {
      const el = document.getElementById(sectionId)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const top = rect.top + window.scrollY
      progressRef.current = computeSectionProgress(top, rect.height, window.scrollY)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [sectionId])

  return progressRef
}
