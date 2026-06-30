import { useEffect, useRef } from 'react'
import { computeSectionProgress } from './scrollProgress'

/**
 * 指定idのDOMセクション内での縦スクロール進捗(0〜1)をrefで返す。
 * useFrame内で `.current` を読むことを想定（Reactの再レンダリングを発生させない）。
 */
export function useJourneySectionProgress(sectionId: string) {
  const progressRef = useRef(0)
  const boundsRef = useRef({ top: 0, height: 0 })

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(sectionId)
      if (!el) return
      const rect = el.getBoundingClientRect()
      boundsRef.current = { top: rect.top + window.scrollY, height: rect.height }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [sectionId])

  useEffect(() => {
    const onScroll = () => {
      const { top, height } = boundsRef.current
      progressRef.current = computeSectionProgress(top, height, window.scrollY)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return progressRef
}
