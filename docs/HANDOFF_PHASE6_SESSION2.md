---
date: 2026-08-01
author: Claude Opus 5（設計・実装・QA）
related_issues: "#324, #327, #328, #329, #330, #333(本HANDOFF)"
related_prs: "#325, #326, #331, #332（すべてマージ済み）"
design_doc: docs/plans/2026-08-01-net-geometry-and-physics.md
---

# HANDOFF PHASE6 SESSION2: ネット実装①・フープ骨格実物比化まで完了

軽量フォーマット継続（次にやること・未解決事項のみ）。**判断根拠・却下案・時系列は以下に記録済み**:

- `C:\Users\3fort\.claude\state\handoff-latest.md`（復旧メモ付き・圧縮復旧hookが参照）
- Obsidian `Projects\portfolio\Decisions\2026-08-01-net-geometry-and-hoop-frame.md`（判断と却下案）
- Obsidian `Projects\portfolio\2026-08-01_SESSION_phase6-net-and-hoop-frame.md`（時系列）
- Obsidian `Projects\portfolio\backlog.md`（2026-08-01 追記2〜4）

## 概要

Phase6 Phase1の設計を確定させ、実装順序①まで完了した。**設計フェーズは終了**（brainstormingの
hard gateは設計書マージ＋ユーザー承認で解除済み）。

| PR | 内容 |
|---|---|
| #325 | 設計書 `docs/plans/2026-08-01-net-geometry-and-physics.md` |
| #326 | §6.4を「バウンドさせない」で確定（案B撤回） |
| #331 | バスケットネットの静止ジオメトリ（実装順序①）。テスト135→146件 |
| #332 | フープ骨格を実物比へ作り直し＋見せ場でカメラを引く（`FREE_THROW_D_BACK=17`） |

**Opusはもう不要。残りに重い設計判断はないのでSonnetで進められる。**

## 次セッション開始時のチェックリスト

```
□ main を最新pull（現在 1617f97）
□ 本ファイルと C:\Users\3fort\.claude\state\handoff-latest.md の両方を読了
□ 設計書 docs/plans/2026-08-01-net-geometry-and-physics.md の §4 / §6 / §8 を読む
□ 実装順序②から着手（設計は済んでいるので実装してよい）
```

## 次にやること（設計書§8の実装順序）

1. **② サッカー/バレーのネット実体化＋シェーダー風**（設計書§4）
   マージ済み静的チューブジオメトリ + `onBeforeCompile`で頂点シェーダーに風を注入
   （既存の `HomeBg.tsx` / `HomeAurora.tsx` / `DiveCloudVeil.tsx` と同じパターン）。
   **風時刻を固定するQA用スイッチを同時に入れる**（風が時間駆動だとスクリーンショットQAが
   非決定的になるため。設計書§7.2）
2. **③ `swish`ビート追加**（設計書§6.3）
   `freeThrow`が`RING_U`で`RING_CENTER`に厳密一致する構造保証は壊さず、その直後に Δu≈0.02 の
   短いビートを挿入して y 7.40→1.6 まで落とす（水平ドリフト ≤1.5 でネット内側を通す）。
   **着手前に `path.test.ts` のバックボードクリアランスを必ず確認**（下記の未解決参照）
3. **④ u軸ベイクVerlet**をバスケネットに適用（設計書§3.4）
   256サンプル × 8サブステップ × 拘束反復3、Float32Array 184KB。初期化コストを実測して
   128サンプルへの削減 or 遅延初期化を判断する
4. **⑤ Blenderで剛体フレームをベベル化**
   別設計書が必要（bpyスクリプト置き場所・GLB出力先・R3F組み込み・gltfjsx活用）。
   対象は支柱 / アーム / バックボード / リング / サッカーゴールフレーム
5. **Issue #327**（`diveHoleStrength()` の配線）は**③のswish実装後**に着手すると効果が出る
6. **Issue #328**（サッカーゴールが実物比で2.3倍縦長）は要ユーザー判断
7. Issues #314〜#318（Phase6軽量項目）は全て未着手のまま

## 未解決・要判断事項

- **`RING_OFFSET` は絶対に動かさない。** `RING_CENTER`＝フリースローの着弾点が動くとボール軌道と
  カメラQAが全部やり直しになる。骨格を直すときは板と支柱だけを動かす（#332の安全弁）
- **`swish`がバックボードのクリアランステストを通るか未検証。** 2026-07-21に全区間の軌道反転が
  同じテストで失敗している（原因はカメラのD_UPリフトがRING_U近傍でバックボード高さまで
  持ち上がること）。スイッシュはリング直下に閉じた短い区間なので通る可能性はあるが要確認
- **`diveHoleStrength()` が実装済みだがどこにも配線されていない**（#327）。参照は自身のテストのみで、
  「地面を貫通して落ちる」表現は現在**雲ヴェールだけ**で成立している
- **サッカーゴールが実物比で2.3倍縦長**（#328、幅0.90倍・高さ2.09倍）。修正すると `KICK_POINT` の
  クロスバークリアランス3.40に波及する
- 太陽グレア（u≈0.195〜0.20）・ショット1実機確認は依然未了（SESSION4から持ち越し）
- **開発サーバーがポート5176で起動したままの可能性**がある（`pnpm dev`）

## 実装時に踏んだ罠（再発防止）

- **`InstancedMesh` は `frustumCulled={false}` が必須。** 既定バウンディングはジオメトリ1個ぶんの
  極小球なので、オブジェクト原点が画面外に出た瞬間に全体が消える（drei `<Clouds>` と同種）
- **`basketNetGeometry.ts` という名前はケース衝突回避のため。** `basketNet.ts` だと `BasketNet.tsx` と
  Windowsで同一視され tsc が TS1149 で落ちる。リネームしないこと
- **スクラッチ数値検証**: プロジェクト内に一時 `.test.ts` を作り実コードをimportして測る。
  **vitestはconsole.logを抑制するので `writeFileSync` で結果をファイルへ出す**
  （`--reporter=basic` は vitest 4 には存在しない）。一時ファイルは必ず削除してからコミット
- **Playwright QAは `/scroll-poc`**（`/` は旧凍結UI）。headed必須。手順は `handoff-latest.md` の
  復旧メモ参照。スクリプトはscratchpadの `qa_net.py`
