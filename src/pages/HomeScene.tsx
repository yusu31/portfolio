import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'

// inline SVG アイコン（OS依存絵文字の代替・線画スタイル）
const IconSoccer = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
)

const IconBasketball = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M4.93 4.93 19.07 19.07M19.07 4.93 4.93 19.07" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const IconVolleyball = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2C6.5 7 6.5 17 12 22M12 2c5.5 5 5.5 15 0 20M2 12h20" />
  </svg>
)

const IconMail = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const NAV_GRID = [
  { path: '/soccer',     Icon: IconSoccer,     label: 'Projects', desc: '作ったもの',    color: '#4fc3f7' },
  { path: '/basketball', Icon: IconBasketball, label: 'Skills',   desc: 'できること',   color: '#ffb300' },
  { path: '/volleyball', Icon: IconVolleyball, label: 'About',    desc: '自分について',  color: '#69f0ae' },
  { path: '/contact',    Icon: IconMail,       label: 'Contact',  desc: '連絡先',       color: '#ce93d8' },
] as const

type NavPath = typeof NAV_GRID[number]['path']

export default function HomeScene() {
  const navigate = useNavigate()
  const heyRef  = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subRef  = useRef<HTMLParagraphElement>(null)
  const ctaRef  = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const [hoveredCard, setHoveredCard] = useState<NavPath | null>(null)
  const [hoveredIcon, setHoveredIcon] = useState<NavPath | null>(null)

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
      gsap.from(gridRef.current,  { opacity: 0, y: 16, duration: 0.6, delay: 1.3 })
    })
    return () => ctx.revert()
  }, [])

  const handleExplore = () => {
    window.dispatchEvent(new CustomEvent('explore-click'))
    setTimeout(() => navigate('/soccer'), 600)
  }

  return (
    <>
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            paddingTop: 'clamp(5rem, 13vh, 8.5rem)',
            paddingLeft: 'clamp(3rem, 7vw, 6rem)',
            maxWidth: '480px',
            pointerEvents: 'auto',
          }}
        >
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
            }}
          >
            <span
              style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#ff6b2b',
                animation: 'blink 2.4s ease-in-out infinite',
              }}
            />
            体育教師 → エンジニア転身中
          </div>

          <span
            ref={heyRef}
            style={{
              display: 'block',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.85rem',
              fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
              letterSpacing: '-0.06em',
            }}
          >
            HEY<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
          </span>

          <p
            ref={subRef}
            style={{
              color: 'rgba(255,255,255,.60)',
              lineHeight: 1.9,
              fontSize: '0.875rem',
              maxWidth: '340px',
              margin: 0,
            }}
          >
            スポーツが育てた思考で、プロダクトを作る。
            <br />
            <span style={{ color: 'rgba(255,255,255,.35)', fontSize: '0.78rem' }}>
              — RaiseTech 卒業生 / 2024年からコードを書き始めた
            </span>
          </p>
        </div>

        <div
          style={{
            paddingBottom: 'clamp(2rem, 5vh, 4rem)',
            paddingLeft: 'clamp(1.5rem, 5vw, 3rem)',
            paddingRight: 'clamp(1.5rem, 5vw, 3rem)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <span
              style={{
                display: 'inline-block',
                color: 'rgba(255,255,255,.35)',
                fontSize: '1.25rem',
                animation: 'scrollBounce 1.6s ease-in-out infinite',
                lineHeight: 1,
              }}
            >
              ↓
            </span>
          </div>

          <div ref={ctaRef} style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={handleExplore}
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.22em',
                padding: '0.9rem 3.5rem',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,.35)',
                color: '#fff',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.25s, color 0.25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.color = '#0a0a0f'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#fff'
              }}
            >
              EXPLORE
            </button>
          </div>

          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.8rem',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            {NAV_GRID.map(({ path, Icon, label, desc, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                onMouseEnter={() => { setHoveredCard(path); setHoveredIcon(path) }}
                onMouseLeave={() => { setHoveredCard(null); setHoveredIcon(null) }}
                style={{
                  background: hoveredCard === path ? `${color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${hoveredCard === path ? `${color}44` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  padding: '0.9rem 0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    transform: hoveredIcon === path ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.2s ease',
                    opacity: hoveredIcon === path ? 1 : 0.6,
                  }}
                >
                  <Icon color={color} />
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                <span
                  style={{
                    fontSize: '0.55rem',
                    color: hoveredCard === path ? `${color}cc` : '#555',
                    transition: 'color 0.2s',
                  }}
                >
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 'clamp(1rem, 3vh, 2rem)',
          left: 'clamp(1.5rem, 4vw, 3rem)',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: 'rgba(255,255,255,.22)',
            textTransform: 'uppercase',
          }}
        >
          /home
        </span>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.1; }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(6px); }
        }
      `}</style>
    </>
  )
}
