import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import JourneyNav from '../components/ui/JourneyNav'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { SOCCER_HOTSPOTS, SOCCER_WAYPOINTS } from '../data/trajectories/soccer-trajectory'
import { interpolateWaypoints } from '../components/canvas/journey/trajectory'
import { PROJECT_CATEGORIES } from '../data/projects'

export default function SoccerScene() {
  const goScene = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelCategoryId, setPanelCategoryId] = useState<string | null>(null)

  const goNext = () => {
    const { pos } = interpolateWaypoints(scrollProgressRef.current, SOCCER_WAYPOINTS)
    goScene('/basketball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } })
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
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
          <div>
            {PROJECT_CATEGORIES.find(c => c.id === panelCategoryId)?.projects.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: '0.7rem 0.8rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ddd' }}>{p.name}</span>
                  <span style={{
                    fontSize: '0.52rem', padding: '0.1rem 0.4rem', borderRadius: '3px',
                    background: p.status === 'live' ? '#1a2a10' : '#1a1a2a',
                    color: p.status === 'live' ? '#6dbf40' : '#7986cb', fontWeight: 700,
                  }}>
                    {p.status === 'live' ? 'LIVE' : 'PLANNED'}
                  </span>
                </div>
                <p style={{ fontSize: '0.65rem', color: '#555', margin: 0 }}>{p.description}</p>
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
