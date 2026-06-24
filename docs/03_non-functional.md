# 非機能要件

## パフォーマンス

| 指標 | 目標値 | 測定ツール |
|---|---|---|
| Lighthouse Performance | **100** | Chrome DevTools |
| Lighthouse Accessibility | **100** | Chrome DevTools |
| Lighthouse Best Practices | **100** | Chrome DevTools |
| Lighthouse SEO | **100** | Chrome DevTools |
| FCP（First Contentful Paint） | **< 0.5s** | PageSpeed Insights |
| LCP（Largest Contentful Paint） | **< 1.5s** | PageSpeed Insights |
| CLS（Cumulative Layout Shift） | **< 0.05** | PageSpeed Insights |
| TTI（Time to Interactive） | **< 2.0s** | PageSpeed Insights |
| JSバンドルサイズ | **< 50KB** | Bundle Analyzer |

採用担当者の84%がスマートフォンでポートフォリオを確認する。
モバイルCore Web Vitalsが採用担当者の第一印象を決める。

## アクセシビリティ

- **WCAG 2.1 AA 準拠**
- すべての画像に `alt` テキスト
- キーボードナビゲーション完全対応（Tab順序・フォーカスインジケーター）
- カラーコントラスト比 4.5:1 以上（テキスト）
- スクリーンリーダー対応（Semantic HTML + ARIA ラベル）

### アニメーションのアクセシビリティ

```css
/* すべての複雑アニメーションを包む（必須） */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

CSS Scroll-Driven Animationsは `prefers-reduced-motion` を自動尊重する。
GSAPアニメーションはすべて `prefers-reduced-motion` チェックを実装する。

## SEO

- `<title>` + `<meta description>` 全ページ設定
- OGP（Open Graph Protocol）設定（SNSシェア時のカード表示）
- Twitter Card 設定
- `sitemap.xml` 自動生成（Astro公式プラグイン）
- `robots.txt` 設定
- 構造化データ（JSON-LD）: Person + WebSite スキーマ
- 日本語 + 英語の `hreflang` 設定

## セキュリティ

- HTTPS 強制（Cloudflare Pages 標準）
- CSP（Content Security Policy）ヘッダー設定
- フォーム送信: Resend API経由（サーバーサイドで処理・スパム対策）
- 環境変数は `.env` で管理（Gitにコミットしない）

## レスポンシブ

- モバイルファーストで設計・実装
- ブレークポイント: `sm:640px / md:768px / lg:1024px / xl:1280px`
- タッチ操作対応（タップターゲット最小44×44px）
- 画像: `<picture>` + WebP + `loading="lazy"` + `width/height` 明示（CLS対策）

## ブラウザ対応

| ブラウザ | バージョン |
|---|---|
| Chrome | 最新2バージョン |
| Firefox | 最新2バージョン |
| Safari | 17以上（CSS Scroll-Driven Animations対応） |
| Edge | 最新2バージョン |

## 保守性

- コンポーネント分割: 1コンポーネント1責務
- Works追加の手順: `src/content/works/` にMDXファイルを追加するだけ
- Blog追加の手順: Zennに投稿→ URLをconfig追記
- デプロイ: `git push` → Cloudflare Pages が自動ビルド・デプロイ

## 分析

- **Cloudflare Analytics**（Cookieなし・GDPR不要・完全無料）
- ページビュー・直帰率・流入経路を確認
