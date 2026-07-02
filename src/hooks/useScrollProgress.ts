import { useEffect } from 'react'
import { gsap } from 'gsap'
import type { Waypoint } from '../components/canvas/journey/trajectory'

export const scrollProgressRef = { current: 0 }
export const scrollIsAnimatingRef = { current: false }

/**
 * ホイール1回で次ウェイポイントへGSAPアニメーションする方式。
 * Lenis廃止。スクロール領域不要。
 * onArrive: アニメーション完了時に到達ウェイポイントのインデックスを返す。
 */
export function useScrollProgress(
  waypoints: Waypoint[],
  onArrive?: (wpIdx: number) => void,
) {
  useEffect(() => {
    if (waypoints.length === 0) return

    const isAnimating = { current: false }
    const currentIdx = { current: 0 }

    scrollProgressRef.current = waypoints[0].progress
    document.body.style.overflow = 'hidden'

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (isAnimating.current) return

      const delta = e.deltaY > 0 ? 1 : -1
      const nextIdx = Math.max(0, Math.min(waypoints.length - 1, currentIdx.current + delta))
      if (nextIdx === currentIdx.current) return

      currentIdx.current = nextIdx
      isAnimating.current = true

      scrollIsAnimatingRef.current = true
      gsap.to(scrollProgressRef, {
        current: waypoints[nextIdx].progress,
        duration: 1.8,
        ease: 'power2.inOut',
        onComplete: () => {
          isAnimating.current = false
          scrollIsAnimatingRef.current = false
          onArrive?.(nextIdx)
        },
      })
    }

    window.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', onWheel)
      document.body.style.overflow = ''
      scrollProgressRef.current = 0
    }
  }, [waypoints, onArrive])
}
