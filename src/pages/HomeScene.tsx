import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Scene from '../components/canvas/Scene'

const NAV_GRID = [
  { path: '/soccer',     icon: '⚽', label: 'Projects', desc: '作ったもの',    color: '#4fc3f7' },
  { path: '/basketball', icon: '🏀', label: 'Skills',   desc: 'できること',   color: '#ffb300' },
  { path: '/volleyball', icon: '🏐', label: 'About',    desc: '自分について',  color: '#69f0ae' },
  { path: '/contact',    icon: '✉',  label: 'Contact',  desc: '連絡先',       color: '#ce93d8' },
] as const

export default function HomeScene() {
  const navigate = useNavigate()
  const heyRef  = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subRef  = useRef<HTMLParagraphElement>(null)
  const ctaRef  = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

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
      <Canvas
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

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
        {/* 左上テキストブロック */}
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
          </p>
        </div>

        {/* 下部 — EXPLORE + 4グリッドナビ */}
        <div
          style={{
            paddingBottom: 'clamp(2rem, 5vh, 4rem)',
            paddingLeft: 'clamp(1.5rem, 5vw, 3rem)',
            paddingRight: 'clamp(1.5rem, 5vw, 3rem)',
            pointerEvents: 'auto',
          }}
        >
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
            {NAV_GRID.map(({ path, icon, label, desc, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '0.9rem 0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${color}18`
                  e.currentTarget.style.borderColor = `${color}44`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '0.55rem', color: '#555' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.1; }
        }
      `}</style>
    </>
  )
}
