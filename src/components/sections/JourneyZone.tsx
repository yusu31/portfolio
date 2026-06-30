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
        height: reducedMotion ? '0' : `${heightVh}vh`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  )
}
