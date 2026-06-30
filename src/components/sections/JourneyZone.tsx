import { useEffect, useState } from 'react'

interface JourneyZoneProps {
  id: string
  heightVh?: number
}

export default function JourneyZone({ id, heightVh = 250 }: JourneyZoneProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <section
      id={id}
      aria-hidden="true"
      style={{
        // 高さ0にすると computeSectionProgress(scrollProgress.ts) が
        // sectionHeight<=0で常に0を返すようになり、SoccerScene側の
        // ボール・カメラ追従演出が自動的に無効化される（追加配線不要）。
        height: reducedMotion ? '0' : `${heightVh}vh`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  )
}
