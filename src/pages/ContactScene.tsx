import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { warpIn } from '../hooks/useSceneTransition'

const CONTACTS = [
  {
    label: 'Email',
    value: '3.fortschritt@gmail.com',
    href: 'mailto:3.fortschritt@gmail.com',
    color: '#ff6b2b',
    hoverColor: '#ff6b2b',
    icon: '✉',
  },
  {
    label: 'GitHub',
    value: 'github.com/yusu31',
    href: 'https://github.com/yusu31',
    color: 'rgba(255,255,255,0.9)',
    hoverColor: '#ce93d8',
    icon: '⌥',
  },
  {
    label: 'Resume',
    value: 'PDF をダウンロード',
    href: '#',
    color: 'rgba(255,255,255,0.9)',
    hoverColor: '#69f0ae',
    icon: '↓',
  },
] as const

export default function ContactScene() {
  const badgeRef  = useRef<HTMLDivElement>(null)
  const eyeRef    = useRef<HTMLHeadingElement>(null)
  const subRef    = useRef<HTMLParagraphElement>(null)
  const listRef   = useRef<HTMLDivElement>(null)
  const footRef   = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    warpIn()
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(badgeRef.current,  { opacity: 0, y: 10, duration: 0.4 })
        .from(eyeRef.current,    { opacity: 0, y: 24, duration: 0.7 }, '-=0.1')
        .from(subRef.current,    { opacity: 0, y: 12, duration: 0.5 }, '-=0.3')
        .from(listRef.current?.children ?? [], {
          opacity: 0, x: -18, duration: 0.4, stagger: 0.1,
        }, '-=0.15')
        .from(footRef.current,   { opacity: 0, duration: 0.5 }, '-=0.1')
    })
    return () => ctx.revert()
  }, [])

  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        paddingTop: '6rem',
        paddingBottom: '5rem',
      }}
    >
      {/* 求職ステータスバッジ */}
      <div
        ref={badgeRef}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 1rem',
          marginBottom: '1.5rem',
          borderRadius: '999px',
          background: 'rgba(255,107,43,0.1)',
          border: '1px solid rgba(255,107,43,0.28)',
          color: '#ff6b2b',
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
        }}
      >
        <span
          style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#ff6b2b',
            animation: 'blink 2.4s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
        求職中 — 2026年度 入社希望
      </div>

      {/* キャッチコピー */}
      <h1
        ref={eyeRef}
        style={{
          fontSize: 'clamp(2.2rem, 6vw, 4rem)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.04em',
          marginBottom: '0.9rem',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        Let&apos;s work<br />
        together<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
      </h1>

      <p
        ref={subRef}
        style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.4)',
          marginBottom: '3rem',
          textAlign: 'center',
          lineHeight: 1.8,
        }}
      >
        自社開発・スタートアップ・副業など、お気軽にどうぞ。
      </p>

      {/* コンタクトリスト */}
      <div
        ref={listRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {CONTACTS.map(({ label, value, href, color, hoverColor, icon }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.2rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${hoverColor}10`
              e.currentTarget.style.borderColor = `${hoverColor}35`
              e.currentTarget.style.transform = 'translateX(4px)'
              const valueEl = e.currentTarget.querySelector('[data-value]') as HTMLElement | null
              if (valueEl) valueEl.style.color = hoverColor
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              e.currentTarget.style.transform = 'translateX(0)'
              const valueEl = e.currentTarget.querySelector('[data-value]') as HTMLElement | null
              if (valueEl) valueEl.style.color = color
            }}
          >
            {/* アイコン枠 */}
            <div
              style={{
                width: '36px', height: '36px',
                borderRadius: '8px',
                background: `${color}14`,
                border: `1px solid ${color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem',
                color,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '0.58rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                {label}
              </p>
              <p data-value style={{ margin: 0, fontSize: '0.82rem', color, fontWeight: 600, transition: 'color 0.2s' }}>
                {value}
              </p>
            </div>
            <span style={{ color: '#333', fontSize: '0.9rem' }}>→</span>
          </a>
        ))}
      </div>

      {/* フッター */}
      <p
        ref={footRef}
        style={{
          marginTop: '3.5rem',
          fontSize: '0.6rem',
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: '0.08em',
          textAlign: 'center',
        }}
      >
        Made with React + Three.js · 2026 · yusu31
      </p>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }
      `}</style>
    </div>
  )
}
