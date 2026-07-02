import { useEffect } from 'react'
import { gsap } from 'gsap'
import type { Waypoint } from '../components/canvas/journey/trajectory'

export const scrollProgressRef = { current: 0 }
export const scrollIsAnimatingRef = { current: false }

// hotspotIndex or impact を持つウェイポイントが「止まれる点」
// それ以外の中間点は放物線補間のためだけに存在し、ホイール操作ではスキップ
function findNextStopIdx(from: number, direction: 1 | -1, waypoints: Waypoint[]): number {
  let idx = from + direction
  while (idx > 0 && idx < waypoints.length - 1) {
    if (waypoints[idx].hotspotIndex !== undefined || waypoints[idx].impact) return idx
    idx += direction
  }
  return Math.max(0, Math.min(waypoints.length - 1, idx))
}

/**
 * ホイール1回で次の「コンテンツ停止点」へGSAPアニメーション。
 * hotspotIndex or impact フラグのないウェイポイントは放物線補間用の通過点として自動スキップ。
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

      const direction = e.deltaY > 0 ? 1 : -1
      const nextIdx = findNextStopIdx(currentIdx.current, direction, waypoints)
      if (nextIdx === currentIdx.current) return

      currentIdx.current = nextIdx
      isAnimating.current = true
      scrollIsAnimatingRef.current = true

      gsap.to(scrollProgressRef, {
        current: waypoints[nextIdx].progress,
        duration: 1.0,
        ease: 'expo.out',
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
