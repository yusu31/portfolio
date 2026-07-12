# HANDOFF Phase 3-25 — Phase 2/3完了・Phase 4(Contact)以降へ

**日付:** 2026-07-12
**前回引継ぎ:** `docs/HANDOFF_PHASE3-24.md`
**このセッションのモデル:** Fable 5(実装・デザイン判断)+ Sonnetサブエージェント(スクリーンショットQA委任)

---

## このセッションでやったこと

### Phase 2: 質感テスト(Issue #222 → PR #223 → マージ済み)

- 参考サイト Sébastien Lempens をPlaywright headedで実機分析(START→終端まで約30枚)。
  分析メモ: `docs/analysis/2026-07-11-lempens-site-analysis.md`(体験構造・質感の源泉・本案件への翻訳表)
- クリスタル球: **既存 `Crystal.tsx` のレシピをそのまま移植が正解**とユーザー確定。
  新規発明2案(粗い20面ジェム/不透明ツヤ球)は却下された
- シーン: **Lempens風の明るいパステル夕景に刷新**(ユーザー承認「暗くなくていいよ」)。
  drei Sky(夕焼け) + Clouds(ピーチの雲) + フォグ#f2b8a0 + 夕日キーライト + 薄紫リムライト
- design-reviewスキルの指摘3件(地面彩度↓・リムライト↑・Bloom調整)を反映

### Phase 3: 3セクション+カードUI(Issue #224 → PR #225 → マージ済み)

- カメラをCatmull-Rom曲線化(`src/journey/sections.ts` の CAMERA_PATH/LOOKAT_PATH)。
  道なりに蛇行し、各ヴェニューへ視線を振りながら前進
- サッカー/バスケ/バレーの低ポリヴェニューを道沿い(左右交互)に配置。3D浮遊タイトル付き
- `src/data/` 実データのカードUI(画面固定オーバーレイ)をセクション連動で表示
- `src/journey/` に分割: sections.ts / CameraRig / CrystalBall / SectionCards / venues

## ユーザー確定事項(デザインのtaste・必読)

1. **ボールの見た目は既存Crystal.tsxレシピ一択**(詳細: memory `feedback-crystal-original-recipe`)。
   見た目を変える提案は必ずスクリーンショットで事前確認を取る
2. **明るいパステル夕景OK**(ダークテーマ必須ではない)。1シーン1色支配を徹底
3. 青系アクセントはトーン支配を崩しやすい(design-review指摘)。カード内のセクション色はOK

## このセッションで確立したパターン・教訓

1. **モデル使い分け(ユーザー指示・2026-07-12)**: セッション枠がすぐ埋まるため、Fableは
   デザイン判断・3D難所のみ。スクリーンショットQA・機械的検証は**Sonnetサブエージェントに委任**
   (今回2巡で機能した。1巡目が破綻3件を検出→修正→2巡目で全解消を確認)
2. **スクロール検証はoffset直指定**: wheel連打はdampingでズレる。スクロールコンテナの
   scrollTopを`frac * (scrollHeight - clientHeight)`で直接設定→3秒待ち→撮影が正確
3. **page.goto は `wait_until="load"`+固定待ち12秒**: Sky/Clouds/フォント読み込みで
   networkidleが発火せずタイムアウトする
4. **セクション区間は連続レンジにする**: 区間に隙間があると「何もない区間」が長く感じられ、
   dampingの遅延でカード出現も遅れて見える
5. **終端は必ず「何かで着地」させる**: カメラが全コンテンツを通過した先の空虚な空間で
   止まると破綻と同じ。終端の視線はAboutヴェニューに固定してある(Phase 4でContactに差し替え)

## Phase 4以降の計画

| Phase | 内容 | ステータス |
|---|---|---|
| 2 | 質感テスト | **完了(PR #223)** |
| 3 | 3セクション+カードUI | **完了(PR #225)** |
| 4 | Contactセクション実装+全体通し確認 | 未着手 |
| 5 | レスポンシブ(375px)・reduced-motion・Lighthouse・公開・本番ルーティング統合 | 未着手 |

### Phase 4でやること

- Contactヴェニュー/演出をz≈-56以降に追加し、CAMERA_PATH/LOOKAT_PATHの終端を延長
  (§2.6: Email / GitHub / Resume(PDF未提供・保留) / フッター表記)
- QAフォローアップ: 終端の構図(太陽グレアの白飛び・ネットポール見切れ)、
  バスケゴールがフレーム外になりがちな問題
- 全体通しスクロールの体験確認(★1: 前進感が5セクション通して持続するか)

### Phase 5でやること(据え置き)

- `/scroll-poc` を `/` に昇格し、`App.tsx` の `LegacyChrome` 分岐・旧ルート・旧コンポーネント削除
- レスポンシブ(375px)・prefers-reduced-motion・Lighthouse・バンドルサイズ(manualChunks)
- Homeカード0.08付近のクリスタル球と見出しの重なりは区間調整済み(home: 0〜0.11)だが、375pxで再確認

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 4実装セッション。

まず docs/HANDOFF_PHASE3-25.md を読んで状況を把握して。
設計書は designs/2026-07-08-scroll-3d-journey-redesign.md(§2.6=Contactデータ、§8=UI方針)。

【モデル運用(重要)】機械的作業(検証・PR事務・小修正)はSonnetのまま進める。
デザイン判断・3D演出の難所だけ/modelでFableに切替え、終わったら戻す。
スクリーンショットのQAはSonnetサブエージェントに委任する(前セッションで確立済み)。

【今回のスコープ】Phase 4: Contactセクション実装+全体通し確認。
- src/journey/sections.ts の CAMERA_PATH/LOOKAT_PATH終端をContactへ延長
- Contactヴェニュー(Email/GitHub/Resumeリンク、§2.6)を実装。終着点は「静止したまとめ画面」に近い演出(設計書§8)
- QAフォローアップ: 終端構図(太陽グレア・ポール見切れ)・バスケゴールのフレーミング
- 全体通しスクロールを検証(offset直指定パターン、goto は wait_until="load"+12秒待ち)

【変更禁止事項】クリスタル球の見た目(memory feedback-crystal-original-recipe)、
明るいパステル夕景の色支配、Issue→branch→PR→merge厳守、pnpm必須。
確認や提案の往復は挟まず実装を進めてよい。コンテキスト60%で見切り→HANDOFF_PHASE3-26で締める
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-12_scroll-3d-phase2-3-implementation.md` に実装詳細を記録
- `Projects/portfolio/article-drafts/2026-07-12_scroll-3d-phase2-3-implementation.md` に記事素材を記録
