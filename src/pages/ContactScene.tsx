const CONTACTS = [
  {
    label: 'Email',
    value: '3.fortschritt@gmail.com',
    href: 'mailto:3.fortschritt@gmail.com',
    color: '#ff6b2b',
  },
  {
    label: 'GitHub',
    value: 'github.com/yusu31',
    href: 'https://github.com/yusu31',
    color: '#ce93d8',
  },
  {
    label: 'Resume',
    value: 'PDF をダウンロード',
    href: '#',
    color: '#69f0ae',
  },
] as const

export default function ContactScene() {
  return (
    <div
      style={{
        minHeight: '100svh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        paddingTop: '6rem',
      }}
    >
      <p
        style={{
          fontSize: '0.65rem',
          color: '#444',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
        }}
      >
        Contact
      </p>
      <h1
        style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.04em',
          marginBottom: '0.8rem',
          textAlign: 'center',
        }}
      >
        Let&apos;s work together<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        自社開発・スタートアップ・副業など、お気軽にどうぞ。
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        {CONTACTS.map(({ label, value, href, color }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.1rem 1.4rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              textDecoration: 'none',
              transition: 'background 0.2s, border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}12`
              e.currentTarget.style.borderColor = `${color}40`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
            }}
          >
            <span style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {label}
            </span>
            <span style={{ fontSize: '0.82rem', color, fontWeight: 600 }}>{value}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
