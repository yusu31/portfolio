# HANDOFF Phase 3-23 — V3 Journey 凍結・3Dスクロール体験へゼロベース刷新（設計フェーズ）

**日付:** 2026-07-08
**前回引継ぎ:** `docs/HANDOFF_PHASE3-22.md`
**現在ブランチ:** main（このHANDOFF自体はPR経由でマージ）
**このセッションのモデル:** Sonnet

---

## このセッションでやったこと

### 1. 方針転換の決定

V3 Journey（クリック駆動の状態機械 + ボール追従カメラ）は **Phase 1で凍結**する。
Phase 2（ボールアニメーション）以降には進まない。

**理由（未解決だった3つの問題）:**
1. カラフルな光の玉（Orb）が soccer / basketball / volleyball ページにも出てしまう
   → 原因特定済み: `Crystal.tsx` の `orbs` state が `mode` 変更時にクリアされず、
     Home で spawn した Orb が他シーンに残留する
2. カード（`JourneyCardBillboard`）が見づらい
   → 原因: 3D空間内 `Html` 配置で背景と重なり視認性が落ちる
3. ボールは画面下 1/3 だけ透明感を出したいが、現状は接地した不透明球

これらを個別に直すのではなく、**体験のコアメタファーをクリックからスクロールに変える**大方針転換を
ユーザーが決定。参考は Sébastien Lempens（https://www.sebastien-lempens.com/）—
スクロール量に応じてカメラが3D空間を前進・旋回していく体験。優先順位は
★1 スクロールで世界が動く感覚 > ★2 3Dの造形・質感（Spline）> ★3 カメラワーク（★1に付随）。

### 2. 設計書を2版作成（最終版が正）

最初に「既存コードへの後付け」を前提とした設計書を書いたが、ユーザーから明確な差し戻しを受けた。

> 3Dスクロール体験は「機能追加」じゃなく「構造の根っこ」。Spline + ScrollControlsを既存ページに
> 後付けすると、z-indexやスクロール制御が衝突し「修正加えすぎてごちゃごちゃ」になる（前回の繰り返し）。

**確定した方針: ゼロベース設計。** 引き継ぐのはコンテンツ（文章・データ・配色）のみ。
アーキテクチャ・コンポーネント構造・状態管理は新規に設計し、実装は別セッション/別ウィンドウで
ゼロから書き起こす。既存コードは実装の土台にしない。

**最終成果物:** `designs/2026-07-08-scroll-3d-journey-redesign.md`（10節構成）

---

## 設計書のサマリー

### コンテンツインベントリ（§2、引き継ぎ対象）
- サイトコンセプト: 「体育教師 → エンジニア転身中」「スポーツが育てた思考で、プロダクトを作る」
- 4セクション: Projects(サッカー/`#4fc3f7`・6件) / Skills(バスケ/`#ffb300`・17件) /
  About(バレー/`#69f0ae`・3ポイント) / Contact(`#ce93d8`)
- データは `src/data/projects.ts` / `skills.ts` / `about.ts` の内容をそのまま踏襲（型・値は流用可）
- 素材: `public/textures/leafy_grass_*`（芝テクスチャ）、`public/sport-loading-white.json`（Lottie）
- Resume PDF は依然未接続（ユーザーからのPDF提供待ち）

### 新アーキテクチャ概要（§5〜8）
- 1本の `<ScrollControls>`（drei）でスクロール量を一元管理。カメラ移動の主導権はScrollControlsに一本化
- カード等のUIは `<Scroll html>` の固定オーバーレイに統一（3D空間内Html配置はやめる＝問題2の対策）
- lenis は二重スクロール制御を避けるため導入しない
- Spline導入は未検証（`@splinetool/react-spline` 未導入、バンドルサイズ要検証）
- ルーティングは「1ページ内スクロール」への統合を推奨案として提示（現行5ルートSPAからの転換）

### オープンクエスチョン（§10、次セッション最初に決めること）
1. ルーティング方式: 1ページ内スクロール（推奨） vs 現行複数ルート維持の折衷案
2. Spline vs R3Fプリミティブでの質感強化（学習コスト・バンドルサイズ次第）
3. **既存リポジトリで新ブランチ作り直し vs 別ディレクトリで試作してから移植** ← 最初に決める必要あり
4. Resume PDF 未接続（提供待ち）

---

## 次セッション用キックオフプロンプト（コピペ用）

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験刷新・実装フェーズ開始セッション。

まず以下を読んで状況を把握して:
1. designs/2026-07-08-scroll-3d-journey-redesign.md（設計書・全10節）
2. docs/HANDOFF_PHASE3-23.md（このファイル）

【最初にやること】
設計書 §10 のオープンクエスチョン、特に「1: ルーティング方式」「3: 実装場所
（既存リポジトリ新ブランチ vs 別ディレクトリ試作）」をユーザーと確認してから実装に着手する。
まだ実装を始めない。

【実装方針の大前提】
- 既存のクリック駆動コード（GlobalCanvas.tsx の状態機械/ClickBallMover/BallFollowCameraRig等、
  Crystal.tsx の mode='click-drive'/spawnOrbs）は参考にせず、ゼロから書く
- 引き継ぐのはコンテンツのみ（設計書 §2 のインベントリ）
- ScrollControls (drei) でカメラ主導、Spline導入は別途検証タスクとして切り出す

ルール: Issue→branch→PR→merge厳守 / pnpm必須 / コンテキスト60%で見切り→HANDOFF_PHASE3-24で締め
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-08_scroll-3d-pivot-design.md` にこのセッションの設計判断を記録
- `Projects/portfolio/article-drafts/2026-07-08_scroll-3d-zero-base-redesign.md` に
  「なぜ後付け設計をボツにしてゼロベースにしたか」を記事素材として記録
