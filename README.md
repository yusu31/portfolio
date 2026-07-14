# yusu portfolio

## ローカルで開く

```bash
git clone https://github.com/yusu31/portfolio.git
cd portfolio
./start.sh --setup   # 初回のみ（依存インストール込み）
```

起動後は [http://localhost:4321](http://localhost:4321) を開いてください。

体育教師からエンジニアへ。yusuのポートフォリオサイト。  
作ったすべての個人プロジェクトのハブとして機能します。

## Tech Stack

| レイヤー | 技術 |
|---|---|
| フレームワーク | Astro 6 |
| スタイリング | Tailwind CSS v4 |
| アニメーション | CSS Scroll-Driven Animations + GSAP ScrollTrigger（Hero） |
| React Islands | Framer Motion |
| デプロイ | Cloudflare Pages |
| コンテンツ | MDX |

## ドキュメント

設計ドキュメントは `docs/` フォルダを参照。

| ファイル | 内容 |
|---|---|
| [docs/01_requirements.md](docs/01_requirements.md) | 要件定義 |
| [docs/02_tech-stack.md](docs/02_tech-stack.md) | 技術スタック選定（比較あり） |
| [docs/03_non-functional.md](docs/03_non-functional.md) | 非機能要件（Lighthouse 100目標） |
| [docs/04_design.md](docs/04_design.md) | UIデザイン方針・カラーパレット |

## セットアップ

```bash
pnpm install
pnpm dev
```

## デプロイ

`git push` → Cloudflare Pages が自動ビルド・デプロイ

## Issue

https://github.com/yusu31/portfolio/issues/1
