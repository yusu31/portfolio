# ボールジャーニー Phase 1（共通基盤＋サッカーシーン）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** スクロール連動の「サッカードリブル＋ロングパス」3Dシーンを、Hero〜Impact間に新設する透明トランジション区間に実装し、ボールジャーニー演出（バスケ・バレーは別Phase）の技術基盤を確立する。

**Architecture:** 既存のR3F Canvas（`Scene.tsx`配下）に新規ディレクトリ `src/components/canvas/journey/` を追加。UI層には`Hero`と`Impact`の間に透明な高さ確保用セクション（`JourneyZone`）を挿入し、その区間のスクロール位置をrefベースのフックで取得、サッカーシーンのボール軌道・カメラドリーをuseFrame内で駆動する。スクロール進捗計算とボール軌道計算は純粋関数として切り出し、Vitestで単体テストする。

**Tech Stack:** React 19 / @react-three/fiber v9 / @react-three/drei / @react-three/postprocessing（GodRays追加） / three.js / Vitest（新規導入）

---

## 設計書との対応

詳細仕様は [`docs/superpowers/specs/2026-06-30-ball-journey-transition-design.md`](../specs/2026-06-30-ball-journey-transition-design.md) を参照。本プランはそのうち「①サッカーシーン」と「共通基盤」のみをスコープとする。バスケットボール・バレーボールシーンは別プランで実装する。

## 重要な設計変更（このプラン作成時に発見）

[Impact.tsx:60](../../../src/components/sections/Impact.tsx#L60) など、Hero以外の全セクションは不透明背景（`#0d0d18` 等）を持つため、3D Canvasは通常そのセクション区間では見えない。これを解消するため、`Hero`と`Impact`の間に**透明な高さ確保用セクション**（`JourneyZone`）を新設し、その区間でのみ3Dキャンバスがフルスクリーンで見える状態を作る。

---

### Task 1: Vitestテスト基盤の導入

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Vitestをdevdependencyに追加**

```bash
npm install -D vitest
```

- [ ] **Step 2: vitest.config.ts を作成**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: package.json の scripts に "test" を追加**

`package.json` の `"scripts"` ブロックを以下に置き換える:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 4: 動作確認用の仮テストで疎通確認**

`src/sanity.test.ts` を一時作成:

```typescript
import { describe, it, expect } from 'vitest'

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Run: `npm run test`
Expected: PASS（1 test passed）

- [ ] **Step 5: 仮テストを削除しコミット**

```bash
rm src/sanity.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: Vitestテスト基盤を導入"
```

---

### Task 2: スクロール進捗計算の純粋関数＋テスト

**Files:**
- Create: `src/components/canvas/journey/scrollProgress.ts`
- Test: `src/components/canvas/journey/scrollProgress.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/components/canvas/journey/scrollProgress.test.ts
import { describe, it, expect } from 'vitest'
import { computeSectionProgress } from './scrollProgress'

describe('computeSectionProgress', () => {
  it('区間開始前は0を返す', () => {
    expect(computeSectionProgress(1000, 500, 800)).toBe(0)
  })

  it('区間終了後は1を返す', () => {
    expect(computeSectionProgress(1000, 500, 1600)).toBe(1)
  })

  it('区間の中間点で0.5を返す', () => {
    expect(computeSectionProgress(1000, 500, 1250)).toBe(0.5)
  })

  it('区間の高さが0以下なら0を返す', () => {
    expect(computeSectionProgress(1000, 0, 1200)).toBe(0)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test -- scrollProgress`
Expected: FAIL（`computeSectionProgress` が存在しない）

- [ ] **Step 3: 実装する**

```typescript
// src/components/canvas/journey/scrollProgress.ts

/**
 * 指定セクションのドキュメント上の絶対top位置(sectionTop)・高さ(sectionHeight)・
 * 現在のスクロール量(scrollY)から、そのセクション内での進捗(0〜1)を計算する。
 */
export function computeSectionProgress(
  sectionTop: number,
  sectionHeight: number,
  scrollY: number,
): number {
  if (sectionHeight <= 0) return 0
  const raw = (scrollY - sectionTop) / sectionHeight
  return Math.min(1, Math.max(0, raw))
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test -- scrollProgress`
Expected: PASS（4 tests passed）

- [ ] **Step 5: コミット**

```bash
git add src/components/canvas/journey/scrollProgress.ts src/components/canvas/journey/scrollProgress.test.ts
git commit -m "feat: セクション単位のスクロール進捗計算を追加"
```

---

### Task 3: ボール軌道計算の純粋関数＋テスト

**Files:**
- Create: `src/components/canvas/journey/trajectory.ts`
- Test: `src/components/canvas/journey/trajectory.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
// src/components/canvas/journey/trajectory.test.ts
import { describe, it, expect } from 'vitest'
import { Vector3 } from 'three'
import { parabolaPoint, dribbleBounceY } from './trajectory'

describe('parabolaPoint', () => {
  const start = new Vector3(0, 0, 0)
  const end = new Vector3(10, 0, 0)

  it('t=0で開始点に一致する', () => {
    const p = parabolaPoint(0, start, end, 3)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
    expect(p.z).toBeCloseTo(0)
  })

  it('t=0.5で頂点の高さに達する', () => {
    const p = parabolaPoint(0.5, start, end, 3)
    expect(p.x).toBeCloseTo(5)
    expect(p.y).toBeCloseTo(3)
  })

  it('t=1で終了点に一致する', () => {
    const p = parabolaPoint(1, start, end, 3)
    expect(p.x).toBeCloseTo(10)
    expect(p.y).toBeCloseTo(0)
  })
})

describe('dribbleBounceY', () => {
  it('t=0ではbaseYを返す（バウンドの谷）', () => {
    expect(dribbleBounceY(0, 2, 0.3, 6)).toBeCloseTo(2)
  })

  it('バウンド高さは常にbaseY以上になる', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(dribbleBounceY(t, 2, 0.3, 6)).toBeGreaterThanOrEqual(2)
    }
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test -- trajectory`
Expected: FAIL（`parabolaPoint` / `dribbleBounceY` が存在しない）

- [ ] **Step 3: 実装する**

```typescript
// src/components/canvas/journey/trajectory.ts
import { Vector3 } from 'three'

/**
 * start→end間を進む放物線軌道上の、進捗t(0〜1)時点の座標を返す。
 * peakHeightはt=0.5時点でのY方向の盛り上がり量。
 */
export function parabolaPoint(
  t: number,
  start: Vector3,
  end: Vector3,
  peakHeight: number,
): Vector3 {
  const x = start.x + (end.x - start.x) * t
  const z = start.z + (end.z - start.z) * t
  const baseY = start.y + (end.y - start.y) * t
  const arc = peakHeight * 4 * t * (1 - t)
  return new Vector3(x, baseY + arc, z)
}

/**
 * ドリブル中のバウンド高さ。t(0〜1)の全区間でbounces回バウンドする。
 * 戻り値は常にbaseY以上。
 */
export function dribbleBounceY(
  t: number,
  baseY: number,
  bounceHeight: number,
  bounces: number,
): number {
  const phase = t * bounces * Math.PI
  return baseY + Math.abs(Math.sin(phase)) * bounceHeight
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test -- trajectory`
Expected: PASS（5 tests passed）

- [ ] **Step 5: コミット**

```bash
git add src/components/canvas/journey/trajectory.ts src/components/canvas/journey/trajectory.test.ts
git commit -m "feat: ボール軌道（放物線・ドリブルバウンド）の計算関数を追加"
```

---

### Task 4: セクション進捗をR3F用にrefで取得するフック

**Files:**
- Create: `src/components/canvas/journey/useJourneySectionProgress.ts`

このフックはR3Fの`useFrame`内で毎フレーム読むため、Reactの再レンダリングを避けてrefで値を保持する（[CameraRig.tsx](../../../src/components/canvas/CameraRig.tsx)と同じ設計方針）。純粋関数のテストで計算ロジックは検証済みなので、ここはDOM配線のみで単体テストは設けない。

- [ ] **Step 1: 実装する**

```typescript
// src/components/canvas/journey/useJourneySectionProgress.ts
import { useEffect, useRef } from 'react'
import { computeSectionProgress } from './scrollProgress'

/**
 * 指定idのDOMセクション内での縦スクロール進捗(0〜1)をrefで返す。
 * useFrame内で `.current` を読むことを想定（Reactの再レンダリングを発生させない）。
 */
export function useJourneySectionProgress(sectionId: string) {
  const progressRef = useRef(0)
  const boundsRef = useRef({ top: 0, height: 0 })

  useEffect(() => {
    const measure = () => {
      const el = document.getElementById(sectionId)
      if (!el) return
      const rect = el.getBoundingClientRect()
      boundsRef.current = { top: rect.top + window.scrollY, height: rect.height }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [sectionId])

  useEffect(() => {
    const onScroll = () => {
      const { top, height } = boundsRef.current
      progressRef.current = computeSectionProgress(top, height, window.scrollY)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return progressRef
}
```

- [ ] **Step 2: 型チェックを通す**

Run: `npx tsc -b --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/canvas/journey/useJourneySectionProgress.ts
git commit -m "feat: セクション単位のスクロール進捗を取得するR3F用フックを追加"
```

---

### Task 5: 透明トランジション区間（JourneyZone）をUI層に追加

**Files:**
- Create: `src/components/sections/JourneyZone.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: JourneyZoneコンポーネントを作成**

```tsx
// src/components/sections/JourneyZone.tsx
interface JourneyZoneProps {
  id: string
  heightVh?: number
}

/**
 * 3DキャンバスをUIに隠されず全画面表示するための、透明な高さ確保用セクション。
 * 中身は描画しない（3D演出はCanvas側のBallJourneyが担当）。
 */
export default function JourneyZone({ id, heightVh = 250 }: JourneyZoneProps) {
  return (
    <section
      id={id}
      style={{
        height: `${heightVh}vh`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  )
}
```

- [ ] **Step 2: App.tsxにHero→Impactの間で挿入**

[App.tsx:47-55](../../../src/App.tsx#L47-L55) の `<main>` 内を以下に変更する:

```tsx
import JourneyZone from './components/sections/JourneyZone'
```
を他のimportと並べて追加し、

```tsx
        <main>
          <Hero />
          <JourneyZone id="journey-soccer" heightVh={250} />
          <Impact />
          <Story />
          <Projects />
          <Skills />
          <Blog />
          <Contact />
        </main>
```
に置き換える。

- [ ] **Step 3: 開発サーバーで目視確認**

```bash
npm run dev
```
ブラウザでHero下にスクロールし、Impactセクションが表示されるまでの間、ページが約2.5画面分長くなっており、その間は3D背景（既存のクリスタル等）がそのまま見え続けることを確認する。

- [ ] **Step 4: コミット**

```bash
git add src/components/sections/JourneyZone.tsx src/App.tsx
git commit -m "feat: Hero-Impact間に3D演出用の透明トランジション区間を追加"
```

---

### Task 6: ナイター照明（Floodlights）

**Files:**
- Create: `src/components/canvas/journey/Floodlights.tsx`

GodRaysエフェクトは「光源となるメッシュ」への参照が必要。`onSunReady`コールバックで親（Task 11のBallJourney）に光源メッシュを渡せるようにする。

- [ ] **Step 1: 実装する**

```tsx
// src/components/canvas/journey/Floodlights.tsx
import { useRef, useEffect } from 'react'
import type { Mesh } from 'three'

interface FloodlightsProps {
  onSunReady?: (mesh: Mesh) => void
}

const POLE_POSITIONS: [number, number, number][] = [
  [-8, 6, -10],
  [8, 6, -10],
  [-8, 6, 10],
  [8, 6, 10],
]

export default function Floodlights({ onSunReady }: FloodlightsProps) {
  const primarySunRef = useRef<Mesh>(null)

  useEffect(() => {
    if (primarySunRef.current && onSunReady) {
      onSunReady(primarySunRef.current)
    }
  }, [onSunReady])

  return (
    <group>
      {POLE_POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          {/* ポール */}
          <mesh position={[0, -y / 2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, y, 8]} />
            <meshStandardMaterial color="#222226" roughness={0.8} />
          </mesh>
          {/* ライトフィクスチャ（発光ディスク） */}
          <mesh ref={i === 0 ? primarySunRef : undefined}>
            <circleGeometry args={[0.6, 16]} />
            <meshStandardMaterial
              color="#fff5e0"
              emissive="#fff5e0"
              emissiveIntensity={6}
              toneMapped={false}
            />
          </mesh>
          <pointLight color="#fff5e0" intensity={60} distance={30} decay={2} />
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc -b --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/canvas/journey/Floodlights.tsx
git commit -m "feat: ナイター投光器コンポーネントを追加"
```

---

### Task 7: Effects.tsxにGodRaysを追加

**Files:**
- Modify: `src/components/canvas/Effects.tsx`

- [ ] **Step 1: 現在の実装を、sunMesh propを受け取れる形に変更**

[Effects.tsx](../../../src/components/canvas/Effects.tsx) の全体を以下に置き換える:

```tsx
// src/components/canvas/Effects.tsx
import { EffectComposer, Bloom, GodRays } from '@react-three/postprocessing'
import type { Mesh } from 'three'

interface EffectsProps {
  sunMesh?: Mesh | null
}

export default function Effects({ sunMesh }: EffectsProps) {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.2}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      {sunMesh ? (
        <GodRays
          sun={sunMesh}
          samples={30}
          density={0.9}
          decay={0.9}
          weight={0.4}
          exposure={0.5}
          blur
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  )
}
```

- [ ] **Step 2: Scene.tsxの呼び出し側を一旦そのまま起動確認**

この時点では`Scene.tsx`は`<Effects />`を引数なしで呼んでいるため`sunMesh`は`undefined`になり、GodRaysは描画されない（Task 11で配線する）。

Run: `npm run dev`
Expected: 既存のクリスタル演出がこれまで通り表示され、コンソールエラーが出ないこと

- [ ] **Step 3: 型チェック**

Run: `npx tsc -b --noEmit`
Expected: エラーなし（`Scene.tsx`側の`<Effects />`呼び出しは`sunMesh`が任意propのためエラーにならない）

- [ ] **Step 4: コミット**

```bash
git add src/components/canvas/Effects.tsx
git commit -m "feat: EffectsにGodRaysを追加（sunMesh未指定時は無効）"
```

---

### Task 8: コート地面（CourtSurface）と芝のPBRテクスチャ

**Files:**
- Create: `public/textures/leafy_grass_diff_1k.jpg`
- Create: `public/textures/leafy_grass_nor_gl_1k.jpg`
- Create: `public/textures/leafy_grass_rough_1k.jpg`
- Create: `src/components/canvas/journey/CourtSurface.tsx`

- [ ] **Step 1: テクスチャをダウンロードして配置**

[Poly Haven "Leafy Grass"](https://polyhaven.com/a/leafy_grass)（CC0ライセンス、クレジット表記不要）から、1K解像度のJPGセットをダウンロードする：
- Diffuse（カラー）マップ
- Normal（GL形式）マップ
- Roughnessマップ

ダウンロードしたファイルをリネームして配置:
```
public/textures/leafy_grass_diff_1k.jpg
public/textures/leafy_grass_nor_gl_1k.jpg
public/textures/leafy_grass_rough_1k.jpg
```

- [ ] **Step 2: CourtSurfaceを実装**

```tsx
// src/components/canvas/journey/CourtSurface.tsx
import { useTexture } from '@react-three/drei'
import { RepeatWrapping } from 'three'

interface CourtSurfaceProps {
  width?: number
  depth?: number
  position?: [number, number, number]
}

export default function CourtSurface({
  width = 20,
  depth = 40,
  position = [0, -1.8, -10],
}: CourtSurfaceProps) {
  const [diffuse, normal, roughness] = useTexture([
    '/textures/leafy_grass_diff_1k.jpg',
    '/textures/leafy_grass_nor_gl_1k.jpg',
    '/textures/leafy_grass_rough_1k.jpg',
  ])

  ;[diffuse, normal, roughness].forEach((tex) => {
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.repeat.set(width / 4, depth / 4)
  })

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        map={diffuse}
        normalMap={normal}
        roughnessMap={roughness}
        roughness={1}
      />
    </mesh>
  )
}
```

- [ ] **Step 3: Playwrightで仮マウントして目視確認**

`SoccerScene.tsx`（Task 10）がまだ無いため、一時的に`Scene.tsx`の`<CrystalContainer />`の下に`<CourtSurface />`を追記して `npm run dev` で起動し、緑の芝テクスチャ地面が表示されることをブラウザで確認する。確認後、追記した一時コードは元に戻す（Task 11で正式に配線する）。

- [ ] **Step 4: コミット**

```bash
git add public/textures/ src/components/canvas/journey/CourtSurface.tsx
git commit -m "feat: PBRテクスチャを使ったコート地面コンポーネントを追加"
```

---

### Task 9: 風になびく芝（GrassField）

**Files:**
- Create: `src/components/canvas/journey/GrassField.tsx`

- [ ] **Step 1: インスタンス芝シェーダーを実装**

```tsx
// src/components/canvas/journey/GrassField.tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { InstancedMesh, Object3D, MathUtils, ShaderMaterial, DoubleSide } from 'three'

interface GrassFieldProps {
  count?: number
  spreadX?: number
  spreadZ?: number
  position?: [number, number, number]
}

const vertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float windPhase = uTime * 2.0 + (instanceMatrix[3][0] + instanceMatrix[3][2]) * 0.5;
    float bend = sin(windPhase) * 0.15 * uv.y;
    pos.x += bend;
    vec4 worldPos = instanceMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * worldPos;
  }
`

const fragmentShader = `
  varying vec2 vUv;
  void main() {
    vec3 base = mix(vec3(0.05, 0.18, 0.06), vec3(0.25, 0.55, 0.2), vUv.y);
    gl_FragColor = vec4(base, 1.0);
  }
`

export default function GrassField({
  count = 6000,
  spreadX = 18,
  spreadZ = 36,
  position = [0, -1.8, -10],
}: GrassFieldProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader,
        fragmentShader,
        side: DoubleSide,
      }),
    [],
  )

  // useMemoはマウント前（refアタッチ前）に実行されるため、
  // ref経由でメッシュに書き込む初期化はuseEffectで行う（マウント後に1回だけ実行）。
  useEffect(() => {
    if (!meshRef.current) return
    for (let i = 0; i < count; i++) {
      dummy.position.set(
        MathUtils.randFloatSpread(spreadX),
        0,
        MathUtils.randFloatSpread(spreadZ),
      )
      dummy.rotation.y = Math.random() * Math.PI
      dummy.scale.setScalar(MathUtils.randFloat(0.6, 1.1))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [count, spreadX, spreadZ, dummy])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} position={position}>
      <planeGeometry args={[0.05, 0.35]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc -b --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/canvas/journey/GrassField.tsx
git commit -m "feat: 風になびくインスタンス芝シェーダーを追加"
```

---

### Task 10: サッカーシーン本体（ドリブル＋ロングパス）

**Files:**
- Create: `src/components/canvas/journey/SoccerScene.tsx`

- [ ] **Step 1: 実装する**

```tsx
// src/components/canvas/journey/SoccerScene.tsx
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Trail } from '@react-three/drei'
import { Mesh, Vector3 } from 'three'
import { useJourneySectionProgress } from './useJourneySectionProgress'
import { dribbleBounceY, parabolaPoint } from './trajectory'
import CourtSurface from './CourtSurface'
import GrassField from './GrassField'
import Floodlights from './Floodlights'

interface SoccerSceneProps {
  onSunReady?: (mesh: Mesh) => void
}

const DRIBBLE_END = 0.7 // progress 0〜0.7: ドリブル、0.7〜1.0: ロングパス
const DRIBBLE_START = new Vector3(0, 0, 4)
const DRIBBLE_END_POS = new Vector3(0, 0, -6)
const PASS_END_POS = new Vector3(0, 0, -30)

export default function SoccerScene({ onSunReady }: SoccerSceneProps) {
  const progressRef = useJourneySectionProgress('journey-soccer')
  const ballRef = useRef<Mesh>(null)
  const { camera } = useThree()

  useFrame(() => {
    const p = progressRef.current
    if (!ballRef.current) return

    if (p <= 0 || p >= 1) {
      ballRef.current.visible = false
      return
    }
    ballRef.current.visible = true

    if (p < DRIBBLE_END) {
      const t = p / DRIBBLE_END
      const x = DRIBBLE_START.x + (DRIBBLE_END_POS.x - DRIBBLE_START.x) * t
      const z = DRIBBLE_START.z + (DRIBBLE_END_POS.z - DRIBBLE_START.z) * t
      const y = dribbleBounceY(t, 0.3, 0.35, 8)
      ballRef.current.position.set(x, y, z)
    } else {
      const t = (p - DRIBBLE_END) / (1 - DRIBBLE_END)
      const point = parabolaPoint(t, DRIBBLE_END_POS, PASS_END_POS, 3.5)
      ballRef.current.position.copy(point)
    }

    // カメラはボールの少し後方・上方から追従するドリー
    const camTarget = new Vector3(
      ballRef.current.position.x,
      ballRef.current.position.y + 1.5,
      ballRef.current.position.z + 4,
    )
    camera.position.lerp(camTarget, 0.08)
    camera.lookAt(ballRef.current.position)
  })

  return (
    <group>
      <CourtSurface />
      <GrassField />
      <Floodlights onSunReady={onSunReady} />
      <Trail width={2} length={6} color="#fb923c" attenuation={(t) => t * t}>
        <mesh ref={ballRef}>
          <sphereGeometry args={[0.3, 24, 24]} />
          <meshStandardMaterial
            color="#fdba74"
            emissive="#f97316"
            emissiveIntensity={1.4}
          />
        </mesh>
      </Trail>
    </group>
  )
}
```

- [ ] **Step 2: 型チェック**

Run: `npx tsc -b --noEmit`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/canvas/journey/SoccerScene.tsx
git commit -m "feat: サッカーシーン（ドリブル+ロングパス）を実装"
```

---

### Task 11: BallJourneyコンテナをScene.tsxに配線

**Files:**
- Create: `src/components/canvas/journey/BallJourney.tsx`
- Modify: `src/components/canvas/Scene.tsx`
- Modify: `src/components/canvas/Effects.tsx`（呼び出し元）

- [ ] **Step 1: BallJourneyコンテナを実装**

```tsx
// src/components/canvas/journey/BallJourney.tsx
import type { Mesh } from 'three'
import SoccerScene from './SoccerScene'

interface BallJourneyProps {
  onSunReady?: (mesh: Mesh) => void
}

export default function BallJourney({ onSunReady }: BallJourneyProps) {
  return (
    <group>
      <SoccerScene onSunReady={onSunReady} />
    </group>
  )
}
```

- [ ] **Step 2: Scene.tsxにsunMesh stateとBallJourneyを追加**

[Scene.tsx](../../../src/components/canvas/Scene.tsx) の冒頭importに追加:

```tsx
import { useState } from 'react'
import type { Mesh } from 'three'
import BallJourney from './journey/BallJourney'
```

`export default function Scene() {` の直後に追加:

```tsx
  const [sunMesh, setSunMesh] = useState<Mesh | null>(null)
```

`<Effects />` の呼び出しを `<Effects sunMesh={sunMesh} />` に変更し、`<CrystalContainer />` の直後に以下を追加:

```tsx
      <BallJourney onSunReady={setSunMesh} />
```

- [ ] **Step 3: 開発サーバーで通し確認**

```bash
npm run dev
```
ブラウザでHero下にスクロールし、サッカーのドリブル→ロングパスが見え、芝・投光器・GodRaysが表示されることを確認する。コンソールエラーが出ないことも確認する。

- [ ] **Step 4: 型チェック**

Run: `npx tsc -b --noEmit`
Expected: エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/components/canvas/journey/BallJourney.tsx src/components/canvas/Scene.tsx
git commit -m "feat: BallJourneyをScene.tsxに統合"
```

---

### Task 12: prefers-reduced-motion対応

**Files:**
- Modify: `src/components/sections/JourneyZone.tsx`

- [ ] **Step 1: motion-reduceなら高さを0にして演出区間自体をスキップする**

[JourneyZone.tsx](../../../src/components/sections/JourneyZone.tsx) を以下に置き換える:

```tsx
// src/components/sections/JourneyZone.tsx
import { useEffect, useState } from 'react'

interface JourneyZoneProps {
  id: string
  heightVh?: number
}

export default function JourneyZone({ id, heightVh = 250 }: JourneyZoneProps) {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <section
      id={id}
      style={{
        height: reducedMotion ? '0' : `${heightVh}vh`,
        background: 'transparent',
        pointerEvents: 'none',
      }}
    />
  )
}
```

`SoccerScene.tsx`側は、`journey-soccer`要素の高さが0になると`computeSectionProgress`が常に0を返す（`sectionHeight <= 0` の分岐）ため、ボールは`visible=false`のまま自動的に非表示になり、追加対応は不要。

- [ ] **Step 2: ブラウザのDevToolsで `prefers-reduced-motion: reduce` をエミュレートして確認**

Chrome DevTools → Rendering タブ → "Emulate CSS media feature prefers-reduced-motion" → "reduce" を選択し、Hero下が即座にImpactにつながる（演出区間がスキップされる）ことを確認する。

- [ ] **Step 3: コミット**

```bash
git add src/components/sections/JourneyZone.tsx
git commit -m "feat: prefers-reduced-motion時にサッカーシーン区間をスキップ"
```

---

### Task 13: Playwrightによる視覚検証（デスクトップ・モバイル）

**Files:**
- なし（検証のみ、スクラッチパスにスクリプトを作成）

- [ ] **Step 1: デスクトップ・モバイル双方でスクロール通し確認**

`npm run dev` でサーバーを起動した状態で、Playwrightスクリプトを実行し:
- デスクトップ幅（1440×900）でHero→journey-soccer→Impactまでスクロールし、各区間でスクリーンショットを撮る
- モバイル幅（390×844）でも同様に確認する
- ブラウザのconsoleエラーが0件であることを確認する

検証観点:
- 芝・投光器・GodRays・ボールのドリブル/パスが意図通り表示されているか
- Impactセクションに入った瞬間、3D演出が完全に隠れて不透明背景に切り替わるか
- ページ全体のスクロール量が極端に重くなっていないか（体感でカクつきがないか）

- [ ] **Step 2: 問題があれば該当Taskに戻って修正**

ここでのフィードバックは個別タスクの実装にフィードバックする。新規タスクとしては追加しない。

---

### Task 14: 最終確認とPR作成

**Files:**
- なし

- [ ] **Step 1: 全体の型チェック・ビルド確認**

```bash
npx tsc -b --noEmit
npm run build
```
Expected: 両方ともエラーなく完了

- [ ] **Step 2: Vitestの全テストを実行**

```bash
npm run test
```
Expected: 全テストPASS

- [ ] **Step 3: Issue作成・ブランチプッシュ・PR作成**

プロジェクトのワークフロー（Issue→branch→PR→自動マージ）に従う。Issueは設計書Issue #45/PR #46を踏まえ、「ボールジャーニー Phase 1: サッカーシーン実装」として新規作成し、`feature/ball-journey-soccer-#<番号>` ブランチで本プランの全コミットをまとめてプッシュ、PRを作成する。

---

## 補足：Phase 2以降

バスケットボールシーン（Story→Projects間）・バレーボールシーン（Projects→Contact間）は、本Phase 1で確立した `scrollProgress.ts` / `trajectory.ts` / `useJourneySectionProgress.ts` / `JourneyZone.tsx` の共通基盤を再利用し、別の実装計画として作成する。手モデル（Mixamo/Sketchfab CC0）の調達はバスケットボールシーンのPhaseで着手する。
