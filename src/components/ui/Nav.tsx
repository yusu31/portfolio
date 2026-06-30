import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '../../hooks/useLanguage'

const NAV_LINKS = [
  { key: 'nav_impact', href: '#impact' },
  { key: 'nav_story', href: '#story' },
  { key: 'nav_works', href: '#projects' },
  { key: 'nav_blog', href: '#blog' },
  { key: 'nav_contact', href: '#contact' },
] as const

export default function Nav() {
  const { t, lang, toggleLang } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <nav
      id="nav"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem 3rem',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: 'rgba(10,10,15,.80)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        pointerEvents: 'auto',
      }}
    >
      <a
        href="#"
        style={{
          fontFamily: 'var(--font-en)',
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '-0.06em',
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        yu<em style={{ fontStyle: 'normal', color: 'var(--color-am)' }}>.</em>
      </a>

      <ul className="nav-links" style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {NAV_LINKS.map(({ key, href }) => (
          <li key={key}>
            <a
              href={href}
              style={{
                fontFamily: 'var(--font-ja)',
                fontSize: '.82rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,.55)',
                textDecoration: 'none',
                transition: 'color .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--color-am)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.55)'
              }}
            >
              {t[key]}
            </a>
          </li>
        ))}
        <li>
          <button
            onClick={toggleLang}
            style={{
              fontFamily: 'var(--font-en)',
              fontSize: '.65rem',
              fontWeight: 700,
              letterSpacing: '.1em',
              padding: '.32rem .8rem',
              borderRadius: '999px',
              background: 'rgba(251,191,36,.20)',
              color: 'var(--color-am)',
              border: '1px solid rgba(251,191,36,.30)',
              cursor: 'pointer',
              transition: 'background .2s',
            }}
          >
            {lang === 'ja' ? 'EN' : 'JP'}
          </button>
        </li>
      </ul>

      <button
        type="button"
        className="nav-toggle"
        aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          flexDirection: 'column',
          gap: '5px',
          width: '28px',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            height: '2px',
            width: '100%',
            background: '#fff',
            borderRadius: '2px',
            transition: 'transform .25s ease, opacity .25s ease',
            transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
          }}
        />
        <span
          style={{
            display: 'block',
            height: '2px',
            width: '100%',
            background: '#fff',
            borderRadius: '2px',
            transition: 'opacity .25s ease',
            opacity: menuOpen ? 0 : 1,
          }}
        />
        <span
          style={{
            display: 'block',
            height: '2px',
            width: '100%',
            background: '#fff',
            borderRadius: '2px',
            transition: 'transform .25s ease, opacity .25s ease',
            transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
          }}
        />
      </button>

      {createPortal(
        <div className={`nav-overlay${menuOpen ? ' nav-overlay-open' : ''}`}>
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={() => setMenuOpen(false)}
            style={{
              position: 'absolute',
              top: '1.4rem',
              right: '1.6rem',
              width: '28px',
              height: '28px',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '1.6rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.6rem' }}>
            {NAV_LINKS.map(({ key, href }) => (
              <li key={key} className="nav-overlay-link">
                <a
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    fontFamily: 'var(--font-ja)',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,.85)',
                    textDecoration: 'none',
                  }}
                >
                  {t[key]}
                </a>
              </li>
            ))}
            <li className="nav-overlay-link">
              <button
                onClick={toggleLang}
                style={{
                  fontFamily: 'var(--font-en)',
                  fontSize: '.75rem',
                  fontWeight: 700,
                  letterSpacing: '.1em',
                  padding: '.4rem 1rem',
                  borderRadius: '999px',
                  background: 'rgba(251,191,36,.20)',
                  color: 'var(--color-am)',
                  border: '1px solid rgba(251,191,36,.30)',
                  cursor: 'pointer',
                }}
              >
                {lang === 'ja' ? 'EN' : 'JP'}
              </button>
            </li>
          </ul>
        </div>,
        document.body
      )}
    </nav>
  )
}
