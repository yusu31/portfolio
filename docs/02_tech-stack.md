# 技術スタック（v2 — React + R3F 実装）

> **注意:** v1（Astro）から v2（React + Vite + R3F）に移行済み。このドキュメントは v2 確定版。

## 選定サマリー

| レイヤー | 採用技術 | バージョン | 備考 |
|---|---|---|---|
| フレームワーク | **React** | 19.2.7 | R3F v9 互換性のため 19 必須 |
| ビルド | **Vite** | 6.x | @vitejs/plugin-react |
| 型システム | **TypeScript** | 5.7 | `"jsx": "react-jsx"` / `bundler` 解決 |
| スタイリング | **Tailwind CSS v4** | 4.3 | `@tailwindcss/vite` プラグイン |
| 3D エンジン | **@react-three/fiber** | 9.6.1 | React 19 内部 API 依存のため 19 必須 |
| 3D ヘルパー | **@react-three/drei** | 10.7.7 | CameraRig 等で使用 |
| ポストプロセス | **@react-three/postprocessing** | 3.0.4 | Phase 3-5 で統合予定（現在除外中） |
| Three.js | **three** | 0.184 | R3F の内部依存 |
| アニメーション | **GSAP** | 3.15 | ScrollTrigger + SplitText（無料プラグイン） |
| React アニメーション | **Framer Motion** | 12 | カーソル・ローダー用 |
| スムーズスクロール | **Lenis** | 1.3 | App.tsx の useEffect 内で初期化 |
| デプロイ | **Cloudflare Pages** | — | main push で自動デプロイ |
| メールフォーム | **Resend API** | — | Functions `/api/send` |

---

## アーキテクチャ（2レイヤー）

```
┌─────────────────────────────────────────┐
│  Canvas Layer (position: fixed, z: 0)   │
│  ├── Scene                              │
│  │   ├── CameraRig                      │
│  │   └── Crystal (サッカーボール風)     │
│  └── Lighting                           │
│                                         │
│  UI Layer (position: relative, z: 10)   │
│  ├── Loader                             │
│  ├── Cursor                             │
│  ├── Nav                                │
│  ├── Hero, Impact, Story, Projects      │
│  ├── Skills, Blog, Contact              │
│  └── Footer                             │
└─────────────────────────────────────────┘
```

### ポイント
- Canvas は `fixed` で全画面に貼り付き（`alpha: true` で透明）
- UI Layer は `pointerEvents: 'none'` がデフォルト → セクション単位で `auto` に
- 3D オブジェクトは UI の「下」に見えるが実際には同一 DOM ツリー外

---

## エントリーポイント

```ts
// src/main.tsx
gsap.registerPlugin(ScrollTrigger, SplitText)
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// src/App.tsx
useEffect(() => {
  const lenis = new Lenis()
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return () => lenis.destroy()
}, [])
```

**Lenis を module レベルで初期化しない理由:** HMR 再実行でクラッシュするため `useEffect` 内のみ。

---

## 依存関係の互換性マトリクス

| R3F v9 | React 18 | React 19 |
|---|---|---|
| `createReconciler` の 'S' プロパティ | ❌ 存在しない → 白画面 | ✅ 動作 |

→ **react/react-dom は 19.x 固定**

---

## パッケージ管理

- **pnpm** 11.x
- Node.js: v22 LTS
- バージョン固定は `pnpm-lock.yaml` で管理

---

## デプロイ: Cloudflare Pages

- `main` ブランチへの push で自動ビルド
- ビルドコマンド: `pnpm build`（`tsc -b && vite build`）
- 出力ディレクトリ: `dist/`
- Functions: `/functions/api/send.ts`（Resend メール送信）
