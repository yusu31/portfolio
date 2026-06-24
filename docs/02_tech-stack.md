# 技術スタック選定

## 選定サマリー

| レイヤー | 採用技術 | 比較検討した代替案 |
|---|---|---|
| フレームワーク | **Astro 6** | Next.js 16, Remix (React Router v7) |
| スタイリング | **Tailwind CSS v4** | CSS Modules, UnoCSS |
| アニメーション（基本） | **CSS Scroll-Driven Animations** | Framer Motion, AOS.js |
| アニメーション（Hero） | **GSAP + ScrollTrigger** | Three.js, CSS-only |
| アニメーション（React Island） | **Framer Motion** | React Spring |
| ページ遷移 | **View Transitions API** | — |
| コンテンツ管理 | **MDX** | Contentful, Sanity |
| デプロイ | **Cloudflare Pages** | Vercel, Netlify |
| メールフォーム | **Resend API** | EmailJS, Formspree |

---

## フレームワーク: Astro 6

### なぜ Astro か

| 指標 | Astro 6 | Next.js 16 | Remix |
|---|---|---|---|
| JSバンドル（デフォルト） | **0KB** | 95KB gzip | 中程度 |
| FCP | **0.3s** | 0.9s | 中程度 |
| Lighthouse | **100/100** | 94/100 | 90〜95 |
| ビルド時間 | **1.2s** | 8.5s | 3〜5s |
| 学習コスト | 低（HTML/CSS知識で入れる） | 高（App Router複雑） | 中 |

### 2026年エコシステム

- GitHubスター 50,000超、週間NPMダウンロード 40万超
- **CloudflareがAstroを買収（2026年1月）** → エッジ最適化が標準装備
- Google・Microsoft・Adobe・IKEA・Harvard が本番利用
- State of JavaScript 2024でNext.jsに次ぐ第2位

### Next.jsを選ばない理由

ポートフォリオはコンテンツ中心・インタラクション最小限のユースケース。
SSRのオーバーヘッドは不要。AstroのゼロJS静的出力がSEOと表示速度を最大化する。

### Astro Island Architecture

Reactコンポーネントを必要な箇所だけhydrateする設計。
技術的な幅（React・Vanilla JS両方使える）を示しながらパフォーマンスを維持できる。

---

## アニメーション戦略

### 2026年の変化

「重いライブラリへの反省」が業界で進んでいる。
ボタンホバーにGSAPを使うと200KB超の依存を積む = アンチパターン。

### 使い分け

```
Hero演出（スクロールストーリーテリング）
└── GSAP + ScrollTrigger（タイムライン制御・複雑な演出）

各セクションのフェードイン・スライドイン
└── CSS Scroll-Driven Animations（0KB・ブラウザネイティブ・Safari 17+対応済み）

ページ遷移
└── View Transitions API（0KB・Astroネイティブサポートあり）

React Islandコンポーネント内
└── Framer Motion（layout・presence・カードホバー）
```

---

## スタイリング: Tailwind CSS v4

- **2025年リリース** → CSS変数ネイティブ・設定ゼロ・`@import "tailwindcss"`だけで動く
- ダークモードのトグルが `prefers-color-scheme` + クラス切替の両方で対応可能
- Bento Gridは `grid-cols` ユーティリティで実装が容易

---

## デプロイ: Cloudflare Pages

### なぜ Vercel ではなく Cloudflare Pages か

- Cloudflare が Astro を買収（2026年1月）→ エッジ最適化が Astro-first で設計されている
- 無料枠: ビルド500回/月・帯域無制限（Vercelは100GB制限あり）
- エッジネットワーク: 320箇所超（Vercelは約30箇所）
- カスタムドメイン・HTTPS: 無料

---

## パッケージ管理

- **pnpm** → npmの3倍高速・ディスク使用量を大幅削減
- Node.js: v22 LTS

---

## バージョン固定方針

```json
{
  "astro": "^6.0.0",
  "tailwindcss": "^4.0.0",
  "gsap": "^3.12.0",
  "framer-motion": "^12.0.0"
}
```
