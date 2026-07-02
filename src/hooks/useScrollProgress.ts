import { useEffect, useRef, useCallback } from 'react'
import { gsap } from 'gsap'
import type { Waypoint } from '../components/canvas/journey/trajectory'

export const scrollProgressRef = { current: 0 }
export const scrollIsAnimatingRef = { current: false }

// navigate() 開始時に impact:true ターゲットの progress を即時セット。
// JourneyEffects がこれを読み取って即時波動発火し、null にクリアする。
export const impactTriggerRef: { current: number | null } = { current: null }

// hotspotIndex or impact を持つウェイポイントが「止まれる点」
function findNextStopIdx(from: number, direction: 1 | -1, waypoints: Waypoint[]): number {
  let idx = from + direction
  while (idx > 0 && idx < waypoints.length - 1) {
    if (waypoints[idx].hotspotIndex !== undefined || waypoints[idx].impact) return idx
    idx += direction
  }
  return Math.max(0, Math.min(waypoints.length - 1, idx))
}

/**
 * ホイール1回 / クリック / キー操作で次の「コンテンツ停止点」へGSAPアニメーション。
 * power3.in: ゆっくりためて→爆発的に到達（スーパープレイ集感）
 * navigate関数を返すのでクリックUIからも呼べる。
 */
export function useScrollProgress(
  waypoints: Waypoint[],
  onArrive?: (wpIdx: number) => void,
): { navigate: (dir: 1 | -1) => void } {
  const isAnimatingRef = useRef(false)
  const currentIdxRef = useRef(0)
  const waypointsRef = useRef(waypoints)
  const onArriveRef = useRef(onArrive)

  useEffect(() => { waypointsRef.current = waypoints }, [waypoints])
  useEffect(() => { onArriveRef.current = onArrive }, [onArrive])

  const navigate = useCallback((direction: 1 | -1) => {
    const wps = waypointsRef.current
    if (isAnimatingRef.current || wps.length === 0) return

    const nextIdx = findNextStopIdx(currentIdxRef.current, direction, wps)
    if (nextIdx === currentIdxRef.current) return

    currentIdxRef.current = nextIdx
    isAnimatingRef.current = true
    scrollIsAnimatingRef.current = true

    // impact:true ターゲットへの移動開始時に即時発火トリガーをセット
    if (wps[nextIdx].impact) {
      impactTriggerRef.current = wps[nextIdx].progress
    }

    gsap.to(scrollProgressRef, {
      current: wps[nextIdx].progress,
      duration: 1.5,
      ease: 'power3.in',
      onComplete: () => {
        isAnimatingRef.current = false
        scrollIsAnimatingRef.current = false
        onArriveRef.current?.(nextIdx)
      },
    })
  }, [])

  useEffect(() => {
    if (waypoints.length === 0) return

    currentIdxRef.current = 0
    scrollProgressRef.current = waypoints[0].progress
    document.body.style.overflow = 'hidden'

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      navigate(e.deltaY > 0 ? 1 : -1)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') navigate(1)
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') navigate(-1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      scrollProgressRef.current = 0
    }
  }, [waypoints, navigate])

  return { navigate }
}
