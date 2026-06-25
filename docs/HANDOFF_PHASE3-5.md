# 引き継ぎプロンプト — Phase 3-5（Bloom + スクロールカメラ）

このプロンプトを新しいチャットの冒頭に貼り付けてください。

---

## 現在の状態（2026-06-25）

ポートフォリオサイト v2 の Phase 3-4 まで完了。PR #30 がオープン中（まだマージしていない場合はマージしてから開始）。

**リポジトリ:** `c:\Users\3fort\dev\portfolio`  
**現在のブランチ:** `main`（PR #30 マージ後）  
**本番:** Cloudflare Pages（main push で自動デプロイ）

---

## 完了済みフェーズ

| フェーズ | 内容 | PR |
|---|---|---|
| 3-1 | Vite + React + TypeScript + R3F + Tailwind セットアップ | #26 |
| 3-2 | UIレイヤー全セクション移植 | #28 |
| 3-3/3-4 | React 19、ダークテーマ、サッカーボール風クリスタル | #30 |

---

## 現在の技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1（React 19 必須）
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（現在除外中）
GSAP 3.15 + ScrollTrigger + SplitText
Lenis 1.3（App.tsx の useEffect 内で初期化）
Tailwind CSS v4
Three.js 0.184
```

---

## アーキテクチャ

```tsx
// App.tsx — 2レイヤー構成
<LanguageProvider>
  <Canvas style={{ position: 'fixed', inset: 0, zIndex: 0 }} camera={{ position: [0,0,5], fov: 60 }} gl={{ antialias: true, alpha: true }} dpr={[1,2]}>
    <Scene />
  </Canvas>
  <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
    <Loader /><Cursor /><Nav />
    <main><Hero /><Impact /><Story /><Projects /><Skills /><Blog /><Contact /></main>
    <Footer />
  </div>
</LanguageProvider>
```

---

## 現在の Crystal.tsx（確認用）

```
src/components/canvas/Crystal.tsx
- 外殻球体: SphereGeometry(1.5) + MeshStandardMaterial(opacity:0.15)
- パネルライン: EdgesGeometry(IcosahedronGeometry(1.52, 1)) + lineBasicMaterial(#fbbf24)
- 内部コア: IcosahedronGeometry(0.95) + emissive #f97316 パルス
- 中心点: SphereGeometry(0.28) + emissive #fbbf24 intensity:12
- アニメーション: 浮遊/自転/マウス視差
```

---

## 次にやること（Phase 3-5 以降）

### Phase 3-5: Bloom ポストプロセッシング統合

**ファイル:** `src/components/canvas/Effects.tsx` と `src/components/canvas/Scene.tsx`

現在 `Effects.tsx` は `EffectComposer` + `Bloom` を実装済みだが、`Scene.tsx` から除外中。  
互換性を確認して再統合する。

```tsx
// Scene.tsx に追加
import Effects from './Effects'
// 最後に
<Effects />
```

**注意点:**
- `@react-three/postprocessing` v3 と React 19 の互換性を確認してから統合
- Bloom 強度は `Crystal.tsx` の emissive と組み合わせて調整（emissiveIntensity を下げ、Bloom で増幅する方が綺麗）

**GitHub フロー:**
```
gh issue create → feature/bloom-effects-#XX → PR → merge
```

---

### Phase 3-6: スクロール連動カメラ

**ファイル:** `src/components/canvas/CameraRig.tsx`

現在は `useScrollProgress()` → `camera.position.y` を単純 lerp するのみ。  
CatmullRomCurve3 でカメラパスを定義し、セクションに応じてカメラが旋回する実装に。

```ts
import { CatmullRomCurve3, Vector3 } from 'three'

const PATH = new CatmullRomCurve3([
  new Vector3(0, 0, 5),   // Hero
  new Vector3(-2, -2, 4), // Story
  new Vector3(3, -4, 5),  // Projects
  new Vector3(0, -7, 5),  // Contact
])
// useScrollProgress() の値を PATH.getPointAt(t) に渡す
```

---

### Phase 3-7: ローダー

**ファイル:** `src/components/ui/Loader.tsx`（スケルトン実装済み）

- GSAP カウントアップ（0% → 100%）
- 完了後に `opacity: 0, scale: 1.04` でフェードアウト
- Canvas が準備できたことを `useThree` の `gl.render` で検知

---

### Phase 3-8: 統合テスト・最適化・デプロイ

- Lighthouse 計測（目標: Performance 90+、Accessibility 95+）
- `vite build` でバンドルサイズ確認
- `pnpm preview` でビルド確認後 `git push` → Cloudflare Pages 自動デプロイ

---

## セッション開始時のチェックリスト

1. `cd c:\Users\3fort\dev\portfolio`
2. `git checkout main && git pull origin main`（PR #30 がマージされていることを確認）
3. `git log --oneline -5` で最新コミット確認
4. `pnpm dev` でローカル確認（localhost:5173）
5. `docs/04_design.md` を読んでデザイン方針を確認

---

## 既知の問題・注意点

1. **Effects.tsx 除外中:** `@react-three/postprocessing` の React 19 互換性が未確認のため `Scene.tsx` から除外してある。Phase 3-5 で対応。

2. **Lenis の初期化:** `App.tsx` の `useEffect` 内のみ。`main.tsx` モジュールレベルでは HMR クラッシュするため絶対に移動しない。

3. **R3F v9 + React 19 必須:** `react/react-dom` を 18 に下げると `Cannot read properties of undefined (reading 'S')` エラーが出て白画面になる。

4. **pnpm-lock.yaml の LF 警告:** Windows 環境での CRLF 変換警告。動作には影響なし。

---

## ファイル構成

```
src/
├── main.tsx               # エントリー（GSAP プラグイン登録）
├── App.tsx                # ルート（Canvas + UI 2レイヤー + Lenis）
├── contexts/
│   └── LanguageContext.tsx # JP/EN 切替 Context
├── hooks/
│   ├── useLanguage.ts
│   ├── useScrollProgress.ts
│   ├── useMouse.ts
│   └── useReveal.ts
├── i18n/
│   └── translations.ts    # JP/EN 全翻訳
├── types/
│   └── index.ts           # Lang, TranslationKey, Translations
├── components/
│   ├── canvas/
│   │   ├── Scene.tsx      # ライティング + Crystal + CameraRig
│   │   ├── Crystal.tsx    # サッカーボール風クリスタル
│   │   ├── CameraRig.tsx  # スクロール連動カメラ
│   │   └── Effects.tsx    # Bloom（現在除外中）
│   ├── ui/
│   │   ├── Nav.tsx        # 常時ダーク glass ナビゲーション
│   │   ├── Cursor.tsx     # カスタムカーソル
│   │   └── Loader.tsx     # ローダー（未実装）
│   └── sections/
│       ├── Hero.tsx       # 透明背景 + glassmorphism カード
│       ├── Impact.tsx     # 数値カウントアップ 4 枚
│       ├── Story.tsx      # タイムライン 5 項目
│       ├── Projects.tsx   # PSI カード 3 枚（3D チルト）
│       ├── Skills.tsx     # タグクラウド
│       ├── Blog.tsx       # Coming Soon
│       ├── Contact.tsx    # メールフォーム
│       └── Footer.tsx     # リンク
└── styles/
    └── global.css         # ダークテーマ変数 + reveal アニメーション
```
