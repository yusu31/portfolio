import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface SceneCardProps {
  visible: boolean
  side: 'left' | 'right'
  category: string       // 上部の小文字ラベル（例: "PROJECTS"）
  title: string
  description: string
  onExplore?: () => void
  exploreLabel?: string
  onNext?: () => void
  nextLabel?: string
}

export default function SceneCard({
  visible,
  side,
  category,
  title,
  description,
  onExplore,
  exploreLabel = 'EXPLORE →',
  onNext,
  nextLabel = 'NEXT ↓',
}: SceneCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (visible) {
      gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
    } else {
      gsap.to(ref.current, { opacity: 0, y: -10, duration: 0.3, ease: 'power2.in' })
    }
  }, [visible])

  const posStyle: React.CSSProperties = side === 'left'
    ? { left: 'clamp(1.5rem, 5vw, 3.5rem)' }
    : { right: 'clamp(1.5rem, 5vw, 3.5rem)' }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 'clamp(2rem, 6vh, 4rem)',
        ...posStyle,
        width: 'min(480px, 45vw)',
        background: 'rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.4rem 1.6rem',
        opacity: 0,
        transform: 'translateY(20px)',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 20,
      }}
    >
      <p style={{
        fontSize: '0.58rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#555',
        margin: '0 0 0.6rem',
      }}>
        {category}
      </p>
      <h2 style={{
        fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
        fontWeight: 800,
        color: '#fff',
        margin: '0 0 0.7rem',
        lineHeight: 1.25,
      }}>
        {title}
      </h2>
      <p style={{
        fontSize: '0.78rem',
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.7,
        margin: '0 0 1.1rem',
      }}>
        {description}
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {onExplore && (
          <button
            onClick={onExplore}
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '0.55rem 1.2rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {exploreLabel}
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.45)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
