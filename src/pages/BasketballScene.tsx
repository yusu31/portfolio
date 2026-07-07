import { useState, useEffect } from 'react'
import GlassPanel from '../components/ui/GlassPanel'
import { SKILL_CATEGORIES } from '../data/skills'
import { warpIn } from '../hooks/useSceneTransition'

export default function BasketballScene() {
  const [panelSkillId, setPanelSkillId] = useState<string | null>(null)

  useEffect(() => {
    warpIn()
    const onExplore = (e: Event) => {
      const { type, categoryId } = (e as CustomEvent<{ type: string; categoryId: string }>).detail
      if (type === 'skill') setPanelSkillId(categoryId)
    }
    window.addEventListener('journey-explore', onExplore)
    return () => window.removeEventListener('journey-explore', onExplore)
  }, [])

  const cat = SKILL_CATEGORIES.find(c => c.id === panelSkillId)
  const LEVEL_LABEL = ['', '学習中', '実務レベル', '得意'] as const

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
        <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/basketball</p>
        <p style={{ fontSize: '0.7rem', color: '#ffb300', fontWeight: 700, margin: '0.15rem 0 0' }}>Skills — できること</p>
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <GlassPanel
          open={!!panelSkillId}
          onClose={() => setPanelSkillId(null)}
          title={cat?.label ?? ''}
          color="#ffb300"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {cat?.skills.map((s) => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.55rem 0.7rem',
                background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '0.78rem', color: '#ddd', fontWeight: 600 }}>{s.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.52rem', color: '#666', letterSpacing: '0.06em' }}>
                    {LEVEL_LABEL[s.level]}
                  </span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[1, 2, 3].map((d) => (
                      <div key={d} style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: d <= s.level ? (cat?.color ?? '#ffb300') : 'rgba(255,255,255,0.12)',
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
