import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_COLORS: Record<string, string> = {
  '/':           '#ff6b2b',
  '/soccer':     '#4fc3f7',
  '/basketball': '#ffb300',
  '/volleyball': '#69f0ae',
  '/contact':    '#ce93d8',
}

export default function RouteTransition() {
  const { pathname } = useLocation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    if (prevPath.current === null) {
      prevPath.current = pathname
      return
    }
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    const el = overlayRef.current
    if (!el) return

    const color = ROUTE_COLORS[pathname] ?? '#ffffff'
    el.style.transition = 'none'
    el.style.backgroundColor = color
    el.style.opacity = '0.5'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.6s ease'
        el.style.opacity = '0'
      })
    })
  }, [pathname])

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        pointerEvents: 'none',
        opacity: 0,
      }}
    />
  )
}
