# 引き継ぎプロンプト — Phase 3-9（統合テスト・最適化・デプロイ）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-06-30）

`main`ブランチで作業開始できる状態。直近のセッションで「モバイルナビ修正」と「ボールジャーニー演出」の設計・実装計画が完了しマージ済み。

**リポジトリ:** `c:\Users\3fort\dev\portfolio`
**現在のブランチ:** `main`（クリーン）
**本番:** Cloudflare Pages（main push で自動デプロイ）
**最新コミット:** `8ef9335`（`git log --oneline -5` で確認）

---

## ⚠️ 開発ワークフロー（必読）

- **Issue → branch → PR → merge を全変更で必須**（コード・ドキュメント問わず例外なし）
- **PRマージはClaudeが確認なしで自動実行してよい**（このプロジェクトに限り事前承認済み）。マージ後のローカルbranch削除・`git remote prune origin`も続けて自動実行する
- このHANDOFFファイル自体の更新もIssue→branch→PRを通すこと

---

## Obsidian記録

- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-hub.md` — プロジェクト全体の戦略・技術スタック・フェーズ進捗
- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-ohzi-reference.md` — ohzi.io参考資料（Gemini解析の評価・採用/不採用判断・技術リサーチまとめ）

詳細な背景を知りたいときはユーザーに読み込み許可を取った上で参照する（SecondBrainの読み込みはユーザー明示指示時のみ）。

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
| 3-9内 | モバイルナビのハンバーガーメニュー対応 | #43, #44 |

---

## 🏃 進行中：ボールジャーニー演出（最優先で次にやること）

Phase 3-9の統合テスト中、ohzi.io風の演出強化として「サッカー→バスケットボール→バレーボール」のスクロール連動3Dシーンを設計した。**設計・実装計画は完了・マージ済み。次は実装フェーズ。**

### ドキュメント
- 設計書: [`docs/superpowers/specs/2026-06-30-ball-journey-transition-design.md`](superpowers/specs/2026-06-30-ball-journey-transition-design.md)（PR #46）
- 実装計画（Phase 1: 共通基盤+サッカーシーン、14タスク）: [`docs/superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md`](superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md)（PR #48）

### 次にやること
**`superpowers:subagent-driven-development` スキルを使い、上記実装計画を1タスクずつsubagent実行する**（ユーザーが選択した実行方式）。計画書のTask 1〜14を順番に実行し、各タスク間でレビューを挟む。

### 設計上の重要な発見（実装時に必ず踏まえること）
1. **Hero以外の全セクションが不透明背景**（[Impact.tsx:60](../src/components/sections/Impact.tsx#L60)等）のため、3D Canvasは通常そこでは見えない。これに対応するため、Hero-Impact間に**透明な高さ確保用セクション**（`JourneyZone`）を新設し、その区間だけ3Dキャンバスがフル表示される設計にした
2. OHZIサイトの「カメラが前進する没入感」は、単なる縦スクロールではなく**カメラがCatmullRomCurve3に沿って3D空間を移動するドリーモデル**として実装する
3. 山岳地形等のOHZI固有の創作物は模倣しない方針。背景は「ナイター（投光器+GodRays）+ 風になびく芝（インスタンスシェーダー）+ 実写CC0 PBRテクスチャ」で質感を担保する
4. 人物パーツ（手など、バスケ/バレーで必要）はMixamo/Sketchfab CC0素材を`MeshToonMaterial`でワイヤーフレーム発光調にスタイライズし、フリー素材の出自を消す（Phase 1のサッカーシーンでは人物アセット不要、Phase 2のバスケで着手）
5. バスケットボール・バレーボールシーンは**別の実装計画として後続で作成する**（Phase 1完了後）

### Phase 1実装計画の概要（タスク数: 14）
Vitestテスト基盤導入 → スクロール進捗/軌道計算の純粋関数+テスト → セクション進捗フック → JourneyZone（透明区間）追加 → ナイター照明（GodRays）→ コート地面（PBRテクスチャ）→ 風になびく芝 → サッカーシーン本体（ドリブル+ロングパス）→ BallJourneyコンテナ統合 → prefers-reduced-motion対応 → Playwright視覚検証 → PR作成

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Effects.tsx で稼働中。Phase 1でGodRays追加予定）
GSAP 3.15 + ScrollTrigger + SplitText
lottie-web 5.13（ローダーのcanvasレンダリング）
Lenis 1.3
Tailwind CSS v4
Three.js 0.184
Vitest（Phase 1実装で新規導入予定。テストはまだ0件）
```

`@rive-app/react-canvas` と `lottie-react` はPhase 3-8で未使用と判明し削除済み。

---

## 現在のアーキテクチャ

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

### Nav.tsx（モバイル対応済み）
768px未満でハンバーガーメニュー→`createPortal`で`document.body`直下にフルスクリーンオーバーレイを描画。`nav`要素の`backdrop-filter`がposition:fixedのcontaining blockになる問題を回避するためportal化している（詳細はPR #44参照）。

---

## 既知の注意点

1. **`alpha: false` 必須**: transmission が暗背景を必要とする
2. **楕円防止**: Crystal の x/z 座標はずらさない（y=-0.4 はOK）
3. **Lenis**: `main.tsx` のモジュールレベル（`autoRaf: false`）。移動しない
4. **LF警告**: Windows CRLF変換警告は無視してよい
5. **不透明背景**: Hero以外の全セクションは不透明背景。3D演出を見せたい区間は`JourneyZone`のような透明スペーサーが必要（上記参照）

---

## Phase 3-9 残りスコープ（ボールジャーニー完了後）

```
1. 全セクション（Hero〜Footer）のスクロール・インタラクション通し確認
2. モバイル/タブレットでのレスポンシブ確認（Canvas DPR・パフォーマンス）
3. Lighthouse等でのパフォーマンス計測・改善
4. Cloudflare Pages 本番デプロイ設定の確認・最終リリース
```

---

## セッション開始チェックリスト

1. `git log --oneline -5` → 最新が `8ef9335` であることを確認
2. `docs/HANDOFF_PHASE3-9.md` を読む（このファイル）
3. `docs/superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md` を読む
4. `superpowers:subagent-driven-development` スキルを使い、Task 1から順に実行を開始する

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| 3-9（ボールジャーニー Phase 1） | サッカーシーン+共通基盤の実装 | **← 次にやる** |
| 3-9（ボールジャーニー Phase 2） | バスケットボールシーン（手アセット調達含む） | 🔲未着手 |
| 3-9（ボールジャーニー Phase 3） | バレーボールシーン | 🔲未着手 |
| 3-9（残り） | 統合テスト・Lighthouse計測・Cloudflareデプロイ | 🔲未着手 |
