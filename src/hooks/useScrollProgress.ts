import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from 'gsap'

// module-levelのref：R3FのuseFrame内でも参照可能
export const scrollProgressRef = { current: 0 }
export const scrollVelocityRef = { current: 0 }

/**
 * スポーツシーンのページコンポーネントでmountする。
 * Lenisを初期化してスクロールをスムーズにし、progressとvelocityをrefに書き込む。
 * アンマウント時にLenisを破棄する（ルート遷移でクリーンアップされる）。
 */
export function useScrollProgress() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.07 })

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      scrollProgressRef.current = progress
      scrollVelocityRef.current = Math.abs(velocity)
    })

    const rafCallback = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(rafCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(rafCallback)
      lenis.destroy()
      scrollProgressRef.current = 0
      scrollVelocityRef.current = 0
    }
  }, [])
}
