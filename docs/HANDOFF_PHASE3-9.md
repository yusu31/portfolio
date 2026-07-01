# 引き継ぎプロンプト — Phase 3-9（統合テスト・最適化・デプロイ）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-07-01）

`main`ブランチで作業開始できる状態。

**重大な設計変更が確定しました:** 2026-07-01のセッションで、ohzi.ioの20枚のスクリーンショットを分析した結果、現在の「JourneyZoneスクロールベース」実装からの大幅な設計見直しを決定した。

**リポジトリ:** `c:\Users\3fort\dev\portfolio`  
**現在のブランチ:** `main`（クリーン）  
**本番:** Cloudflare Pages（main push で自動デプロイ）  
**最新コミット:** `git log --oneline -5` で確認

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

## ✅ 完了済みフェーズ

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
| 3-9（ボールジャーニー Phase 1） | サッカーシーン+共通基盤の実装（旧設計、後述の新設計で置き換え予定） | #52 |

---

## 🚨 最重要：OHZIスタイル全面リアーキテクチャへの移行

### なぜ設計を見直すのか

Phase 1実装（JourneyZoneベース）を確認した結果、以下の問題が判明した：

1. **Heroに芝・投光器がブリードしている**（SoccerSceneのCourtSurface/GrassField/Floodlightsがスクロール進捗に無関係に常時レンダリングされる）
2. **芝のクオリティが低い**（フォグなし・シャドウなし・光応答なし）
3. **ohzi.ioの本質的な設計思想から根本的にずれている**

### ohzi.ioの正確な構造（2026-07-01確認済み）

ohzi.ioはスクロール一本のSPAではなく、**URLが変わる別々のルートページ**（`/who-we-are` `/how-we-do-it` `/our-work` `/contact`）で構成されており、ページ間遷移時にワープトンネル演出が挟まる。各ルート内では1つの3Dビネット+浮遊テキストカードがスクロール連動する。

### 決定した新アーキテクチャ

**ルート構造:**
```
/              → HomeScene     現Hero（クリスタル + HEY. + EXPLORE → /soccer へ）
/soccer        → SoccerScene   サッカービネット（フルスクリーン透明 + スクロール連動3D）
/basketball    → BasketballScene
/volleyball    → VolleyballScene → /work へ
/work          → WorkScene     現行の不透明スクロールサイト（Impact → Footer）そのまま
```

**主な技術変更:**
- `react-router-dom` v7 を新規追加
- 各ルートページが**自前のCanvas**を持つ（旧：App.tsxの1つのCanvasが全ページ共通）
- ジャーニールート（`/soccer` `/basketball` `/volleyball`）は**全面透明UI**（OHZI準拠）
- `/work`以降は現行の不透明スクロールサイトを維持（Impact〜Footerは変更不要）

**ルート間トランジション（確定）:**
- ボールは消えずに残り続ける（視覚的連続性）
- 画面全体が次シーンのブランドカラーでフラッシュ
- React Routerがルート切り替え
- ワープトンネルは使用しない（スポーツ感と合わないため）

**設計書:** [`docs/superpowers/specs/2026-07-01-ohzi-rewrite-design.md`](superpowers/specs/2026-07-01-ohzi-rewrite-design.md)

### 設計書のどこが未完か

設計書のアーキテクチャセクションは確定済み。**シーン設計セクション（各スポーツのカメラワーク・フレーム形状・マテリアル・テキストカードのコピー）は次セッションで`brainstorming`スキルを使って完成させる。**

---

## 次にやること（最優先）

```
1. brainstormingスキルで設計書のシーン設計セクションを完成させる
   参照: docs/superpowers/specs/2026-07-01-ohzi-rewrite-design.md の「未完了」セクション
   各スポーツのカメラ・フレーム形状・マテリアル・コピーを決定

2. 設計書完成後、writing-plansスキルで実装計画を作成
   対象: React Router導入 → 各ルートページの新規作成 → 旧JourneyZoneコードの移行

3. subagent-driven-developmentスキルで実装
```

**旧Phase 2/3計画（バスケ・バレーの個別計画）は新設計に統合されるため個別には作成しない。**

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Bloom稼働中。GodRaysは実装済みだが無効化中）
GSAP 3.15 + ScrollTrigger + SplitText
lottie-web 5.13（ローダーのcanvasレンダリング）
Lenis 1.3（→ Routerベース移行後の扱いを要検討）
Tailwind CSS v4
Three.js 0.184
Vitest 4.1.9（trajectory/scrollProgressの計9テスト）
react-router-dom v7（← 新規追加予定）
```

**重要: pnpm必須。** `npm install`はarboristクラッシュで失敗する。

---

## 現在のアーキテクチャ（旧・参考用）

旧実装は以下の通り。新ルートベース設計への移行で大部分が書き換わるが、純粋関数（scrollProgress.ts / trajectory.ts）と一部のCanvas要素は再利用する。

### 旧Canvas（App.tsx） ← 変更予定
```tsx
<Canvas
  style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]}
>
```

### 旧UIレイヤー（App.tsx） ← /work に移動予定
```
<main>
  <Hero /> → HomeScene に昇格
  <JourneyZone id="journey-soccer" heightVh={250} /> → 廃止（ルートベースに移行）
  <Impact /> → /work 内で維持
  ...
</main>
```

---

## 既知の注意点（新設計でも引き継ぐもの）

1. **`alpha: false` 必須**: transmission が暗背景を必要とする
2. **楕円防止**: Crystal の x/z 座標はずらさない（y=-0.4 はOK）
3. **LF警告**: Windows CRLF変換警告は無視してよい
4. **pnpm必須**: `npm install`は使わない
5. **GodRays無効化中**: `Effects.tsx`の`GOD_RAYS_ENABLED = false`。再チューニングは別タスク
6. **Hero区間閾値**: `heroScrollRange.ts`の`getHeroScrollRange()`に集約済み（新設計でルートが分離されたら不要になる可能性が高い）
7. **Geminiプロンプトの技術値は信用しない**: 「Canvasがfixedされていない」等の技術的診断は事実誤認があった（実際には正しく実装済み）。演出的な方向性は参考にするが、具体的な数値は実装後の目視チューニングで決める

---

## Phase 3-9 残りスコープ（リアーキテクチャ込み）

```
1. 設計書のシーン設計セクションを完成（brainstorming）
2. React Router導入 + ルートページ新規作成
3. /soccer ルート: 旧SoccerSceneをリアーキテクチャ（フォグ・シャドウ・PBR追加）
4. /basketball ルート: 新規実装
5. /volleyball ルート: 新規実装
6. ルート間フラッシュトランジション実装
7. /work ルート: 現行コンテンツの移行
8. GodRaysの再チューニング（Bloomとの組み合わせ方見直し）
9. 全ルート通し確認（Playwright）
10. モバイル/タブレットでのレスポンシブ確認
11. パフォーマンス計測・Lighthouse
12. Cloudflare Pages 本番デプロイ確認
```

---

## セッション開始チェックリスト

1. `git log --oneline -5` → 最新コミットを確認
2. `docs/HANDOFF_PHASE3-9.md` を読む（このファイル）
3. `docs/superpowers/specs/2026-07-01-ohzi-rewrite-design.md` を読む（新設計書）
4. 設計書の「未完了」セクションを確認 → brainstormingスキルでシーン設計を完成させる
5. 設計完成後: writing-plans → subagent-driven-development の順で実装へ

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| OHZIリアーキテクチャ 設計書完成 | シーン設計セクション（カメラ・フレーム・マテリアル・コピー）| **← 次にやる** |
| OHZIリアーキテクチャ 実装 | React Router + 3ルートのスポーツビネット + トランジション | 🔲未着手 |
| 統合テスト・最終調整 | GodRays再チューニング・Lighthouse・Cloudflareデプロイ | 🔲未着手 |
