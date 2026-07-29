---
date: 2026-07-29
author: Claude Sonnet 5(実装・検証・設計)
related_issues: "#292(ロングキック#4)、#294(本HANDOFF)"
related_prs: "#293(ロングキック#4+キャッチ&構え#4.5、マージ済み)"
---

# HANDOFF PHASE5-5 SESSION4: PR-1マージ判断 + PR-4(ロングキック)実装完了

## 概要

前セッション(SESSION3)の終わりに「PR #289(ダイブ演出)はユーザー自身のブラウザ確認待ちでマージ保留中」という状態だった。本セッションはその確認・マージ判断から始まり、SESSION3のロードマップに従ってPR-4(ロングキック、ショット#4・#4.5)を設計・実装・マージまで完了させた。

**本セッションの最終状態: PR #289・PR #293ともにマージ済み。作業ツリークリーン。次はPR-5(ワープVFX)が未着手。**

**計画ファイルとの対応関係**: `C:\Users\3fort\.claude\plans\stateless-crunching-wand.md`(SESSION3で承認済みの3ステップ計画)のステップ1(ダイブ軌道の垂直優勢化)は前セッション(2026-07-21)のうちにPR #289へ追加コミット済み(commit `c37042c`)。ステップ2(PR-4ロングキック)が本セッションの主作業。ステップ3(PR-5ワープVFX)が次の着手対象で、具体的な実装方法(ChromaticAberration+Bloomブースト、`ScrollJourneyPoc.tsx`への組み込み方)は同ファイルに詳細設計済み。

---

## セッション冒頭の経緯: PR-1マージ判断

ユーザーから「HANDOFF_PHASE5-5_SESSION2.mdを読んで、PR-1(ダイブ)から実装を始めて」という指示を受けたが、調査の結果PR-1は**既に実装・自動QA完了済みでPR #289として8日前(2026-07-21)から保留中**だと判明した(SESSION3が未読のまま指示されていた)。この状況をユーザーに共有し、「自動QA結果を信頼してそのままマージ」の判断を得てPR #289をマージした。

## PR-4実装の経緯

ユーザーから「計画・設計は詳細にできてるか、僕に聞きたいことがあれば上司として質問してほしい」という念押しを受け、いきなり数値を提案する進め方から、**スクラッチパッドNode.jsシミュレーション(three.js非依存、camera.ts/pass.ts/dribble.tsの計算式を素のJSで再現)で候補パラメータを事前検証してから実装する**進め方に切り替えた。

この検証で、**KICK_POINT(ロングキックの蹴り出し地点)をゴール直近(2〜3ユニット)に置くと、チェイスカメラ(ボールの後方に位置取る設計)がゴール裏へ回り込み、クロスバー・支柱に1〜2ユニット未満まで危険接近する**という、実装前でなければ気づけなかった問題を発見した。KICK_POINTをゴール正面6.45ユニットへ調整することで解決した。

実装中には別の問題にも遭遇した: ドリブル終盤(ウィーブしながら進む)からKICK_POINT(静止点)へ滑らかに繋ぐ実装を「weave位置とKICK_POINTを直接lerpする」方式で最初に作ったところ、既存の回帰テスト(ヨー角ステップ・回転ステップ)が軒並み不合格になった。原因はlerp係数の変化率×位置差の交差項が大きくなることで、**「振動する量と静止点を直接lerpで繋がない、振幅を先に0へ減衰させてから位置を寄せる」**という設計に変更して解消した。

両方の判断の詳細はObsidian `Projects/portfolio/Decisions/2026-07-29-long-kick-goal-clearance-and-lerp-crossterm.md`に記録済み。

---

## 実装した内容(PR #293)

- `src/journey/ball/anchors.ts`: 新規anchor`KICK_POINT`(ゴール正面6.45ユニット)を追加
- `src/journey/ball/beats/dribble.ts`: 終盤(t≥0.7、`KICK_APPROACH_START`)でウィーブ振幅を0へ減衰させながらKICK_POINTへ収束
- `src/journey/ball/physics/ballistic-trajectory.ts`: `arcHeightAt(a,b,c,t)`を追加(`solveBallisticArcLateral`の正規化時間版、非対称な始点・終点高さに対応する一般形。a=c=0のとき既存の`4H·t(1-t)`に一致)
- `src/journey/ball/beats/pass.ts`: KICK_POINT→CATCH_POINTの非対称弾道(頂点高さ15)に書き換え
- `src/journey/camera.ts`: arc区間(u∈[DRIBBLE_END=0.202, CATCH_START=0.384])のカメラ距離ブレンド追加(D_BACK/D_UP 4.5/3.0→7/4.5、前後12%イーズの台形ブレンド`arcBlendT`)
- `src/journey/ball/beats.ts`: `CATCH_END`を`CATCH_START+0.01`→`+0.025`へ拡張、`catchPose`を「沈み込み(quarter-sine)→底でホールド→ease-inで加速上昇」の3段構成に再設計
- `src/journey/ball/ballPath.ts`: passビートの起点を`dribblePosition(1)`から明示的な`KICK_POINT`参照に変更
- `src/journey/ball/chase.test.ts` / `src/journey/camera.test.ts`: 上記変更に伴う回帰テストの追加・区間分割・閾値更新

全126テストgreen、`tsc --noEmit`/`npm run build`クリーン。

## 視覚QA

Playwright(単一ページ・相対wheel・二段階待機、`feedback-playwright-headless-scroll-qa-method`の手法)でu=0.17〜0.41を9点スクリーンショット確認。

- KICK_POINT→クロスバー通過→弾道頂点(u≈0.293、バスケコート"SKILLS"タイトルが見え始める)→キャッチ→ホールド→フリースロー上昇、と設計通りに繋がることを確認
- **キック直前(u≈0.19〜0.20)の方向転換の瞬間、カメラが太陽方向を横切り1コマだけ白飛び気味のグレアが発生**。カメラ-ボール距離5.6・占有率0.6と数値上は安全範囲内(近接事故ではない)であることを確認した上でユーザーに説明し、「このまま進める」の判断を得た。修正は行っていない。

---

## 次セッションへの引き継ぎ

### 開始時のチェックリスト
```
□ main を最新pull
□ 本ファイルとSESSION3(docs/HANDOFF_PHASE5-5_SESSION3.md)読了
□ 設計アーティファクト(https://claude.ai/code/artifact/308a91c5-1917-4a44-a323-13406096fe0b)
  でショット#4のワープVFX仕様を再確認
```

### 次にやること(優先順)

1. **新規Issue: PR-5 ワープVFX** — キック軌道中間点(u≈0.29、arc区間中央=`(DRIBBLE_END+CATCH_START)/2`)で`ChromaticAberration`(放射状の色収差)+Bloom一時強化による短いフラッシュ。`@react-three/postprocessing`は既存依存(`Bloom`使用中)、`ChromaticAberration`は未使用のため新規追加。
   - `src/journey/warpVfxEnvelope.ts`を新規作成し、既存の`diveBlendT`(camera.ts)・`diveWobbleEnvelope`(cameraAttitude.ts)・`diveVeilEnvelope`(diveVeilEnvelope.ts)・`arcBlendT`(camera.ts、本PRで追加)と同じ「uの純関数でenvelope(0〜1)を返す」idiomの5例目として実装する
   - `ChromaticAberration`の`offset`(Vector2)をこの包絡線でスケールし、`ScrollJourneyPoc.tsx`内で`useFrame`(`useScroll`経由)で毎フレーム更新する新規コンポーネントを追加(`DiveCloudVeil.tsx`と同じ「u駆動・imperative」パターンを踏襲)
   - Bloomのintensity一時引き上げも同じ包絡線を使い、フラッシュ的な一瞬の光量アップを表現する
   - 色収差量・フラッシュ時間は「叩き台の数値のみ」でQAでの実測調整が前提。詳細設計は`C:\Users\3fort\.claude\plans\stateless-crunching-wand.md`(ステップ3)に保存済み
2. **PR-6 スパイクバウンド化(#9)** — 新規anchor`SPIKE_FLOOR`・`SPIKE_BOUNCE_PEAK`を追加、`spike.ts`を`ballistic-trajectory.ts`(本PRで追加した`arcHeightAt`が使える)利用に置換。現状「トス頂点→Contact手前」の1本の直線グライドを、①ネット上からabout奥側の床へ叩き込み②短くバウンド③バウンド頂点からContactへ大きく弧を描いて舞い上がる、の3段構成に再設計。
3. **PR-7 Contactジオラマ(#10)** — `venues.tsx`のContactVenueの円柱台座(`cylinderGeometry`)を、サッカー・バスケ・バレー3コートの縮小模型(各1/8〜1/10スケール)に置き換える。具体的な縮尺・配置は未設計のため、着手前にユーザーと相談すること。
4. **PR-8 フリースローD_UP微増(#5)** — 最小の変更。他PRに便乗してもよい。`cameraAttitude.ts`の既存KEYFRAMES(ダッチアングル20°+pitch+6°)は維持しつつ、`camera.ts`にD_UP微増ブレンドを追加。

各PRごとに`tsc --noEmit` → `npm run build` → `npx vitest run` → devサーバーでの視覚QA(Playwright) → ユーザー確認、の既存フローを踏襲する。

### 未解決・要判断事項

- **太陽グレア(u≈0.195)は許容判断のまま**。将来の通しQAで気になるようなら、方向転換タイミングの調整かBloom抑制を再検討する
- **リポジトリ直下に未追跡の古いファイルが残っている**(`.wrangler/`, `RESEARCH_BRIEF.md`, `lighthouse-report.json`, `lighthouse-report2.json`, `qa_pr4_dribble.png`, `qa_pr4_freethrow.png`, `qa_pr4_spike.png`, `test-results/`)。2026-07-20由来と推測され、本セッションでは触れていない。次セッションで要否をユーザーに確認してから削除するか判断する
- ショット1(オープニングワイド)の「現状で十分ワイドか」の実機確認は依然未了
- `fall.ts`(ダイブ区間のボール軌道)は`ballistic-trajectory.ts`未適用のまま(Phase 6候補、SESSION3から持ち越し)

---

## セッションノート

### 日付: 2026-07-29

- ユーザー指示「SESSION2を読んでPR-1から実装して」を受けたが、調査でPR-1が既に実装・自動QA済みでPR #289として保留中と判明。SESSION3(main上、SESSION2より新しい)の存在をユーザーに共有
- ユーザー判断「自動QA結果を信頼してそのままマージ」でPR #289マージ、ローカル/リモートブランチ削除
- SESSION3ロードマップに従いPR-4(ロングキック)着手を提案 → ユーザーから「計画は詳細にできてるか、質問があれば上司として聞け」との念押し
- スクラッチパッドNode.jsシミュレーションでKICK_POINT候補・弾道頂点高さ・カメラ拡張距離を事前検証。ゴール構造物クリアランス問題を実装前に発見・回避
- Issue #292作成 → ブランチ`feature/long-kick-ballistic-arc-#292`で実装
- 実装中、dribble終盤のブレンドでlerp交差項によるジッター問題に遭遇 → ウィーブ振幅減衰方式へ設計変更して解消
- 全126テストgreen確認後、devサーバー起動しPlaywrightで9点スクリーンショットQA
- 太陽グレアを発見、ユーザーに現象を説明(「太陽グレアって何？」という質問に回答) → 「このまま進める」の判断を得る
- PR #293作成・マージ、Obsidian Decisions記録、project-portfolio-v2メモリ更新
- ユーザーから「次やることは？引継ぎして、しっかり詳細に」との依頼を受け、handoffスキルで本ファイルおよび`.claude\state\handoff-latest.md`を作成

**教訓:**
- **「計画・設計をちゃんと詰めてから実装しろ、質問があれば聞け」という念押しを受けたら、数値の当てずっぽうではなくスクラッチパッドでの事前シミュレーションに切り替えるべき**。今回それで実装後に発覚したはずの構造物クリアランス問題を実装前に潰せた
- **チェイスカメラは「ボールの後ろ」に位置するため、ボールが構造物のすぐそばで急に方向転換すると、カメラは進行方向と逆側、つまり構造物に近づく側に回り込む**。新しいanchor位置を決めるときは、ボール自身の座標だけでなく「カメラがどこに来るか」も逆算して構造物との距離を確認する必要がある
- **「振動する量」と「静止した目標値」を直接lerpで繋ぐのは危険**(lerp係数の変化率×位置差の交差項でジッターが出る)。振動の振幅を先にゼロへ収束させてから、平均的な位置を目標へ寄せる、という2段階の設計にすると滑らかになる
- 静止画のQAだけでなく、数値(カメラ-ボール距離・占有率・NDC)による裏付けがあると、視覚的に気になる現象(太陽グレア等)が「バグ」なのか「許容できる偶然」なのかを冷静に切り分けられる
