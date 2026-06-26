import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useLanguage } from '../../hooks/useLanguage'

export default function Hero() {
  const { t } = useLanguage()
  const heyRef   = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subRef   = useRef<HTMLParagraphElement>(null)
  const ctaRef   = useRef<HTMLDivElement>(null)

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
      gsap.from(subRef.current,   { opacity: 0, y: 14, duration: 0.6, delay: 1.0 })
      gsap.from(ctaRef.current,   { opacity: 0, y: 8,  duration: 0.5, delay: 1.15 })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section
      id="hero"
      style={{
        height: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: 'transparent',
        position: 'relative',
        pointerEvents: 'none',
      }}
    >
      {/* 左上テキストブロック — クリスタルと重ならないよう左寄り */}
      <div
        style={{
          pointerEvents: 'auto',
          paddingTop: 'clamp(5rem, 13vh, 8.5rem)',
          paddingLeft: 'clamp(3rem, 7vw, 6rem)',
          maxWidth: '480px',
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
            marginBottom: '1.25rem',
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
            marginBottom: '0.85rem',
            fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
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
            color: 'rgba(255,255,255,.60)',
            lineHeight: 1.9,
            fontSize: '0.875rem',
            maxWidth: '340px',
            margin: 0,
          }}
          dangerouslySetInnerHTML={{ __html: t.hero_sub.replace('\n', '<br/>') }}
        />
      </div>

      {/* 下部中央 EXPLORE ボタン */}
      <div
        ref={ctaRef}
        style={{
          pointerEvents: 'auto',
          alignSelf: 'center',
          paddingBottom: 'clamp(2.5rem, 7vh, 5rem)',
        }}
      >
        <a
          href="#impact"
          onClick={(e) => {
            e.preventDefault()
            // クリスタル横移動トランジション
            window.dispatchEvent(new CustomEvent('explore-click'))
            // 少し遅らせてからスクロール（クリスタルが飛び出す演出と合わせる）
            setTimeout(() => {
              document.getElementById('impact')?.scrollIntoView({ behavior: 'smooth' })
            }, 500)
          }}
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-en)',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            padding: '0.9rem 3.5rem',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,.35)',
            color: '#fff',
            textDecoration: 'none',
            background: 'transparent',
            transition: 'background 0.25s, color 0.25s, border-color 0.25s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.background = '#fff'
            el.style.color = '#0a0a0f'
            el.style.borderColor = '#fff'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.background = 'transparent'
            el.style.color = '#fff'
            el.style.borderColor = 'rgba(255,255,255,.35)'
          }}
        >
          EXPLORE
        </a>
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
