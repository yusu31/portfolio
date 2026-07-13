# HANDOFF Phase 3-27 — 体験拡張の再計画(Phase 5〜8再編)・実装はPhase 5-1から

**日付:** 2026-07-13
**前回引継ぎ:** `docs/HANDOFF_PHASE3-26.md`
**このセッションのモデル:** Fable 5(計画・判断)+ Sonnetサブエージェント3並列(調査)

---

## このセッションでやったこと

1. **ユーザーレビュー受領**: ①移動距離が参考サイトより格段に短い ②クリスタル球を旅の主人公にしてボール軌道リレーを演じさせたい ③プリミティブのみでチープ、アセット/モデリングで質感向上したい ④終端の表彰台+3ボールはかっこ悪い
2. **3並列エージェント調査**: コード現状(GLTF 0・テクスチャ0・接地影なしを確認)/ Obsidian taste定義・却下履歴 / フリーアセット・技法のWeb調査(Poly Haven CC0 HDRI、Sketchfab CC-BY プロップ、gltfjsxパイプライン等)
3. **参考サイト実測**(Playwright): Lempensサイトは3チャプター・総ホイール約20万px・連続スクロール約80秒 ≒ 現状の3〜4倍の体験量。主人公は`motorbike`クラスで実装
4. **計画策定→ユーザー承認**: `docs/plans/2026-07-13-phase5-8-experience-expansion.md`(このリポジトリ内・全文)

## 重要: Phase番号の読み替え

**HANDOFF_PHASE3-26の「Phase 5(公開準備)」「Phase 6(公開前チェック→公開)」は、そのまま「Phase 7」「Phase 8」へスライドした。** 新しいPhase 5/6は:

- **Phase 5** = 経路の弧長パラメータ化 → 3倍延長(PAGES 7→21) → クリスタル球のボールリレー(ドリブル→ロングパス→キャッチ→フリースロー→リング通過→落下→レシーブ→トス→アタック→ジオラマ台座に静止)
- **Phase 6** = アセットリッチ化(HDRI・GLTF・芝テクスチャ・接地影・ミニチュアジオラマ・Text3D)。**着手時に候補表をユーザーに提示して承認を得てからDL/生成**(3d-assetsスキル規約)

詳細・PRスライス・パフォーマンス予算・検証方法はすべて計画ファイル参照。

## 確定した判断(却下案含む)

- **経路**: `getPoint(t)`のまま全再調整案を却下 → `getPointAt(u)`(弧長)+`centripetal`へ移行。終端静止は制御点重ね置きをやめoffsetクランプで表現
- **ボールリレー**: 物理エンジン(cannon-es/rapier)却下 → 振付ベース(区間ごとの放物線+共有アンカー座標)。リング通過は座標一致で保証
- **終端演出**: 「水鏡+衛星軌道」「振り返り終幕」「ミニマル静止」を却下 → **「旅路のミニチュアジオラマ」採用**(既存ヴェニューコンポーネントの縮小再利用で統一感を構造的に保証)
- **白ワープ/液体インク転換**: 見送り(「1つの連続空間」の差別化と矛盾)。Text3Dタイトルは1つスパイク→QA→展開の段階導入
- **Spline**: 却下のまま(バンドル2MB超の実測済み)

## 軽微な引き継ぎ

- resume.pdf 未提供(変わらず)。旧Phase 5の項目はPhase 7で実施
- ルート直下の `lighthouse-report*.json` は2026-07-07の旧`/`計測。journey実装後の計測は存在しない(Phase 7で実施)
- `public/textures/leafy_grass_*` は未配線の孤立アセット(Phase 6-3で配線)

## 次セッション用キックオフプロンプト(コピペ用・Sonnet始動推奨)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 5-1実装セッション。

まず docs/HANDOFF_PHASE3-27.md と docs/plans/2026-07-13-phase5-8-experience-expansion.md を読んで。

【モデル運用(重要)】Sonnet始動。機械的実装・検証・PR事務はSonnetのまま。
ボール軌道の演出調整・構図判断の難所だけ/modelでFableに切替え、終わったら戻す。
スクリーンショットQAはSonnetサブエージェント委任(確立済み)。

【今回のスコープ】計画のPhase 5-1(弧長パラメータ化)のみ。1 Issue → 1 PR:
- CameraRig.tsx の getPoint → getPointAt、curveType 'centripetal' 化
- sections.ts → src/journey/path/ 分割、終端静止はoffsetクランプ方式へ
- SECTION_RANGES再導出(各ヴェニューの構図が現行同等になるよう)
- Vitest回帰テスト(経路長レンジ・RANGES単調性・u→z座標のヴェニュー近傍性)
- QA基準は「ピクセル一致」ではなく「構図の同等性」(offset直指定スクリーンショット比較)
余裕があればPhase 5-2(経路3倍延長・PAGES 21)に着手可。5-2完了時はユーザーの
通しスクロール承認が必須マイルストーン。

【変更禁止事項】クリスタル球の見た目レシピ、パステル夕景の色支配、Bloomでのグレア対策、
Issue→branch→PR→merge厳守、pnpm必須。/scroll-poc配下PRはマージ可、/昇格だけは保持。
確認や提案の往復は挟まず実装を進めてよい。コンテキスト60%で見切り→次HANDOFFで締める
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-13_scroll-3d-phase5-replanning.md`(セッション記録・却下案含む)
- `Decisions/2026-07-13-journey-ending-diorama.md`(終端演出の選定)
- `article-drafts/2026-07-13_scroll-3d-phase5-planning.md`(記事ネタ)
