# 要件定義書 — yusu portfolio v2

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロジェクト名 | yusu portfolio v2 |
| 目的 | エンジニア転職・副業獲得のためのポートフォリオサイト刷新 |
| 参考サイト | https://ohzi.io/ |
| 本番URL | https://portfolio-dew.pages.dev（引き継ぎ） |
| リポジトリ | https://github.com/yusu31/portfolio |

---

## 2. ゴール定義

### ビジネスゴール
- 採用担当者・副業クライアントに「技術力の高さ」を視覚的に証明する
- 「元体育教師のエンジニア」という唯一無二のストーリーを体験として届ける
- 問い合わせ（Contact）のコンバージョンを増やす

### 技術ゴール
- ohzi.ioに近い「3D没入型」のウェブ体験を実現する
- React × WebGL × GSAPのスキルをポートフォリオ自体で証明する
- Lighthouseスコア Performance 80以上を維持する

---

## 3. ユーザーストーリー

| ユーザー | やりたいこと | 達成条件 |
|---|---|---|
| 採用担当者 | エンジニアの技術力を30秒で判断したい | Heroで「すごい」と感じ、Projectsまでスクロールする |
| 副業クライアント | どんな人間か知りたい | Storyセクションで経歴に共感する |
| エンジニア仲間 | 使っている技術を知りたい | Skillsセクションで技術スタックが確認できる |
| 訪問者全員 | 問い合わせしやすい | Contactフォームから1分以内に送信できる |

---

## 4. 機能要件

### 必須機能（Must Have）
- [ ] 全画面WebGLキャンバス（3Dオブジェクト + パーティクル）
- [ ] カスタム球体カーソル（`mix-blend-mode: difference` + spring追従）
- [ ] スクロール連動カメラ移動（`CatmullRomCurve3` パス）
- [ ] マウスパラックス（3Dオブジェクトの視差）
- [ ] Bloomポストプロセッシング（発光エフェクト）
- [ ] ページローダー（3Dアセット読み込み中の演出）
- [ ] i18n（JP / EN 切り替え）
- [ ] Contactフォーム → Resend API（既存APIを流用）
- [ ] OGP / sitemap / robots.txt
- [ ] レスポンシブ（モバイル対応。3DはCSS Fallbackに簡略化）

### あると良い機能（Should Have）
- [ ] 被写界深度（Depth of Field）ポストプロセッシング
- [ ] ダストパーティクル（InstancedMesh）
- [ ] Web Audio API（既存から移植）
- [ ] 磁気ボタン（既存から移植）

### 対象外（Won't Have）
- フルWebGL風景レンダリング（ohzi.ioの山岳シーン等）→ Phase 4以降
- ドラッグナビゲーション
- マルチページ遷移（ワンページ構成を維持）

---

## 5. 非機能要件

| 項目 | 要件 |
|---|---|
| パフォーマンス | Lighthouse Performance ≥ 80（PC） |
| アクセシビリティ | `prefers-reduced-motion` 対応。アニメーション無効化オプション |
| ブラウザ対応 | Chrome/Edge/Safari/Firefox 最新2バージョン |
| モバイル対応 | SP表示ではWebGLを簡略化（Three.js Fallback） |
| デプロイ | Cloudflare Pages（GitHub Actions自動デプロイ、変更なし） |
| Contact API | Cloudflare Functions（`functions/api/send.ts`、変更なし） |

---

## 6. 移行方針

| 既存資産 | 移行方法 |
|---|---|
| セクションコンテンツ（テキスト・i18n） | Astro→React JSXに書き換え |
| カラートークン・フォント | global.cssからCSS変数を継承 |
| Contactフォーム（`functions/api/send.ts`） | **そのまま流用**（フレームワーク非依存） |
| GSAP ScrollTrigger | そのまま流用 |
| Three.jsクリスタル | R3Fで再実装（コード簡略化） |
| カスタムカーソル | Framer Motionで再実装（強化） |
| Lenis | R3Fの`useScroll`と統合 |
