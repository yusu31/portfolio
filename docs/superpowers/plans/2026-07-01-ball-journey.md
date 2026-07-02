# スクロール連動ボールジャーニー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soccer / Basketball / Volleyball の3スポーツシーンに、スクロール連動でCrystalが軌道を旅するボールジャーニーを実装する。

**Architecture:** GlobalCanvas 1本にCrystal + ルート別背景を集約（alpha:false維持）。Lenisのprogressコールバックを`scrollProgressRef`（module-level ref）に格納し、R3FのuseFrameとHTML UIの両方から参照。各スポーツシーンのページはLenisを初期化するHTMLレイヤーのみ担当。

**Tech Stack:** React 19, R3F v9, @react-three/drei, Lenis 1.3, GSAP 3.15, Three.js 0.184, Vitest（純粋TS関数のみテスト）

---

## Phase A: インフラ整備（Task 1〜7）

Phase A完了後: HomeSceneが壊れないこと、ブラウザで`/`を開いてCrystalが表示されることを確認してからPhase Bに進む。

---

### Task 1: Waypoint型 + interpolateWaypoints関数

**Files:**
- Modify: `src/components/canvas/journey/trajectory.ts`
- Modify: `src/components/canvas/journey/trajectory.test.ts`

- [ ] **Step 1: Waypoint型とinterpolateWaypoints関数を`trajectory.ts`に追記する**

```ts
// src/components/canvas/journey/trajectory.ts
// ===== 既存のparabolaPoint, dribbleBounceYはそのまま残す =====

import { Vector3 } from 'three'

export interface Waypoint {
  progress: number
  pos: [number, number, number]
  camOffset: [number, number, number]   // カメラの Crystal からの相対オフセット
  rotSpeed: number                      // Crystal外殻の回転速度スケール (0=停止, 1=通常)
  hotspotIndex?: number                 // この付近で出すホットスポットのインデックス
}

export function interpolateWaypoints(
  progress: number,
  waypoints: Waypoint[],
): { pos: Vector3; camOffset: Vector3; rotSpeed: number; hotspotIndex: number | undefined } {
  const none = { pos: new Vector3(), camOffset: new Vector3(0, 0, 5), rotSpeed: 1, hotspotIndex: undefined }
  if (waypoints.length === 0) return none
  const first = waypoints[0]
  if (progress <= first.progress) {
    return {
      pos: new Vector3(...first.pos),
      camOffset: new Vector3(...first.camOffset),
      rotSpeed: first.rotSpeed,
      hotspotIndex: first.hotspotIndex,
    }
  }
  const last = waypoints[waypoints.length - 1]
  if (progress >= last.progress) {
    return {
      pos: new Vector3(...last.pos),
      camOffset: new Vector3(...last.camOffset),
      rotSpeed: last.rotSpeed,
      hotspotIndex: last.hotspotIndex,
    }
  }
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    if (progress >= a.progress && progress < b.progress) {
      const t = (progress - a.progress) / (b.progress - a.progress)
      const lerp = (x: number, y: number) => x + (y - x) * t
      return {
        pos: new Vector3(lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1]), lerp(a.pos[2], b.pos[2])),
        camOffset: new Vector3(
          lerp(a.camOffset[0], b.camOffset[0]),
          lerp(a.camOffset[1], b.camOffset[1]),
          lerp(a.camOffset[2], b.camOffset[2]),
        ),
        rotSpeed: lerp(a.rotSpeed, b.rotSpeed),
        hotspotIndex: Math.abs(progress - a.progress) < Math.abs(progress - b.progress)
          ? a.hotspotIndex
          : b.hotspotIndex,
      }
    }
  }
  return none
}
```

- [ ] **Step 2: テストを`trajectory.test.ts`に追記する**

```ts
// 既存のdescribeブロックの後に追記

import { interpolateWaypoints, type Waypoint } from './trajectory'

describe('interpolateWaypoints', () => {
  const wps: Waypoint[] = [
    { progress: 0.0, pos: [0, 0, 0], camOffset: [0, 0, 5], rotSpeed: 1.0 },
    { progress: 0.5, pos: [4, 0, 0], camOffset: [0, 0, 5], rotSpeed: 0.5 },
    { progress: 1.0, pos: [8, 0, 0], camOffset: [0, 0, 5], rotSpeed: 1.0 },
  ]

  it('progress=0で最初のwaypoint位置を返す', () => {
    const r = interpolateWaypoints(0, wps)
    expect(r.pos.x).toBeCloseTo(0)
    expect(r.rotSpeed).toBeCloseTo(1.0)
  })

  it('progress=0.5で中間ウェイポイント位置を返す', () => {
    const r = interpolateWaypoints(0.5, wps)
    expect(r.pos.x).toBeCloseTo(4)
  })

  it('progress=0.25で線形補間値を返す', () => {
    const r = interpolateWaypoints(0.25, wps)
    expect(r.pos.x).toBeCloseTo(2)
    expect(r.rotSpeed).toBeCloseTo(0.75)
  })

  it('progress=1で最後のwaypoint位置を返す', () => {
    const r = interpolateWaypoints(1, wps)
    expect(r.pos.x).toBeCloseTo(8)
  })

  it('空配列でデフォルト値(原点)を返す', () => {
    const r = interpolateWaypoints(0.5, [])
    expect(r.pos.x).toBe(0)
    expect(r.pos.y).toBe(0)
  })
})
```

- [ ] **Step 3: テストが通ることを確認する**

```
pnpm test
```

期待結果: 全テストPASS（既存9テスト + 新規5テスト = 14テスト）

- [ ] **Step 4: コミット**

```bash
git add src/components/canvas/journey/trajectory.ts src/components/canvas/journey/trajectory.test.ts
git commit -m "feat: Waypoint型とinterpolateWaypoints関数を追加"
```

---

### Task 2: Crystal.tsx — mode prop追加

**Files:**
- Modify: `src/components/canvas/Crystal.tsx`

- [ ] **Step 1: CrystalPropsインターフェースと`mode`/`journeySpeed` propを追加する**

`Crystal.tsx`のexport defaultの直前に以下を追加し、関数シグネチャを変更する：

```tsx
interface CrystalProps {
  mode?: 'interactive' | 'journey'
  journeySpeed?: number  // 0=停止 1=通常 2=高速。journey modeのみ使用
}

export default function Crystal({ mode = 'interactive', journeySpeed = 1 }: CrystalProps) {
```

- [ ] **Step 2: journey modeでドラッグ・クリックを無効にする**

`useEffect`の中のイベントハンドラ(`onMove`, `onUp`)を以下に変更：

```tsx
  useEffect(() => {
    if (mode === 'journey') return  // journey modeではポインターイベント無効
    const onMove = (e: PointerEvent) => { /* 既存コードそのまま */ }
    const onUp = () => { /* 既存コードそのまま */ }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [spawnOrbs, mode])
```

- [ ] **Step 3: journey modeで回転速度をjourneySpeedで制御する**

`useFrame`内の外殻回転コード（`shellRef.current.rotation.y += delta * 0.18`の部分）を変更：

```tsx
    if (shellRef.current) {
      if (!isDragging.current) {
        const speed = mode === 'journey' ? journeySpeed : 1
        shellRef.current.rotation.y += delta * 0.18 * speed + angularVel.current.y
        // ... 残りの既存コードそのまま
      }
    }
```

- [ ] **Step 4: meshのonPointerDownをjourney modeで無効にする**

```tsx
      <mesh
        ref={shellRef}
        onPointerDown={mode === 'interactive' ? (e) => {
          isDragging.current = true
          lastPtr.current = { x: e.clientX, y: e.clientY }
          totalDrag.current = 0
          angularVel.current = { x: 0, y: 0 }
        } : undefined}
      >
```

- [ ] **Step 5: ブラウザで動作確認（`pnpm dev`）**

`/` を開いてCrystalのドラッグ・クリックが通常通り動くこと（modeデフォルト=interactiveなので変化なし）

- [ ] **Step 6: コミット**

```bash
git add src/components/canvas/Crystal.tsx
git commit -m "feat: Crystal.tsxにmodeとjourneySpeed propを追加"
```

---

### Task 3: HomeBg.tsx — Scene.tsxからCrystalを分離

**Files:**
- Create: `src/components/canvas/HomeBg.tsx`
- Modify: `src/components/canvas/Scene.tsx`（Crystal関連を削除）

- [ ] **Step 1: `HomeBg.tsx`を新規作成する**

Scene.tsxの内容からCrystalContainerを除いた版：

```tsx
// src/components/canvas/HomeBg.tsx
import { useRef, useMemo } from 'react'
import { Environment } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import CameraRig from './CameraRig'
import Effects from './Effects'

const rippleVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const rippleFrag = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 c = vUv - 0.5;
  float d = length(c);
  float w1 = sin(d * 24.0 - uTime * 2.1)  * 1.0;
  float w2 = sin(d * 14.0 - uTime * 1.35) * 0.55;
  float w3 = sin(d *  8.0 - uTime * 0.85) * 0.35;
  float wave = (w1 + w2 + w3) / 1.9 * 0.5 + 0.5;
  float fade = smoothstep(0.5, 0.02, d);
  float alpha = wave * fade * 0.14;
  vec3 color = vec3(0.98, 0.45, 0.09);
  gl_FragColor = vec4(color, alpha);
}
`

function GroundRipple() {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })
  return (
    <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[3.5, 64]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={rippleVert}
        fragmentShader={rippleFrag}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default function HomeBg() {
  return (
    <>
      <color attach="background" args={['#0a0a0f']} />
      <Environment preset="sunset" resolution={64} />
      <ambientLight intensity={0.06} />
      <pointLight position={[4, 5, 5]} intensity={35} color="#fff5e0" />
      <pointLight position={[-4, -2, 3]} intensity={40} color="#fb923c" />
      <pointLight position={[0, 4, -5]} intensity={18} color="#c0d8ff" />
      <pointLight position={[2, -5, -3]} intensity={20} color="#ffd090" />
      <CameraRig />
      <GroundRipple />
      <Effects />
    </>
  )
}
```

- [ ] **Step 2: `Scene.tsx`の内容を全て削除してHomeBgへのre-exportにする**

（後方互換性のため。後で削除可能）

```tsx
// src/components/canvas/Scene.tsx
export { default } from './HomeBg'
```

- [ ] **Step 3: コミット**

```bash
git add src/components/canvas/HomeBg.tsx src/components/canvas/Scene.tsx
git commit -m "refactor: HomeBg.tsxを分離（CrystalはGlobalCanvasに移管予定）"
```

---

### Task 4: scrollProgressRef + useScrollProgress フック

**Files:**
- Create: `src/hooks/useScrollProgress.ts`

- [ ] **Step 1: `src/hooks/`ディレクトリを作成する**

```bash
mkdir -p src/hooks
```

- [ ] **Step 2: `useScrollProgress.ts`を作成する**

```ts
// src/hooks/useScrollProgress.ts
import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from 'gsap'

// module-levelのref：R3FのuseFrame内でも参照可能
export const scrollProgressRef = { current: 0 }
export const scrollVelocityRef = { current: 0 }

/**
 * スポーツシーンのページコンポーネントでmountする。
 * Lenisを初期化してスクロールをスムーズにし、progressとvelocityをrefに書き込む。
 * アンマウント時にLenisを破棄する（ルート遷移でクリーンアップされる）。
 */
export function useScrollProgress() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.07 })

    lenis.on('scroll', ({ progress, velocity }: { progress: number; velocity: number }) => {
      scrollProgressRef.current = progress
      scrollVelocityRef.current = Math.abs(velocity)
    })

    const rafCallback = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(rafCallback)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(rafCallback)
      lenis.destroy()
      scrollProgressRef.current = 0
      scrollVelocityRef.current = 0
    }
  }, [])
}
```

- [ ] **Step 3: コミット**

```bash
git add src/hooks/useScrollProgress.ts
git commit -m "feat: useScrollProgressフックとscrollProgressRefを追加"
```

---

### Task 5: GlobalCanvas.tsx + App.tsx更新 + HomeScene Canvas除去

**Files:**
- Create: `src/components/canvas/GlobalCanvas.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/HomeScene.tsx`

- [ ] **Step 1: `GlobalCanvas.tsx`を作成する**

```tsx
// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { MathUtils } from 'three'
import type * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
import { scrollProgressRef, scrollVelocityRef } from '../../hooks/useScrollProgress'

// ルート別の背景色
const BG_COLORS: Record<string, string> = {
  '/':           '#0a0a0f',
  '/soccer':     '#050b1a',
  '/basketball': '#0d0a02',
  '/volleyball': '#021a12',
  '/contact':    '#0a0a0f',
}

// CrystalをGlobalCanvasのルートで管理するためのグループ
// HomeSceneの'explore-click'イベントを受けてGSAPで飛び出す
function CrystalRoot({ isHome }: { isHome: boolean }) {
  const grpRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!isHome) return
    const onExplore = () => {
      if (!grpRef.current) return
      gsap.to(grpRef.current.position, { x: 5, duration: 1.1, ease: 'power2.in' })
      gsap.to(grpRef.current.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.7, delay: 0.45, ease: 'power2.in',
        onComplete: () => {
          if (!grpRef.current) return
          grpRef.current.position.x = 0
          grpRef.current.scale.set(1, 1, 1)
        },
      })
    }
    window.addEventListener('explore-click', onExplore)
    return () => window.removeEventListener('explore-click', onExplore)
  }, [isHome])

  // journey modeではscrollProgressに連動して位置を制御（Task 7のJourneyCameraRigで実装）
  // ここではgrpRefをJourneyCameraRigに渡す設計のため、group refを公開できるよう分離する

  const speed = isHome ? 1 : scrollVelocityRef.current * 2 + 0.3

  return (
    <group ref={grpRef} position={[0, isHome ? -0.4 : 0, 0]}>
      <Crystal mode={isHome ? 'interactive' : 'journey'} journeySpeed={speed} />
    </group>
  )
}

// 背景色をルートに応じて切り替えるコンポーネント
function BgColor({ pathname }: { pathname: string }) {
  const color = BG_COLORS[pathname] ?? '#0a0a0f'
  return <color attach="background" args={[color as THREE.ColorRepresentation]} />
}

export default function GlobalCanvas() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <BgColor pathname={pathname} />
        {isHome && <HomeBg />}
        {/* Phase B以降: SoccerBg / BasketballBg / VolleyballBg をここに追加 */}
        <CrystalRoot isHome={isHome} />
        {/* Phase B以降: JourneyCameraRig をここに追加 */}
      </Suspense>
    </Canvas>
  )
}
```

- [ ] **Step 2: `App.tsx`に`<GlobalCanvas />`を追加する**

```tsx
// src/App.tsx
import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import AppRoutes from './router'
import Cursor from './components/ui/Cursor'
import Loader from './components/ui/Loader'
import GlobalNav from './components/ui/GlobalNav'
import RouteTransition from './components/ui/RouteTransition'
import GlobalCanvas from './components/canvas/GlobalCanvas'

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <GlobalCanvas />
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

- [ ] **Step 3: `HomeScene.tsx`から`<Canvas>`と`<Scene />`を除去する**

HomeSceneは純HTMLレイヤーのみになる。`Canvas`・`Suspense`・`Scene`のimportを削除し、returnから`<Canvas>...</Canvas>`ブロックを取り除く。

```tsx
// src/pages/HomeScene.tsx — Canvas部分を削除した後の先頭
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
// Canvas, Suspense, Scene のimportを削除

// NAV_GRID定義・useEffect・handleExploreは変わらず

export default function HomeScene() {
  // ... 既存の useEffect, handleExplore はそのまま

  return (
    <>
      {/* <Canvas> ... </Canvas> ブロックを完全に削除 */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          height: '100svh',
          // ... 残りは既存コードそのまま
        }}
      >
        {/* 既存のHTML UIをそのまま維持 */}
      </div>
      <style>{/* ... */}</style>
    </>
  )
}
```

- [ ] **Step 4: ブラウザで動作確認（`pnpm dev`）**

- `/` でCrystalが表示されること（HomeBgとCrystalがGlobalCanvas経由で描画）
- EXPLOREボタンでCrystalが右に飛び出し、/soccerに遷移すること
- `/soccer` でCrystalが表示されること（SoccerBgはまだないがCrystalは出る）

- [ ] **Step 5: コミット**

```bash
git add src/components/canvas/GlobalCanvas.tsx src/App.tsx src/pages/HomeScene.tsx
git commit -m "feat: GlobalCanvas実装・HomeSceneからCanvas除去"
```

---

### Task 6: SceneCard.tsx — ohzi.io風コンテンツカード

**Files:**
- Create: `src/components/ui/SceneCard.tsx`

- [ ] **Step 1: `SceneCard.tsx`を作成する**

```tsx
// src/components/ui/SceneCard.tsx
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

interface SceneCardProps {
  visible: boolean
  side: 'left' | 'right'
  category: string       // 上部の小文字ラベル（例: "PROJECTS"）
  title: string
  description: string
  onExplore?: () => void
  exploreLabel?: string
  onNext?: () => void
  nextLabel?: string
}

export default function SceneCard({
  visible,
  side,
  category,
  title,
  description,
  onExplore,
  exploreLabel = 'EXPLORE →',
  onNext,
  nextLabel = 'NEXT ↓',
}: SceneCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (visible) {
      gsap.to(ref.current, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
    } else {
      gsap.to(ref.current, { opacity: 0, y: visible ? 20 : -10, duration: 0.3, ease: 'power2.in' })
    }
  }, [visible])

  const posStyle: React.CSSProperties = side === 'left'
    ? { left: 'clamp(1.5rem, 5vw, 3.5rem)' }
    : { right: 'clamp(1.5rem, 5vw, 3.5rem)' }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 'clamp(2rem, 6vh, 4rem)',
        ...posStyle,
        width: 'min(480px, 45vw)',
        background: 'rgba(10, 10, 20, 0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '1.4rem 1.6rem',
        opacity: 0,
        transform: 'translateY(20px)',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 20,
      }}
    >
      <p style={{
        fontSize: '0.58rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#555',
        margin: '0 0 0.6rem',
      }}>
        {category}
      </p>
      <h2 style={{
        fontSize: 'clamp(1rem, 2.2vw, 1.25rem)',
        fontWeight: 800,
        color: '#fff',
        margin: '0 0 0.7rem',
        lineHeight: 1.25,
      }}>
        {title}
      </h2>
      <p style={{
        fontSize: '0.78rem',
        color: 'rgba(255,255,255,0.55)',
        lineHeight: 1.7,
        margin: '0 0 1.1rem',
      }}>
        {description}
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {onExplore && (
          <button
            onClick={onExplore}
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              padding: '0.55rem 1.2rem',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {exploreLabel}
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.45)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: コミット**

```bash
git add src/components/ui/SceneCard.tsx
git commit -m "feat: SceneCard（ohzi.io参考）を追加"
```

---

### Task 7: JourneyCameraRig.tsx — スクロール連動カメラ

**Files:**
- Create: `src/components/canvas/JourneyCameraRig.tsx`
- Modify: `src/components/canvas/GlobalCanvas.tsx`

- [ ] **Step 1: `JourneyCameraRig.tsx`を作成する**

```tsx
// src/components/canvas/JourneyCameraRig.tsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { Vector3, MathUtils } from 'three'
import type * as THREE from 'three'
import { scrollProgressRef } from '../../hooks/useScrollProgress'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'

// 各スポーツシーンのウェイポイントはPhase B〜Dで import する
// Phase Aではスポーツシーンでカメラが初期位置のままになる（OK）
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     [],
  '/basketball': [],
  '/volleyball': [],
}

const _targetPos = new Vector3()
const _targetCamPos = new Vector3()

export default function JourneyCameraRig() {
  const { camera } = useThree()
  const { pathname } = useLocation()
  const crystalGroupRef = useRef<THREE.Group | null>(null)

  useFrame(() => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints || waypoints.length === 0) return

    const progress = scrollProgressRef.current
    const { pos, camOffset, rotSpeed } = interpolateWaypoints(progress, waypoints)

    // Crystal位置を更新（GlobalCanvas内のCrystalRootのgroupを直接操作するのではなく
    // JourneyCameraRig自身がGroupを管理する設計に変更 → Task 7 Step 2で対応）
    _targetPos.copy(pos)
    _targetCamPos.copy(pos).add(camOffset)

    // カメラをCrystal位置 + offsetへスムーズ移動
    camera.position.lerp(_targetCamPos, 0.05)
    camera.lookAt(_targetPos)
  })

  return null
}
```

> **注意:** Crystal の実際の位置移動は GlobalCanvas.tsx 側でJourneyCameraRigが返す位置を受け取る形が理想だが、R3F内でのref共有のため、Phase B以降でSoccerBgと一緒に結線する。現段階はカメラ制御のみ。

- [ ] **Step 2: GlobalCanvas.tsxにJourneyCameraRigとCrystal位置制御を追加する**

`CrystalRoot`は現状`isHome`時のexplore-clickアニメーションのみ担当。  
journey modeでのCrystal位置制御は**GlobalCanvas内に新コンポーネント`CrystalJourneyMover`を追加**して分離する。

GlobalCanvas.tsx を以下のように更新する（importブロック含む完全版）：

```tsx
// src/components/canvas/GlobalCanvas.tsx
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import { Vector3 } from 'three'
import type * as THREE from 'three'
import gsap from 'gsap'
import Crystal from './Crystal'
import HomeBg from './HomeBg'
import Effects from './Effects'
import JourneyCameraRig from './JourneyCameraRig'
import { scrollProgressRef, scrollVelocityRef } from '../../hooks/useScrollProgress'
import { interpolateWaypoints } from './journey/trajectory'
import type { Waypoint } from './journey/trajectory'

const BG_COLORS: Record<string, string> = {
  '/': '#0a0a0f', '/soccer': '#050b1a',
  '/basketball': '#0d0a02', '/volleyball': '#021a12', '/contact': '#0a0a0f',
}

// Journey modeでCrystalの3D位置をscrollProgressに連動させる
// Phase B以降でSCENE_WAYPOINTSにデータを追加する
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer': [], '/basketball': [], '/volleyball': [],
}

const _lerpTarget = new Vector3()

function CrystalJourneyMover({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { pathname } = useLocation()
  useFrame(() => {
    const waypoints = SCENE_WAYPOINTS[pathname]
    if (!waypoints?.length || !groupRef.current) return
    const { pos } = interpolateWaypoints(scrollProgressRef.current, waypoints)
    _lerpTarget.set(pos.x, pos.y, pos.z)
    groupRef.current.position.lerp(_lerpTarget, 0.08)
  })
  return null
}

// explore-click（HomeScene）でCrystalが右に飛び出すアニメーション
function CrystalRoot({ isHome, pathname }: { isHome: boolean; pathname: string }) {
  const grpRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!isHome) return
    const onExplore = () => {
      if (!grpRef.current) return
      gsap.to(grpRef.current.position, { x: 5, duration: 1.1, ease: 'power2.in' })
      gsap.to(grpRef.current.scale, {
        x: 0, y: 0, z: 0, duration: 0.7, delay: 0.45, ease: 'power2.in',
        onComplete: () => {
          if (!grpRef.current) return
          grpRef.current.position.x = 0
          grpRef.current.scale.set(1, 1, 1)
        },
      })
    }
    window.addEventListener('explore-click', onExplore)
    return () => window.removeEventListener('explore-click', onExplore)
  }, [isHome])

  // journey modeの回転速度：velocityベース（Crystal.tsxのuseFrame内で読む）
  const journeySpeed = isHome ? 1 : Math.min(scrollVelocityRef.current * 2 + 0.3, 4)

  return (
    <>
      <group ref={grpRef} position={[0, isHome ? -0.4 : 0, 0]}>
        <Crystal mode={isHome ? 'interactive' : 'journey'} journeySpeed={journeySpeed} />
      </group>
      {!isHome && <CrystalJourneyMover groupRef={grpRef} />}
    </>
  )
}

function BgColor({ pathname }: { pathname: string }) {
  const color = BG_COLORS[pathname] ?? '#0a0a0f'
  return <color attach="background" args={[color as THREE.ColorRepresentation]} />
}

export default function GlobalCanvas() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <Canvas
      style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        <BgColor pathname={pathname} />
        {isHome && <HomeBg />}
        {/* Phase B以降: SoccerBg / BasketballBg / VolleyballBg をここに追加 */}
        <CrystalRoot isHome={isHome} pathname={pathname} />
        {!isHome && <JourneyCameraRig />}
        <Effects />
      </Suspense>
    </Canvas>
  )
}
```

> **Phase B以降の作業:** `SCENE_WAYPOINTS`に各スポーツシーンのウェイポイントをimportして追加する（JourneyCameraRig.tsxのSCENE_WAYPOINTSと同じものを使う）。Task 8 Step 3〜5でこの対応を行う。

- [ ] **Step 3: `journeySpeed`をCrystal.tsxのuseFrame内で動的に参照できるようpropをrefに変更する**

Crystal.tsxの`journeySpeed`propをそのままuseFrame内で参照すると、React rerenderのタイミングにしか更新されない。  
`journeySpeedRef`をprops経由で渡す形に変更する：

まずCrystalPropsを修正：
```tsx
interface CrystalProps {
  mode?: 'interactive' | 'journey'
  journeySpeedRef?: React.RefObject<number>  // journey mode用（毎frameで読む）
}
```

GlobalCanvas.tsxのCrystalRoot内でrefを作成して渡す：
```tsx
const journeySpeedRef = useRef(1)

// useFrameで毎frame更新
useFrame(() => {
  if (!isHome) {
    journeySpeedRef.current = Math.min(scrollVelocityRef.current * 2 + 0.3, 4)
  }
})

// Crystal に ref を渡す
<Crystal mode={isHome ? 'interactive' : 'journey'} journeySpeedRef={journeySpeedRef} />
```

Crystal.tsxのuseFrame内の回転コードを以下に変更：
```tsx
const speed = mode === 'journey'
  ? (journeySpeedRef?.current ?? 1)
  : 1
shellRef.current.rotation.y += delta * 0.18 * speed + angularVel.current.y
```

- [ ] **Step 4: コミット**

```bash
git add src/components/canvas/JourneyCameraRig.tsx src/components/canvas/GlobalCanvas.tsx src/components/canvas/Crystal.tsx
git commit -m "feat: JourneyCameraRig + CrystalJourneyMover（Crystal位置制御）を追加"
```

---

## Phase B: Soccerシーン（Task 8〜9）

Phase B完了後確認: `/soccer` でスクロールするとCrystalが動き、折り返しポイントでSceneCardが出ることを確認。

---

### Task 8: soccer-trajectory.ts + SoccerBg.tsx

**Files:**
- Create: `src/data/trajectories/soccer-trajectory.ts`
- Create: `src/components/canvas/soccer/SoccerBg.tsx`

- [ ] **Step 1: `src/data/trajectories/`ディレクトリを作成する**

```bash
mkdir -p src/data/trajectories
```

- [ ] **Step 2: `soccer-trajectory.ts`を作成する**

```ts
// src/data/trajectories/soccer-trajectory.ts
import type { Waypoint } from '../../components/canvas/journey/trajectory'

// ホットスポット定義（PROJECT_CATEGORIESのcategoryIdと対応）
export interface SoccerHotspot {
  index: number
  categoryId: string
  cardSide: 'left' | 'right'
}

export const SOCCER_HOTSPOTS: SoccerHotspot[] = [
  { index: 0, categoryId: 'web-apps',    cardSide: 'right' },
  { index: 1, categoryId: 'games',       cardSide: 'left'  },
  { index: 2, categoryId: 'websites',    cardSide: 'right' },
  { index: 3, categoryId: 'tools',       cardSide: 'left'  },
]

// 300vh スクロール全体が progress 0→1
// pos: Crystal の3D位置。camOffset: カメラの Crystal からの相対オフセット
export const SOCCER_WAYPOINTS: Waypoint[] = [
  // Phase1: ドリブル開始
  { progress: 0.00, pos: [0,  0.0,  0],  camOffset: [0,    0.3,  4.5], rotSpeed: 1.0 },
  { progress: 0.08, pos: [0,  0.0, -2],  camOffset: [0,   -0.1,  4.0], rotSpeed: 1.2 },

  // Phase2: ジグザグ×4（各折り返しにホットスポット）
  { progress: 0.18, pos: [-2.5, 0.1, -4],  camOffset: [ 0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 0 },
  { progress: 0.26, pos: [-2.5, 0.0, -5],  camOffset: [ 0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.32, pos: [ 2.5, 0.1, -7],  camOffset: [-0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 1 },
  { progress: 0.40, pos: [ 2.5, 0.0, -8],  camOffset: [-0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.48, pos: [-2.5, 0.1, -10], camOffset: [ 0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 2 },
  { progress: 0.56, pos: [-2.5, 0.0, -11], camOffset: [ 0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.62, pos: [ 2.5, 0.1, -13], camOffset: [-0.6, 0.3, 4.0], rotSpeed: 0.2, hotspotIndex: 3 },
  { progress: 0.70, pos: [ 2.5, 0.0, -14], camOffset: [-0.5, 0.3, 4.0], rotSpeed: 1.0 },

  // Phase3: ゴール前→ロングパス
  { progress: 0.80, pos: [0,   0.0, -16], camOffset: [0, 0.8, 6.0], rotSpeed: 1.5 },
  { progress: 0.90, pos: [0,   0.3, -17], camOffset: [0, 0.6, 5.0], rotSpeed: 2.0 },
  { progress: 1.00, pos: [8,   5.0, -22], camOffset: [0, 0.5, 7.0], rotSpeed: 3.0 },
]

// ホットスポットの検出閾値
export const HOTSPOT_RADIUS = 0.025
```

- [ ] **Step 3: `SoccerBg.tsx`を作成する**

```tsx
// src/components/canvas/soccer/SoccerBg.tsx
import { useMemo } from 'react'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

// ゴール枠
function GoalFrame() {
  const W = 3.6, H = 1.8, T = 0.07
  const mat = (
    <meshStandardMaterial color="white" emissive="white" emissiveIntensity={2.0} roughness={0.1} />
  )
  return (
    <group position={[0, -0.5, -18]}>
      <mesh position={[0, H, 0]}><boxGeometry args={[W, T, T]} />{mat}</mesh>
      <mesh position={[-W / 2, H / 2, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
      <mesh position={[W / 2, H / 2, 0]}><boxGeometry args={[T, H, T]} />{mat}</mesh>
    </group>
  )
}

// 芝フロア
function GrassFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, -10]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#0d2210" roughness={0.95} metalness={0} />
    </mesh>
  )
}

// 観客席シルエット（遠景・極低輝度）
function AudienceSilhouette() {
  const count = 60
  const boxes = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.sin(i * 2.1) * 18),
      y: Math.random() * 2 - 0.5,
      z: -28 - Math.random() * 6,
      w: 0.4 + Math.random() * 0.3,
      h: 0.8 + Math.random() * 0.8,
    }))
  }, [])

  return (
    <group>
      {boxes.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <boxGeometry args={[b.w, b.h, 0.1]} />
          <meshStandardMaterial color="#0a1520" emissive="#0a1520" emissiveIntensity={0.05} />
        </mesh>
      ))}
    </group>
  )
}

export default function SoccerBg() {
  return (
    <>
      <Environment preset="night" resolution={64} />
      <ambientLight intensity={0.03} />
      <directionalLight position={[0, 10, 5]} intensity={1.0} color="#8ab4d0" />
      <pointLight position={[-4, 4, 2]} intensity={18} color="#4fc3f7" />
      <pointLight position={[4, 4, -4]} intensity={12} color="#1a3a5c" />
      <fog attach="fog" args={['#050b1a', 12, 40]} />
      <GrassFloor />
      <GoalFrame />
      <AudienceSilhouette />
    </>
  )
}
```

- [ ] **Step 4: GlobalCanvas.tsxにSoccerBgとSoccerウェイポイントを追加する**

GlobalCanvas.tsxを以下の3箇所修正する（Task 7で作ったファイルの続き）：

```tsx
// 1. importブロックに追加
import SoccerBg from './soccer/SoccerBg'
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'

// 2. SCENE_WAYPOINTSを更新（GlobalCanvas.tsx内の空配列を置き換え）
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,   // [] → SOCCER_WAYPOINTS
  '/basketball': [],
  '/volleyball': [],
}

// 3. Canvas内のコメント行を置き換え
{pathname === '/soccer' && <SoccerBg />}
```

- [ ] **Step 5: JourneyCameraRig.tsxにもSoccerウェイポイントを追加する**

JourneyCameraRig.tsxのSCENE_WAYPOINTSも同様に更新する：

```tsx
// JourneyCameraRig.tsxのimportブロックに追加
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'

// SCENE_WAYPOINTSを更新
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': [],
  '/volleyball': [],
}
```

- [ ] **Step 6: `pnpm dev`でブラウザ確認**

`/soccer` でSoccerBgの芝・ゴールが見え、スクロールするとCrystalが動くことを確認（座標のチューニングは後でOK）

- [ ] **Step 7: コミット**

```bash
git add src/data/trajectories/soccer-trajectory.ts src/components/canvas/soccer/SoccerBg.tsx src/components/canvas/GlobalCanvas.tsx src/components/canvas/JourneyCameraRig.tsx
git commit -m "feat: Soccer軌道データとSoccerBg追加"
```

---

### Task 9: SoccerScene.tsx — スクロール連動完成

**Files:**
- Modify: `src/pages/SoccerScene.tsx`
- Modify: `src/data/projects.ts`（hotspotインデックスとの対応確認）

- [ ] **Step 1: `projects.ts`でcategoryIdを確認する**

```bash
grep -n "id:" src/data/projects.ts | head -10
```

4カテゴリのidをメモしておく（`soccer-trajectory.ts`のcategoryIdと一致させるため）

- [ ] **Step 2: `soccer-trajectory.ts`のcategoryIdを実際のidに合わせて修正する**

`projects.ts`のidに合わせてcategoryIdを更新する（例: `'web-apps'` → 実際のid文字列）

- [ ] **Step 3: SoccerScene.tsxを書き換える**

```tsx
// src/pages/SoccerScene.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROJECT_CATEGORIES } from '../data/projects'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { SOCCER_HOTSPOTS, SOCCER_WAYPOINTS, HOTSPOT_RADIUS } from '../data/trajectories/soccer-trajectory'

function ProjectList({ categoryId }: { categoryId: string }) {
  const category = PROJECT_CATEGORIES.find((c) => c.id === categoryId)
  if (!category) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {category.projects.map((p) => (
        <div
          key={p.id}
          style={{
            padding: '0.7rem 0.8rem',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ddd' }}>{p.name}</span>
            <span style={{
              fontSize: '0.52rem', padding: '0.1rem 0.4rem', borderRadius: '3px',
              background: p.status === 'live' ? '#1a2a10' : '#1a1a2a',
              color: p.status === 'live' ? '#6dbf40' : '#7986cb', fontWeight: 700,
            }}>
              {p.status === 'live' ? 'LIVE' : 'PLANNED'}
            </span>
          </div>
          <p style={{ fontSize: '0.65rem', color: '#555', margin: 0 }}>{p.description}</p>
        </div>
      ))}
    </div>
  )
}

export default function SoccerScene() {
  useScrollProgress()  // Lenisを初期化

  const navigate = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelCategoryId, setPanelCategoryId] = useState<string | null>(null)

  // scrollProgressRefをポーリングしてホットスポットを検出
  useEffect(() => {
    let raf: number
    const check = () => {
      const p = scrollProgressRef.current
      let found: number | null = null
      for (const wp of SOCCER_WAYPOINTS) {
        if (wp.hotspotIndex !== undefined && Math.abs(p - wp.progress) < HOTSPOT_RADIUS) {
          found = wp.hotspotIndex
          break
        }
      }
      setActiveHotspotIdx(found)
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [])

  const activeHotspot = activeHotspotIdx !== null ? SOCCER_HOTSPOTS[activeHotspotIdx] : null
  const isLastHotspot = activeHotspotIdx === SOCCER_HOTSPOTS.length - 1

  return (
    <>
      {/* 300vhのスクロール領域 */}
      <div style={{ height: '300vh' }} />

      {/* 固定UIオーバーレイ */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        {/* ページラベル */}
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
          <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/soccer</p>
          <p style={{ fontSize: '0.7rem', color: '#4fc3f7', fontWeight: 700, margin: '0.15rem 0 0' }}>Projects — 作ったもの</p>
        </div>

        {/* SceneCard（ホットスポット付近で出現） */}
        <div style={{ pointerEvents: 'auto' }}>
          <SceneCard
            visible={!!activeHotspot}
            side={activeHotspot?.cardSide ?? 'right'}
            category="PROJECTS"
            title={PROJECT_CATEGORIES.find(c => c.id === activeHotspot?.categoryId)?.label ?? ''}
            description={`${PROJECT_CATEGORIES.find(c => c.id === activeHotspot?.categoryId)?.projects.length ?? 0} projects`}
            onExplore={activeHotspot ? () => setPanelCategoryId(activeHotspot.categoryId) : undefined}
            onNext={isLastHotspot ? () => navigate('/basketball') : undefined}
            nextLabel={isLastHotspot ? 'NEXT →' : undefined}
          />
        </div>

        {/* 詳細パネル（従来のGlassPanel） */}
        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!panelCategoryId}
            onClose={() => setPanelCategoryId(null)}
            title={PROJECT_CATEGORIES.find(c => c.id === panelCategoryId)?.label ?? ''}
            color="#4fc3f7"
          >
            {panelCategoryId && <ProjectList categoryId={panelCategoryId} />}
          </GlassPanel>
        </div>

        {/* Soccer末端のNEXTボタン（最後まで見たユーザー向け） */}
        <button
          onClick={() => navigate('/basketball')}
          style={{
            position: 'absolute', bottom: '2rem', right: '2.5rem',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            padding: '0.6rem 1.5rem', borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
            background: 'transparent', cursor: 'pointer', pointerEvents: 'auto',
          }}
        >
          NEXT: SKILLS →
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 4: `pnpm dev`でブラウザ確認**

- `/soccer`でスクロールするとCrystalが移動すること
- ジグザグターンのprogress付近でSceneCardが出現すること
- EXPLOREクリックでGlassPanelが開くこと
- NEXTで`/basketball`に遷移すること

- [ ] **Step 5: コミット**

```bash
git add src/pages/SoccerScene.tsx
git commit -m "feat: SoccerScene スクロール連動完成"
```

---

## Phase C: Basketballシーン（Task 10〜11）

---

### Task 10: basketball-trajectory.ts + BasketballBg.tsx

**Files:**
- Create: `src/data/trajectories/basketball-trajectory.ts`
- Create: `src/components/canvas/basketball/BasketballBg.tsx`

- [ ] **Step 1: `basketball-trajectory.ts`を作成する**

```ts
// src/data/trajectories/basketball-trajectory.ts
import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface BasketballHotspot {
  index: number
  skillCategory: string  // skills.tsのcategoryIdと対応
  cardSide: 'left' | 'right'
}

export const BASKETBALL_HOTSPOTS: BasketballHotspot[] = [
  { index: 0, skillCategory: 'frontend',      cardSide: 'right' },
  { index: 1, skillCategory: 'backend',        cardSide: 'left'  },
  { index: 2, skillCategory: 'infrastructure', cardSide: 'right' },
]

// 250vh スクロール
export const BASKETBALL_WAYPOINTS: Waypoint[] = [
  // Phase1: 左上から飛来→キャッチ
  { progress: 0.00, pos: [-4,  3.5, -1], camOffset: [1.0, -0.5, 4.0], rotSpeed: 2.0 },
  { progress: 0.12, pos: [-2,  2.0, -1], camOffset: [0.8, -0.3, 4.0], rotSpeed: 1.5 },
  { progress: 0.20, pos: [ 0,  0.5,  0], camOffset: [0,    0.2, 4.5], rotSpeed: 0.3, hotspotIndex: 0 }, // キャッチ

  // Phase2: シュートモーション→放物線
  { progress: 0.32, pos: [ 0,  0.0,  0], camOffset: [0,    0.3, 4.5], rotSpeed: 1.0 },
  { progress: 0.45, pos: [ 0,  4.5, -3], camOffset: [-0.5, 0.0, 4.0], rotSpeed: 2.0, hotspotIndex: 1 }, // 放物線頂点
  { progress: 0.58, pos: [ 0,  4.5, -4], camOffset: [-0.3, 0.0, 4.0], rotSpeed: 0.2, hotspotIndex: 2 }, // リング手前

  // Phase3: リング通過
  { progress: 0.70, pos: [ 0,  2.2, -5], camOffset: [0, -0.3, 3.0], rotSpeed: 1.5 }, // リング通過
  { progress: 0.80, pos: [ 0,  1.0, -5], camOffset: [0,  0.8, 2.0], rotSpeed: 1.0 }, // FPV演出
  { progress: 0.90, pos: [ 0, -0.5, -5], camOffset: [0,  1.5, 3.0], rotSpeed: 0.5 }, // 落下
  { progress: 1.00, pos: [ 0, -1.5, -5], camOffset: [0,  2.0, 4.0], rotSpeed: 0.3 },
]

export const HOTSPOT_RADIUS = 0.025
```

- [ ] **Step 2: `BasketballBg.tsx`を作成する**

```tsx
// src/components/canvas/basketball/BasketballBg.tsx
import { useMemo } from 'react'
import { Environment } from '@react-three/drei'

// バックボード + リング
function Backboard() {
  const ringMat = <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={1.5} roughness={0.2} />
  return (
    <group position={[0, 2.2, -6]}>
      {/* バックボード */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.0, 0.05]} />
        <meshStandardMaterial color="#111" roughness={0.4} />
      </mesh>
      {/* リング（トーラス） */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.23, 0.018, 8, 24]} />
        {ringMat}
      </mesh>
      {/* ネット（簡易：細いシリンダー×8） */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.2, -0.15, Math.sin(angle) * 0.2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.3, 4]} />
            <meshStandardMaterial color="#aaa" />
          </mesh>
        )
      })}
    </group>
  )
}

// コート床（木目調）
function CourtFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -2]} receiveShadow>
      <planeGeometry args={[20, 30]} />
      <meshStandardMaterial color="#120c00" roughness={0.6} metalness={0} />
    </mesh>
  )
}

// コートラインマーキング
function CourtLines() {
  const lines = useMemo(() => [
    // センターライン
    { x: 0, z: -8, w: 20, d: 0.04 },
    // 三点ライン近似（直線で代用）
    { x: 0, z: -3, w: 12, d: 0.04 },
    { x: 0, z: -12, w: 12, d: 0.04 },
  ], [])
  return (
    <group position={[0, -1.19, 0]}>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.x, 0, l.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[l.w, l.d]} />
          <meshStandardMaterial color="#2a1800" emissive="#2a1800" emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

export default function BasketballBg() {
  return (
    <>
      <Environment preset="warehouse" resolution={64} />
      <ambientLight intensity={0.04} />
      <pointLight position={[0, 8, 0]} intensity={30} color="#ffb300" />
      <pointLight position={[-5, 4, 0]} intensity={15} color="#c87000" />
      <fog attach="fog" args={['#0d0a02', 10, 35]} />
      <CourtFloor />
      <CourtLines />
      <Backboard />
    </>
  )
}
```

- [ ] **Step 3: GlobalCanvas.tsxとJourneyCameraRig.tsxを更新する**

GlobalCanvas.tsxを以下の3箇所修正する（Task 8で作ったファイルの続き）：

```tsx
// 1. importブロックに追加
import BasketballBg from './basketball/BasketballBg'
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'

// 2. SCENE_WAYPOINTSを更新（[] → BASKETBALL_WAYPOINTS）
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': [],
}

// 3. Canvas内に追加
{pathname === '/basketball' && <BasketballBg />}
```

JourneyCameraRig.tsxも同様に更新する：

```tsx
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': [],
}
```

- [ ] **Step 4: コミット**

```bash
git add src/data/trajectories/basketball-trajectory.ts src/components/canvas/basketball/BasketballBg.tsx src/components/canvas/GlobalCanvas.tsx src/components/canvas/JourneyCameraRig.tsx
git commit -m "feat: Basketball軌道データとBasketballBg追加"
```

---

### Task 11: BasketballScene.tsx — スクロール連動完成

**Files:**
- Modify: `src/pages/BasketballScene.tsx`

- [ ] **Step 1: `skills.ts`のカテゴリidを確認する**

```bash
grep -n "id:" src/data/skills.ts | head -10
```

`basketball-trajectory.ts`のskillCategoryと一致させる。

- [ ] **Step 2: BasketballScene.tsxを書き換える**

```tsx
// src/pages/BasketballScene.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import GlassPanel from '../components/ui/GlassPanel'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { BASKETBALL_HOTSPOTS, BASKETBALL_WAYPOINTS, HOTSPOT_RADIUS } from '../data/trajectories/basketball-trajectory'
// skills.tsからimport（実際のファイル構造に合わせる）
import { SKILL_CATEGORIES } from '../data/skills'

export default function BasketballScene() {
  useScrollProgress()
  const navigate = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)
  const [panelSkillId, setPanelSkillId] = useState<string | null>(null)

  useEffect(() => {
    let raf: number
    const check = () => {
      const p = scrollProgressRef.current
      let found: number | null = null
      for (const wp of BASKETBALL_WAYPOINTS) {
        if (wp.hotspotIndex !== undefined && Math.abs(p - wp.progress) < HOTSPOT_RADIUS) {
          found = wp.hotspotIndex
          break
        }
      }
      setActiveHotspotIdx(found)
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [])

  const activeHotspot = activeHotspotIdx !== null ? BASKETBALL_HOTSPOTS[activeHotspotIdx] : null
  const skillCategory = SKILL_CATEGORIES?.find(c => c.id === activeHotspot?.skillCategory)

  return (
    <>
      <div style={{ height: '250vh' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
          <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/basketball</p>
          <p style={{ fontSize: '0.7rem', color: '#ffb300', fontWeight: 700, margin: '0.15rem 0 0' }}>Skills — できること</p>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <SceneCard
            visible={!!activeHotspot}
            side={activeHotspot?.cardSide ?? 'right'}
            category="SKILLS"
            title={skillCategory?.label ?? ''}
            description={`${skillCategory?.skills?.length ?? 0} skills`}
            onExplore={activeHotspot ? () => setPanelSkillId(activeHotspot.skillCategory) : undefined}
            onNext={activeHotspotIdx === BASKETBALL_HOTSPOTS.length - 1 ? () => navigate('/volleyball') : undefined}
            nextLabel="NEXT →"
          />
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <GlassPanel
            open={!!panelSkillId}
            onClose={() => setPanelSkillId(null)}
            title={SKILL_CATEGORIES?.find(c => c.id === panelSkillId)?.label ?? ''}
            color="#ffb300"
          >
            {/* スキル一覧を表示 — skills.tsの構造に合わせる */}
            <div>
              {SKILL_CATEGORIES?.find(c => c.id === panelSkillId)?.skills?.map((s: { name: string }) => (
                <div key={s.name} style={{ padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a', fontSize: '0.72rem', color: '#ccc' }}>{s.name}</div>
              ))}
            </div>
          </GlassPanel>
        </div>
        <button
          onClick={() => navigate('/volleyball')}
          style={{
            position: 'absolute', bottom: '2rem', right: '2.5rem',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            padding: '0.6rem 1.5rem', borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
            background: 'transparent', cursor: 'pointer', pointerEvents: 'auto',
          }}
        >
          NEXT: ABOUT →
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: `skills.ts`の構造を確認してBasketballScene.tsxのimport/型を修正する**

```bash
head -30 src/data/skills.ts
```

実際のexport名・型に合わせてBasketballScene.tsxを調整する。

- [ ] **Step 4: ブラウザ確認 + コミット**

```bash
pnpm dev
# /basketball でスクロール動作を確認
git add src/pages/BasketballScene.tsx
git commit -m "feat: BasketballScene スクロール連動完成"
```

---

## Phase D: Volleyballシーン（Task 12〜13）

---

### Task 12: volleyball-trajectory.ts + VolleyballBg.tsx

**Files:**
- Create: `src/data/trajectories/volleyball-trajectory.ts`
- Create: `src/components/canvas/volleyball/VolleyballBg.tsx`

- [ ] **Step 1: `volleyball-trajectory.ts`を作成する**

```ts
// src/data/trajectories/volleyball-trajectory.ts
import type { Waypoint } from '../../components/canvas/journey/trajectory'

export interface VolleyballHotspot {
  index: number
  aboutKey: string   // about.tsのkeyと対応
  cardSide: 'left' | 'right'
}

export const VOLLEYBALL_HOTSPOTS: VolleyballHotspot[] = [
  { index: 0, aboutKey: 'background', cardSide: 'right' },  // レシーブ位置
  { index: 1, aboutKey: 'workstyle',  cardSide: 'left'  },  // セッター位置
  { index: 2, aboutKey: 'lookingfor', cardSide: 'right' },  // トス頂点
]

// 250vh スクロール
export const VOLLEYBALL_WAYPOINTS: Waypoint[] = [
  // Phase1: 上から落下→レシーブ
  { progress: 0.00, pos: [ 0,  5.0,  0], camOffset: [0,  0.5, 5.0], rotSpeed: 1.5 },
  { progress: 0.10, pos: [ 0,  2.0,  0], camOffset: [0,  0.3, 4.5], rotSpeed: 1.2 },
  { progress: 0.20, pos: [ 0, -0.5,  0], camOffset: [0, -0.2, 4.0], rotSpeed: 0.2, hotspotIndex: 0 }, // レシーブ

  // Phase2: セッターへのパス→高いトス
  { progress: 0.35, pos: [ 1,  1.0, -1], camOffset: [0.5, 0.3, 4.0], rotSpeed: 1.0 },
  { progress: 0.48, pos: [ 1,  3.5, -2], camOffset: [-0.5, 0.2, 4.5], rotSpeed: 0.3, hotspotIndex: 1 }, // セッター
  { progress: 0.60, pos: [ 2,  5.5, -2], camOffset: [-0.5, 0.0, 5.0], rotSpeed: 0.1, hotspotIndex: 2 }, // トス頂点

  // Phase3: スパイク急降下
  { progress: 0.70, pos: [ 2,  3.0, -3], camOffset: [0.5, 0.5, 4.0], rotSpeed: 2.5 },
  { progress: 0.85, pos: [ 3,  0.5, -4], camOffset: [0.5, 1.0, 3.5], rotSpeed: 3.5 },
  { progress: 0.95, pos: [ 3, -0.8, -4], camOffset: [0.5, 1.5, 3.0], rotSpeed: 4.0 }, // 着地
  { progress: 1.00, pos: [ 3, -0.8, -4], camOffset: [0.5, 1.5, 3.0], rotSpeed: 0.5 },
]

export const HOTSPOT_RADIUS = 0.025
```

- [ ] **Step 2: `VolleyballBg.tsx`を作成する**

```tsx
// src/components/canvas/volleyball/VolleyballBg.tsx
import { Environment } from '@react-three/drei'

// ネット
function Net() {
  return (
    <group position={[0, 0, -3]}>
      {/* ネット上部ライン */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[8, 0.04, 0.02]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5} />
      </mesh>
      {/* ネット下部ライン */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[8, 0.03, 0.02]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} />
      </mesh>
      {/* 縦糸（8本） */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-3.5 + i * 0.875, 0.3, 0]}>
          <boxGeometry args={[0.015, 1.4, 0.01]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
    </group>
  )
}

// アンテナ（赤白ポール）
function Antennas() {
  const colors = ['#ff2222', '#ffffff']
  return (
    <>
      {[-4, 4].map((x) => (
        <group key={x} position={[x, 0.5, -3]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, -0.5 + i * 0.2, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
              <meshStandardMaterial color={colors[i % 2]} emissive={colors[i % 2]} emissiveIntensity={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  )
}

// グリッド床
function GridFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, -2]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#012010" roughness={0.9} />
      </mesh>
      {/* コートライン */}
      {[-5, 5].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, -1.19, -2]}>
          <planeGeometry args={[0.04, 20]} />
          <meshStandardMaterial color="#69f0ae" emissive="#69f0ae" emissiveIntensity={0.1} />
        </mesh>
      ))}
    </>
  )
}

// 遠景ライン照明
function AmbientLines() {
  return (
    <>
      {[-8, 8].map((x) => (
        <mesh key={x} position={[x, 2, -8]}>
          <boxGeometry args={[0.05, 0.05, 12]} />
          <meshStandardMaterial color="#69f0ae" emissive="#69f0ae" emissiveIntensity={0.15} />
        </mesh>
      ))}
    </>
  )
}

export default function VolleyballBg() {
  return (
    <>
      <Environment preset="night" resolution={64} />
      <ambientLight intensity={0.03} />
      <pointLight position={[0, 6, 0]} intensity={20} color="#69f0ae" />
      <pointLight position={[-5, 3, -3]} intensity={10} color="#005533" />
      <fog attach="fog" args={['#021a12', 8, 30]} />
      <GridFloor />
      <Net />
      <Antennas />
      <AmbientLines />
    </>
  )
}
```

- [ ] **Step 3: GlobalCanvas.tsxとJourneyCameraRig.tsxを更新する**

GlobalCanvas.tsxを以下の3箇所修正する（Task 10で作ったファイルの続き）：

```tsx
// 1. importブロックに追加
import VolleyballBg from './volleyball/VolleyballBg'
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'

// 2. SCENE_WAYPOINTSを更新（[] → VOLLEYBALL_WAYPOINTS）
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': VOLLEYBALL_WAYPOINTS,
}

// 3. Canvas内に追加
{pathname === '/volleyball' && <VolleyballBg />}
```

JourneyCameraRig.tsxも同様に更新する：

```tsx
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'
const SCENE_WAYPOINTS: Record<string, Waypoint[]> = {
  '/soccer':     SOCCER_WAYPOINTS,
  '/basketball': BASKETBALL_WAYPOINTS,
  '/volleyball': VOLLEYBALL_WAYPOINTS,
}
```

- [ ] **Step 4: コミット**

```bash
git add src/data/trajectories/volleyball-trajectory.ts src/components/canvas/volleyball/VolleyballBg.tsx src/components/canvas/GlobalCanvas.tsx src/components/canvas/JourneyCameraRig.tsx
git commit -m "feat: Volleyball軌道データとVolleyballBg追加"
```

---

### Task 13: VolleyballScene.tsx — スクロール連動完成

**Files:**
- Modify: `src/pages/VolleyballScene.tsx`

- [ ] **Step 1: `about.ts`のキーを確認する**

```bash
head -20 src/data/about.ts
```

`volleyball-trajectory.ts`のaboutKeyと一致させる。

- [ ] **Step 2: VolleyballScene.tsxを書き換える**

```tsx
// src/pages/VolleyballScene.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCard from '../components/ui/SceneCard'
import { useScrollProgress, scrollProgressRef } from '../hooks/useScrollProgress'
import { VOLLEYBALL_HOTSPOTS, VOLLEYBALL_WAYPOINTS, HOTSPOT_RADIUS } from '../data/trajectories/volleyball-trajectory'
// about.tsのimportは実際の構造に合わせる
import { ABOUT_SECTIONS } from '../data/about'

export default function VolleyballScene() {
  useScrollProgress()
  const navigate = useNavigate()
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number | null>(null)

  useEffect(() => {
    let raf: number
    const check = () => {
      const p = scrollProgressRef.current
      let found: number | null = null
      for (const wp of VOLLEYBALL_WAYPOINTS) {
        if (wp.hotspotIndex !== undefined && Math.abs(p - wp.progress) < HOTSPOT_RADIUS) {
          found = wp.hotspotIndex
          break
        }
      }
      setActiveHotspotIdx(found)
      raf = requestAnimationFrame(check)
    }
    raf = requestAnimationFrame(check)
    return () => cancelAnimationFrame(raf)
  }, [])

  const activeHotspot = activeHotspotIdx !== null ? VOLLEYBALL_HOTSPOTS[activeHotspotIdx] : null
  const aboutSection = ABOUT_SECTIONS?.find((s: { key: string }) => s.key === activeHotspot?.aboutKey)

  return (
    <>
      <div style={{ height: '250vh' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', bottom: '1.5rem', left: '2.5rem' }}>
          <p style={{ fontSize: '0.55rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>/volleyball</p>
          <p style={{ fontSize: '0.7rem', color: '#69f0ae', fontWeight: 700, margin: '0.15rem 0 0' }}>About — 自分について</p>
        </div>
        <div style={{ pointerEvents: 'auto' }}>
          <SceneCard
            visible={!!activeHotspot}
            side={activeHotspot?.cardSide ?? 'right'}
            category="ABOUT"
            title={aboutSection?.title ?? ''}
            description={aboutSection?.description ?? ''}
            onNext={activeHotspotIdx === VOLLEYBALL_HOTSPOTS.length - 1 ? () => navigate('/contact') : undefined}
            nextLabel="NEXT: CONTACT →"
          />
        </div>
        <button
          onClick={() => navigate('/contact')}
          style={{
            position: 'absolute', bottom: '2rem', right: '2.5rem',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            padding: '0.6rem 1.5rem', borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
            background: 'transparent', cursor: 'pointer', pointerEvents: 'auto',
          }}
        >
          NEXT: CONTACT →
        </button>
      </div>
    </>
  )
}
```

- [ ] **Step 3: `about.ts`の構造を確認してVolleyballScene.tsxのimport/型を修正する**

```bash
head -30 src/data/about.ts
```

実際のexport名・型に合わせる。

- [ ] **Step 4: ブラウザ確認 + コミット**

```bash
pnpm dev
# /volleyball でスクロール動作を確認
git add src/pages/VolleyballScene.tsx
git commit -m "feat: VolleyballScene スクロール連動完成"
```

---

## Phase E: 仕上げ（Task 14〜15）

---

### Task 14: ルート遷移の連続性 — Crystal位置の引き継ぎ

**Files:**
- Modify: `src/pages/SoccerScene.tsx`
- Modify: `src/pages/BasketballScene.tsx`
- Modify: `src/components/canvas/GlobalCanvas.tsx`

- [ ] **Step 1: SoccerScene.tsxのNEXTボタンにlocation.stateを追加する**

```tsx
// SoccerScene.tsxのNEXTボタン類に追加
import { scrollProgressRef } from '../hooks/useScrollProgress'
import { SOCCER_WAYPOINTS } from '../data/trajectories/soccer-trajectory'
import { interpolateWaypoints } from '../components/canvas/journey/trajectory'

// navigate呼び出しを変更
const goNext = () => {
  const { pos } = interpolateWaypoints(scrollProgressRef.current, SOCCER_WAYPOINTS)
  navigate('/basketball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } })
}
```

`navigate('/basketball')` を `goNext()` に置き換える（NEXTボタンとSceneCardのonNextの両方）。

- [ ] **Step 2: BasketballScene.tsxも同様に対応する**

```tsx
const goNext = () => {
  const { pos } = interpolateWaypoints(scrollProgressRef.current, BASKETBALL_WAYPOINTS)
  navigate('/volleyball', { state: { ballEntry: { x: pos.x, y: pos.y, z: pos.z } } })
}
```

- [ ] **Step 3: GlobalCanvas.tsxでlocation.stateを受け取り入場アニメーションの開始位置に使う**

```tsx
import { useLocation } from 'react-router-dom'

// GlobalCanvas内（既存のuseLocation利用箇所に追記）
const { pathname, state } = useLocation()
const ballEntry = (state as { ballEntry?: { x: number; y: number; z: number } } | null)?.ballEntry

// CrystalRoot に ballEntryX, ballEntryY を渡す
// CrystalRoot内でuseEffect: ballEntryがあればCrystalをそのXYZからスタートさせる
// （gsapでフワッと入場位置から通常軌道に収束）
```

CrystalRoot の useEffect に以下を追加：

```tsx
useEffect(() => {
  if (!grpRef.current || !ballEntry || isHome) return
  // 前のシーンからのボール位置からスタート（フラッシュ明けの連続性）
  grpRef.current.position.set(ballEntry.x, ballEntry.y, ballEntry.z)
  // 最初のウェイポイント位置へスムーズ収束（0.8秒）
  gsap.to(grpRef.current.position, {
    x: 0, y: 0, z: 0,
    duration: 0.8,
    ease: 'power2.out',
  })
}, [ballEntry])  // ballEntryが変わった時のみ実行（ルート入場時）
```

- [ ] **Step 4: ブラウザ確認**

Soccer末端から Basketball に遷移した時、Crystalがフラッシュ明けに右上から飛来する（位置連続性）ことを確認。

- [ ] **Step 5: コミット**

```bash
git add src/pages/SoccerScene.tsx src/pages/BasketballScene.tsx src/components/canvas/GlobalCanvas.tsx
git commit -m "feat: ルート遷移のCrystal位置連続性を実装"
```

---

### Task 15: JourneyEffects.tsx — 接触エフェクト

**Files:**
- Create: `src/components/canvas/JourneyEffects.tsx`
- Modify: `src/components/canvas/GlobalCanvas.tsx`

- [ ] **Step 1: `JourneyEffects.tsx`を作成する**

```tsx
// src/components/canvas/JourneyEffects.tsx
import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useLocation } from 'react-router-dom'
import * as THREE from 'three'
import { scrollProgressRef } from '../../hooks/useScrollProgress'
import { SOCCER_WAYPOINTS } from '../../data/trajectories/soccer-trajectory'
import { BASKETBALL_WAYPOINTS } from '../../data/trajectories/basketball-trajectory'
import { VOLLEYBALL_WAYPOINTS } from '../../data/trajectories/volleyball-trajectory'
import { interpolateWaypoints } from './journey/trajectory'

// 衝撃波リングアニメーション1個分の状態
interface ShockwaveState {
  active: boolean
  progress: number  // 0→1
  x: number; y: number; z: number
  axis: 'horizontal' | 'vertical'
  color: string
}

const NUM_RINGS = 3  // 同時最大数

export default function JourneyEffects() {
  const { pathname } = useLocation()
  const { camera } = useThree()
  const ringRefs = useRef<(THREE.Mesh | null)[]>(Array(NUM_RINGS).fill(null))
  const states = useRef<ShockwaveState[]>(
    Array(NUM_RINGS).fill(null).map(() => ({
      active: false, progress: 0, x: 0, y: 0, z: 0,
      axis: 'horizontal' as const, color: '#ffffff',
    }))
  )
  const prevProgress = useRef(0)
  const cameraShake = useRef(0)

  // ホットスポットを跨いだ瞬間にエフェクト発火
  const maybeFireEffect = (current: number) => {
    const prev = prevProgress.current
    const waypoints = pathname === '/soccer' ? SOCCER_WAYPOINTS
      : pathname === '/basketball' ? BASKETBALL_WAYPOINTS
      : VOLLEYBALL_WAYPOINTS

    for (const wp of waypoints) {
      if (wp.hotspotIndex === undefined) continue
      // prevとcurrentの間にwp.progressが入ったら発火
      if ((prev < wp.progress && current >= wp.progress) ||
          (prev > wp.progress && current <= wp.progress)) {
        const { pos } = interpolateWaypoints(wp.progress, waypoints)
        // 空いているスロットにエフェクトをセット
        const slot = states.current.findIndex(s => !s.active)
        if (slot < 0) break
        states.current[slot] = {
          active: true, progress: 0,
          x: pos.x, y: pos.y, z: pos.z,
          axis: pathname === '/basketball' && wp.hotspotIndex === 2 ? 'vertical' : 'horizontal',
          color: pathname === '/soccer' ? '#4fc3f7'
            : pathname === '/basketball' ? '#ffb300' : '#69f0ae',
        }
        if (pathname === '/volleyball' && wp.hotspotIndex === 2) {
          cameraShake.current = 0.3  // スパイク着地でカメラシェイク
        }
      }
    }
    prevProgress.current = current
  }

  useFrame((_, delta) => {
    const current = scrollProgressRef.current
    maybeFireEffect(current)

    // カメラシェイク
    if (cameraShake.current > 0) {
      camera.position.x += (Math.random() - 0.5) * 0.04
      camera.position.y += (Math.random() - 0.5) * 0.04
      cameraShake.current = Math.max(0, cameraShake.current - delta)
    }

    // リングアニメーション更新
    states.current.forEach((s, i) => {
      if (!s.active) return
      s.progress += delta * 1.8  // 0→1 で約0.55秒
      const mesh = ringRefs.current[i]
      if (!mesh) return
      const scale = s.progress * 2.5 + 0.1
      mesh.scale.setScalar(scale)
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity = Math.max(0, 1 - s.progress)
      mat.emissiveIntensity = (1 - s.progress) * 4
      mesh.position.set(s.x, s.y, s.z)
      mesh.rotation.x = s.axis === 'horizontal' ? Math.PI / 2 : 0
      mesh.visible = true
      if (s.progress >= 1) {
        s.active = false
        mesh.visible = false
      }
    })
  })

  return (
    <>
      {Array.from({ length: NUM_RINGS }, (_, i) => (
        <mesh
          key={i}
          ref={el => { ringRefs.current[i] = el }}
          visible={false}
        >
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={4}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}
```

- [ ] **Step 2: GlobalCanvas.tsxにJourneyEffectsを追加する**

```tsx
import JourneyEffects from './JourneyEffects'

// Canvas内（JourneyCameraRigの隣）
{!isHome && <JourneyEffects />}
```

- [ ] **Step 3: ブラウザ確認**

各シーンでホットスポット付近を通過した時に衝撃波リングが出ることを確認。

- [ ] **Step 4: 全テスト実行**

```bash
pnpm test
```

期待結果: 全テストPASS（14テスト）

- [ ] **Step 5: ビルド確認**

```bash
pnpm build
```

TypeScriptエラーが0であることを確認。

- [ ] **Step 6: コミット**

```bash
git add src/components/canvas/JourneyEffects.tsx src/components/canvas/GlobalCanvas.tsx
git commit -m "feat: JourneyEffects（衝撃波リング + カメラシェイク）を追加"
```

---

## 座標チューニング指針

各シーンのウェイポイント座標値は初期値であり、`pnpm dev`で実際に動かしながら調整が必要。  
調整ポイント：

1. **Soccer**: ゴール枠（z=-18）に対してPhase3末端のpos(z=-22)が遠すぎる/近すぎる場合は調整
2. **Basketball**: バックボード（z=-6）とリング（z=-5, y=2.2）に対してウェイポイントが合っているか確認
3. **Volleyball**: ネット（z=-3）に対してPhase2のウェイポイントが適切か確認

チューニングはコードではなくデータファイル（`*-trajectory.ts`）の数値変更のみで完結する。

---

## データ構造の事前確認（実装前に必須）

Task 9・11・13の実装前に以下を確認する：

```bash
# project categories
grep -n "export\|id:" src/data/projects.ts | head -20

# skill categories
grep -n "export\|id:" src/data/skills.ts | head -20

# about sections
grep -n "export\|key:\|title:" src/data/about.ts | head -20
```

各トラジェクトリファイルのid/keyが実際のデータと一致していない場合は、トラジェクトリファイル側を修正する。
