// 3Dの上に重ねる平面UI。参考例①は「右端に縦のアイコン列、左下にロゴタイプ」だったので、
// A のオーバーレイと同じ構成をそのまま使う(構成そのものは4例に共通していて既に合っている)。
//
// **文字色は区間のパレットから引く**。夜の区間だけ背景が暗いので明暗を反転させる。
// A では Dusk 章のピンク文字が背景に埋もれて読めなくなったので、
// B では背景の明るさから判定して自動で反転させている。
import type { CSSProperties } from 'react'
import { LEGS, legStart } from './route'
import { paletteAt, parseHex } from './palette'

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

export default function ProtoBOverlay({ index, outline }: { index: number; outline: boolean }) {
  const leg = LEGS[Math.min(index, LEGS.length - 1)]
  const palette = paletteAt(legStart(index) + leg.length / 2)
  const dark = brightness(palette.sky) < 128
  const ink = dark ? '#f2ece0' : '#23282e'
  const sub = dark ? 'rgba(242,236,224,0.62)' : 'rgba(35,40,46,0.62)'

  return (
    <div style={wrap}>
      <div style={{ ...tag, color: sub }}>
        PROTOTYPE B — ONE-POINT STREET
        <span style={{ marginLeft: 12, color: palette.accent }}>{palette.label}</span>
        {/* 輪郭線の有無は B の検証項目なので、どちらで見ているかを画面に出す */}
        <span style={{ marginLeft: 12 }}>{outline ? 'OUTLINE ON' : 'OUTLINE OFF'}</span>
      </div>

      <div style={titleBlock}>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', color: palette.accent, fontWeight: 700 }}>
          LEG {String(index + 1).padStart(2, '0')} / {String(LEGS.length).padStart(2, '0')}
        </div>
        <div
          style={{
            fontSize: 'clamp(28px, 5vw, 52px)',
            fontWeight: 800,
            color: ink,
            lineHeight: 1.1,
            marginTop: 4,
            // 街の密度が高いので、文字が背景に負けないよう最小限の影を敷く
            textShadow: dark ? '0 2px 18px rgba(0,0,0,0.5)' : '0 2px 18px rgba(255,255,255,0.45)',
          }}
        >
          {leg.title}
        </div>
        <div style={{ fontSize: 14, color: sub, marginTop: 6 }}>{leg.caption}</div>
      </div>

      <div style={railStyle}>
        {LEGS.map((l, i) => (
          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.16em', color: i === index ? ink : 'transparent' }}>
              {l.title}
            </span>
            <span
              style={{
                width: i === index ? 22 : 10,
                height: 2,
                background: i === index ? palette.accent : sub,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
