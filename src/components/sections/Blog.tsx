import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'

export default function Blog() {
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
      id="blog"
      style={{ borderTop: '1px solid var(--color-bd)', background: 'var(--color-cream)', pointerEvents: 'auto' }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '6rem 1.5rem' }}>

        <div className="reveal" style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Blog
          </p>
          <h2 style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', lineHeight: 1.1, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)', marginBottom: '0.75rem' }}>
            {t.blog_h}
          </h2>
          <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.88rem', lineHeight: 1.95, maxWidth: '32rem' }}>
            {t.blog_desc}
          </p>
        </div>

        <div
          className="reveal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '5rem 1.5rem',
            border: '1px dashed var(--color-bd)',
            borderRadius: '1rem',
            background: 'var(--color-cream)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✍️</div>
          <p style={{ fontFamily: 'var(--font-en)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-or)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            {t.blog_soon_title}
          </p>
          <p
            style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.84rem', lineHeight: 1.9, textAlign: 'center', maxWidth: '18rem' }}
            dangerouslySetInnerHTML={{ __html: t.blog_soon_desc.replace('\n', '<br/>') }}
          />
        </div>
      </div>
    </section>
  )
}
