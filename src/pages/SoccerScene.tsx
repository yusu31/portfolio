import { Suspense, useState } from 'react'
import { PROJECT_CATEGORIES, type ProjectCategory } from '../data/projects'
import SoccerCanvas from '../components/canvas/soccer/SoccerCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#4fc3f7'

function ProjectList({ category }: { category: ProjectCategory }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {category.projects.map((p) => (
        <div
          key={p.id}
          style={{
            padding: '0.9rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ddd' }}>{p.name}</span>
            <span
              style={{
                fontSize: '0.55rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '3px',
                background: p.status === 'live' ? '#1a2a10' : '#1a1a2a',
                color: p.status === 'live' ? '#6dbf40' : '#7986cb',
                fontWeight: 700,
              }}
            >
              {p.status === 'live' ? 'LIVE' : 'PLANNED'}
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#666', margin: '0 0 0.5rem' }}>{p.description}</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {p.tech.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: '0.55rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '3px',
                  background: 'rgba(79,195,247,0.1)',
                  color: ACCENT,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          {p.githubUrl && (
            <a
              href={p.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.62rem',
                color: ACCENT,
                textDecoration: 'none',
                border: `1px solid ${ACCENT}44`,
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              GitHub →
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SoccerScene() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeCategory = PROJECT_CATEGORIES.find((c) => c.id === activeId) ?? null

  return (
    <>
      <Suspense fallback={null}>
        <SoccerCanvas />
      </Suspense>

      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '3rem' }}>
          <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/soccer</p>
          <p style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, margin: '0.2rem 0 0' }}>Projects — 作ったもの</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {PROJECT_CATEGORIES.map((cat) => (
            <Hotspot
              key={cat.id}
              x={cat.hotspotX}
              y={cat.hotspotY}
              label={cat.label}
              color={cat.color}
              active={activeId === cat.id}
              onClick={() => setActiveId((prev) => (prev === cat.id ? null : cat.id))}
            />
          ))}
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!activeCategory}
            onClose={() => setActiveId(null)}
            title={activeCategory ? `${activeCategory.icon} ${activeCategory.label}` : ''}
            color={activeCategory?.color ?? ACCENT}
          >
            {activeCategory && <ProjectList category={activeCategory} />}
          </GlassPanel>
        </div>
      </div>
    </>
  )
}
