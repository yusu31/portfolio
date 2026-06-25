import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useLanguage } from '../../hooks/useLanguage'

export default function Hero() {
  const { t } = useLanguage()
  const heyRef = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heyRef.current) {
        try {
          const split = SplitText.create(heyRef.current, { type: 'chars', mask: 'chars' })
          gsap.from(split.chars, {
            yPercent: 110,
            duration: 0.85,
            stagger: 0.06,
            ease: 'power3.out',
            delay: 0.3,
          })
        } catch {
          gsap.from(heyRef.current, { opacity: 0, y: 30, duration: 0.85, delay: 0.3 })
        }
      }
      gsap.from(badgeRef.current, { opacity: 0, y: 10, duration: 0.5, delay: 0.2 })
      gsap.from(subRef.current,  { opacity: 0, y: 14, duration: 0.6, delay: 1.0 })
      gsap.from(ctaRef.current,  { opacity: 0, y: 8,  duration: 0.5, delay: 1.15 })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section
      id="hero"
      style={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* 足下からのオレンジグロー */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 50% at 65% 50%, rgba(251,146,60,.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* コンテンツカード（glassmorphism ダーク版） */}
      <div
        style={{
          maxWidth: '460px',
          width: '100%',
          marginLeft: 'clamp(1.5rem, 8vw, 10rem)',
          borderRadius: '1.25rem',
          padding: '2.5rem',
          background: 'rgba(255,255,255,.06)',
          border: '1px solid rgba(255,255,255,.12)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 32px 80px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.10)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* バッジ */}
        <div
          ref={badgeRef}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 1rem',
            marginBottom: '1.75rem',
            borderRadius: '999px',
            background: 'rgba(251,191,36,.12)',
            border: '1px solid rgba(251,191,36,.28)',
            color: '#fbbf24',
            fontSize: '0.72rem',
            fontWeight: 700,
            fontFamily: 'var(--font-ja)',
          }}
        >
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--color-am)',
            animation: 'blink 2.4s ease-in-out infinite',
          }} />
          {t.hero_badge}
        </div>

        {/* HEY. */}
        <span
          ref={heyRef}
          id="hey"
          style={{
            display: 'block',
            fontFamily: 'var(--font-en)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1,
            marginBottom: '0.75rem',
            fontSize: 'clamp(3.4rem, 7vw, 5.2rem)',
            letterSpacing: '-0.06em',
          }}
        >
          HEY<em style={{ fontStyle: 'normal', color: 'var(--color-am)' }}>.</em>
        </span>

        {/* サブコピー */}
        <p
          ref={subRef}
          style={{
            fontFamily: 'var(--font-ja)',
            color: 'rgba(255,255,255,.65)',
            lineHeight: 1.95,
            marginBottom: '2rem',
            fontSize: '0.9rem',
          }}
          dangerouslySetInnerHTML={{ __html: t.hero_sub.replace('\n', '<br/>') }}
        />

        {/* CTAボタン */}
        <div ref={ctaRef} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="#projects"
            style={{
              fontFamily: 'var(--font-ja)',
              fontWeight: 700,
              fontSize: '0.83rem',
              padding: '0.875rem 1.75rem',
              borderRadius: '10px',
              background: 'var(--color-or)',
              color: '#fff',
              textDecoration: 'none',
              transition: 'filter .2s',
              boxShadow: '0 0 24px rgba(251,146,60,.35)',
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.filter = 'brightness(1.12)')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.filter = '')}
          >
            {t.hero_cta1}
          </a>
          <a
            href="#contact"
            style={{
              fontFamily: 'var(--font-ja)',
              fontWeight: 700,
              fontSize: '0.83rem',
              padding: '0.875rem 1.75rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,.20)',
              color: 'rgba(255,255,255,.70)',
              textDecoration: 'none',
              transition: 'border-color .2s, color .2s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = 'var(--color-am)'
              el.style.color = 'var(--color-am)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement
              el.style.borderColor = 'rgba(255,255,255,.20)'
              el.style.color = 'rgba(255,255,255,.70)'
            }}
          >
            {t.hero_cta2}
          </a>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.1; }
        }
      `}</style>
    </section>
  )
}
