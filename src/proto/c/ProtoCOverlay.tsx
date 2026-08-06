// 3Dの上に重ねる平面UI。A / B と同じ構成(参考例①のアイコン列・④のHUDに倣ったもの)。
//
// **文字色はカードのパレットから引き、背景の明るさで自動反転させる**(B で確立)。
// C は Night のカードだけ背景が暗く、他の3枚は明るいので反転が必ず要る。
//
// 検証ノブ(`?pal` / `?chain`)の状態を画面に出すのは、
// 撮った絵がどの条件のものか後から分からなくなるのを防ぐため(B の OUTLINE 表示と同じ)。
import type { CSSProperties } from 'react'
import { CARDS, cardPalette } from './cards'
import { parseHex } from './palette'

const wrap: CSSProperties = {
  position: 'fixed',
  inset: 0,
  pointerEvents: 'none',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
}

const tag: CSSProperties = {
  position: 'absolute',
  top: 'clamp(16px, 3vw, 36px)',
  left: 'clamp(16px, 3vw, 36px)',
  fontSize: 11,
  letterSpacing: '0.24em',
  fontWeight: 700,
}

const titleBlock: CSSProperties = {
  position: 'absolute',
  left: 'clamp(16px, 3vw, 36px)',
  bottom: 'clamp(20px, 4vw, 48px)',
}

const railStyle: CSSProperties = {
  position: 'absolute',
  right: 'clamp(16px, 3vw, 36px)',
  top: '50%',
  transform: 'translateY(-50%)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  alignItems: 'flex-end',
}

/** 背景の明るさ。文字色の反転をパレットのidではなく実際の明るさで決める */
function brightness(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return (r * 299 + g * 587 + b * 114) / 1000
}

export default function ProtoCOverlay({
  index,
  paletteOverride,
  chain,
  skyway,
  weave,
  hop,
}: {
  index: number
  paletteOverride: number | null
  chain: boolean
  skyway: boolean
  weave: boolean
  hop: boolean
}) {
  const active = Math.min(Math.max(index, 0), CARDS.length - 1)
  const card = CARDS[active]
  const palette = cardPalette(active, paletteOverride)
  const dark = brightness(palette.sky) < 128
  const ink = dark ? '#f2ece0' : '#23282e'
  const sub = dark ? 'rgba(242,236,224,0.62)' : 'rgba(35,40,46,0.62)'

  return (
    <div style={wrap}>
      <div style={{ ...tag, color: sub }}>
        PROTOTYPE C — ISLAND CARDS
        <span style={{ marginLeft: 12, color: palette.accent }}>{palette.label}</span>
        {/* どの検証条件で見ているかを必ず画面に残す */}
        {paletteOverride !== null && <span style={{ marginLeft: 12 }}>PALETTE FORCED</span>}
        {!chain && <span style={{ marginLeft: 12 }}>CHAIN OFF</span>}
        {!skyway && <span style={{ marginLeft: 12 }}>SKYWAY OFF</span>}
        {!weave && <span style={{ marginLeft: 12 }}>WEAVE OFF</span>}
        {!hop && <span style={{ marginLeft: 12 }}>HOP OFF</span>}
      </div>

      <div style={titleBlock}>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', color: palette.accent, fontWeight: 700 }}>
          CARD {String(active + 1).padStart(2, '0')} / {String(CARDS.length).padStart(2, '0')}
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 800,
            color: ink,
            lineHeight: 1.1,
            marginTop: 4,
            // 島の密度が高いので、文字が背景に負けないよう最小限の影を敷く
            textShadow: dark ? '0 2px 18px rgba(0,0,0,0.5)' : '0 2px 18px rgba(255,255,255,0.45)',
          }}
        >
          {card.title}
        </div>
        <div style={{ fontSize: 14, color: sub, marginTop: 6 }}>{card.caption}</div>
      </div>

      <div style={railStyle}>
        {CARDS.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.16em', color: i === active ? ink : 'transparent' }}>
              {c.title}
            </span>
            <span
              style={{
                width: i === active ? 22 : 10,
                height: 2,
                background: i === active ? palette.accent : sub,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
