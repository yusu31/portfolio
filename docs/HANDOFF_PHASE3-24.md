# HANDOFF Phase 3-24 — 3Dスクロール体験 Phase 2以降(7/13 Fable5セッション向け)

**日付:** 2026-07-08
**前回引継ぎ:** `docs/HANDOFF_PHASE3-23.md`
**現在ブランチ:** main(このHANDOFF自体はPR経由でマージ)
**このセッションのモデル:** Sonnet

---

## このセッションでやったこと

設計書 `designs/2026-07-08-scroll-3d-journey-redesign.md` §9 の **Phase 1のみ**を実装・検証した。

- Issue #218 → ブランチ `feature/scroll-camera-phase1-poc-#218` → PR #219 → main へマージ済み
- `/scroll-poc` に独立ページ(`src/pages/ScrollJourneyPoc.tsx`)を新規追加
- `ScrollControls`(drei) + `useScroll()` + `useFrame` でスクロールoffsetに応じてカメラのposition/lookAtを
  毎フレーム更新し、Home→Projects間でカメラが前進する感覚を実装
- 既存のクリック駆動コード(`GlobalCanvas.tsx`/`Crystal.tsx`)は一切参照せず、ゼロから実装
- Playwrightで実機スクロール検証(スクリーンショット4段階)を実施し、体感を確認
- **完了条件達成:** 「ローカルでスクロールするとカメラが前進する感覚が実際に確認できる」ことを確認済み

詳細な実装記録・詰まったポイントは SecondBrain:
`Projects/portfolio/2026-07-08_scroll-3d-phase1-poc-implementation.md` を参照。

### このセッションで見つかった教訓(次セッションで踏まないための注意)

1. **既存の共通レイアウトとの衝突に注意。** `App.tsx` の `GlobalCanvas`/`Cursor`/`GlobalNav` は
   ルートに関わらず常時マウントされる `position: fixed` の全画面オーバーレイ。新規ページを
   ゼロから書いても、これらが二重に重なって表示される。今回は `App.tsx` に `LegacyChrome` という
   ラッパーを作り、`useLocation()` で対象パスのときだけ非表示にして回避した。
   Phase 2以降で本番ルーティング(1ページ内スクロール)に統合する際は、この `LegacyChrome` の
   出し分けごと不要になる(旧コンポーネント自体を削除する)想定。
2. **スクロール/アニメーション検証は必ず両端(0%・100%)まで確認する。** 中間地点だけ見て
   「良い感じ」と判断すると、終端でカメラが対象物にめり込んで画面が真っ黒になるような
   バグを見逃す。今回も実際に発生し、移動距離の係数を調整して解消した。

---

## 参考サイト(体験の"お手本" — 実装前に毎回確認すること)

**Sébastien Lempens**
- サイト: https://www.sebastien-lempens.com/
- GitHub: https://github.com/sebastien-lempens

この参考サイトを軸に「スクロール量に応じてカメラが3D空間を前進・旋回していく」体験を
作り込む。優先順位: **★1 スクロールで空間が進む感覚 > ★2 3Dの造形・質感 > ★3 カメラワークの自然さ**
(★3は★1の副産物として付いてくる想定)。

### Fable5セッション開始時に必ずやること

1. **サイト自体をブラウザで開いて動きを観察する。** スクロール速度に対するカメラ移動量、
   セクション切り替わり時の演出(フェード/ズーム/回転)、カメラのイージング(damping)の
   効き方を実際に触って確認してから設計・実装に入る。「見た記憶」で進めない。
2. **デモ動画があれば必ず確認する。** サイトのトップページやSNS等にプロモーション動画・
   ワークスルー動画がないか確認し、あれば通しで見て「どの区間で何が起きるか」をメモしてから
   実装方針を決める。
3. **GitHubリポジトリのREADME・ドキュメントを必ず読む。** 使用ライブラリ・実装アプローチの
   記載があれば読み込み、このプロジェクトの制約(Spline不採用・R3Fプリミティブのみ・
   バンドルサイズ要件)と照らし合わせて「真似できる部分」と「真似できない部分」を切り分ける。
4. 上記1〜3で得た「動き・UIの分析結果」を簡単にメモしてから、初めて設計・実装のコードを書く。
   分析をスキップしていきなり実装すると、★1(スクロールで空間が進む感覚)の再現度が下がる。

このプロセス自体を、他の参考サイト(Landing.Love等で見つけた新しい参考事例)を追加で
真似る場合にも同様に適用すること。

---

## Phase 2以降の実装計画(未着手・設計書§9より抜粋)

| Phase | 内容 | ステータス |
|---|---|---|
| 1 | ScrollControls + Home→Projects間のカメラ前進POC | **完了(PR #219)** |
| 2 | R3Fプリミティブでの質感テスト(`MeshTransmissionMaterial`等、1オブジェクトで検証) | 未着手 |
| 3 | Projects/Skills/Aboutの3セクションを§2データで実装、カードUI(`Scroll html`)を実装 | 未着手 |
| 4 | Contactセクションを実装、全体を通しでスクロールして体験を確認 | 未着手 |
| 5 | レスポンシブ(375px含む)・reduced-motion対応・Lighthouse・公開 | 未着手 |

- コンテンツデータ(§2インベントリ): `src/data/projects.ts`/`skills.ts`/`about.ts` の型・値は
  そのまま流用可(ロジックのみ新規実装)
- 素材: `public/textures/leafy_grass_*`(芝テクスチャ)、`public/sport-loading-white.json`(Lottie)
- Resume PDFは引き続き未接続(ユーザーからの提供待ち、`public/resume.pdf`配置が必要)
- Phase 1で作った `/scroll-poc` ページと `App.tsx` の `LegacyChrome` 分岐は、Phase 3で
  本番ルーティング(1ページ内スクロール)に統合する際に置き換え・削除する想定

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase2以降実装セッション。

まず以下を読んで状況を把握して:
1. designs/2026-07-08-scroll-3d-journey-redesign.md(設計書・全10節)
2. docs/HANDOFF_PHASE3-24.md(このファイル)
3. SecondBrain: Projects/portfolio/2026-07-08_scroll-3d-phase1-poc-implementation.md
   (Phase1実装の詳細・詰まったポイント)

【Phase1は完了済み・確認不要】
ScrollControls + Home→Projects間のカメラ前進POC(PR #219)で「スクロールでカメラが
前進する感覚」の検証は完了済み。/scroll-poc ページと App.tsx の LegacyChrome 分岐として
実装が残っている。

【今回のスコープ】
設計書§9のPhase 2から着手する。R3Fプリミティブでの質感テスト(MeshTransmissionMaterial等、
まず1オブジェクトで検証)→ Phase 3(Projects/Skills/Aboutの3セクション実装、Scroll htmlの
カードUI)→ Phase 4(Contact実装、全体通し確認)→ Phase 5(レスポンシブ・reduced-motion・
Lighthouse・公開)の順で進めてよい。

【実装前に必ずやること: 参考サイトの動き・UI分析】
参考サイト Sébastien Lempens(https://www.sebastien-lempens.com/ / GitHub:
https://github.com/sebastien-lempens)を必ずブラウザで開いて動きを観察し、デモ動画が
あれば確認し、GitHubのREADME・ドキュメントを読んでから設計・実装に入ること。
分析をスキップしていきなり実装しない。優先順位は
★1 スクロールで空間が進む感覚 > ★2 3Dの造形・質感 > ★3 カメラワークの自然さ。

【実装方針の大前提(変更なし)】
- 既存のクリック駆動コード(GlobalCanvas.tsx/Crystal.tsx)は参考にせずゼロから書く
- Splineは導入しない(R3Fプリミティブのみ、§7参照。バンドルサイズ実測済みで却下確定)
- ルーティングは1ページ内スクロール
- スクロール/アニメーション検証は必ず両端(0%・100%)まで確認する(Phase1で踏んだ教訓)

ルール: Issue→branch→PR→merge厳守 / pnpm必須。Issue番号は新規に取得すること
確認や提案の往復は挟まず実装を進めてよい。コンテキスト60%で見切り→HANDOFF_PHASE3-25で締める
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-08_scroll-3d-phase1-poc-implementation.md` に
  このセッションの実装詳細・詰まったポイントを記録
- `Projects/portfolio/article-drafts/2026-07-08_scroll-3d-phase1-poc-implementation.md` に
  記事素材(「動いた」で終わらせない教訓2件)を記録
