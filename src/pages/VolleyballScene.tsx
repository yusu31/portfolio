import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import { ABOUT_POINTS } from '../data/about'
import { VOLLEYBALL_HOTSPOTS_3D } from '../data/hotspots/volleyball-hotspots'
import { useSceneContext } from '../contexts/SceneContext'
import { warpIn, warpNavigate } from '../hooks/useSceneTransition'

export default function VolleyballScene() {
  const goScene = useNavigate()
  const { activeHotspotId, visitedHotspotIds, showFinale, setFinaleHotspotCount, setForceTarget, resetScene } = useSceneContext()
  const [panelAboutId, setPanelAboutId] = useState<string | null>(null)

  useEffect(() => {
    warpIn()
    setFinaleHotspotCount(VOLLEYBALL_HOTSPOTS_3D.length)
    return () => resetScene()
  }, [setFinaleHotspotCount, resetScene])

  // finale に近接したらスパイク演出 → Contact へ
  useEffect(() => {
    if (showFinale && activeHotspotId === 'finale') {
      setForceTarget([0, 6, -4])
      const timer = setTimeout(() => {
        warpNavigate(() => goScene('/contact'), '#b0aaff')
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [showFinale, activeHotspotId, setForceTarget, goScene])

  const activeHotspot = VOLLEYBALL_HOTSPOTS_3D.find(h => h.id === activeHotspotId) ?? null
  const activeAbout = ABOUT_POINTS.find(p => p.id === activeHotspot?.categoryId)
  const panelAbout = ABOUT_POINTS.find(p => p.id === panelAboutId)
  const allVisited = VOLLEYBALL_HOTSPOTS_3D.every(h => visitedHotspotIds.has(h.id))

  return (
    <div data-scene-ui style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
        <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/volleyball</p>
        <p style={{ fontSize: '0.7rem', color: '#69f0ae', fontWeight: 700, margin: '0.15rem 0 0' }}>About — 私について</p>
      </div>

      {allVisited && !showFinale && (
        <div style={{
          position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)',
          fontSize: '0.65rem', color: '#69f0ae', letterSpacing: '0.12em',
          padding: '0.5rem 1.2rem', borderRadius: '999px',
          border: '1px solid rgba(105,240,174,0.3)', background: 'rgba(105,240,174,0.08)',
          pointerEvents: 'none',
        }}>
          ↓ 光の点へ転がせ — SPIKE!
        </div>
      )}

      <div style={{ pointerEvents: 'auto' }}>
        <SceneCard
          visible={!!activeHotspot}
          side={activeHotspot?.cardSide ?? 'right'}
          category="ABOUT"
          title={activeAbout?.title ?? activeHotspot?.label ?? ''}
          description={activeAbout ? activeAbout.body.slice(0, 60) + (activeAbout.body.length > 60 ? '...' : '') : ''}
          onExplore={activeHotspot ? () => setPanelAboutId(activeHotspot.categoryId) : undefined}
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
    </div>
  )
}
