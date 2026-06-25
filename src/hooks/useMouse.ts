import { useEffect, useRef } from 'react'

export interface MouseState {
  x: number
  y: number
}

export function useMouse(): React.RefObject<MouseState> {
  const mouse = useRef<MouseState>({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -((e.clientY / window.innerHeight) * 2 - 1),
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return mouse
}
