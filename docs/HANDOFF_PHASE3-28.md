# HANDOFF Phase 3-28 — Phase 5-1(弧長パラメータ化)実装・PR #239はQA残2件でマージ保留

**日付:** 2026-07-13
**前回引継ぎ:** `docs/HANDOFF_PHASE3-27.md`
**このセッションのモデル:** Fable 5(実装・QA判断)+ Sonnetサブエージェント1回(スクリーンショット比較QA)

---

## このセッションでやったこと

1. **Phase 5-1実装完了**(Issue #238 → PR #239、**マージ保留**):
   - `CameraRig.tsx`: `getPoint(t)` → `getPointAt(u)`、終端静止は `PATH_END_OFFSET=0.982` クランプ
   - `curveType` を `'centripetal'` 化、`arcLengthDivisions=400` 明示+初期化時キャッシュ温め
   - `sections.ts` → `src/journey/path/`(venues / curves / sections / index)に分割
   - 終端の制御点重ね置きを廃止し、経路を z=-56.5(視線 -59.4)まで延長。u=0.982 が旧終点ポーズ camera(0,1.5,-55.3) に一致するよう逆算
   - Vitest回帰テスト20件(`src/journey/path/path.test.ts`)全緑・`pnpm build` 成功(three-core 732KBのまま)
2. **SECTION_RANGES再導出**: 旧経路と同一カメラz座標になるuを二分法で逆算。新RANGES = home 0〜0.105 / projects 0.164〜0.424 / skills 0.424〜0.618 / about 0.618〜0.873 / contact 0.873〜1.01。カメラ位置はΔ≤0.05で一致、視線はヴェニュー中間で旧よりヴェニュー中心に近い(skills 2.91→1.56, about 2.56→1.27)
3. **スクリーンショットQA**(main旧offset × ブランチz等価offsetの11ペア、Sonnet委任): 6 PASS。FAIL報告4件のうち**04/05は再撮影で正常構図を確認→撮影フレークと確定**(コード正常)
4. **QAスクリプト正式収録**: `scripts/qa-shots.mjs`(offset直指定撮影。Phase 5-2フルスイープで再利用)

## PR #239のマージ条件(未完了)

1. **07/09(境界ちょうどのサンプル)**: カードが1セクション前に表示された。`sectionAt` が [start, end) のため、damping収束の僅かな下振れで前のカードが写る撮影アーティファクトの疑いが濃厚。**境界±0.005 の4点**(0.613/0.623/0.868/0.878)で再撮影して確認する(3Dシーンは一致済みなのでmain側の撮り直しは不要)
2. **08(about中間)**: 新視線はネット全体が見える引き気味の構図(視線経路パラメータ化の想定内変化・数値上は改善方向)。**目視の最終判断が未実施**。before=main offset 0.625 / after=ブランチ offset 0.759 で撮影して比較する

両方OKなら PR #239 をマージ(このプロジェクトはマージ自動実行が事前承認済み)。

## 確定した判断(却下案含む)

- **RANGES再導出**: 目視での手動再調整案を却下 → カメラzの単調性を利用した二分法逆算(再現可能・5-2でも同じ手が使える)
- **QA撮影**: headless Chromium → WebGLで `page.screenshot` が固まるため**ヘッドド必須**(e2e設定と同じ理由)。`networkidle` 待ち → 3Dシーンは通信が終わらず**タイムアウトするため load+canvas待ち+9秒固定**
- **QAサンプル設計の教訓**: 境界ちょうどのoffsetは [start,end) 判定の下振れでカードが揺れる。**今後は境界±εで撮る**
- 撮影フレーク(04/05で行程の7割地点が写った)は原因未特定だが再現せず。5-2のフルスイープでは**各点のリトライ or offset実測値の記録**を入れると安全

## 軽微な引き継ぎ

- QA画像はセッションscratchpad(`...\706a0a90-...\scratchpad\qa\{before,after,recheck}`)にあり、OS掃除で消える可能性あり。必要なら上記offsetで再撮影
- resume.pdf 未提供・lighthouse-report*.json はPhase 7で再計測(変わらず)
- `C:\Users\3fort\.claude\state\handoff-portfolio-phase5-1.md` に同内容の状態ファイルあり(handoff-latest.md は並行の環境整理セッションが使用中のため別名)

## 次セッション用キックオフプロンプト(コピペ用・Sonnet始動推奨)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 5-1仕上げ→Phase 5-2セッション。

まず docs/HANDOFF_PHASE3-28.md と docs/plans/2026-07-13-phase5-8-experience-expansion.md を読んで。

【モデル運用(重要)】Sonnet始動。機械的実装・検証・PR事務はSonnetのまま。
構図判断の難所だけ/modelでFableに切替え、終わったら戻す。

【今回のスコープ】
1. PR #239の残QAを閉じてマージ: ①pnpm dev → node scripts/qa-shots.mjs で
   境界±ε(0.613/0.623/0.868/0.878)のカード切替確認 ②about中間の構図目視判断
   (before=main offset 0.625 / after=ブランチ offset 0.759)
2. マージ後、Phase 5-2(経路66→約200ユニット・PAGES 7→21・transit骨格3区間)に着手。
   fog far再検証(46→60〜70)。完了時はユーザーの通しスクロール承認が必須マイルストーン。
   注意: path.test.ts の経路長レンジ(62〜73)を延長後の値に更新すること

【変更禁止事項】クリスタル球の見た目レシピ、パステル夕景の色支配、Bloomでのグレア対策、
Issue→branch→PR→merge厳守、pnpm必須。/scroll-poc配下PRはマージ可、/昇格だけは保持。
確認や提案の往復は挟まず実装を進めてよい。コンテキスト60%で見切り→次HANDOFFで締める
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-13_scroll-3d-phase5-1-arc-length.md`(セッション記録)
