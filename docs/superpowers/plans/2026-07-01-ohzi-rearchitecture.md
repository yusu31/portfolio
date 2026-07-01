# OHZIリアーキテクチャ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Router v7 でルートベースSPAに移行し、各スポーツ3Dシーン（Soccer=Projects / Basketball=Skills / Volleyball=About）とContactページを実装する。

**Architecture:** 現行の「1Canvas全ページ共通 + スクロール長ページ」構造を廃止し、各ルートが独自Canvas・独自3Dシーンを持つルートベース構成に移行する。UI操作はスクロールではなくホットスポットクリック→グラスパネル表示とする。

**Tech Stack:** React 19 + R3F v9 + react-router-dom v7 + GSAP + Three.js + @react-three/drei + @react-three/postprocessing（Bloom）+ pnpm

---

## ファイル構成

### 新規作成
```
src/router.tsx
src/pages/HomeScene.tsx
src/pages/SoccerScene.tsx
src/pages/BasketballScene.tsx
src/pages/VolleyballScene.tsx
src/pages/ContactScene.tsx
src/data/projects.ts
src/data/skills.ts
src/data/about.ts
src/components/ui/GlobalNav.tsx
src/components/ui/GlassPanel.tsx
src/components/ui/Hotspot.tsx
src/components/ui/RouteTransition.tsx
src/components/canvas/soccer/SoccerCanvas.tsx
src/components/canvas/basketball/BasketballCanvas.tsx
src/components/canvas/volleyball/VolleyballCanvas.tsx
```

### 変更
```
src/App.tsx       → Router エントリーポイントのみ
src/main.tsx      → Lenis 削除（スクロール不要なルートが増えるため）
package.json      → react-router-dom 追加
```

### 削除（Task 10 で実行）
```
src/components/canvas/journey/SoccerScene.tsx   （旧JourneyZoneベース）
src/components/sections/JourneyZone.tsx
src/components/sections/Impact.tsx              （/work廃止に伴い削除）
src/components/sections/Story.tsx
src/components/sections/Projects.tsx
src/components/sections/Skills.tsx
src/components/sections/Blog.tsx
src/components/sections/Contact.tsx
src/components/sections/Footer.tsx
src/components/ui/Nav.tsx                       （GlobalNavに置換）
```

### 維持（変更なし）
```
src/components/canvas/Crystal.tsx
src/components/canvas/CameraRig.tsx
src/components/canvas/Effects.tsx
src/components/canvas/journey/BallJourney.tsx   （HomeScene用に継続使用）
src/components/canvas/journey/trajectory.ts
src/components/canvas/journey/scrollProgress.ts
src/components/ui/Cursor.tsx
src/components/ui/Loader.tsx
src/contexts/LanguageContext.tsx
```

---

## Task 1: react-router-dom インストール + App.tsx をRouter化

**Files:**
- Modify: `package.json`
- Rewrite: `src/App.tsx`
- Create: `src/router.tsx`

- [ ] **Step 1: react-router-dom v7 をインストール**

```bash
pnpm add react-router-dom@^7
```

Expected: `react-router-dom` が `package.json` の `dependencies` に追加される。

- [ ] **Step 2: src/router.tsx を作成**

```tsx
import { Routes, Route } from 'react-router-dom'
import HomeScene from './pages/HomeScene'
import SoccerScene from './pages/SoccerScene'
import BasketballScene from './pages/BasketballScene'
import VolleyballScene from './pages/VolleyballScene'
import ContactScene from './pages/ContactScene'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeScene />} />
      <Route path="/soccer" element={<SoccerScene />} />
      <Route path="/basketball" element={<BasketballScene />} />
      <Route path="/volleyball" element={<VolleyballScene />} />
      <Route path="/contact" element={<ContactScene />} />
    </Routes>
  )
}
```

- [ ] **Step 3: src/App.tsx を Router エントリーに書き換え**

```tsx
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { Suspense } from 'react'
import AppRoutes from './router'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import GlobalNav from './components/ui/GlobalNav'
import RouteTransition from './components/ui/RouteTransition'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Cursor />
        <Loader />
        <GlobalNav />
        <RouteTransition />
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </LanguageProvider>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: src/main.tsx から Lenis を削除**

Lenis はスクロール連動 3D のために使っていたが、新設計はクリックベースなので不要。

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import './styles/global.css'
import App from './App'

gsap.registerPlugin(ScrollTrigger, SplitText)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: 仮のページファイルを作成してビルドエラーを確認**

各ページの最小実装を作成（後のTaskで上書き）:

```bash
# 各ページの仮ファイルを一括作成
mkdir -p src/pages src/data src/components/ui src/components/canvas/soccer src/components/canvas/basketball src/components/canvas/volleyball
```

`src/pages/HomeScene.tsx`:
```tsx
export default function HomeScene() {
  return <div style={{ color: '#fff', padding: '2rem' }}>Home (WIP)</div>
}
```

同じ要領で `SoccerScene.tsx`, `BasketballScene.tsx`, `VolleyballScene.tsx`, `ContactScene.tsx` を作成（内容は `Home` → `Soccer` 等に変更）。

`src/components/ui/GlobalNav.tsx`:
```tsx
export default function GlobalNav() { return null }
```

`src/components/ui/RouteTransition.tsx`:
```tsx
export default function RouteTransition() { return null }
```

- [ ] **Step 6: 開発サーバーを起動してエラーがないか確認**

```bash
pnpm dev
```

Expected: `http://localhost:5173` でアプリが起動し、ブラウザに "Home (WIP)" が表示される。コンソールエラーなし。

- [ ] **Step 7: コミット**

```bash
git add src/App.tsx src/main.tsx src/router.tsx src/pages/ src/components/ui/GlobalNav.tsx src/components/ui/RouteTransition.tsx package.json pnpm-lock.yaml
git commit -m "feat: React Router v7導入 + Routerエントリーポイント化"
```

---

## Task 2: コンテンツデータファイル

**Files:**
- Create: `src/data/projects.ts`
- Create: `src/data/skills.ts`
- Create: `src/data/about.ts`

- [ ] **Step 1: src/data/projects.ts を作成**

```ts
export interface Project {
  id: string
  name: string
  description: string
  tech: string[]
  liveUrl?: string
  githubUrl?: string
  status: 'live' | 'planned'
}

export interface ProjectCategory {
  id: string
  icon: string
  label: string
  color: string
  hotspotX: string
  hotspotY: string
  projects: Project[]
}

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    id: 'webapp',
    icon: '🌐',
    label: 'Webアプリ',
    color: '#4fc3f7',
    hotspotX: '25%',
    hotspotY: '35%',
    projects: [
      {
        id: 'task-management',
        name: 'Task Management',
        description: 'タスク管理Webアプリ（RaiseTech課題）',
        tech: ['Spring Boot', 'React', 'MySQL', 'Docker'],
        githubUrl: 'https://github.com/yusu31/TaskManagement',
        status: 'live',
      },
      {
        id: 'event-finder',
        name: 'Event Finder',
        description: 'イベント検索・登録アプリ（RaiseTech課題）',
        tech: ['Spring Boot', 'React', 'MySQL'],
        githubUrl: 'https://github.com/yusu31/EventFinder',
        status: 'live',
      },
    ],
  },
  {
    id: 'game',
    icon: '🎮',
    label: 'ゲーム',
    color: '#ffb300',
    hotspotX: '70%',
    hotspotY: '40%',
    projects: [
      {
        id: 'typing-dungeon',
        name: 'TYPING DUNGEON',
        description: 'プログラミング用語タイピングRPG',
        tech: ['Phaser.js', 'TypeScript', 'Gemini API'],
        status: 'planned',
      },
      {
        id: 'marathon-rpg',
        name: 'MARATHON RPG',
        description: '実走距離でキャラが進むRPG',
        tech: ['React', 'Samsung Health API', 'Phaser.js'],
        status: 'planned',
      },
    ],
  },
  {
    id: 'website',
    icon: '🖥',
    label: 'Webサイト / LP',
    color: '#69f0ae',
    hotspotX: '30%',
    hotspotY: '65%',
    projects: [
      {
        id: 'portfolio',
        name: 'このポートフォリオ',
        description: 'ohzi.io風3Dインタラクティブポートフォリオ',
        tech: ['React', 'Three.js', 'R3F', 'GSAP'],
        githubUrl: 'https://github.com/yusu31/portfolio',
        status: 'live',
      },
    ],
  },
  {
    id: 'tool',
    icon: '🔧',
    label: 'ツール / 自動化',
    color: '#ce93d8',
    hotspotX: '68%',
    hotspotY: '65%',
    projects: [
      {
        id: 'error-translator',
        name: 'エラー翻訳くん',
        description: '英語エラーを日本語で解説するChrome拡張',
        tech: ['TypeScript', 'Chrome Extension API', 'Gemini API'],
        status: 'planned',
      },
    ],
  },
]
```

- [ ] **Step 2: src/data/skills.ts を作成**

```ts
export interface Skill {
  name: string
}

export interface SkillCategory {
  id: string
  label: string
  description: string
  color: string
  hotspotX: string
  hotspotY: string
  skills: Skill[]
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'frontend',
    label: 'Frontend',
    description: 'UIとインタラクション',
    color: '#4fc3f7',
    hotspotX: '22%',
    hotspotY: '45%',
    skills: [
      { name: 'React 19' },
      { name: 'TypeScript' },
      { name: 'Three.js / R3F' },
      { name: 'GSAP' },
      { name: 'Tailwind CSS v4' },
      { name: 'Vite 6' },
    ],
  },
  {
    id: 'backend',
    label: 'Backend',
    description: 'サーバーとデータ',
    color: '#ffb300',
    hotspotX: '50%',
    hotspotY: '35%',
    skills: [
      { name: 'Java' },
      { name: 'Spring Boot' },
      { name: 'MySQL' },
      { name: 'REST API' },
      { name: 'JUnit 5' },
      { name: 'MyBatis' },
    ],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    description: 'デプロイと環境',
    color: '#69f0ae',
    hotspotX: '75%',
    hotspotY: '48%',
    skills: [
      { name: 'AWS (EC2, RDS, S3)' },
      { name: 'Docker' },
      { name: 'GitHub Actions' },
      { name: 'Cloudflare Pages' },
      { name: 'Git / GitHub' },
    ],
  },
]
```

- [ ] **Step 3: src/data/about.ts を作成**

```ts
export interface AboutPoint {
  id: string
  label: string
  title: string
  body: string
  color: string
  hotspotX: string
  hotspotY: string
}

export const ABOUT_POINTS: AboutPoint[] = [
  {
    id: 'background',
    label: 'Background',
    title: 'バックグラウンド',
    body: '10年間、体育教師として生徒の成長を設計してきた。テクノロジーが教育を変える瞬間を目撃し、エンジニアへ転身。深夜に初めてHTMLを書いた日から、教えることと作ることをコードでつないできた。',
    color: '#69f0ae',
    hotspotX: '25%',
    hotspotY: '38%',
  },
  {
    id: 'style',
    label: 'Work Style',
    title: '仕事スタイル',
    body: '設計が9割。ユーザーが迷わない、1機能に特化したプロダクトを信条とする。チームの中で動き、ドリブルもパスも使い分ける。問題はコードで解くより先に言葉で解く。',
    color: '#69f0ae',
    hotspotX: '60%',
    hotspotY: '32%',
  },
  {
    id: 'seeking',
    label: 'Looking For',
    title: '求める環境',
    body: 'プロダクトを一緒に育てる自社開発の環境。エンジニアとしての成長と、社会への価値提供を同時に追える場所。副業・スタートアップへの参加にも積極的。',
    color: '#69f0ae',
    hotspotX: '45%',
    hotspotY: '62%',
  },
]
```

- [ ] **Step 4: TypeScript の型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 5: コミット**

```bash
git add src/data/
git commit -m "feat: コンテンツデータファイル作成（projects/skills/about）"
```

---

## Task 3: 共通UIコンポーネント（GlassPanel・Hotspot・RouteTransition）

**Files:**
- Create: `src/components/ui/GlassPanel.tsx`
- Create: `src/components/ui/Hotspot.tsx`
- Rewrite: `src/components/ui/RouteTransition.tsx`

- [ ] **Step 1: src/components/ui/GlassPanel.tsx を作成**

```tsx
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
      {/* backdrop tap-to-close */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 90,
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          right: '3rem',
          top: '50%',
          width: 'min(400px, calc(100vw - 4rem))',
          background: 'rgba(10,10,20,0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '1.8rem',
          zIndex: 100,
          pointerEvents: open ? 'auto' : 'none',
          transform: open
            ? 'translate(0, -50%)'
            : 'translate(110%, -50%)',
          opacity: open ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease',
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
```

- [ ] **Step 2: src/components/ui/Hotspot.tsx を作成**

```tsx
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
      {/* rings */}
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
```

- [ ] **Step 3: src/components/ui/RouteTransition.tsx を書き換え**

```tsx
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const ROUTE_COLORS: Record<string, string> = {
  '/': '#ff6b2b',
  '/soccer': '#4fc3f7',
  '/basketball': '#ffb300',
  '/volleyball': '#69f0ae',
  '/contact': '#ce93d8',
}

export default function RouteTransition() {
  const { pathname } = useLocation()
  const overlayRef = useRef<HTMLDivElement>(null)
  const prevPath = useRef<string | null>(null)

  useEffect(() => {
    if (prevPath.current === null) {
      prevPath.current = pathname
      return
    }
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    const el = overlayRef.current
    if (!el) return

    const color = ROUTE_COLORS[pathname] ?? '#ffffff'
    el.style.transition = 'none'
    el.style.backgroundColor = color
    el.style.opacity = '0.5'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.6s ease'
        el.style.opacity = '0'
      })
    })
  }, [pathname])

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        pointerEvents: 'none',
        opacity: 0,
      }}
    />
  )
}
```

- [ ] **Step 4: TypeScript 型チェック**

```bash
pnpm exec tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 5: コミット**

```bash
git add src/components/ui/GlassPanel.tsx src/components/ui/Hotspot.tsx src/components/ui/RouteTransition.tsx
git commit -m "feat: 共通UIコンポーネント追加（GlassPanel / Hotspot / RouteTransition）"
```

---

## Task 4: GlobalNav

**Files:**
- Rewrite: `src/components/ui/GlobalNav.tsx`

- [ ] **Step 1: src/components/ui/GlobalNav.tsx を実装**

```tsx
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/soccer',     label: 'Projects' },
  { path: '/basketball', label: 'Skills' },
  { path: '/volleyball', label: 'About' },
  { path: '/contact',    label: 'Contact' },
] as const

export default function GlobalNav() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.2rem clamp(1.5rem, 5vw, 3rem)',
        backdropFilter: isHome ? 'none' : 'blur(16px)',
        WebkitBackdropFilter: isHome ? 'none' : 'blur(16px)',
        background: isHome ? 'transparent' : 'rgba(10,10,15,0.55)',
        borderBottom: isHome ? 'none' : '1px solid rgba(255,255,255,0.05)',
        transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
        pointerEvents: 'auto',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        style={{
          fontWeight: 800,
          fontSize: '1.1rem',
          letterSpacing: '-0.06em',
          color: '#fff',
          textDecoration: 'none',
        }}
      >
        yu<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
      </Link>

      {/* Desktop links */}
      <ul
        className="nav-links"
        style={{
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          margin: 0,
          padding: 0,
        }}
      >
        {NAV_ITEMS.map(({ path, label }) => (
          <li key={path}>
            <Link
              to={path}
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: pathname === path ? '#ff6b2b' : 'rgba(255,255,255,0.55)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: 開発サーバーで動作確認**

```bash
pnpm dev
```

ブラウザで `http://localhost:5173` を開き、ナビのリンクをクリックして `/soccer`, `/basketball` 等にルート遷移することを確認。フラッシュエフェクトが発動することを確認。

- [ ] **Step 3: コミット**

```bash
git add src/components/ui/GlobalNav.tsx
git commit -m "feat: GlobalNav実装（react-router Link + アクティブルートハイライト）"
```

---

## Task 5: HomeScene（既存Hero + 4グリッドナビ）

**Files:**
- Rewrite: `src/pages/HomeScene.tsx`

HomeScene は既存の `App.tsx`（Canvasレイヤー）と `Hero.tsx`（UIレイヤー）を吸収し、さらに4グリッドナビを追加する。

- [ ] **Step 1: src/pages/HomeScene.tsx を実装**

```tsx
import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import Scene from '../components/canvas/Scene'

const NAV_GRID = [
  { path: '/soccer',     icon: '⚽', label: 'Projects', desc: '作ったもの',   color: '#4fc3f7' },
  { path: '/basketball', icon: '🏀', label: 'Skills',   desc: 'できること',  color: '#ffb300' },
  { path: '/volleyball', icon: '🏐', label: 'About',    desc: '自分について', color: '#69f0ae' },
  { path: '/contact',    icon: '✉',  label: 'Contact',  desc: '連絡先',      color: '#ce93d8' },
] as const

export default function HomeScene() {
  const navigate = useNavigate()
  const heyRef   = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const subRef   = useRef<HTMLParagraphElement>(null)
  const ctaRef   = useRef<HTMLDivElement>(null)
  const gridRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heyRef.current) {
        try {
          const split = SplitText.create(heyRef.current, { type: 'chars', mask: 'chars' })
          gsap.from(split.chars, {
            yPercent: 110,
            duration: 0.85,
            stagger: 0.06,
            ease: 'power3.out',
            delay: 0.3,
          })
        } catch {
          gsap.from(heyRef.current, { opacity: 0, y: 30, duration: 0.85, delay: 0.3 })
        }
      }
      gsap.from(badgeRef.current, { opacity: 0, y: 10, duration: 0.5, delay: 0.2 })
      gsap.from(subRef.current,   { opacity: 0, y: 14, duration: 0.6, delay: 1.0 })
      gsap.from(ctaRef.current,   { opacity: 0, y: 8,  duration: 0.5, delay: 1.15 })
      gsap.from(gridRef.current,  { opacity: 0, y: 16, duration: 0.6, delay: 1.3 })
    })
    return () => ctx.revert()
  }, [])

  const handleExplore = () => {
    window.dispatchEvent(new CustomEvent('explore-click'))
    setTimeout(() => navigate('/soccer'), 600)
  }

  return (
    <>
      {/* 3D Canvas Layer */}
      <Canvas
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%',
          height: '100vh',
          zIndex: 0,
        }}
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>

      {/* UI Layer */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        {/* 左上テキストブロック */}
        <div
          style={{
            paddingTop: 'clamp(5rem, 13vh, 8.5rem)',
            paddingLeft: 'clamp(3rem, 7vw, 6rem)',
            maxWidth: '480px',
            pointerEvents: 'auto',
          }}
        >
          {/* バッジ */}
          <div
            ref={badgeRef}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 1rem',
              marginBottom: '1.25rem',
              borderRadius: '999px',
              background: 'rgba(251,191,36,.12)',
              border: '1px solid rgba(251,191,36,.28)',
              color: '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#ff6b2b',
                animation: 'blink 2.4s ease-in-out infinite',
              }}
            />
            体育教師 → エンジニア転身中
          </div>

          {/* HEY. */}
          <span
            ref={heyRef}
            style={{
              display: 'block',
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1,
              marginBottom: '0.85rem',
              fontSize: 'clamp(3.5rem, 7vw, 5.5rem)',
              letterSpacing: '-0.06em',
            }}
          >
            HEY<em style={{ fontStyle: 'normal', color: '#ff6b2b' }}>.</em>
          </span>

          {/* 1行自己紹介 */}
          <p
            ref={subRef}
            style={{
              color: 'rgba(255,255,255,.60)',
              lineHeight: 1.9,
              fontSize: '0.875rem',
              maxWidth: '340px',
              margin: 0,
            }}
          >
            スポーツが育てた思考で、プロダクトを作る。
          </p>
        </div>

        {/* 下部 — EXPLORE + 4グリッドナビ */}
        <div
          style={{
            paddingBottom: 'clamp(2rem, 5vh, 4rem)',
            paddingLeft: 'clamp(1.5rem, 5vw, 3rem)',
            paddingRight: 'clamp(1.5rem, 5vw, 3rem)',
            pointerEvents: 'auto',
          }}
        >
          {/* EXPLORE ボタン */}
          <div ref={ctaRef} style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <button
              onClick={handleExplore}
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.22em',
                padding: '0.9rem 3.5rem',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,.35)',
                color: '#fff',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.25s, color 0.25s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.background = '#fff'
                el.style.color = '#0a0a0f'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.background = 'transparent'
                el.style.color = '#fff'
              }}
            >
              EXPLORE
            </button>
          </div>

          {/* 4グリッドナビ */}
          <div
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.8rem',
              maxWidth: '560px',
              margin: '0 auto',
            }}
          >
            {NAV_GRID.map(({ path, icon, label, desc, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: '10px',
                  padding: '0.9rem 0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = `${color}18`
                  el.style.borderColor = `${color}44`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.04)'
                  el.style.borderColor = 'rgba(255,255,255,0.08)'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontSize: '0.55rem', color: '#555' }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.1; }
        }
      `}</style>
    </>
  )
}
```

- [ ] **Step 2: Scene.tsx から BallJourney を一時的に無効化**

BallJourney は旧 JourneyZone（スクロール連動）のため、HomeScene では無効化する。`src/components/canvas/Scene.tsx` を編集：

```tsx
// src/components/canvas/Scene.tsx の BallJourney 行を削除
// Before:
//   <BallJourney onSunReady={setSunMesh} />
// After: 行ごと削除（BallJourneyのimportも削除）

import { useRef, useMemo, useEffect } from 'react'
import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import { getHeroScrollRange } from './heroScrollRange'
import Crystal from './Crystal'
import Effects from './Effects'

// ... (rippleVert / rippleFrag / GroundRipple は変更なし) ...

function CrystalContainer() {
  const grpRef = useRef<THREE.Group>(null)

  useEffect(() => {
    const onExplore = () => {
      if (!grpRef.current) return
      gsap.to(grpRef.current.position, { x: 5, duration: 1.1, ease: 'power2.in' })
      gsap.to(grpRef.current.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.7,
        delay: 0.45,
        ease: 'power2.in',
        onComplete: () => {
          if (grpRef.current) {
            grpRef.current.position.x = 0
            grpRef.current.scale.set(1, 1, 1)
          }
        },
      })
    }
    window.addEventListener('explore-click', onExplore)
    return () => window.removeEventListener('explore-click', onExplore)
  }, [])

  useFrame(() => {
    if (!grpRef.current) return
    grpRef.current.visible = window.scrollY <= getHeroScrollRange()
  })

  return (
    <group ref={grpRef} position={[0, -0.4, 0]}>
      <Crystal />
    </group>
  )
}

export default function Scene() {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <Environment preset="sunset" resolution={64} />
      <ambientLight intensity={0.06} />
      <pointLight position={[4, 5, 5]}   intensity={35} color="#fff5e0" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#fb923c" />
      <pointLight position={[0, 4, -5]}  intensity={18} color="#c0d8ff" />
      <pointLight position={[2, -5, -3]} intensity={20} color="#ffd090" />
      <CameraRig />
      <CrystalContainer />
      <GroundRipple />
      <Effects />
    </>
  )
}
```

- [ ] **Step 3: 開発サーバーで HomeScene を確認**

```bash
pnpm dev
```

`http://localhost:5173/` でクリスタル + HEY. + 4グリッドナビが表示されることを確認。グリッドのボタンをクリックして各ルートに遷移することを確認。

- [ ] **Step 4: コミット**

```bash
git add src/pages/HomeScene.tsx src/components/canvas/Scene.tsx
git commit -m "feat: HomeScene実装（クリスタル + HEY. + 4グリッドナビ）"
```

---

## Task 6: ContactScene

**Files:**
- Rewrite: `src/pages/ContactScene.tsx`

- [ ] **Step 1: src/pages/ContactScene.tsx を実装**

```tsx
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
    href: '/resume.pdf',
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
              const el = e.currentTarget
              el.style.background = `${color}12`
              el.style.borderColor = `${color}40`
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(255,255,255,0.03)'
              el.style.borderColor = 'rgba(255,255,255,0.07)'
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
```

- [ ] **Step 2: /contact で動作確認**

`http://localhost:5173/contact` にアクセスして連絡先が表示されることを確認。Email リンクがメーラーを開くことを確認。

- [ ] **Step 3: コミット**

```bash
git add src/pages/ContactScene.tsx
git commit -m "feat: ContactScene実装（Email / GitHub / Resume）"
```

---

## Task 7: SoccerCanvas（3D シーン）

**Files:**
- Create: `src/components/canvas/soccer/SoccerCanvas.tsx`

このコンポーネントが `/soccer` ページの 3D 背景を担う。ミッドナイトブルーフォグ + サッカーゴール枠 + 芝フロア + 自動アニメーションするボール。

- [ ] **Step 1: src/components/canvas/soccer/SoccerCanvas.tsx を作成**

```tsx
import { useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { useFrame } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Mesh, Group } from 'three'

// ── Ball ──────────────────────────────────────────
function SoccerBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.z = Math.sin(t * 0.4) * 1.5
    ref.current.position.x = Math.sin(t * 0.25) * 0.6
    ref.current.position.y = Math.abs(Math.sin(t * 2.8)) * 0.35 - 0.3
    ref.current.rotation.x = t * 1.8
    ref.current.rotation.z = t * 0.9
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color="#fdba74"
        emissive="#f97316"
        emissiveIntensity={1.6}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

// ── Goal Frame ────────────────────────────────────
function GoalFrame() {
  const W = 3.6, H = 1.8, T = 0.06
  const mat = (
    <meshStandardMaterial
      color="white"
      emissive="white"
      emissiveIntensity={2.5}
      roughness={0.1}
    />
  )
  return (
    <group position={[0, -0.2, -7]}>
      {/* top bar */}
      <mesh position={[0, H, 0]} castShadow>
        <boxGeometry args={[W, T, T]} />{mat}
      </mesh>
      {/* left post */}
      <mesh position={[-W / 2, H / 2, 0]} castShadow>
        <boxGeometry args={[T, H, T]} />{mat}
      </mesh>
      {/* right post */}
      <mesh position={[W / 2, H / 2, 0]} castShadow>
        <boxGeometry args={[T, H, T]} />{mat}
      </mesh>
    </group>
  )
}

// ── Grass Floor ───────────────────────────────────
function GrassFloor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.65, 0]}
      receiveShadow
    >
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial
        color="#0d2210"
        roughness={0.95}
        metalness={0}
      />
    </mesh>
  )
}

// ── Scene Lights ──────────────────────────────────
function SoccerLights() {
  return (
    <>
      <ambientLight intensity={0.04} />
      <directionalLight
        position={[0, 10, 5]}
        intensity={1.2}
        color="#8ab4d0"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-4, 4, 2]}  intensity={20} color="#4fc3f7" />
      <pointLight position={[4, 4, -4]}  intensity={15} color="#1a3a5c" />
    </>
  )
}

// ── Camera auto-drift ─────────────────────────────
function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.12) * 0.5
    camera.position.y = -0.3 + Math.sin(t * 0.08) * 0.15
    camera.position.z = 4.5 + Math.sin(t * 0.06) * 0.3
    camera.lookAt(0, 0.3, -3)
  })
  return null
}

// ── Main Export ───────────────────────────────────
export default function SoccerCanvas() {
  return (
    <Canvas
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
      }}
      camera={{ position: [0, -0.3, 4.5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#050b1a']} />
      <fog attach="fog" args={['#0a1128', 8, 35]} />

      <SoccerLights />
      <Environment preset="night" resolution={64} />
      <CameraDrift />

      <SoccerBall />
      <GoalFrame />
      <GrassFloor />

      <EffectComposer>
        <Bloom
          intensity={1.4}
          luminanceThreshold={0.65}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/canvas/soccer/SoccerCanvas.tsx
git commit -m "feat: SoccerCanvas 3Dシーン（ゴール枠・芝・フォグ・Bloom）"
```

---

## Task 8: SoccerScene ページ（Projects + ホットスポット + グラスパネル）

**Files:**
- Rewrite: `src/pages/SoccerScene.tsx`

- [ ] **Step 1: src/pages/SoccerScene.tsx を実装**

```tsx
import { Suspense, useState } from 'react'
import { PROJECT_CATEGORIES, type ProjectCategory } from '../data/projects'
import SoccerCanvas from '../components/canvas/soccer/SoccerCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#4fc3f7'

function ProjectList({ category }: { category: ProjectCategory }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {category.projects.map((p) => (
        <div
          key={p.id}
          style={{
            padding: '0.9rem 1rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ddd' }}>{p.name}</span>
            <span
              style={{
                fontSize: '0.55rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '3px',
                background: p.status === 'live' ? '#1a2a10' : '#1a1a2a',
                color: p.status === 'live' ? '#6dbf40' : '#7986cb',
                fontWeight: 700,
              }}
            >
              {p.status === 'live' ? 'LIVE' : 'PLANNED'}
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: '#666', margin: '0 0 0.5rem' }}>{p.description}</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {p.tech.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: '0.55rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '3px',
                  background: 'rgba(79,195,247,0.1)',
                  color: ACCENT,
                }}
              >
                {t}
              </span>
            ))}
          </div>
          {p.githubUrl && (
            <a
              href={p.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.62rem',
                color: ACCENT,
                textDecoration: 'none',
                border: `1px solid ${ACCENT}44`,
                padding: '0.2rem 0.6rem',
                borderRadius: '4px',
                display: 'inline-block',
              }}
            >
              GitHub →
            </a>
          )}
        </div>
      ))}
    </div>
  )
}

export default function SoccerScene() {
  const [activeId, setActiveId] = useState<string | null>(null)

  const activeCategory = PROJECT_CATEGORIES.find((c) => c.id === activeId) ?? null

  const handleHotspot = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <Suspense fallback={null}>
        <SoccerCanvas />
      </Suspense>

      {/* UI overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {/* Page label */}
        <div
          style={{
            position: 'absolute',
            bottom: '2.5rem',
            left: '3rem',
            pointerEvents: 'none',
          }}
        >
          <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            /soccer
          </p>
          <p style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, margin: '0.2rem 0 0' }}>
            Projects — 作ったもの
          </p>
        </div>

        {/* Hotspots */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {PROJECT_CATEGORIES.map((cat) => (
            <Hotspot
              key={cat.id}
              x={cat.hotspotX}
              y={cat.hotspotY}
              label={cat.label}
              color={cat.color}
              active={activeId === cat.id}
              onClick={() => handleHotspot(cat.id)}
            />
          ))}
        </div>

        {/* Glass Panel */}
        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!activeCategory}
            onClose={() => setActiveId(null)}
            title={activeCategory ? `${activeCategory.icon} ${activeCategory.label}` : ''}
            color={activeCategory?.color ?? ACCENT}
          >
            {activeCategory && <ProjectList category={activeCategory} />}
          </GlassPanel>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: `/soccer` で動作確認**

`http://localhost:5173/soccer` にアクセスして以下を確認：
- 3D シーン（ゴール枠・芝・ボール）が表示される
- ホットスポット（⚽🎮🖥🔧）が画面上に表示される
- クリックするとグラスパネルが右からスライドインする
- ✕ またはパネル外クリックで閉じる

- [ ] **Step 3: コミット**

```bash
git add src/pages/SoccerScene.tsx
git commit -m "feat: SoccerScene実装（Projects 4カテゴリ + グラスパネル）"
```

---

## Task 9: BasketballCanvas + BasketballScene（Skills）

**Files:**
- Create: `src/components/canvas/basketball/BasketballCanvas.tsx`
- Rewrite: `src/pages/BasketballScene.tsx`

- [ ] **Step 1: src/components/canvas/basketball/BasketballCanvas.tsx を作成**

```tsx
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { Mesh } from 'three'

function BasketballBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.y = 0.8 + Math.sin(t * 1.8) * 0.6
    ref.current.position.x = Math.sin(t * 0.3) * 0.4
    ref.current.rotation.z = t * 1.2
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.32, 32, 32]} />
      <meshStandardMaterial
        color="#c45200"
        emissive="#ff7c00"
        emissiveIntensity={1.0}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

function BackboardFrame() {
  const W = 1.8, H = 1.1, T = 0.07
  const mat = (
    <meshStandardMaterial
      color="white"
      emissive="white"
      emissiveIntensity={2.0}
      roughness={0.1}
    />
  )
  return (
    <group position={[0, 3.0, -5]}>
      <mesh position={[0, H / 2, 0]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[0, -H / 2, 0]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[-W / 2, 0, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[W / 2, 0, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
    </group>
  )
}

function GymFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={512}
        mixBlur={0.9}
        mixStrength={1.8}
        roughness={0.85}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#1a0800"
        metalness={0.1}
      />
    </mesh>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.1) * 0.6
    camera.position.y = 0.5 + Math.sin(t * 0.07) * 0.2
    camera.position.z = 5 + Math.sin(t * 0.05) * 0.3
    camera.lookAt(0, 1.5, -2)
  })
  return null
}

export default function BasketballCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0.5, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#100600']} />
      <fog attach="fog" args={['#b35a00', 10, 30]} />

      <ambientLight intensity={0.05} />
      <directionalLight position={[0, 8, 3]} intensity={1.5} color="#ffb74d" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 5, 2]} intensity={25} color="#ffb300" />
      <pointLight position={[3, 3, -3]} intensity={15} color="#7c4a00" />

      <Environment preset="warehouse" resolution={64} />
      <CameraDrift />

      <BasketballBall />
      <BackboardFrame />
      <GymFloor />

      <EffectComposer>
        <Bloom intensity={1.2} luminanceThreshold={0.65} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
```

- [ ] **Step 2: src/pages/BasketballScene.tsx を実装**

```tsx
import { Suspense, useState } from 'react'
import { SKILL_CATEGORIES, type SkillCategory } from '../data/skills'
import BasketballCanvas from '../components/canvas/basketball/BasketballCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#ffb300'

function SkillList({ category }: { category: SkillCategory }) {
  return (
    <div>
      <p style={{ fontSize: '0.68rem', color: '#666', marginBottom: '1rem' }}>{category.description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {category.skills.map((s) => (
          <div
            key={s.name}
            style={{
              padding: '0.6rem 0.9rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#ccc',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: category.color, flexShrink: 0 }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BasketballScene() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeCategory = SKILL_CATEGORIES.find((c) => c.id === activeId) ?? null

  return (
    <>
      <Suspense fallback={null}>
        <BasketballCanvas />
      </Suspense>

      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '2.5rem', left: '3rem' }}>
          <p style={{ fontSize: '0.6rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/basketball</p>
          <p style={{ fontSize: '0.75rem', color: ACCENT, fontWeight: 700, margin: '0.2rem 0 0' }}>Skills — できること</p>
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}>
          {SKILL_CATEGORIES.map((cat) => (
            <Hotspot
              key={cat.id}
              x={cat.hotspotX}
              y={cat.hotspotY}
              label={cat.label}
              color={cat.color}
              active={activeId === cat.id}
              onClick={() => setActiveId((prev) => (prev === cat.id ? null : cat.id))}
            />
          ))}
        </div>

        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!activeCategory}
            onClose={() => setActiveId(null)}
            title={activeCategory?.label ?? ''}
            color={activeCategory?.color ?? ACCENT}
          >
            {activeCategory && <SkillList category={activeCategory} />}
          </GlassPanel>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: `/basketball` で動作確認**

`http://localhost:5173/basketball` で体育館アンバーの 3D シーン + スキルホットスポットが表示されることを確認。

- [ ] **Step 4: コミット**

```bash
git add src/components/canvas/basketball/BasketballCanvas.tsx src/pages/BasketballScene.tsx
git commit -m "feat: BasketballScene実装（Skills 3カテゴリ + 体育館シーン）"
```

---

## Task 10: VolleyballCanvas + VolleyballScene（About）

**Files:**
- Create: `src/components/canvas/volleyball/VolleyballCanvas.tsx`
- Rewrite: `src/pages/VolleyballScene.tsx`

- [ ] **Step 1: src/components/canvas/volleyball/VolleyballCanvas.tsx を作成**

```tsx
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import type { Mesh } from 'three'

function VolleyballBall() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (!ref.current) return
    ref.current.position.y = 0.5 + Math.sin(t * 1.2) * 0.8
    ref.current.position.x = Math.sin(t * 0.35) * 0.5
    ref.current.rotation.x = t * 0.8
    ref.current.rotation.y = t * 1.1
  })
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.28, 32, 32]} />
      <meshStandardMaterial
        color="#e8f0e8"
        emissive="#69f0ae"
        emissiveIntensity={0.8}
        roughness={0.4}
        metalness={0.05}
      />
    </mesh>
  )
}

function VolleyballNet() {
  const W = 5.5, T = 0.07
  const mat = (
    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.8} roughness={0.1} />
  )
  return (
    <group position={[0, 0.4, -4]}>
      {/* top tape */}
      <mesh position={[0, 0, 0]}><boxGeometry args={[W, T * 2, T]} />{mat}</mesh>
      {/* left pole */}
      <mesh position={[-W / 2, -0.5, 0]}><boxGeometry args={[T, 1.0, T]} />{mat}</mesh>
      {/* right pole */}
      <mesh position={[W / 2, -0.5, 0]}><boxGeometry args={[T, 1.0, T]} />{mat}</mesh>
    </group>
  )
}

function GridFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#001a12" roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[20, 24, '#004d40', '#004d40']} position={[0, -0.64, 0]} />
    </>
  )
}

function CameraDrift() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.09) * 0.7
    camera.position.y = 0.3 + Math.sin(t * 0.06) * 0.2
    camera.position.z = 4.8 + Math.sin(t * 0.05) * 0.4
    camera.lookAt(0, 0.5, -2)
  })
  return null
}

export default function VolleyballCanvas() {
  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0.3, 4.8], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      shadows
    >
      <color attach="background" args={['#001410']} />
      <fog attach="fog" args={['#004d40', 10, 30]} />

      <ambientLight intensity={0.04} />
      <directionalLight position={[0, 8, 3]} intensity={1.0} color="#80cbc4" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 4, 2]} intensity={20} color="#26a69a" />
      <pointLight position={[3, 3, -3]} intensity={12} color="#004d40' />

      <Environment preset="dawn" resolution={64} />
      <CameraDrift />

      <VolleyballBall />
      <VolleyballNet />
      <GridFloor />

      <EffectComposer>
        <Bloom intensity={1.3} luminanceThreshold={0.6} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
```

- [ ] **Step 2: src/pages/VolleyballScene.tsx を実装**

```tsx
import { Suspense, useState } from 'react'
import { ABOUT_POINTS, type AboutPoint } from '../data/about'
import VolleyballCanvas from '../components/canvas/volleyball/VolleyballCanvas'
import Hotspot from '../components/ui/Hotspot'
import GlassPanel from '../components/ui/GlassPanel'

const ACCENT = '#69f0ae'

function AboutContent({ point }: { point: AboutPoint }) {
  return (
    <p
      style={{
        fontSize: '0.78rem',
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 2.0,
        margin: 0,
      }}
    >
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
```

- [ ] **Step 3: `/volleyball` で動作確認**

`http://localhost:5173/volleyball` でサイアン/エメラルド 3D シーン + About ホットスポットが表示されることを確認。

- [ ] **Step 4: コミット**

```bash
git add src/components/canvas/volleyball/VolleyballCanvas.tsx src/pages/VolleyballScene.tsx
git commit -m "feat: VolleyballScene実装（About 3ポイント + ネット・グリッドシーン）"
```

---

## Task 11: 旧ファイル削除 + クリーンアップ

**Files:**
- Delete: `src/components/canvas/journey/SoccerScene.tsx`
- Delete: `src/components/sections/JourneyZone.tsx`
- Delete: `src/components/sections/Impact.tsx`
- Delete: `src/components/sections/Story.tsx`
- Delete: `src/components/sections/Projects.tsx`
- Delete: `src/components/sections/Skills.tsx`
- Delete: `src/components/sections/Blog.tsx`
- Delete: `src/components/sections/Contact.tsx`
- Delete: `src/components/sections/Footer.tsx`
- Delete: `src/components/ui/Nav.tsx`
- Delete: `src/components/sections/Hero.tsx`

- [ ] **Step 1: 旧ファイルを削除**

```bash
git rm src/components/canvas/journey/SoccerScene.tsx
git rm src/components/sections/JourneyZone.tsx
git rm src/components/sections/Impact.tsx
git rm src/components/sections/Story.tsx
git rm src/components/sections/Projects.tsx
git rm src/components/sections/Skills.tsx
git rm src/components/sections/Blog.tsx
git rm src/components/sections/Contact.tsx
git rm src/components/sections/Footer.tsx
git rm src/components/ui/Nav.tsx
git rm src/components/sections/Hero.tsx
```

- [ ] **Step 2: BallJourney.tsx・コンテキストファイルの確認**

`src/components/canvas/journey/BallJourney.tsx` は旧 SoccerScene を import しているので内容を確認し、空のグループに変更するか削除する。現在 HomeScene の Scene.tsx で BallJourney を既に外しているため、不要であれば削除：

```bash
git rm src/components/canvas/journey/BallJourney.tsx
```

LanguageContext は今後も使う可能性があるため維持する。

- [ ] **Step 3: TypeScript 型チェック + ビルド**

```bash
pnpm exec tsc --noEmit
pnpm build
```

Expected: エラーなし。`dist/` フォルダが生成される。

- [ ] **Step 4: 全ルートの最終動作確認**

```bash
pnpm dev
```

- `http://localhost:5173/` — クリスタル + HEY. + 4グリッドナビ
- `http://localhost:5173/soccer` — サッカービネット + プロジェクトパネル
- `http://localhost:5173/basketball` — 体育館シーン + スキルパネル
- `http://localhost:5173/volleyball` — ネットシーン + Aboutパネル
- `http://localhost:5173/contact` — シンプル連絡先ページ
- ナビの各リンクでフラッシュトランジションが動作する

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "chore: 旧ファイル削除（JourneyZone / 旧sections / 旧Nav）"
```

---

## Task 12: Issue・PR・マージ

- [ ] **Step 1: GitHub Issue を作成**

```bash
gh issue create \
  --title "feat: OHZIリアーキテクチャ実装（Router + 3スポーツシーン + Contact）" \
  --body "設計書 docs/superpowers/specs/2026-07-01-ohzi-rewrite-design.md に基づくルートベースSPAの完全実装。"
```

- [ ] **Step 2: feature ブランチで作業していることを確認**

```bash
git log --oneline -5
git branch
```

- [ ] **Step 3: PR を作成してマージ**

```bash
gh pr create \
  --title "feat: OHZIリアーキテクチャ実装 (#XX)" \
  --body "## 概要
React Router v7 + 各スポーツルート（Soccer/Basketball/Volleyball）+ ContactScene を実装。

## 変更内容
- react-router-dom v7 導入
- HomeScene（クリスタル + 4グリッドナビ）
- SoccerScene（Projects 4カテゴリ + グラスパネル）
- BasketballScene（Skills 3カテゴリ）
- VolleyballScene（About 3ポイント）
- ContactScene（シンプル連絡先）
- GlobalNav（全ルート共通透明ナビ）
- RouteTransition（カラーフラッシュ演出）
- 旧ファイル削除

Closes #XX"
gh pr merge --squash --delete-branch
git checkout main && git pull && git remote prune origin
```

---

## セルフレビュー（計画作成時確認）

**スペックカバレッジ:**
- ✅ `/` HomeScene（クリスタル + HEY. + 4グリッドナビ + 1行自己紹介）
- ✅ `/soccer` SoccerScene（Projects 4カテゴリ + ホットスポット + グラスパネル）
- ✅ `/basketball` BasketballScene（Skills 3カテゴリ）
- ✅ `/volleyball` VolleyballScene（About 3ポイント）
- ✅ `/contact` ContactScene（Email / GitHub / Resume）
- ✅ GlobalNav（全ページ共通・アクティブハイライト）
- ✅ RouteTransition（カラーフラッシュ）
- ✅ ホットスポット → グラスパネルのインタラクション
- ✅ 各シーンのカラーグレーディング・フォグ・フレーム形状・床マテリアル
- ✅ Bloom（全スポーツシーン）
- ✅ `alpha: false`（各 Canvas）
- ✅ `/work` 廃止（旧ファイル全削除）

**注意事項（実装者へ）:**
- `pnpm` 必須。`npm install` は使わない
- VolleyballCanvas の pointLight color 値に閉じる `'` が脱落しないよう注意（Task 10 Step 1 参照）
- ContactScene の `resume.pdf` は `public/resume.pdf` に配置が必要（未作成の場合は href を `#` にしておく）
- MeshReflectorMaterial の `blur` prop は配列型: `blur={[300, 100]}`
- 各 Canvas の `camera` prop は初期位置であり、CameraDrift コンポーネントが毎フレーム上書きする
