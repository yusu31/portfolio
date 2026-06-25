# 技術スタック定義書 — yusu portfolio v2

## 1. スタック一覧

| カテゴリ | ライブラリ | バージョン | 選定理由 |
|---|---|---|---|
| Framework | React | 18.x | R3Fの前提。最大のエコシステム |
| Build Tool | Vite | 6.x | 高速HMR。Astroから自然に移行可能 |
| Language | TypeScript | 5.x | 型安全。既存コードと統一 |
| 3D Rendering | Three.js | 0.17x | 既存資産を活かす |
| 3D React層 | @react-three/fiber | 9.x | Three.jsをReactコンポーネントとして扱える |
| 3D ユーティリティ | @react-three/drei | 10.x | カメラ・テキスト・シェーダー等の便利ヘルパー群 |
| ポストプロセス | @react-three/postprocessing | 3.x | Bloom/DOF/Noiseを数行で実装 |
| アニメーション | GSAP + ScrollTrigger | 3.15 | 既存資産をそのまま流用 |
| UIアニメーション | Framer Motion | 12.x | カーソル・ローダーのSpringアニメーション |
| スタイリング | Tailwind CSS | v4 | 既存と統一。クラスベースで高速 |
| スムーズスクロール | Lenis | 1.x | 既存から引き継ぎ。R3Fと統合 |
| メール送信 | Resend | — | Cloudflare Functions側。変更なし |
| デプロイ | Cloudflare Pages | — | 既存環境を引き継ぎ |
| CI/CD | GitHub Actions | — | 既存ワークフローを引き継ぎ |

---

## 2. AstroをやめてReact+Viteにする理由

### Astroの限界（ohzi.ioレベルを目指す場合）
- **R3Fが使えない** — AstroのIslands architectureとR3Fの相性が悪く、フルCanvas体験に制限がある
- **記述量が多い** — Three.jsを素で書くとR3Fの2〜3倍のコードが必要
- **エコシステムの差** — ohzi.io系チュートリアルはほぼR3F前提

### React+Viteのメリット
- R3Fで宣言的にシーンを組める（コンポーネント単位で3Dオブジェクトを管理）
- `useFrame`・`useScroll`・`useThree`など専用フックで実装が整理される
- `@react-three/drei`の`<PerspectiveCamera>`・`<Environment>`・`<Float>`等が使える
- `@react-three/postprocessing`でBloom/DOFが5行で書ける

### 移行コスト評価
- 既存HTML（Astro）→ JSX変換は構造がシンプルなため低コスト
- `functions/api/send.ts`はCloudflare Functions（フレームワーク非依存）なのでそのまま
- OGP/sitemap/robots.txtはViteプラグインで対応可能

---

## 3. 採用しないライブラリと理由

| ライブラリ | 不採用理由 |
|---|---|
| Next.js | SSRは不要（静的サイト）。Viteの方がシンプル |
| React Three Xr | XR機能は不要 |
| Babylon.js | Three.jsに慣れた資産があるため移行コスト大 |
| Anime.js | GSAPで代替可能。ライブラリ重複を避ける |

---

## 4. 依存パッケージ一覧（想定）

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "three": "^0.177.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0",
    "@react-three/postprocessing": "^3.0.0",
    "gsap": "^3.15.0",
    "framer-motion": "^12.0.0",
    "lenis": "^1.3.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@types/three": "^0.177.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```
