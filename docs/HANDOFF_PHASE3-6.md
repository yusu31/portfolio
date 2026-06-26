# 引き継ぎプロンプト — Phase 3-6（グラウンドグロー + クリックオービット）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-06-26）

Phase 3-5 の PR #32 がマージ済み。**現在 `main` ブランチで作業開始できる状態。**

**リポジトリ:** `c:\Users\3fort\dev\portfolio`  
**現在のブランチ:** `main`（クリーン）  
**本番:** Cloudflare Pages（main push で自動デプロイ）

---

## 完了済みフェーズ

| フェーズ | 内容 | PR |
|---|---|---|
| 3-1 | Vite + React + TypeScript + R3F + Tailwind セットアップ | #26 |
| 3-2 | UIレイヤー全セクション移植 | #28 |
| 3-3/3-4 | React 19、ダークテーマ、サッカーボール風クリスタル | #30 |
| 3-5 | Bloom 統合・カットクリスタル確定・スクロールアウト | #32 |

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Effects.tsx で稼働中）
GSAP 3.15 + ScrollTrigger + SplitText
Lenis 1.3
Tailwind CSS v4
Three.js 0.184
```

---

## 現在の Canvas アーキテクチャ（重要）

```tsx
// App.tsx — Canvas は右55%固定 + CSS mask-image でエッジをフェード
<Canvas
  style={{
    position: 'fixed', top: 0, right: 0,
    width: '55%', height: '100vh', zIndex: 0,
    maskImage: 'linear-gradient(to right, transparent 0%, black 18%)',
    WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%)',
  }}
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]}
>
  <Scene />
</Canvas>

// UIレイヤー（zIndex:10, pointerEvents:'none'）
// 個別ボタン・リンクは内側で pointer-events: auto を戻している
```

**Canvas の設計意図：**
- `width: 55%` + `right: 0`：球体が HEY カードと重ならない
- `alpha: false`：`MeshPhysicalMaterial` の `transmission` が正しく機能（暗背景が必要）
- `mask-image`：Canvas 左端の縦ラインを自然なフェードで解消
- 楕円回避：球体は Canvas の光学中心 `[0, 0, 0]` に配置

---

## 現在の Crystal（確定形）

**ファイル:** `src/components/canvas/Crystal.tsx`

```tsx
// 外殻クリスタル: IcosahedronGeometry(1.5, 2) + flatShading → 320面カットクリスタル
<mesh ref={shellRef}>
  <icosahedronGeometry args={[1.5, 2]} />
  <meshPhysicalMaterial
    color="#ffe8cc" roughness={0.01} metalness={0.0}
    clearcoat={1.0} clearcoatRoughness={0.01}
    transmission={0.70} ior={1.5} thickness={1.5}
    flatShading={true}
  />
</mesh>

// 内部コア（カーソルに追従する発光体）
<group ref={coreGrpRef}>
  // オレンジ球: radius=0.80, emissive #f97316, emissiveIntensity パルス(3.5±1.2)
  // 白熱点:    radius=0.22, emissive #fbbf24, emissiveIntensity=9
</group>
```

**アニメーション:**
- `floatRef`：全体が y軸で ±0.14 ゆっくり浮遊（sin波 0.65Hz）
- `shellRef`：Y軸自転（delta * 0.18）+ カーソルで X 傾き
- `coreGrpRef`：カーソル追従（pointer.x/y * 0.55、lerp 0.06）

---

## 現在の CameraRig

**ファイル:** `src/components/canvas/CameraRig.tsx`

```tsx
useFrame(() => {
  // Hero(100vh)の65%スクロール時点でクリスタルが上端から退場
  const targetY = -(scrollY.current / window.innerHeight) * 4.8
  camera.position.y += (targetY - camera.position.y) * 0.15
})
```

**挙動：** スクロールするとカメラが下降 → クリスタルが上にスクロールアウト。Impactセクション到達時には完全に画面外。

---

## Phase 3-6 でやること

### 機能 1: グラウンドグロー（クリスタル下の光の床）

ohzi.io 参考。クリスタルの真下に幻想的な光の反射・グロー。

**実装方針:**
```tsx
// Scene.tsx に追加
// Option A: 発光平面（シンプル）
<mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[4, 4]} />
  <meshStandardMaterial
    color="#fb923c" emissive="#f97316" emissiveIntensity={0.8}
    transparent opacity={0.15}
  />
</mesh>

// Option B: MeshReflectorMaterial（@react-three/drei）— より本格的
import { MeshReflectorMaterial } from '@react-three/drei'
<mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
  <planeGeometry args={[6, 6]} />
  <MeshReflectorMaterial
    blur={[300, 100]} resolution={512} mixBlur={0.8}
    mixStrength={60} roughness={1} depthScale={1.2}
    color="#1a0a00" metalness={0.6}
  />
</mesh>
```

Option B の方が幻想的だが、パフォーマンスに注意（resolution を低めに）。

---

### 機能 2: クリック → 発光体がオービット（ohzi.io スタイル）

クリスタルをクリックするたびに、ランダムな色の小球がクリスタルから飛び出して周回する。

**実装方針:**

```tsx
// Crystal.tsx に追加
const [orbs, setOrbs] = useState<OrbData[]>([])

// Canvas をクリックしたとき（useThree の events or onClick on mesh）
const handleClick = () => {
  const newOrb: OrbData = {
    id: Date.now(),
    color: ORBS_COLORS[Math.floor(Math.random() * ORBS_COLORS.length)],
    radius: 2.2 + Math.random() * 0.6,  // 周回半径
    speed: 0.4 + Math.random() * 0.6,    // 周回速度
    phase: Math.random() * Math.PI * 2,  // 初期位相
    tilt: (Math.random() - 0.5) * 0.8,  // 軌道の傾き
  }
  setOrbs(prev => [...prev.slice(-5), newOrb])  // 最大6個まで
}

// ORBS_COLORS 候補
const ORBS_COLORS = ['#f97316', '#60a5fa', '#a78bfa', '#34d399', '#f472b6', '#fbbf24']

// useFrame 内で各 orb の position を計算
// x = Math.cos(t * speed + phase) * radius
// z = Math.sin(t * speed + phase) * radius
// y = Math.sin(t * speed * 0.3) * 0.5 + tilt （上下にも微妙に動く）
```

**Orb コンポーネント（小球）:**
```tsx
<mesh position={[x, y, z]}>
  <sphereGeometry args={[0.12, 16, 16]} />
  <meshStandardMaterial
    color={orb.color} emissive={orb.color}
    emissiveIntensity={4} toneMapped={false}
  />
</mesh>
```

---

## GitHub フロー（次のセッションで実行）

```bash
# 1. Issue 作成
gh issue create \
  --title "feat: グラウンドグロー・クリック時オービット実装（Phase 3-6）" \
  --body "## 内容\n- クリスタル下にグラウンドグロー（MeshReflectorMaterial）\n- クリックで発光オービットが出現・周回\n\n## 完了条件\n- [ ] グラウンドグローが幻想的に見える\n- [ ] クリックで色違いのオービットが最大6個まで周回\n- [ ] パフォーマンスが問題ない（60fps）"

# 2. ブランチ作成（Issue番号を確認してから）
git checkout -b feature/ground-glow-orbs-#XX

# 3. 実装 → commit → PR → merge
```

---

## セッション開始チェックリスト

1. `cd c:\Users\3fort\dev\portfolio`
2. `git checkout main && git pull origin main`
3. `git log --oneline -3` → `0d97e32` (Phase 3-5 squash) が最新コミットであることを確認
4. `pnpm dev` でローカル確認（localhost:5173）
5. このファイルの「Phase 3-6 でやること」を読んで実装開始

---

## 既知の問題・注意点

1. **`transmission` は `alpha: false` が必要：** Canvas を `alpha: true` に戻すとガラスの透明感が壊れる（暗背景が透過テクスチャとして必要）。

2. **楕円問題の再発防止：** 球体は必ず Canvas の光学中心 `[0, 0, 0]` に置く。x/z をずらすと楕円になる。Scene.tsx の `<group position={[0,0,0]}>` は変えない。

3. **Lenis の初期化場所：** `main.tsx` のモジュールレベル（`autoRaf: false`）。HMR 対応のためここ以外には移動しない。

4. **R3F v9 + React 19 必須：** React 18 に戻すと白画面エラーになる。

5. **pnpm-lock.yaml の LF 警告：** Windows 環境の CRLF 変換警告。動作には影響なし、無視してよい。

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| 3-6 | グラウンドグロー + クリックオービット | **← 次にやる** |
| 3-7 | ohzi.io スタイルのページ構成（EXPLORE ボタン等） | 未着手 |
| 3-8 | ローダー実装 | 未着手 |
| 3-9 | 統合テスト・最適化・Cloudflare デプロイ | 未着手 |
