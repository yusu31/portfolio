import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'

const CATEGORIES = [
  {
    label: 'Engineering',
    tags: ['REST API 設計・実装', 'Spring Boot', 'React SPA', 'TypeScript', 'PostgreSQL', 'Docker', 'CI/CD', 'Chrome 拡張開発', 'Gemini API 連携', 'Three.js / R3F'],
  },
  {
    label: 'Soft Skills — 体育教師から移植',
    tags: ['課題分解・設定力', '複雑なことを伝える力', 'PDCA 高速回転', 'チームリード 10年', 'ユーザー共感設計', 'ドキュメント化'],
  },
]

export default function Skills() {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!sectionRef.current) return
    const triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    sectionRef.current.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 83%',
          onEnter: () => el.classList.add('reveal-in'),
        })
      )
    })

    return () => triggers.forEach((tr) => tr.kill())
  }, [])

  return (
    <section
      ref={sectionRef}
      id="skills"
      style={{ borderTop: '1px solid rgba(255,255,255,.08)', background: '#0d0d18', pointerEvents: 'auto' }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '6rem 1.5rem' }}>

        <div className="reveal" style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Capabilities
          </p>
          <h2 style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', lineHeight: 1.1, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)', marginBottom: '0.75rem' }}>
            {t.skills_h}
          </h2>
          <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.88rem', lineHeight: 1.95, maxWidth: '32rem' }}>
            {t.skills_desc}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {CATEGORIES.map(({ label, tags }) => (
            <div
              key={label}
              className="reveal"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.10)', borderRadius: '0.75rem', padding: '1.5rem' }}
            >
              <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,.10)' }}>
                {label}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: 'var(--font-ja)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      padding: '0.375rem 0.75rem',
                      background: 'rgba(255,255,255,.06)',
                      border: '1px solid rgba(255,255,255,.12)',
                      borderRadius: '999px',
                      color: 'var(--color-tx)',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.target as HTMLElement).style.borderColor = 'rgba(251,191,36,.50)'
                      ;(e.target as HTMLElement).style.boxShadow = '0 0 12px rgba(251,191,36,.15)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,.12)'
                      ;(e.target as HTMLElement).style.boxShadow = ''
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
