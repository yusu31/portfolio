// 3Dの上に重ねる平面UI(共通原則6)。参考例①の縦アイコン列・④のHUDに相当する層。
// 章タイトルとカット番号だけを出す。試作なので中身は最小限だが、
// 「箱庭 + 画面固定のUI」という**構成そのものが評価対象**なので入れておく。
import type { CSSProperties } from 'react'
import { CHAPTERS } from './chapters'
import type { Palette } from './palette'

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

export default function ProtoAOverlay({ index, palette }: { index: number; palette: Palette }) {
  const chapter = CHAPTERS[index]
  // 文字色はパレットから引く。夜の章だけ背景が暗いので明暗を反転させる
  const dark = palette.id === 'night'
  const ink = dark ? '#f2ece0' : '#2b2119'
  const sub = dark ? 'rgba(242,236,224,0.62)' : 'rgba(43,33,25,0.6)'

  return (
    <div style={wrap}>
      <div style={{ ...tag, color: sub }}>
        PROTOTYPE A — DIORAMA
        <span style={{ marginLeft: 12, color: palette.accent }}>{palette.label}</span>
      </div>

      <div style={titleBlock}>
        <div style={{ fontSize: 11, letterSpacing: '0.22em', color: palette.accent, fontWeight: 700 }}>
          CUT {String(index + 1).padStart(2, '0')} / {String(CHAPTERS.length).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, color: ink, lineHeight: 1.1, marginTop: 4 }}>
          {chapter.title}
        </div>
        <div style={{ fontSize: 14, color: sub, marginTop: 6 }}>{chapter.caption}</div>
      </div>

      <div style={railStyle}>
        {CHAPTERS.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.16em', color: i === index ? ink : 'transparent' }}>
              {c.title}
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
