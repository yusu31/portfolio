# 引き継ぎプロンプト — Phase 3-9（統合テスト・最適化・デプロイ）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-06-30）

Phase 3-8 の PR #38、ワークフロールール更新の PR #40 がマージ済み。**現在 `main` ブランチで作業開始できる状態。**

**リポジトリ:** `c:\Users\3fort\dev\portfolio`
**現在のブランチ:** `main`（クリーン）
**本番:** Cloudflare Pages（main push で自動デプロイ）
**最新コミット:** `70b1d0a`（`git log --oneline -3` で確認）

---

## ⚠️ 開発ワークフロー（2026-06-30に変更・必読）

Phase 3-8完了後にルールを変更した（Issue #39 → PR #40）。詳細は `CLAUDE.md` 参照。

- **Issue → branch → PR → merge を全変更で必須**（コード・ドキュメント問わず例外なし）。過去にあった「引き継ぎドキュメントのみmain直接push」の慣習は廃止済み
- **PRマージはClaudeが確認なしで自動実行してよい**（このプロジェクトに限り事前承認済み）。マージ後のローカルbranch削除・`git remote prune origin`も続けて自動実行する
- このHANDOFFファイル自体の更新も、次回から必ずIssue→branch→PRを通すこと

---

## Obsidian記録

`C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-hub.md` に本プロジェクトの戦略・技術スタック・開発ルール・フェーズ進捗・Phase 3-8実装の経緯を記録済み。詳細な背景を知りたいときはユーザーに読み込み許可を取った上で参照する（SecondBrainの読み込みはユーザー明示指示時のみ）。

---

## 完了済みフェーズ

| フェーズ | 内容 | PR |
|---|---|---|
| 3-1 | Vite + React + TypeScript + R3F + Tailwind セットアップ | #26 |
| 3-2 | UIレイヤー全セクション移植 | #28 |
| 3-3/3-4 | React 19、ダークテーマ、サッカーボール風クリスタル | #30 |
| 3-5 | Bloom 統合・カットクリスタル確定・スクロールアウト | #32 |
| 3-6 | グラウンドグロー（波紋シェーダー）+ クリックオービット | #34 |
| 3-7 | Canvas全画面化・ohzi.io風Hero・Crystal物理インタラクション | #36 |
| 3-8 | サッカーボールローダー実装 | #38 |

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Effects.tsx で稼働中）
GSAP 3.15 + ScrollTrigger + SplitText
lottie-web 5.13（ローダーのcanvasレンダリング）
Lenis 1.3
Tailwind CSS v4
Three.js 0.184
```

`@rive-app/react-canvas` と `lottie-react` はPhase 3-8で未使用と判明し削除済み。

---

## Phase 3-8 確定版：Loader.tsx

### 構成
- `lottie-web`（`renderer: 'canvas'`, `dpr: 1`）でサッカーボールアニメーションを表示
- 素材は **白(#ffffff)でダウンロード** → CSSフィルターで `#fb923c` に正確変換
  ```css
  filter: brightness(0) saturate(100%) invert(70%) sepia(64%) saturate(1147%) hue-rotate(335deg) brightness(101%) contrast(96%);
  ```
- アセット: `public/sport-loading-white.json`（500×500, 5秒ループ, 1レイヤー）

### ゲージのアニメーション設計
- `useProgress`（実ロード進捗）と、GSAPで駆動する「表示用ゲージ」を分離
- ゲージは `MIN_DISPLAY_MS = 1800` にかけて `power1.inOut` イージングで0→100%
- フェードアウト発火条件: **ゲージ完了（`gaugeDoneRef`）かつ実ロード完了（`loadDoneRef`）の両方が揃ったとき**
  - 実ロードが早く終わっても、ゲージのアニメーションが先に唐突に100%へ飛ばないようにするための設計
- React 19 Strict Mode対策: `mountedRef` + `animRef.current?.destroy()` でlottieインスタンスの二重生成を防止

### 既知の調整ポイント
- `MIN_DISPLAY_MS`（Loader.tsx:8）を変えるとローダーの体感速度を調整できる
- 色がズレた場合は `filter` の `hue-rotate` の角度を再調整（白素材からの変換なので理論上ズレないはず）

---

## 現在のアーキテクチャ（Phase 3-7時点から変更なし）

### Canvas（App.tsx）
```tsx
<Canvas
  style={{
    position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100vh', zIndex: 0,
  }}
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]}
>
  <Suspense fallback={null}>
    <Scene />
  </Suspense>
</Canvas>
```
`<Loader />` はSuspense外（UI Layer内）に配置し、`useProgress`でCanvas内のロード状況を監視。

### Hero / Crystal / Scene / CameraRig
Phase 3-7から変更なし。詳細は `docs/HANDOFF_PHASE3-8.md` を参照。

---

## 既知の注意点

1. **`alpha: false` 必須**: transmission が暗背景を必要とする
2. **楕円防止**: Crystal の x/z 座標はずらさない（y=-0.4 はOK）
3. **Lenis**: `main.tsx` のモジュールレベル（`autoRaf: false`）。移動しない
4. **LF警告**: Windows CRLF変換警告は無視してよい
5. **pnpm専用**: `workspace:*` プロトコル使用のため npm では動かない

---

## Phase 3-9 でやること：統合テスト・最適化・デプロイ

### 想定スコープ
```
1. 全セクション（Hero〜Footer）のスクロール・インタラクション通し確認
2. モバイル/タブレットでのレスポンシブ確認（Canvas DPR・パフォーマンス）
3. Lighthouse等でのパフォーマンス計測・改善
4. Cloudflare Pages 本番デプロイ設定の確認・最終リリース
```

### チェック観点
- ローダー→Hero→Crystalインタラクション→各セクションスクロールが一連で破綻しないか
- 低スペック端末でのlottie-webアニメーションの負荷（`dpr:1`設定済みだが要再検証）
- ビルドサイズ（不要アセットが`public/`に残っていないか）

---

## セッション開始チェックリスト

1. `git log --oneline -3` → 最新が `70b1d0a`（ワークフロールール更新）であることを確認
2. `docs/HANDOFF_PHASE3-9.md` を読む（このファイル）
3. `CLAUDE.md` の開発ワークフロー節を確認（マージ自動化ルール）
4. Issue 作成 → ブランチ作成 → 実装 → PR → 自動マージ

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| 3-9 | 統合テスト・最適化・Cloudflare デプロイ | **← 次にやる** |
