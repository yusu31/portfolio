import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import JourneyNav from '../components/ui/JourneyNav'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { SOCCER_HOTSPOTS, SOCCER_WAYPOINTS } from '../data/trajectories/soccer-trajectory'
import { interpolateWaypoints } from '../components/canvas/journey/trajectory'
import { PROJECT_CATEGORIES } from '../data/projects'
import { warpNavigate, warpIn } from '../hooks/useSceneTransition'

export default function SoccerScene() {
  const goScene = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelCategoryId, setPanelCategoryId] = useState<string | null>(null)

  // 新シーン入場時: FOV 収束 + DOM ブラー解除
  useEffect(() => { warpIn() }, [])

  const goNext = () => {
    const { pos } = interpolateWaypoints(scrollProgressRef.current, SOCCER_WAYPOINTS)
    warpNavigate(() => goScene('/basketball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } }), '#ff8c00')
  }

  const onArrive = useCallback((wpIdx: number) => {
    const wp = SOCCER_WAYPOINTS[wpIdx]
    setActiveHotspotIdx(wp.hotspotIndex !== undefined ? wp.hotspotIndex : null)
  }, [])

  const { navigate } = useScrollProgress(SOCCER_WAYPOINTS, onArrive)

  const activeHotspot = activeHotspotIdx !== null ? SOCCER_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === SOCCER_HOTSPOTS.length - 1
  const activeCategory = PROJECT_CATEGORIES.find(c => c.id === activeHotspot?.categoryId)

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
        <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/soccer</p>
        <p style={{ fontSize: '0.7rem', color: '#4fc3f7', fontWeight: 700, margin: '0.15rem 0 0' }}>Projects — 作ったもの</p>
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <SceneCard
          visible={!!activeHotspot}
          side={activeHotspot?.cardSide ?? 'right'}
          category="PROJECTS"
          title={activeCategory?.label ?? ''}
          description={`${activeCategory?.projects?.length ?? 0} projects`}
          onExplore={activeHotspot ? () => setPanelCategoryId(activeHotspot.categoryId) : undefined}
          onNext={isLastHotspot ? goNext : undefined}
          nextLabel="NEXT →"
        />
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <GlassPanel
          open={!!panelCategoryId}
          onClose={() => setPanelCategoryId(null)}
          title={PROJECT_CATEGORIES.find(c => c.id === panelCategoryId)?.label ?? ''}
          color="#4fc3f7"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {PROJECT_CATEGORIES.find(c => c.id === panelCategoryId)?.projects.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '0.8rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '8px',
                }}
              >
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
                    <span
                      key={t}
                      style={{
                        fontSize: '0.55rem', padding: '0.15rem 0.5rem', borderRadius: '3px',
                        background: 'rgba(79,195,247,0.1)', color: '#4fc3f7',
                        border: '1px solid rgba(79,195,247,0.2)', fontWeight: 600,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {(p.githubUrl || p.liveUrl) && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {p.githubUrl && (
                      <a
                        href={p.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.6rem', color: '#ccc', textDecoration: 'none',
                          padding: '0.25rem 0.6rem', borderRadius: '4px',
                          border: '1px solid rgba(255,255,255,0.12)',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: 'rgba(255,255,255,0.04)',
                        }}
                      >
                        ↗ GitHub
                      </a>
                    )}
                    {p.liveUrl && (
                      <a
                        href={p.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.6rem', color: '#4fc3f7', textDecoration: 'none',
                          padding: '0.25rem 0.6rem', borderRadius: '4px',
                          border: '1px solid rgba(79,195,247,0.25)',
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: 'rgba(79,195,247,0.06)',
                        }}
                      >
                        ↗ LIVE
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      <button
        onClick={goNext}
        style={{
          position: 'absolute', bottom: '2rem', right: '2.5rem',
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
          padding: '0.6rem 1.5rem', borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
          background: 'transparent', cursor: 'pointer', pointerEvents: 'auto',
        }}
      >
        NEXT: SKILLS →
      </button>

      <JourneyNav navigate={navigate} accentColor="#4fc3f7" />
    </div>
  )
}
