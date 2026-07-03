import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import JourneyNav from '../components/ui/JourneyNav'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { BASKETBALL_HOTSPOTS, BASKETBALL_WAYPOINTS } from '../data/trajectories/basketball-trajectory'
import { interpolateWaypoints } from '../components/canvas/journey/trajectory'
import { SKILL_CATEGORIES } from '../data/skills'
import { warpNavigate, warpIn } from '../hooks/useSceneTransition'

export default function BasketballScene() {
  const goScene = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelSkillId, setPanelSkillId] = useState<string | null>(null)

  useEffect(() => { warpIn() }, [])

  const goNext = () => {
    const { pos } = interpolateWaypoints(scrollProgressRef.current, BASKETBALL_WAYPOINTS)
    warpNavigate(() => goScene('/volleyball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } }))
  }

  const onArrive = useCallback((wpIdx: number) => {
    const wp = BASKETBALL_WAYPOINTS[wpIdx]
    setActiveHotspotIdx(wp.hotspotIndex !== undefined ? wp.hotspotIndex : null)
  }, [])

  const { navigate } = useScrollProgress(BASKETBALL_WAYPOINTS, onArrive)

  const activeHotspot = activeHotspotIdx !== null ? BASKETBALL_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === BASKETBALL_HOTSPOTS.length - 1
  const activeSkillCat = SKILL_CATEGORIES.find(c => c.id === activeHotspot?.skillCategory)

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
        <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/basketball</p>
        <p style={{ fontSize: '0.7rem', color: '#ffb300', fontWeight: 700, margin: '0.15rem 0 0' }}>Skills — できること</p>
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <SceneCard
          visible={!!activeHotspot}
          side={activeHotspot?.cardSide ?? 'right'}
          category="SKILLS"
          title={activeSkillCat?.label ?? ''}
          description={activeSkillCat?.description ?? ''}
          onExplore={activeHotspot ? () => setPanelSkillId(activeHotspot.skillCategory) : undefined}
          onNext={isLastHotspot ? goNext : undefined}
          nextLabel="NEXT →"
        />
      </div>

      <div style={{ pointerEvents: 'auto' }}>
        <GlassPanel
          open={!!panelSkillId}
          onClose={() => setPanelSkillId(null)}
          title={SKILL_CATEGORIES.find(c => c.id === panelSkillId)?.label ?? ''}
          color="#ffb300"
        >
          <div>
            {SKILL_CATEGORIES.find(c => c.id === panelSkillId)?.skills.map((s) => (
              <div
                key={s.name}
                style={{
                  padding: '0.5rem 0.6rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.75rem',
                  color: '#ccc',
                }}
              >
                {s.name}
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
        NEXT: ABOUT →
      </button>

      <JourneyNav navigate={navigate} accentColor="#ffb300" />
    </div>
  )
}
