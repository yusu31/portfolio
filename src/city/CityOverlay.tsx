// 章とフェーズを示すオーバーレイ。
//
// ⚠ 文字色はパレットから導出していない。B の既知バグ「Amber 章はオーバーレイ文字が読めない
//   (橙の差し色を橙の空に重ねている)」を踏まないため、**暗いスクリムの上に白**という
//   4パレット全部で成立する組み合わせに逃がしてある。
//   `paletteAt(t)` から導出して ΔE 閾値で縛るのは PR 4〜5(§5.4)。
import { CHAPTERS } from './route'
import type { PhaseId } from './route'
import type { CityLocation } from './CityCamera'

const PHASE_LABEL: Record<PhaseId, string> = {
  street: '街区',
  open: '導入',
  venue: '敷地',
  exit: '退出',
}

type Props = {
  location: CityLocation
  /** 効いている QA ノブ。スクリーンショットに何の設定で撮ったかが写るようにする */
  flags: { outline: boolean; warp: boolean; landmarks: boolean }
}

export default function CityOverlay({ location, flags }: Props) {
  const chapter = CHAPTERS[location.chapter] ?? CHAPTERS[0]
  const off = [!flags.outline && 'ol=0', !flags.warp && 'warp=0', !flags.landmarks && 'land=0'].filter(Boolean)

  return (
    <div style={styles.root}>
      {/* 章の進み。4つの棒が満ちていく */}
      <div style={styles.progress}>
        {CHAPTERS.map((c, i) => (
          <span
            key={c.id}
            style={{
              ...styles.bar,
              background: i <= location.chapter ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.22)',
            }}
          />
        ))}
      </div>

      <div style={styles.panel}>
        {/* 街区で語られる物語 */}
        <div style={styles.story}>{chapter.story}</div>
        {/* 敷地で見せるセクション */}
        <div style={styles.section}>{chapter.section}</div>
        <div style={styles.meta}>
          <span style={styles.phase}>{PHASE_LABEL[location.phase]}</span>
          <span style={styles.verb}>{chapter.verb}</span>
        </div>
      </div>

      {off.length > 0 && <div style={styles.flags}>{off.join(' / ')}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: 'system-ui, -apple-system, "Hiragino Sans", sans-serif',
    color: '#fff',
  },
  progress: {
    position: 'absolute',
    top: 24,
    left: 28,
    display: 'flex',
    gap: 6,
  },
  bar: {
    display: 'block',
    width: 34,
    height: 2,
    borderRadius: 2,
    transition: 'background 400ms ease',
  },
  panel: {
    position: 'absolute',
    left: 28,
    bottom: 30,
    padding: '14px 20px 16px',
    borderRadius: 4,
    // 4パレット全部で文字が読める最小限のスクリム
    background: 'rgba(10,10,15,0.52)',
    backdropFilter: 'blur(6px)',
  },
  story: {
    fontSize: 12,
    letterSpacing: '0.08em',
    opacity: 0.72,
    marginBottom: 4,
  },
  section: {
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: '0.02em',
    lineHeight: 1.1,
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    fontSize: 11,
    letterSpacing: '0.1em',
    opacity: 0.66,
  },
  phase: {
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.34)',
  },
  verb: {},
  flags: {
    position: 'absolute',
    right: 24,
    bottom: 30,
    padding: '6px 10px',
    borderRadius: 4,
    background: 'rgba(10,10,15,0.52)',
    fontSize: 11,
    letterSpacing: '0.08em',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    opacity: 0.8,
  },
}
