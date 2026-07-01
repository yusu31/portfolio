import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/soccer',     label: 'Projects' },
  { path: '/basketball', label: 'Skills' },
  { path: '/volleyball', label: 'About' },
  { path: '/contact',    label: 'Contact' },
] as const

export default function GlobalNav() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem clamp(1.5rem, 5vw, 3rem)',
        backdropFilter: isHome ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isHome ? 'none' : 'blur(16px)',
        background: isHome ? 'transparent' : 'rgba(10,10,15,0.55)',
        borderBottom: isHome ? 'none' : '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.4s ease',
        pointerEvents: 'auto',
      }}
    >
      <Link
        to="/"
        style={{
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '-0.06em',
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        yu<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
      </Link>

      <ul
        style={{
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          margin: 0,
          padding: 0,
        }}
      >
        {NAV_ITEMS.map(({ path, label }) => (
          <li key={path}>
            <Link
              to={path}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: pathname === path ? '#ff6b2b' : 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
