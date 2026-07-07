# HANDOFF Phase 3-20 — タスク9 バンドル最適化 + Cloudflare Pages デプロイ完了

**日付:** 2026-07-07  
**前回引継ぎ:** `docs/HANDOFF_PHASE3-19.md`  
**現在ブランチ:** main（PR #197, #199 マージ済み）  
**このセッションのモデル:** Sonnet

---

## このセッションで完了したこと

### タスク9: バンドル最適化 + Cloudflare Pages デプロイ

#### PR #197 — manualChunks バンドル分割 + TS ビルドエラー修正

**変更ファイル:**
- `tsconfig.json` — `"types": ["vite/client"]` 追加（`import.meta.env` エラー解消）
- `src/contexts/SceneContext.tsx` — window キャストを `unknown` 経由に修正
- `vite.config.ts` — `manualChunks` 追加（6ベンダーチャンクに分割）
- `package.json` / `pnpm-lock.yaml` — `resend@6.17.1` を dependencies に追加

**バンドル変化:**

| Before | After |
|---|---|
| index.js: 2,041 kB (gzip 565 kB) | three-core: 732 kB (gzip 190 kB) |
| 1チャンク | r3f: 298 kB (gzip 91 kB) |
| | lottie: 308 kB (gzip 79 kB) |
| | react-vendor: 231 kB (gzip 74 kB) |
| | framer: 125 kB (gzip 41 kB) |
| | gsap: 122 kB (gzip 49 kB) |
| | index (app): 46 kB (gzip 16 kB) |

**resend 修正の経緯:**  
`functions/api/send.ts`（連絡フォームバックエンド）が `resend` を import しているが  
`package.json` に未登録で wrangler デプロイが失敗していた → 追加で解消。

#### PR #199 — React.lazy ルートコード分割

**変更ファイル:**
- `src/router.tsx` — 全5シーンを `React.lazy` + dynamic import に変更

index チャンクが 73 kB → 46 kB (gzip 22.5 → 15.9 kB) に削減。  
各シーンが独立チャンク（3-7 kB）として生成されるようになった。

---

## Lighthouse 計測結果

| 指標 | Before (PR #197) | After (PR #199) | 目標 |
|---|---|---|---|
| Performance スコア | 29 | 30 | 80+ |
| FCP | 6.4 s | 6.3 s | <1.8 s |
| LCP | 17.6 s | 17.0 s | <2.5 s |
| TBT | 5,470 ms | 4,790 ms | <200 ms |
| CLS | 0 | 0 | 0 ✓ |

### 80+ 未達成の根本原因と今後の対策

**原因:** `GlobalCanvas` (`App.tsx` に常時マウント) が Three.js / R3F / Drei /  
Postprocessing 全てを同期ロードするため、WebGL 初期化がメインスレッドをブロックする。

**80+ 達成には以下の設計変更が必要:**

```tsx
// 案: ローディング画面が完了するまで Canvas をマウントしない
const [canvasReady, setCanvasReady] = useState(false)

// Loader の onComplete で setCanvasReady(true)
// → FCP がローダーの表示時間まで短縮される
```

この変更は「ローダー表示中は3D canvas が見えない」トレードオフあり。  
ユーザーの設計判断が必要。

---

## Cloudflare Pages デプロイ状況

- **本番 URL パターン:** `https://{hash}.portfolio-dew.pages.dev`
- **最新デプロイ:** `https://5ee57f1c.portfolio-dew.pages.dev`
- **デプロイ方法:** main push → GitHub Actions (`deploy.yml`) → wrangler → Cloudflare Pages
- **secrets:** `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`（設定済み）

---

## 現在のチャンク構成（確定版）

```
dist/assets/
├── three-core-*.js     732 kB / gzip 190 kB
├── r3f-*.js            298 kB / gzip  91 kB
├── lottie-*.js         308 kB / gzip  79 kB
├── react-vendor-*.js   231 kB / gzip  74 kB
├── framer-*.js         125 kB / gzip  41 kB
├── gsap-*.js           122 kB / gzip  49 kB
├── index-*.js           46 kB / gzip  16 kB
├── HomeScene-*.js        6.5 kB / gzip 2.4 kB
├── VolleyballScene-*.js  6.5 kB / gzip 2.7 kB
├── SoccerScene-*.js      5.5 kB / gzip 2.5 kB
├── ContactScene-*.js     4.4 kB / gzip 1.9 kB
├── BasketballScene-*.js  3.9 kB / gzip 1.8 kB
└── GlassPanel-*.js       3.3 kB / gzip 1.3 kB
```

---

## 残タスク

### 高優先

- **Resume PDF 接続**（ユーザー PDF 待ち）
  - `public/resume.pdf` 配置 + `ContactScene.tsx` の href 1行

### 中優先

- **Lighthouse 80+ 達成**（任意・設計変更必要）
  - `GlobalCanvas` の遅延マウント（Loader 完了後に canvas 表示）
  - 要: ユーザーの設計判断

- **カスタムドメイン接続**（任意）
  - Cloudflare Pages の `portfolio-dew.pages.dev` → カスタムドメイン

### ロードマップ参照

`docs/01_requirements.md` でフェーズ完了状況を確認すること。

---

## 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio の次セッション（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-20.md を読んで状況を把握して。

優先タスク:
1. Resume PDF 接続（public/resume.pdf 配置 + ContactScene.tsx href）
2. Lighthouse 80+ 達成に向けた GlobalCanvas 遅延マウント実装（要設計確認）
3. カスタムドメイン設定（任意）

ルール: Issue→branch→PR→merge厳守 / pnpm必須 /
コンテキスト60%で見切り→HANDOFF_PHASE3-21とロードマップ更新で終了。
```
