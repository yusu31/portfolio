import { Suspense, useState } from 'react'
import { SKILL_CATEGORIES, type SkillCategory } from '../data/skills'
import BasketballCanvas from '../components/canvas/basketball/BasketballCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#ffb300'

function SkillList({ category }: { category: SkillCategory }) {
  return (
    <div>
      <p style={{ fontSize: '0.68rem', color: '#666', marginBottom: '1rem' }}>{category.description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {category.skills.map((s) => (
          <div
            key={s.name}
            style={{
              padding: '0.6rem 0.9rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#ccc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: category.color, flexShrink: 0 }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BasketballScene() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeCategory = SKILL_CATEGORIES.find((c) => c.id === activeId) ?? null

  return (
    <>
      <Suspense fallback={null}>
        <BasketballCanvas />
      </Suspense>

      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '3rem' }}>
          <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/basketball</p>
          <p style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, margin: '0.2rem 0 0' }}>Skills — できること</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {SKILL_CATEGORIES.map((cat) => (
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
            title={activeCategory?.label ?? ''}
            color={activeCategory?.color ?? ACCENT}
          >
            {activeCategory && <SkillList category={activeCategory} />}
          </GlassPanel>
        </div>
      </div>
    </>
  )
}
