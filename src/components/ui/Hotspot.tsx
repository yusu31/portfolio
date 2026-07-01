interface HotspotProps {
  x: string
  y: string
  label: string
  color: string
  active: boolean
  onClick: () => void
}

export default function Hotspot({ x, y, label, color, active, onClick }: HotspotProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '8px',
        zIndex: 50,
      }}
    >
      <div style={{ position: 'relative', width: '28px', height: '28px' }}>
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: active ? 0.6 : 0.2,
            animation: active ? 'none' : 'hs-pulse 2.2s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `1.5px solid ${color}`,
            opacity: active ? 1 : 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            background: color,
            opacity: active ? 1 : 0.8,
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.55rem',
          color,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          opacity: 0.85,
        }}
      >
        {label}
      </span>
      <style>{`
        @keyframes hs-pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.4); opacity: 0.05; }
        }
      `}</style>
    </button>
  )
}
