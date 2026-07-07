import { useState, useEffect } from 'react'
import GlassPanel from '../components/ui/GlassPanel'
import { PROJECT_CATEGORIES } from '../data/projects'
import { warpIn } from '../hooks/useSceneTransition'

export default function SoccerScene() {
  const [panelCategoryId, setPanelCategoryId] = useState<string | null>(null)

  useEffect(() => {
    warpIn()
    const onExplore = (e: Event) => {
      const { type, categoryId } = (e as CustomEvent<{ type: string; categoryId: string }>).detail
      if (type === 'project') setPanelCategoryId(categoryId)
    }
    window.addEventListener('journey-explore', onExplore)
    return () => window.removeEventListener('journey-explore', onExplore)
  }, [])

  const activeCategory = PROJECT_CATEGORIES.find(c => c.id === panelCategoryId)

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
        <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/soccer</p>
        <p style={{ fontSize: '0.7rem', color: '#4fc3f7', fontWeight: 700, margin: '0.15rem 0 0' }}>Projects — 作ったもの</p>
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <GlassPanel
          open={!!panelCategoryId}
          onClose={() => setPanelCategoryId(null)}
          title={activeCategory?.label ?? ''}
          color="#4fc3f7"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {activeCategory?.projects.map((p) => (
              <div key={p.id} style={{
                padding: '0.8rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e8e8e8' }}>{p.name}</span>
                  <span style={{
                    fontSize: '0.5rem', padding: '0.15rem 0.45rem', borderRadius: '4px',
                    background: p.status === 'live' ? 'rgba(109,191,64,0.15)' : 'rgba(121,134,203,0.15)',
                    color: p.status === 'live' ? '#6dbf40' : '#7986cb',
                    fontWeight: 700, letterSpacing: '0.06em', flexShrink: 0, marginLeft: '0.5rem',
                  }}>
                    {p.status === 'live' ? 'LIVE' : 'PLANNED'}
                  </span>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.55rem' }}>{p.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: p.githubUrl || p.liveUrl ? '0.6rem' : 0 }}>
                  {p.tech.map((t) => (
                    <span key={t} style={{
                      fontSize: '0.55rem', padding: '0.15rem 0.5rem', borderRadius: '3px',
                      background: 'rgba(79,195,247,0.1)', color: '#4fc3f7',
                      border: '1px solid rgba(79,195,247,0.2)', fontWeight: 600,
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
                {p.githubUrl && (
                  <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: '0.6rem', color: '#ccc', textDecoration: 'none',
                    padding: '0.25rem 0.6rem', borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.04)',
                  }}>↗ GitHub</a>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
