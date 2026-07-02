import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { VOLLEYBALL_HOTSPOTS, VOLLEYBALL_WAYPOINTS, HOTSPOT_RADIUS } from '../data/trajectories/volleyball-trajectory'
import { ABOUT_POINTS } from '../data/about'

export default function VolleyballScene() {
  useScrollProgress()
  const navigate = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelAboutId, setPanelAboutId] = useState<string | null>(null)

  useEffect(() => {
    let raf: number
    const check = () => {
      const p = scrollProgressRef.current
      let found: number | null = null
      for (const wp of VOLLEYBALL_WAYPOINTS) {
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

  const activeHotspot = activeHotspotIdx !== null ? VOLLEYBALL_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === VOLLEYBALL_HOTSPOTS.length - 1
  const activeAbout = ABOUT_POINTS.find(p => p.id === activeHotspot?.aboutId)
  const panelAbout = ABOUT_POINTS.find(p => p.id === panelAboutId)

  return (
    <>
      <div style={{ height: '250vh' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
          <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/volleyball</p>
          <p style={{ fontSize: '0.7rem', color: '#69f0ae', fontWeight: 700, margin: '0.15rem 0 0' }}>About — 私について</p>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <SceneCard
            visible={!!activeHotspot}
            side={activeHotspot?.cardSide ?? 'right'}
            category="ABOUT"
            title={activeAbout?.title ?? ''}
            description={activeAbout ? activeAbout.body.slice(0, 60) + (activeAbout.body.length > 60 ? '...' : '') : ''}
            onExplore={activeHotspot ? () => setPanelAboutId(activeHotspot.aboutId) : undefined}
            onNext={isLastHotspot ? () => navigate('/contact') : undefined}
            nextLabel="CONTACT →"
          />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!panelAboutId}
            onClose={() => setPanelAboutId(null)}
            title={panelAbout?.title ?? ''}
            color="#69f0ae"
          >
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.9, margin: 0 }}>
              {panelAbout?.body}
            </p>
          </GlassPanel>
        </div>
        <button
          onClick={() => navigate('/contact')}
          style={{
            position: 'absolute', bottom: '2rem', right: '2.5rem',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            padding: '0.6rem 1.5rem', borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
            background: 'transparent', cursor: 'pointer', pointerEvents: 'auto',
          }}
        >
          CONTACT →
        </button>
      </div>
    </>
  )
}
