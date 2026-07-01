import { Suspense, useState } from 'react'
import { ABOUT_POINTS, type AboutPoint } from '../data/about'
import VolleyballCanvas from '../components/canvas/volleyball/VolleyballCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#69f0ae'

function AboutContent({ point }: { point: AboutPoint }) {
  return (
    <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', lineHeight: 2.0, margin: 0 }}>
      {point.body}
    </p>
  )
}

export default function VolleyballScene() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activePoint = ABOUT_POINTS.find((p) => p.id === activeId) ?? null

  return (
    <>
      <Suspense fallback={null}>
        <VolleyballCanvas />
      </Suspense>

      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '3rem' }}>
          <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/volleyball</p>
          <p style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, margin: '0.2rem 0 0' }}>About — 自分について</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {ABOUT_POINTS.map((pt) => (
            <Hotspot
              key={pt.id}
              x={pt.hotspotX}
              y={pt.hotspotY}
              label={pt.label}
              color={ACCENT}
              active={activeId === pt.id}
              onClick={() => setActiveId((prev) => (prev === pt.id ? null : pt.id))}
            />
          ))}
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!activePoint}
            onClose={() => setActiveId(null)}
            title={activePoint?.title ?? ''}
            color={ACCENT}
          >
            {activePoint && <AboutContent point={activePoint} />}
          </GlassPanel>
        </div>
      </div>
    </>
  )
}
