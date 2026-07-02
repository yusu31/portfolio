interface Props {
  navigate: (dir: 1 | -1) => void
  accentColor?: string
}

const btnStyle = (color: string): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color,
  opacity: 0.45,
  fontSize: '0.7rem',
  padding: '0.6rem 1.2rem',
  lineHeight: 1,
  letterSpacing: '0.15em',
  fontWeight: 700,
  transition: 'opacity 0.15s',
})

export default function JourneyNav({ navigate, accentColor = '#ffffff' }: Props) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.15rem',
      zIndex: 20,
      pointerEvents: 'auto',
      userSelect: 'none',
    }}>
      <button
        onClick={() => navigate(-1)}
        style={btnStyle(accentColor)}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
        aria-label="Previous"
      >
        ▲
      </button>
      <span style={{
        fontSize: '0.42rem',
        letterSpacing: '0.25em',
        color: accentColor,
        opacity: 0.25,
        textTransform: 'uppercase',
        fontWeight: 700,
        pointerEvents: 'none',
      }}>
        navigate
      </span>
      <button
        onClick={() => navigate(1)}
        style={btnStyle(accentColor)}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.45')}
        aria-label="Next"
      >
        ▼
      </button>
    </div>
  )
}
