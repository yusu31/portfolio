import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export function useReveal<T extends HTMLElement = HTMLElement>(start = 'top 83%') {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      onEnter: () => el.classList.add('reveal-in'),
    })
    return () => trigger.kill()
  }, [start])

  return ref
}
