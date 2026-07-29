---
date: 2026-07-29
author: Claude Sonnet 5(実装・検証・設計)
related_issues: "#296(ワープVFX#5)、#298(本HANDOFF)"
related_prs: "#297(ワープVFX#5、マージ済み)"
---

# HANDOFF PHASE5-5 SESSION5: PR-5(ワープVFX)実装完了

## 概要

`docs/HANDOFF_PHASE5-5_SESSION4.md`と計画ファイル`C:\Users\3fort\.claude\plans\stateless-crunching-wand.md`
のステップ3に従い、PR-5(ワープVFX)を設計→実装→実機QA→数値調整→マージまで完了した。

**本セッションの最終状態: PR #297マージ済み。作業ツリークリーン。計画ファイルの3ステップ(ダイブ軌道
垂直優勢化・PR-4ロングキック・PR-5ワープVFX)が全て完了。次はPR-6(スパイクバウンド化)が未着手。**

---

## 実装した内容(PR #297)

- `src/journey/warpVfxEnvelope.ts`(新規): 既存の`diveBlendT`/`diveWobbleEnvelope`/`diveVeilEnvelope`/
  `arcBlendT`と同一idiom(uの純関数でenvelope 0→1→0を返す)の5例目。`WARP_PEAK_U`
  (=`(DRIBBLE_END+CATCH_START)/2`≈0.293)±0.02で発火する対称smootherstep包絡線
- `src/journey/WarpFlash.tsx`(新規): `DiveCloudVeil.tsx`と同じ「u駆動・imperative」パターン。
  `useScroll()`でuを取得し、`ChromaticAberration`のoffsetと`Bloom`のintensityを毎フレーム直接書き込む
- `src/pages/ScrollJourneyPoc.tsx`: `EffectComposer`に`ChromaticAberration`を追加、`WarpFlash`を
  ScrollControls配下に追加。エフェクトインスタンスはコールバックrefで橋渡し(下記の実装中に発見した
  問題を参照)

全133テストgreen(新規`warpVfxEnvelope.test.ts` 7件含む)、`tsc --noEmit`/`npm run build`クリーン。

## 実装中に発見した2つの実行時バグ(@react-three/postprocessing v3)

型チェック・ユニットテストでは検知できず、Playwrightで`page.on('pageerror', ...)`を仕込んで実機で
発見した。詳細はObsidian `Knowledge/react-three-postprocessing-effect-ref-pitfalls.md`に記録済み。

1. **`ChromaticAberration`の`offset`プロップにプレーン配列`[0,0]`を渡すとVector2に変換されない**。
   `wrapEffect`(ライブラリ内部実装)は値をそのままコンストラクタへ渡すだけで変換ヘルパーを使わない
   ため、`ref.current.offset`がプレーン配列のままになり`.set()`が`TypeError`で壊れる。
   → `THREE.Vector2`インスタンスを直接渡すよう修正(`CA_INITIAL_OFFSET`)。
2. **エフェクトインスタンスへのrefをオブジェクトref(`ref={someRefObject}`)で渡すと、他state変化
   (activeSection変更等)での再レンダー時にクラッシュする**。`wrapEffect`内部の
   `useMemo(..., [JSON.stringify(props)])`が、マウント済みのエフェクトインスタンス(循環参照を持つ)
   を含む`props`を直列化しようとして`Converting circular structure to JSON`で例外を投げる。
   → コールバックref(`ref={(instance) => { ref.current = instance }}`)に変更して回避
   (関数はJSON.stringifyで無視される=undefined化されるため)。

## 実機QAでの数値調整

初期実装は「叩き台の数値」(CA_PEAK_OFFSET=0.006, BLOOM_PEAK_INTENSITY=3.5)で行ったが、Playwright QA
でu≈0.293がもともと太陽方向を向いていて画面全体が明るい/靄がかった区間だと判明し、フラッシュ自体の
視認性が弱かった。ワープVFXを無効化(envを強制0)した状態での同一u値スクリーンショットとのA/B比較で
「この靄は既存シーンの特性でありPR-5由来ではない」ことを数値・視覚の両面で確認した上で、ユーザーに
「叩き台のまま進めるか、この場で強めるか」を確認し、「もう少し強めに調整」の判断を得た。

**現在値: CA_PEAK_OFFSET=0.015(叩き台比2.5倍)、BLOOM_PEAK_INTENSITY=6(ベース1.1に対し約5.5倍、
叩き台比では約1.7倍)。** u=0.26/0.32(範囲外)では効果ゼロ、u=0.28〜0.305(範囲内)でボール縁・地平線に
視認できる虹色フリンジを実機確認済み。

---

## 次セッションへの引き継ぎ

### 開始時のチェックリスト
```
□ main を最新pull
□ 本ファイルとSESSION4(docs/HANDOFF_PHASE5-5_SESSION4.md)読了
□ リポジトリ直下の未追跡ファイル(.wrangler/等、SESSION4から持ち越し)の削除要否をユーザーに確認
```

### 次にやること(優先順)

1. **PR-6 スパイクバウンド化(#9、新規Issue化してから着手)** — 新規anchor`SPIKE_FLOOR`・
   `SPIKE_BOUNCE_PEAK`を追加、`spike.ts`を`ballistic-trajectory.ts`(PR-4で追加した`arcHeightAt`が
   使える)利用に置換。現状「トス頂点→Contact手前」の1本の直線グライドを、①ネット上から相手コート床
   へ叩き込み②短くバウンド③バウンド頂点からContactへ大きく弧を描いて舞い上がる、の3段構成に再設計する。
2. **PR-7 Contactジオラマ(#10、着手前にユーザー相談必須)** — `venues.tsx`のContactVenueの円柱台座
   (`cylinderGeometry`)を、サッカー・バスケ・バレー3コートの縮小模型(各1/8〜1/10スケール)に置き換える。
   具体的な縮尺・配置は未設計。既存の`SoccerVenue`/`BasketVenue`/`VolleyVenue`ジオメトリを縮小再利用
   するか、新規に簡略化モデルを作るかも未決定。3Dアセットが絡む場合は`3d-assets`スキルを使う想定。
3. **PR-8 フリースローD_UP微増(#5、他PRに便乗可)** — 最小の変更。`cameraAttitude.ts`の既存
   KEYFRAMES(ダッチアングル20°+pitch+6°)は維持しつつ、`camera.ts`にD_UP微増ブレンドを追加。

各PRごとに`tsc --noEmit` → `npm run build` → `npx vitest run` → devサーバーでの視覚QA(Playwright)
→ ユーザー確認、の既存フローを踏襲する。

### 残りフェーズの完成予想(概算)

過去の実績ペース(PR-4は1セッションの主作業として完了、PR-5は実働1.5〜2時間程度で完了、うち大半は
2つのライブラリバグの特定作業)から皮算用した概算。**精度は粗い前提付きの見積もりであり、確定スケジュール
ではない**:

| PR | 規模感 | 実働時間目安 |
|---|---|---|
| PR-6(スパイクバウンド化) | PR-4(ロングキック)と同等規模 | 2〜4時間 |
| PR-8(フリースローD_UP微増) | 最小、他PR便乗可 | 30分〜1時間 |
| PR-7(Contactジオラマ) | **最も不確実**。既存venueジオメトリの縮小再利用なら軽量、新規3Dアセット調達が必要なら重い | 2〜3時間(軽量ケース)〜4〜8時間(重いケース) |

**合計実働見込み: 楽観5〜9時間 / 保守的8〜13時間。** カレンダー換算では、直近の実績(2026-07-17〜21に
連続5セッション、その後2026-07-29まで8日間の間隔)を踏まえると、開発頻度次第で**早ければ数日、
今回のような間隔(数日〜1週間おき)が続くなら1〜2週間程度**が目安。PR-7の設計確定(ユーザー相談)前は
この見積もりの不確実性が最も高い。

### 未解決・要判断事項

- **太陽グレア(u≈0.195〜0.20)は許容判断のまま**(SESSION4から持ち越し)。将来の通しQAで気になる
  ようなら方向転換タイミング調整かBloom抑制を再検討する。
- **リポジトリ直下に未追跡の古いファイルが残っている**(`.wrangler/`, `RESEARCH_BRIEF.md`,
  `lighthouse-report.json`, `lighthouse-report2.json`, `qa_pr4_dribble.png`, `qa_pr4_freethrow.png`,
  `qa_pr4_spike.png`, `test-results/`)。2026-07-20由来と推測。本セッションでも未対応、削除要否は
  次セッションでユーザーに確認する。
- ショット1(オープニングワイド)の「現状で十分ワイドか」の実機確認は依然未了。
- `fall.ts`(ダイブ区間のボール軌道)は`ballistic-trajectory.ts`未適用のまま(Phase 6候補、SESSION3
  から持ち越し)。

---

## セッションノート

### 日付: 2026-07-29

- SESSION4のHANDOFFと計画ファイルのステップ3を読んでPR-5(ワープVFX)着手を確認、Issue #296作成→
  ブランチ`feature/warp-vfx-chromatic-aberration-#296`で実装開始
- 既存の`diveVeilEnvelope`等の実装を先に読み、同一idiomで`warpVfxEnvelope.ts`を実装。ScrollControls
  ソースコードを直接確認し、EffectComposerを移動せずrefで橋渡しする設計に決定
- 実装直後、Playwright実機QAで`ca.offset.set is not a function`エラーを発見 → Vector2変換の問題と
  特定・修正
- 修正後も`Converting circular structure to JSON`エラーが発生 → `wrapEffect`の内部実装を直接読み、
  オブジェクトrefがJSON.stringifyの対象に含まれることが原因と特定 → コールバックref方式に変更して解消
- 全133テストgreen・tsc/buildクリーン確認後、Playwright QAで9点スクリーンショット確認。u≈0.293付近が
  もともと太陽方向を向いていて明るく、フラッシュの視認性が弱いことに気づく
- A/Bスクリーンショット比較(ワープVFX無効化状態)で「靄は既存シーンの特性、PR-5由来ではない」ことを
  確認 → ユーザーに「叩き台のまま進めるか、この場で強めるか」を確認 →「もう少し強めに調整」の回答を
  得てCA_PEAK_OFFSET/BLOOM_PEAK_INTENSITYを強化 → 再QAで視認性向上を確認
- 全検証再実行後、PR #297作成・即マージ(プロジェクトの自動マージ承認ルールに基づく)、ローカル/
  リモートブランチ削除
- ユーザーから「Obsidianに記録して、セッションを変えるのでコピペpromptを」との依頼を受け、
  handoff/obsidian-vaultスキルで記録。追加で「残りのフェーズと完成予想時間を算出して」との依頼を
  受け、過去の実績ペースから概算(上表)を提示

**教訓:**
- **`@react-three/postprocessing`のようなラッパーライブラリでrefを使った命令的アニメーションを
  実装するときは、まず該当ライブラリの内部実装(バンドルされたJS)を直接読んで、refの扱い・メモ化の
  依存キーを確認してから実装する方が手戻りが少ない**。今回は実装後に2つのバグを実機QAで発見してから
  内部実装を読みに行ったが、先に読んでいれば両方とも実装前に回避できた可能性がある
- **視覚エフェクトの「叩き台の数値」は、ピーク地点の既存シーンの明るさ・コントラストによって実際の
  視認性が大きく変わる**。数値だけを見て強さを判断せず、必ず実機スクリーンショットで確認し、
  疑わしい場合はエフェクト無効化状態とのA/B比較で「エフェクト由来かシーン由来か」を切り分けるべき
- Playwrightでのスクロール位置合わせは「複数回の補正wheel」ではなく「1回の相対wheel→長めの待機→
  安定確認」の方式に統一すべき(このマシンの高負荷下では補正ループが発振することを再確認)
