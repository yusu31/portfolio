import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'

const STATS = [
  { count: 10, suffix: '年', label: 'Experience', descKey: 'imp1_desc', color: 'var(--color-or)', delay: 0.05 },
  { count: 3,  suffix: '件', label: 'Projects',   descKey: 'imp2_desc', color: 'var(--color-am2)', delay: 0.15 },
  { count: 80, suffix: '%', label: 'Time Saved',  descKey: 'imp3_desc', color: 'var(--color-or)', delay: 0.25 },
  { count: 2,  suffix: 'h+', label: 'Weekly Saved', descKey: 'imp4_desc', color: 'var(--color-am2)', delay: 0.35 },
] as const

export default function Impact() {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const cards = sectionRef.current?.querySelectorAll<HTMLElement>('.impact-card')
    if (!cards) return

    const triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    cards.forEach((card, i) => {
      const numEl = card.querySelector<HTMLElement>('[data-count]')
      const stat = STATS[i]

      const t1 = ScrollTrigger.create({
        trigger: card,
        start: 'top 88%',
        onEnter: () => card.classList.add('reveal-in'),
      })
      triggers.push(t1)

      if (numEl && stat) {
        const t2 = ScrollTrigger.create({
          trigger: numEl,
          start: 'top 85%',
          onEnter: () => {
            const dur = 1800
            const t0 = performance.now()
            ;(function tick(now: number) {
              const p = Math.min((now - t0) / dur, 1)
              const eased = 1 - Math.pow(1 - p, 3)
              numEl.textContent = Math.round(eased * stat.count) + stat.suffix
              if (p < 1) requestAnimationFrame(tick)
            })(performance.now())
          },
        })
        triggers.push(t2)
      }
    })

    return () => triggers.forEach((t) => t.kill())
  }, [])

  return (
    <section
      ref={sectionRef}
      id="impact"
      style={{ padding: '4rem 0', background: '#0d0d18', borderBottom: '1px solid rgba(255,255,255,.08)', pointerEvents: 'auto' }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.25rem',
            textAlign: 'center',
          }}
          className="md:grid-cols-4"
        >
          {STATS.map(({ suffix, label, descKey, color, delay }, i) => (
            <div
              key={descKey}
              className="impact-card"
              style={{
                padding: '2rem',
                borderRadius: '0.75rem',
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.10)',
                transitionDelay: `${delay}s`,
              }}
            >
              <span
                data-count="true"
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-en)',
                  fontWeight: 800,
                  lineHeight: 1,
                  marginBottom: '0.25rem',
                  color,
                  fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                  letterSpacing: '-0.05em',
                }}
              >
                0{suffix}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-en)',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,.45)',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  marginBottom: '0.25rem',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-ja)',
                  fontSize: '0.78rem',
                  color: 'rgba(255,255,255,.50)',
                  lineHeight: 1.65,
                }}
              >
                {t[descKey]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
