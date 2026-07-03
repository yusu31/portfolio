import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import JourneyNav from '../components/ui/JourneyNav'
import { useScrollProgress } from '../hooks/useScrollProgress'
import { VOLLEYBALL_HOTSPOTS, VOLLEYBALL_WAYPOINTS } from '../data/trajectories/volleyball-trajectory'
import { ABOUT_POINTS } from '../data/about'
import { warpNavigate, warpIn } from '../hooks/useSceneTransition'

export default function VolleyballScene() {
  const goScene = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelAboutId, setPanelAboutId] = useState<string | null>(null)

  useEffect(() => { warpIn() }, [])

  const onArrive = useCallback((wpIdx: number) => {
    const wp = VOLLEYBALL_WAYPOINTS[wpIdx]
    setActiveHotspotIdx(wp.hotspotIndex !== undefined ? wp.hotspotIndex : null)
  }, [])

  const { navigate } = useScrollProgress(VOLLEYBALL_WAYPOINTS, onArrive)

  const activeHotspot = activeHotspotIdx !== null ? VOLLEYBALL_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === VOLLEYBALL_HOTSPOTS.length - 1
  const activeAbout = ABOUT_POINTS.find(p => p.id === activeHotspot?.aboutId)
  const panelAbout = ABOUT_POINTS.find(p => p.id === panelAboutId)

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
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
          onNext={isLastHotspot ? () => warpNavigate(() => goScene('/contact'), '#b0aaff') : undefined}
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
          {panelAbout && (
            <div>
              <span style={{
                display: 'inline-block',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#69f0ae',
                background: 'rgba(105,240,174,0.12)',
                border: '1px solid rgba(105,240,174,0.3)',
                borderRadius: '999px',
                padding: '0.2rem 0.7rem',
                marginBottom: '0.75rem',
              }}>
                {panelAbout.label}
              </span>
              <div style={{ borderLeft: '2px solid rgba(105,240,174,0.5)', paddingLeft: '0.85rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.9, margin: 0 }}>
                  {panelAbout.body}
                </p>
              </div>
              {panelAbout.id === 'seeking' && (
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#fff',
                  background: '#ff6b2b',
                  borderRadius: '999px',
                  padding: '0.25rem 0.8rem',
                  marginBottom: '0.75rem',
                }}>
                  現在 求職中
                </span>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: panelAbout.id === 'seeking' ? '0.5rem' : 0 }}>
                {panelAbout.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: '0.62rem',
                    fontWeight: 500,
                    color: '#69f0ae',
                    background: 'rgba(105,240,174,0.1)',
                    border: '1px solid rgba(105,240,174,0.25)',
                    borderRadius: '999px',
                    padding: '0.2rem 0.65rem',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      <button
        onClick={() => warpNavigate(() => goScene('/contact'), '#b0aaff')}
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

      <JourneyNav navigate={navigate} accentColor="#69f0ae" />
    </div>
  )
}
