import { useEffect, useState } from 'react'

export default function Footer() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <footer
      style={{
        borderTop: '1px solid var(--color-bd)',
        background: '#fff',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '64rem',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <span style={{ fontFamily: 'var(--font-en)', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.06em', color: 'var(--color-tx)' }}>
          yu<em style={{ fontStyle: 'normal', color: 'var(--color-or)' }}>.</em>
        </span>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {[
            { href: 'https://github.com/yusu31', label: 'GitHub' },
            { href: '#', label: 'Zenn' },
            { href: '#', label: 'X' },
          ].map(({ href, label }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{ fontFamily: 'var(--font-en)', fontSize: '0.72rem', color: 'var(--color-sub)', textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--color-or)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--color-sub)')}
            >
              {label}
            </a>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.67rem', color: 'var(--color-sub)' }}>
          © 2026 yusu
        </p>
      </div>

      {/* ページトップボタン */}
      <a
        href="#"
        aria-label="ページトップへ"
        style={{
          position: 'fixed',
          bottom: '1.75rem',
          right: '1.75rem',
          zIndex: 50,
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          border: '1px solid var(--color-bd)',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          opacity: showTop ? 1 : 0,
          pointerEvents: showTop ? 'auto' : 'none',
          transition: 'opacity .3s, background .2s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--color-cream)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = '#fff')}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--color-sub)' }} strokeLinecap="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </a>
    </footer>
  )
}
