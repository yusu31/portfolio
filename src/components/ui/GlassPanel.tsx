import { type ReactNode } from 'react'

interface GlassPanelProps {
  open: boolean
  onClose: () => void
  title: string
  color: string
  children: ReactNode
}

export default function GlassPanel({ open, onClose, title, color, children }: GlassPanelProps) {
  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          right: '3rem',
          top: '50%',
          width: 'min(400px, calc(100vw - 4rem))',
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
          borderRadius: '12px',
          padding: '1.8rem',
          zIndex: 100,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translate(0, -50%)' : 'translate(110%, -50%)',
          opacity: open ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
          maxHeight: 'calc(100svh - 8rem)',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.2rem',
          }}
        >
          <h2
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0.2rem',
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
