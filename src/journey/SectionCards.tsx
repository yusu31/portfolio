// セクション連動のカードUI(設計書§4/§8)。
// 3D空間に埋め込まず、常に画面に固定されたHTMLオーバーレイとして表示する。
// アクティブセクションの切替(CameraRigから通知)でフェードイン/アウトする。
// パネルの見た目はLempens分析の「半透明ダークパネル」を暖色系に翻訳したもの。
import type { CSSProperties, ReactNode } from 'react'
import { PROJECT_CATEGORIES } from '../data/projects'
import { SKILL_CATEGORIES } from '../data/skills'
import { ABOUT_POINTS } from '../data/about'
import type { SectionId } from './sections'

const panelBase: CSSProperties = {
  position: 'fixed',
  top: '50%',
  right: 'clamp(16px, 4vw, 64px)',
  transform: 'translateY(-50%) translateX(24px)',
  width: 'min(400px, 42vw)',
  maxHeight: '76vh',
  overflowY: 'auto',
  padding: '24px 26px',
  borderRadius: 16,
  background: 'rgba(43, 24, 26, 0.78)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 240, 230, 0.16)',
  color: '#fff7f0',
  fontFamily: '"Plus Jakarta Sans", sans-serif',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 0.5s ease, transform 0.5s ease',
}

const panelActive: CSSProperties = {
  opacity: 1,
  pointerEvents: 'auto',
  transform: 'translateY(-50%) translateX(0)',
}

function Panel({ visible, children }: { visible: boolean; children: ReactNode }) {
  return <div style={visible ? { ...panelBase, ...panelActive } : panelBase}>{children}</div>
}

function SectionHeading({ en, ja, accent }: { en: string; ja: string; accent: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, letterSpacing: '0.22em', color: accent, fontWeight: 700 }}>{en}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{ja}</div>
    </div>
  )
}

const chipStyle = (accent: string): CSSProperties => ({
  display: 'inline-block',
  fontSize: 10.5,
  padding: '2px 8px',
  borderRadius: 999,
  border: `1px solid ${accent}55`,
  color: '#ffe9db',
  marginRight: 5,
  marginBottom: 4,
})

// Home: 画面固定のヒーローコピー(パネルではなく左下に直置き)
function HomeCard({ visible }: { visible: boolean }) {
  const style: CSSProperties = {
    position: 'fixed',
    left: 'clamp(20px, 6vw, 96px)',
    bottom: '18vh',
    maxWidth: 520,
    color: '#fff7f0',
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    textShadow: '0 2px 18px rgba(96, 40, 28, 0.5)',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
    pointerEvents: 'none',
  }
  return (
    <div style={style}>
      <div
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          padding: '4px 12px',
          borderRadius: 999,
          background: 'rgba(255, 107, 43, 0.85)',
          color: '#fff',
          marginBottom: 14,
        }}
      >
        体育教師 → エンジニア転身中
      </div>
      <h1 style={{ fontSize: 'clamp(26px, 3.4vw, 42px)', fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
        スポーツが育てた思考で、
        <br />
        プロダクトを作る
      </h1>
      <p style={{ fontSize: 14, marginTop: 12, opacity: 0.85 }}>求職中 — 2026年度 入社希望 / 自社開発・スタートアップ・副業に積極的</p>
      <div style={{ fontSize: 11, letterSpacing: '0.35em', marginTop: 26, opacity: 0.75 }}>SCROLL ↓</div>
    </div>
  )
}

function ProjectsCard({ visible }: { visible: boolean }) {
  return (
    <Panel visible={visible}>
      <SectionHeading en="PROJECTS" ja="作ったもの" accent="#4fc3f7" />
      {PROJECT_CATEGORIES.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: cat.color, letterSpacing: '0.08em', marginBottom: 6 }}>
            {cat.label}
          </div>
          {cat.projects.map((p) => (
            <div key={p.id} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: `2px solid ${cat.color}66` }}>
              <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                {p.name}
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 999,
                    background: p.status === 'live' ? 'rgba(105, 240, 174, 0.2)' : 'rgba(255,255,255,0.12)',
                    color: p.status === 'live' ? '#69f0ae' : '#d9c8c0',
                  }}
                >
                  {p.status === 'live' ? 'LIVE' : 'PLANNED'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.8, margin: '3px 0 5px' }}>{p.description}</div>
              <div>
                {p.tech.map((t) => (
                  <span key={t} style={chipStyle(cat.color)}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </Panel>
  )
}

function LevelDots({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <span style={{ letterSpacing: 2 }}>
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ color: i <= level ? color : 'rgba(255,255,255,0.22)', fontSize: 10 }}>
          ●
        </span>
      ))}
    </span>
  )
}

function SkillsCard({ visible }: { visible: boolean }) {
  return (
    <Panel visible={visible}>
      <SectionHeading en="SKILLS" ja="できること" accent="#ffb300" />
      {SKILL_CATEGORIES.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: cat.color, letterSpacing: '0.08em' }}>
            {cat.label}
            <span style={{ fontWeight: 400, color: '#e8d5cc', marginLeft: 8, fontSize: 11 }}>{cat.description}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            {cat.skills.map((s) => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12.5,
                  padding: '3px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span>{s.name}</span>
                <LevelDots level={s.level} color={cat.color} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </Panel>
  )
}

function AboutCard({ visible }: { visible: boolean }) {
  return (
    <Panel visible={visible}>
      <SectionHeading en="ABOUT" ja="自分について" accent="#69f0ae" />
      {ABOUT_POINTS.map((pt) => (
        <div key={pt.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#69f0ae', letterSpacing: '0.08em' }}>{pt.label}</div>
          <div style={{ fontSize: 15, fontWeight: 700, margin: '3px 0 5px' }}>{pt.title}</div>
          <div style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.85 }}>{pt.body}</div>
          <div style={{ marginTop: 7 }}>
            {pt.tags.map((t) => (
              <span key={t} style={chipStyle('#69f0ae')}>
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </Panel>
  )
}

export default function SectionCards({ active }: { active: SectionId | null }) {
  return (
    <>
      <HomeCard visible={active === 'home'} />
      <ProjectsCard visible={active === 'projects'} />
      <SkillsCard visible={active === 'skills'} />
      <AboutCard visible={active === 'about'} />
    </>
  )
}
