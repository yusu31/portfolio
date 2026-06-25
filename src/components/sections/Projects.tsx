import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLanguage } from '../../hooks/useLanguage'
import type { TranslationKey } from '../../types'

interface Project {
  id: string
  label: string
  sub: string
  tags: string[]
  titleKey: TranslationKey
  probKey: TranslationKey
  solKey: TranslationKey
  impKey: TranslationKey
  demoUrl: string
  grad: string
  iconColor: string
  delay: number
}

const PROJECTS: Project[] = [
  {
    id: 'taiiku',
    label: 'TAIIKU',
    sub: 'Education × AI',
    tags: ['React', 'Spring Boot', 'Gemini API'],
    titleKey: 'taiiku_title',
    probKey: 'taiiku_prob',
    solKey: 'taiiku_sol',
    impKey: 'taiiku_imp',
    demoUrl: '#',
    grad: 'from-[#fff7ed] to-[#ffedd5]',
    iconColor: '#f97316',
    delay: 0.1,
  },
  {
    id: 'task',
    label: 'TASK',
    sub: 'Full-Stack',
    tags: ['Spring Boot', 'React', 'PostgreSQL'],
    titleKey: 'task_title',
    probKey: 'task_prob',
    solKey: 'task_sol',
    impKey: 'task_imp',
    demoUrl: '#',
    grad: 'from-[#fffbeb] to-[#fef3c7]',
    iconColor: '#d97706',
    delay: 0.2,
  },
  {
    id: 'err',
    label: 'ERR→JP',
    sub: 'Chrome Extension',
    tags: ['Chrome Extension', 'Gemini API', 'JavaScript'],
    titleKey: 'err_title',
    probKey: 'err_prob',
    solKey: 'err_sol',
    impKey: 'err_imp',
    demoUrl: '#',
    grad: 'from-[#fef9f0] to-[#fde68a]',
    iconColor: '#b45309',
    delay: 0.3,
  },
]

function ProjectCard({ project, t }: { project: Project; t: Record<string, string> }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const card = cardRef.current
    const glare = glareRef.current
    if (!card || !glare) return

    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = card.getBoundingClientRect()
      const x = (e.clientX - left - width / 2) / width
      const y = (e.clientY - top - height / 2) / height
      card.style.transition = 'transform 0.08s ease, border-color 0.3s, box-shadow 0.3s'
      card.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`
      glare.style.opacity = '1'
      glare.style.background = `radial-gradient(circle at ${e.clientX - left}px ${e.clientY - top}px, rgba(249,115,22,.07), transparent 65%)`
    }
    const onLeave = () => {
      card.style.transition = 'transform 0.65s cubic-bezier(.23,1,.32,1), border-color 0.3s, box-shadow 0.3s'
      card.style.transform = 'perspective(900px) rotateY(0) rotateX(0) scale(1)'
      glare.style.opacity = '0'
    }

    card.addEventListener('mousemove', onMove)
    card.addEventListener('mouseleave', onLeave)
    return () => {
      card.removeEventListener('mousemove', onMove)
      card.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const thumbnail = (
    <div
      style={{
        width: '100%',
        aspectRatio: '16/9',
        borderBottom: '1px solid var(--color-bd)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(to bottom right, ${project.grad.includes('fff7ed') ? '#fff7ed' : project.grad.includes('fffbeb') ? '#fffbeb' : '#fef9f0'}, ${project.grad.includes('ffedd5') ? '#ffedd5' : project.grad.includes('fef3c7') ? '#fef3c7' : '#fde68a'})`,
      }}
    >
      <div style={{ fontFamily: 'var(--font-en)', fontWeight: 800, fontSize: '2rem', letterSpacing: '-0.04em', color: project.iconColor, marginBottom: '0.25rem' }}>
        {project.label}
      </div>
      <div style={{ fontFamily: 'var(--font-en)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#a8a29e' }}>
        {project.sub}
      </div>
    </div>
  )

  return (
    <div
      ref={cardRef}
      className="proj-card reveal"
      style={{
        position: 'relative',
        background: '#fff',
        border: '1px solid var(--color-bd)',
        borderRadius: '1rem',
        overflow: 'hidden',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        transitionDelay: `${project.delay}s`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = '#fdba74'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 40px rgba(0,0,0,.1)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-bd)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
      }}
    >
      {/* グレアエフェクト */}
      <div ref={glareRef} style={{ position: 'absolute', inset: 0, borderRadius: '1rem', pointerEvents: 'none', opacity: 0, transition: 'opacity 0.2s', zIndex: 20 }} />

      {thumbnail}

      {/* コンテンツ */}
      <div style={{ padding: '1.25rem', position: 'relative', zIndex: 10 }}>
        {/* タグ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
          {project.tags.map((tag) => (
            <span key={tag} style={{ fontFamily: 'var(--font-en)', fontSize: '0.59rem', fontWeight: 600, padding: '0.125rem 0.5rem', background: 'var(--color-cream)', border: '1px solid var(--color-bd)', borderRadius: '4px', color: 'var(--color-sub)' }}>
              {tag}
            </span>
          ))}
        </div>

        <p style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', fontSize: '1rem', lineHeight: 1.4, marginBottom: '0.75rem' }}>
          {t[project.titleKey]}
        </p>

        {/* PSI */}
        <PSIBlock label="Problem" color="#f97316" bg="#fff7f5" border="#fdba74" text={t[project.probKey]} />
        <PSIBlock label="Solution" color="#d97706" bg="#fffbeb" border="#fcd34d" text={t[project.solKey]} />
        <PSIBlock label="Impact" color="#c2410c" bg="#fff7ed" border="#f97316" text={t[project.impKey]} bold />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
          <a href={project.demoUrl} style={{ fontFamily: 'var(--font-ja)', fontSize: '0.77rem', fontWeight: 700, color: 'var(--color-or)', textDecoration: 'none', transition: 'opacity .2s' }} onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = '0.6')} onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = '1')}>
            {t.demo_link}
          </a>
        </div>
      </div>
    </div>
  )
}

function PSIBlock({ label, color, bg, border, text, bold }: { label: string; color: string; bg: string; border: string; text: string; bold?: boolean }) {
  return (
    <div style={{ marginBottom: '0.375rem', padding: '0.5rem 0.625rem', borderRadius: '0.5rem', background: bg, borderLeft: `2.5px solid ${border}` }}>
      <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.59rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, marginBottom: '0.125rem' }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-ja)', fontSize: '0.79rem', color: bold ? 'var(--color-or2)' : 'var(--color-tx)', lineHeight: 1.65, fontWeight: bold ? 700 : 400 }}>{text}</p>
    </div>
  )
}

export default function Projects() {
  const { t } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !headRef.current) return
    const triggers: ReturnType<typeof ScrollTrigger.create>[] = []

    headRef.current.classList.add('reveal')
    triggers.push(
      ScrollTrigger.create({
        trigger: headRef.current,
        start: 'top 83%',
        onEnter: () => headRef.current?.classList.add('reveal-in'),
      })
    )

    const cards = sectionRef.current.querySelectorAll<HTMLElement>('.proj-card')
    cards.forEach((card) => {
      triggers.push(
        ScrollTrigger.create({
          trigger: card,
          start: 'top 83%',
          onEnter: () => card.classList.add('reveal-in'),
        })
      )
    })

    return () => triggers.forEach((tr) => tr.kill())
  }, [])

  return (
    <section
      ref={sectionRef}
      id="projects"
      style={{ borderTop: '1px solid var(--color-bd)', background: 'var(--color-cream)', pointerEvents: 'auto' }}
    >
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '6rem 1.5rem' }}>
        <div ref={headRef} style={{ marginBottom: '3rem' }}>
          <p style={{ fontFamily: 'var(--font-en)', fontSize: '0.66rem', fontWeight: 700, color: 'var(--color-or)', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Projects
          </p>
          <h2 style={{ fontFamily: 'var(--font-ja)', fontWeight: 700, color: 'var(--color-tx)', lineHeight: 1.1, letterSpacing: '-0.03em', fontSize: 'clamp(1.75rem, 4.5vw, 2.75rem)', marginBottom: '0.75rem' }}>
            {t.proj_h}
          </h2>
          <p style={{ fontFamily: 'var(--font-ja)', color: 'var(--color-sub)', fontSize: '0.88rem', lineHeight: 1.95, maxWidth: '32rem' }}>
            {t.proj_desc}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {PROJECTS.map((p) => (
            <ProjectCard key={p.id} project={p} t={t} />
          ))}
        </div>
      </div>
    </section>
  )
}
