# HANDOFF Phase 3-26 — Phase 4(Contact)完了・Phase 5へ

**日付:** 2026-07-13
**前回引継ぎ:** `docs/HANDOFF_PHASE3-25.md`
**このセッションのモデル:** Fable 5(実装・構図判断)+ Sonnetサブエージェント(スクリーンショットQA 2巡)

---

## このセッションでやったこと

### Phase 4: Contactセクション+全体通し確認(Issue #228 → PR #229 → マージ済み)

- `src/journey/sections.ts`: SectionId/SECTION_RANGES/VENUESに contact 追加。
  CAMERA_PATH/LOOKAT_PATH終端を z=-55.3 へ延長し、**終端2点をほぼ重ねて「静止」を演出**。PAGES 6→7
- ContactVenue(`venues.tsx`): フィニッシュゲート(CONTACTバナー付き・**カメラがくぐり抜ける**)+
  円形プラザ + 3ヴェニューのボールが集う表彰台(**右サイドの奥行き階段配置**)+ 暖色オーブ。
  「ゴールテープを切って表彰台を見る」構図で、太陽を背にするため旧終端の逆光グレアを構造的に解消
- ContactCard(`SectionCards.tsx`): 画面中央のまとめパネル(求職バッジ / Let's work together. /
  Email / GitHub / **Resume=PDF未提供でリンク無効** / フッター表記)。既存ContactSceneのトーンを暖色に翻訳
- QAフォロー: バスケゴールをコート奥端**左寄り**へ移設+センターサークル追加、地面をプラザ奥まで延長、
  Contact背景に夕焼け雲を追加

### QA経緯(Playwright 14枚 × SonnetサブエージェントQA 2巡)

1巡目の重大4件 → 修正 → 2巡目で全解消・マージ可判定:
- バスケゴールがSKILLSタイトルと同軸で埋没 → 奥端左寄りに移設して分離
- バレーネット・支柱がフレーム外 → 視線経路(LOOKAT)を早めに左へ振る点を追加
- offset0.70で太陽側の空が全幅白飛び → 視線を早めに正面へ戻す(太陽との方位角差を拡大)
- 終端の中央カードが表彰台の白ボールを完全に隠す → 表彰台を右サイド奥行き階段に再配置
- CONTACT文字の上端/右端見切れ → タイトルをゲート上のバナー(fontSize 0.62)へ移設

## このセッションで確立したパターン・教訓(追加分)

1. **Catmull-Romに点を足すと全区間ズレる**: `getPoint(t)`は弧長パラメータではなく制御点数依存。
   経路延長時はSECTION_RANGESと視線同期を全セクション再計算すること(sections.tsに注意コメント済み)
2. **グレアは視線方位で消す**: 白飛びはBloom値ではなく「視線と太陽の方位角差」で制御する。
   トーン(taste)を守ったままQA指摘を解消できる
3. **中央固定カードと3D構図は同軸に置かない**: 終端の見せ場オブジェクトはカードの左右に逃がす
   (表彰台は右サイドの奥行き階段が正解だった)
4. **3D浮遊タイトルは構造物に載せると見切れない**: 終端タイトルはゲートバナー化が有効

## 軽微な残課題(マージ非ブロッカー・Phase 5冒頭で任意対応)

- offset0.70の左上端にごく薄い白みの名残(許容範囲判定)
- 空の発光オーブが「複数の太陽」に見えるカットがある(Phase 3承認済み演出。気になれば数を減らす)
- **resume.pdf 未提供**: `public/resume.pdf` 配置後、`SectionCards.tsx` の `CONTACT_LINKS` の
  Resume行の `href: null` をパスに差し替えるだけで有効化できる

## Phase 5でやること(据え置きから昇格)

**注意: Phase 5ではデプロイまで行わない。公開はPhase 6(公開前チェック)の通過後。**

| 項目 | 内容 |
|---|---|
| ルーティング統合 | `/scroll-poc` を `/` に昇格、`App.tsx` の `LegacyChrome` 分岐・旧ルート・旧コンポーネント削除 |
| レスポンシブ | 375px確認(Homeカードとクリスタル球の重なり、中央Contactカードの収まり) |
| アクセシビリティ | prefers-reduced-motion 対応 |
| パフォーマンス | Lighthouse、バンドルサイズ(three-coreが732KB — manualChunks調整) |

## Phase 6でやること(公開前チェック → 公開)

Phase 5完了後、以下のチェックをすべて通してから本番デプロイする。

### 公開前チェックリスト

- [ ] **最終デザインQA**: design-reviewスキルで全セクション通しレビュー(taste準拠・Sonnetサブエージェント委任可)
- [ ] **クロスブラウザ/実機**: Chrome・Edge・Firefox + モバイル実機(375px)で通しスクロール
- [ ] **Lighthouse最終計測**: Performance / Accessibility / Best Practices / SEO の4カテゴリ
- [ ] **メタ情報**: title・description・OGP画像・favicon・twitterカード
- [ ] **リンク・コンテンツ校正**: Email/GitHubリンクの動作、英語表記・誤字の校正
- [ ] **resume.pdfの最終判断**: 配置して有効化するか、Resume行を非表示にするかを決める
- [ ] **コンソールエラーゼロ**: 通しスクロール中にエラー・警告が出ないこと
- [ ] **ユーザー本人の通し確認**: taste最終承認をもらってからデプロイに進む

### 公開

- [ ] 本番デプロイ
- [ ] デプロイ後の本番URLでスモークチェック(通しスクロール・リンク動作・モバイル表示)

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 5実装セッション。

まず docs/HANDOFF_PHASE3-26.md を読んで状況を把握して。

【モデル運用(重要)】Sonnet始動。機械的作業(検証・PR事務・小修正)はSonnetのまま進める。
デザイン判断の難所だけ/modelでFableに切替え、終わったら戻す。
スクリーンショットQAはSonnetサブエージェントに委任(確立済み)。

【今回のスコープ】Phase 5: 公開準備。
- /scroll-poc を / に昇格し、App.tsxのLegacyChrome分岐・旧ルート・旧コンポーネントを削除
- 375pxレスポンシブ(Homeカード重なり・中央Contactカードの収まり)・prefers-reduced-motion
- Lighthouse・バンドルサイズ(manualChunksでthree-core分割)
- 検証はoffset直指定パターン、goto は wait_until="load"+12秒待ち
- **デプロイはしない**。公開はPhase 6(公開前チェック→公開)で行う。
  チェックリストはHANDOFF本文のPhase 6セクション参照

【変更禁止事項】クリスタル球の見た目(memory feedback-crystal-original-recipe)、
明るいパステル夕景の色支配、カメラ経路とSECTION_RANGES(Phase 4でQA済み。
経路に点を足すと全区間ズレるので触らない)、Issue→branch→PR→merge厳守、pnpm必須。
確認や提案の往復は挟まず実装を進めてよい。コンテキスト60%で見切り→次HANDOFFで締める
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-13_scroll-3d-phase4-contact.md` に実装詳細を記録
