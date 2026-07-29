---
date: 2026-07-29
author: Claude Sonnet 5(実装・検証)
related_issues: "#300(スパイクバウンド化)、#302(本HANDOFF)"
related_prs: "#301(スパイクバウンド化、マージ済み)"
---

# HANDOFF PHASE5-5 SESSION6: PR-6(スパイクバウンド化)マージ完了

今回から軽量フォーマット(次にやること・未解決事項のみ)を適用。実装経緯・技術的発見・
教訓の詳細はObsidian `Projects/portfolio/2026-07-29_SESSION6_spike-bounce-pr6.md`および
`Knowledge/playwright-r3f-scroll-verification.md`に記録済み。

## 概要

`docs/HANDOFF_PHASE5-5_SESSION5.md`の次アクション#1に従い、PR-6(スパイクバウンド化)を
設計→実装→実機QA→マージまで完了した。**本セッションの最終状態: PR #301マージ済み。
作業ツリークリーン。次はPR-7(Contactジオラマ)が未着手。**

## 次セッション開始時のチェックリスト

```
□ main を最新pull
□ 本ファイル読了
□ リポジトリ直下の未追跡ファイル(.wrangler/等)の削除要否をユーザーに確認(複数セッション持ち越し)
```

## 次にやること(優先順)

1. **PR-7 Contactジオラマ(#10、着手前にユーザー相談必須)** — `venues.tsx`のContactVenueの
   円柱台座(`cylinderGeometry`)を、サッカー・バスケ・バレー3コートの縮小模型(各1/8〜1/10
   スケール)に置き換える。具体的な縮尺・配置は未設計。既存の`SoccerVenue`/`BasketVenue`/
   `VolleyVenue`ジオメトリを縮小再利用するか、新規に簡略化モデルを作るかも未決定。
   3Dアセットが絡む場合は`3d-assets`スキルを使う想定。
2. **PR-8 フリースローD_UP微増(#5、他PRに便乗可)** — 最小の変更。`cameraAttitude.ts`の
   既存KEYFRAMES(ダッチアングル20°+pitch+6°)は維持しつつ、`camera.ts`にD_UP微増ブレンドを
   追加。

各PRごとに`tsc --noEmit` → `npm run build` → `npx vitest run` → devサーバーでの視覚QA
(Playwright)→ ユーザー確認、の既存フローを踏襲する。

## 未解決・要判断事項

- **リポジトリ直下に未追跡の古いファイルが残っている**(`.wrangler/`, `RESEARCH_BRIEF.md`,
  `lighthouse-report.json`, `lighthouse-report2.json`, `qa_pr4_*.png`, `test-results/`)。
  複数セッション未対応、削除要否は次セッションでユーザーに確認する。
- 太陽グレア(u≈0.195〜0.20)は許容判断のまま(SESSION4から持ち越し)。
- ショット1(オープニングワイド)の実機確認は依然未了。
- `fall.ts`(ダイブ区間のボール軌道)は`ballistic-trajectory.ts`未適用のまま(Phase 6候補)。
