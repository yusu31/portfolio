# 開発ワークフロー & デプロイプロトコル — yusu portfolio v2

## 1. 開発フェーズ計画

| フェーズ | 内容 | 目安工数 |
|---|---|---|
| **Phase 3-0** | 設計書策定（本ドキュメント） | 完了 |
| **Phase 3-1** | プロジェクトセットアップ（Vite+React+R3F+Tailwind） | 0.5日 |
| **Phase 3-2** | UIレイヤー移植（セクション全7つをJSXに変換、i18n） | 1〜2日 |
| **Phase 3-3** | カスタムカーソル刷新（Framer Motion球体） | 0.5日 |
| **Phase 3-4** | Canvasレイヤー基盤（Scene.tsx、CameraRig、パーティクル） | 1日 |
| **Phase 3-5** | ポストプロセッシング（Bloom、DOF、Noise） | 0.5日 |
| **Phase 3-6** | スクロール連動カメラ（CatmullRomCurve3） | 1〜2日 |
| **Phase 3-7** | ローダー実装 | 0.5日 |
| **Phase 3-8** | 統合テスト・パフォーマンス最適化・デプロイ | 1日 |

**合計目安: 6〜8日**

---

## 2. ブランチ戦略

```
main（本番）
 └── feature/setup-vite-react-#XX        Phase 3-1
 └── feature/ui-sections-#XX             Phase 3-2
 └── feature/cursor-sphere-#XX           Phase 3-3
 └── feature/canvas-scene-#XX            Phase 3-4
 └── feature/postprocessing-#XX          Phase 3-5
 └── feature/scroll-camera-#XX           Phase 3-6
 └── feature/loader-#XX                  Phase 3-7
 └── chore/performance-deploy-#XX        Phase 3-8
```

各フェーズ = 1 Issue + 1 ブランチ + 1 PR の原則。

---

## 3. コミット規則

```
feat: 機能追加（例: feat: R3Fクリスタルコンポーネントを実装）
fix:  バグ修正
chore: 設定・依存関係
docs: ドキュメント
refactor: リファクタリング
```

---

## 4. PR規則

- タイトル: `feat: 〇〇を実装 (#Issue番号)`
- 本文: 変更内容 / スクリーンショット（UI変更時）/ テスト手順
- マージ前チェック:
  - [ ] `pnpm build` が通る
  - [ ] Cloudflare Pages プレビューURLで動作確認
  - [ ] モバイル表示確認（Chrome DevTools）

---

## 5. デプロイプロトコル

```
ローカル開発
    │  pnpm dev
    ▼
feature/* ブランチ push
    │  GitHub Actions → Cloudflare Pages プレビューデプロイ
    ▼
PR作成 → レビュー（ブラウザ確認）
    │
    ▼
main マージ
    │  GitHub Actions → Cloudflare Pages 本番デプロイ
    ▼
https://portfolio-dew.pages.dev で本番確認
```

---

## 6. 環境変数

| 変数名 | 場所 | 用途 |
|---|---|---|
| `RESEND_API_KEY` | Cloudflare Pages ダッシュボード（シークレット） | メール送信 |

ローカルでContactをテストする場合は `.dev.vars` に設定。

```
# .dev.vars（gitignore済み）
RESEND_API_KEY=re_xxxxxxxxxx
```

---

## 7. Cloudflare Pages 設定（v2移行後）

| 項目 | 設定値 |
|---|---|
| Build command | `pnpm build` |
| Build output | `dist` |
| Framework preset | Vite（自動検出） |
| Node version | 20.x |

Functions（`functions/api/send.ts`）は変更なく機能する。

---

## 8. 移行手順（Astro → React）

1. 現在の `main` ブランチをタグで保存（`v1.0.0`）
2. `feature/setup-vite-react` ブランチで新プロジェクトを構築
3. 各フェーズのブランチをPRでmainに積み上げていく
4. 全フェーズ完了後、Cloudflare Pagesのビルド設定を確認・更新
5. 動作確認後、`v2.0.0` タグを打つ

> **重要:** v1（Astro版）は `git tag v1.0.0` で保存するため、いつでも戻せる。
