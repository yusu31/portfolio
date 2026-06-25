import { useEffect, useState } from 'react'
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
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('hero')
      if (!hero) return
      setIsDark(hero.getBoundingClientRect().bottom > 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        transition: 'background .4s, border-color .4s',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: isDark ? 'rgba(234,88,12,.85)' : 'rgba(255,251,245,.95)',
        borderBottom: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid var(--color-bd)',
        pointerEvents: 'auto',
      }}
    >
      {/* ロゴ */}
      <a
        href="#"
        style={{
          fontFamily: 'var(--font-en)',
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '-0.06em',
          color: isDark ? '#fff' : 'var(--color-tx)',
          textDecoration: 'none',
          transition: 'color .4s',
        }}
      >
        yu<em style={{ fontStyle: 'normal', color: 'var(--color-am)' }}>.</em>
      </a>

      {/* リンク */}
      <ul style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: '2rem' }}>
        {NAV_LINKS.map(({ key, href }) => (
          <li key={key}>
            <a
              href={href}
              style={{
                fontFamily: 'var(--font-ja)',
                fontSize: '.82rem',
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,.7)' : 'var(--color-sub)',
                textDecoration: 'none',
                transition: 'color .2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = isDark
                  ? 'var(--color-am)'
                  : 'var(--color-or)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = isDark
                  ? 'rgba(255,255,255,.7)'
                  : 'var(--color-sub)'
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
              background: isDark ? 'rgba(255,255,255,.15)' : 'var(--color-or2)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              transition: 'background .4s',
            }}
          >
            {lang === 'ja' ? 'EN' : 'JP'}
          </button>
        </li>
      </ul>
    </nav>
  )
}
