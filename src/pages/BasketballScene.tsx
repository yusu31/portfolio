import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { BASKETBALL_HOTSPOTS, BASKETBALL_WAYPOINTS, HOTSPOT_RADIUS } from '../data/trajectories/basketball-trajectory'
import { interpolateWaypoints } from '../components/canvas/journey/trajectory'
import { SKILL_CATEGORIES } from '../data/skills'

export default function BasketballScene() {
  useScrollProgress()
  const navigate = useNavigate()

  const goNext = () => {
    const { pos } = interpolateWaypoints(scrollProgressRef.current, BASKETBALL_WAYPOINTS)
    navigate('/volleyball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } })
  }
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelSkillId, setPanelSkillId] = useState<string | null>(null)

  useEffect(() => {
    let raf: number
    const check = () => {
      const p = scrollProgressRef.current
      let found: number | null = null
      for (const wp of BASKETBALL_WAYPOINTS) {
        if (wp.hotspotIndex !== undefined && Math.abs(p - wp.progress) < HOTSPOT_RADIUS) {
          found = wp.hotspotIndex
          break
        }
      }
      setActiveHotspotIdx(found)
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [])

  const activeHotspot = activeHotspotIdx !== null ? BASKETBALL_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === BASKETBALL_HOTSPOTS.length - 1
  const activeSkillCat = SKILL_CATEGORIES.find(c => c.id === activeHotspot?.skillCategory)

  return (
    <>
      <div style={{ height: '250vh' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
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
      </div>
    </>
  )
}
