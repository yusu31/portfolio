# HANDOFF Phase 3-34 — Phase 5-5 PR2(世界の3倍化)実装・マージ完了 + 繰り越し整理

**日付:** 2026-07-17(夜)〜2026-07-18
**前回引継ぎ:** `docs/HANDOFF_PHASE3-33.md`
**このセッションのモデル:** Fable 5(前半・PR2実装) / Sonnet(本文書作成)

---

## このセッションでやったこと(時系列)

### 1. PR2: 世界の3倍化+経路・セクション再導出(PR #266マージ済み・Issue #265)

設計書`docs/plans/2026-07-17-phase5-5-court-expansion.md`(唯一の正典)§1〜6に基づき、相互拘束の強いvenues/curves/sections/anchors/beats/テストを原子的に1PRで実装した。

- **実装前にスクラッチパッドの使い捨てスクリプトで新経路・新アンカーを実測**(§5の確立手法どおり)。結果は設計時シミュレーションと**完全一致**: 最小カメラ-ボール距離4.34@u=0.648 / 最大画面占有率0.76 / 最大ステップ2.69 / NDCサンプル16点全PASS
- 変更ファイル: `path/venues.ts`(VENUE_SCALE=3・COURT_SIZES・STRUCTURE_GROUND_LIFT新設)、`venues.tsx`(コート面・チョーク・構造物3倍化+接地補正、タイトルy=6.5/fontSize=1.8)、`ball/anchors.ts`(全アンカーをフレーミング実測値で再定義、RING_CENTER自動導出は不変)、`path/curves.ts`(新CAMERA_PATH 14点・全長253.5/LOOKAT_PATH 10点・255.0/PATH_END_OFFSET=0.9933/PAGES=27)、`path/transit.ts`・`path/sections.ts`・`ball/beats.ts`(実測系定数のみ・**定数名は変更していない**)、`ScrollJourneyPoc.tsx`(Ground[70,330]@z=-100・ORBS/雲を新全長へ再配分)
- テスト更新: 視線近傍テストをコートAABB内判定へ意味論ごと置換、構造物クリアランステスト(7構造物×500サンプル、水平距離>1.2)を新規追加、ステップ閾値3.0→4.0、占有率テストをfocusWeight>0全域へ拡大
- 検証: `tsc -b` / `build` / `vitest run` → **64件全green**。Playwright offset直指定スクリーンショット12点をSonnetサブエージェントに視覚QA委任 → マージ阻害なし(貫通・浮遊・色崩壊・タイトル崩壊なし)

### 2. トークン制限接近による中断とスコープ縮小

Sonnetサブエージェント視覚QAを当初2巡の予定だったが、ユーザー指示で1巡に短縮。PR3(動線パラメータ)・本HANDOFF文書・セッションノートのObsidian詳細記録は次セッションへ繰り越しとし、Obsidian `Projects/portfolio/backlog.md` を暫定引き継ぎとして更新して前セッションを終えた。

### 3. 本セッション: 繰り越し分のHANDOFF_PHASE3-34作成(Issue #267)

ユーザーは買い物のため離席。離席中にできる作業として、backlogと設計書§3を読み込んだ上で本文書を作成した。

---

## PR2 QAで見つかった要調整4件(未対応・意図的に保留)

タッチライン際カメラ設計(「カメラは引かない」ユーザー明言)の帰結として生じたもので、貫通や破綻ではない。**勝手に修正せず、ユーザー通しスクロール確認後にPR3以降で判断する**方針が確定済み:

1. フープ支柱過接近 @offset≈0.46 [中]
2. ネット面過接近 @offset≈0.72 [中]
3. ネット支柱と半透明球の透過重なり @offset≈0.687 [軽微]
4. コート面の単調さ @offset≈0.162 [軽微]

---

## 確定した判断(却下案含む)

PR2に関する却下案は設計書§8に完全版があるため再掲しない。本セッションで新たに確定した判断はなし(文書作成のみ)。

## 軽微な引き継ぎ・注意事項

- **教訓**: pnpmはシンボリックリンクを展開しないため、Playwrightをスクリプトから直接requireする際は`.pnpm/playwright@x.y.z`配下のパスを経由する必要がある
- ローリング回転のROLL_GAIN(roll.ts、現1.0)を0.6〜0.8へ下げる調整余地はPR3に持ち越し中(HANDOFF_PHASE3-33からの継続事項)
- `beats.ts`の定数名は変えない(カメラ姿勢反転演出のplan `C:\Users\3fort\.claude\plans\typed-snuggling-wirth.md` がu境界名に依存) — PR2でも遵守済み
- `.wrangler/`・`lighthouse-report*.json`・`test-results/`は未追跡のまま(従来から継続・無関係)
- devサーバーは前セッション終了時に停止済み

## リポジトリ状態(このHANDOFF作成時点)

- `main`: PR #260(設計書)・PR #262(PR1ローリング回転)・PR #266(PR2世界の3倍化)マージ済み、クリーン
- オープンなIssue: #244(ジャンプナビ・Phase 7待ち)
- Phase 5-5の残り: **PR3(動線パラメータ)** → ユーザー通しスクロール確認 → 要調整4件の扱い判断 → カメラ姿勢反転演出解禁

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験。Phase 5-5はPR2(世界の3倍化、PR #266)まで
マージ済み。docs/HANDOFF_PHASE3-34.md と設計書 docs/plans/2026-07-17-phase5-5-court-expansion.md §3、
Obsidian Projects/portfolio/backlog.md を読んで。

【今回のスコープ】
① PR3(動線パラメータ): dribble BOUNCE_CYCLES 9/BOUNCE_HEIGHT 1.3/WEAVE_CYCLES 3.5/
  WEAVE_AMPLITUDE 3.0、pass ARC_HEIGHT 4.0、freeThrow ARC_HEIGHT 3.2(設計書§3)。
  QAでROLL_GAIN 0.6〜0.8調整余地あり
② ユーザー通しスクロール確認 → backlogの「PR2視覚QA要調整4件」の扱いを決める
③ Phase 5-5完了後にカメラ姿勢反転演出(plan file: typed-snuggling-wirth.md)解禁

【変更禁止事項】クリスタル球の材質レシピ、パステル夕景の色支配、Bloomグレア対策、
Issue→branch→PR→merge厳守(ドキュメントのみでも例外なし)、pnpm必須、物理エンジン不導入、
beats.ts定数名変更禁止。
```
