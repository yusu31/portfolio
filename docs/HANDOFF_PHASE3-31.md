# HANDOFF Phase 3-31 — Phase 5-4(ボールリレー後半)実装・マージ完了

**日付:** 2026-07-15
**前回引継ぎ:** `docs/HANDOFF_PHASE3-30.md`
**このセッションのモデル:** Sonnet(機械的実装・検証・PR事務)+ Fable(ビート設計・演出調整の難所のみ、ユーザー承認の上で切替)

---

## このセッションでやったこと(時系列)

### 1. セッション開始時の確認

キックオフプロンプトに従い、HANDOFF_PHASE3-30・計画書・Obsidian backlog・Decisions(近接歪み設計判断)を読み込んだ上で着手。fall〜restの5ビートの境界offset・端点座標・軌道(演出の核心部分)を設計する段階で、運用ルール通りユーザーにFableへの切替を確認し、承認を得た。

### 2. 実測(既存パターン踏襲)

Phase 5-3と同じ手法(スクラッチパッドの使い捨てNode/Vitestスクリプトで`CAMERA_PATH`/`LOOKAT_PATH`を直接サンプリング)で、u=0.4〜1.0の範囲のカメラ実座標を確認してから設計に着手した。

- about区間(u=0.619〜0.699)はカメラz=-113.25〜-129.61付近を通過
- transit3(about→contact)はu=0.699〜0.95、カメラz=-129〜-181付近
- contact到達はu=0.96でz=-181、u=1.0でz=-187.30に静止(PATH_END_OFFSET=0.9915でクランプ)

### 3. 実装

- `anchors.ts`: `FALL_LANDING`(落下着地点)・`RECEIVE_PEAK`(レシーブ頂点)・`TOSS_PEAK`(トス頂点)・`SPIKE_LANDING`(スパイク着地)・`CONTACT_REST_OFFSET`/`CONTACT_REST`(最終静止点)を追加。Phase 5-3のプレースホルダー(`POST_RING_REST`・`settlePose`)を置き換え
- `beats/fall.ts` `receive.ts` `setToss.ts` `spike.ts` `rest.ts`: 各ビートの軌道関数。共有イージング(`beats/easing.ts`)を新設
- `beats.ts`: `FALL_END`/`RECEIVE_END`/`TOSS_END`(aboutセクション終了と一致)/`SPIKE_END`/`REST_END`(`PATH_END_OFFSET`と一致)を追加
- `ballPath.ts`: `getBallPose`のdispatchをRING_U以降まで拡張し、offset全区間(idle→rest)が完成
- `venues.tsx`: `ContactVenue()`の表彰台+3ボールを撤去し円柱台座に置き換え(ミニチュアジオラマ本体はPhase 6-5)。`VolleyVenue`の静的バレーボールも撤去(Soccer/Basketと同じ対称性)

### 4. テスト設計

`ballPath.test.ts`に前半分と同じ3系統のテストを拡張(全50 tests green):

1. ビート継ぎ目の連続性(新境界5つを追加)
2. 見せ場でのNDCフレーム内収まり(新規サンプル9点を追加)
3. **新規**: カメラ-ボール間距離が2ユニット未満にならないこと(Phase 5-3の教訓を数値テスト化)
4. **新規**: カメラから見た球の見かけの角度サイズが視野角の90%を超えないこと(下記5-1参照。距離だけでは検出できない「画面占有率」の回帰を防止する一次防衛線)

### 5. QA(Sonnetサブエージェント2巡)で発見・修正したバグ

#### 5-1. u=0.48でボールが画面の9割以上を占有(新種の近接歪み)

- **現象**: fall序盤、カメラ-ボール距離は4.89あり従来の「距離2〜3が危険域」というテストは通過していたが、球の見た目半径(1.5、他venueの静的ボール0.28〜0.32よりずっと大きい)により、見かけの角度サイズが視野角の94%に達し画面のほぼ全面を占有した
- **教訓**: 「カメラ-対象間の距離」だけでは対象の見た目のサイズを考慮できない。半径が大きい対象では、距離が十分でも画面占有率が過大になりうる。距離テストに加え、見かけの角度サイズ(`2*atan(radius/distance)`)のテストを新設した
- **採用した解決策**: fallの水平方向(x,z)の移動をeaseOutCubicに変更(Phase 5-3のidle→dribble遷移と同じ「序盤で素早くカメラを引き離す」パターン)。鉛直(y)はeaseInCubicのまま(自由落下の加速感を維持)

#### 5-2. u=0.698でNDCが大きく破綻(|x|=1.91)

- **原因**: `TOSS_PEAK`を当初about venue中心付近(z相対+1)に置いたが、`TOSS_END`(u=0.699、about区間終了と一致させた境界)の時点でカメラは既にz≈-129まで進んでおり、venue中心(z=-128)基準では視線の後方(カメラより手前)になっていた
- **採用した解決策**: `TOSS_PEAK`のz相対オフセットを-6まで奥へ寄せ、カメラより十分前方になるようにした

#### 5-3. u=0.914で距離1.24まで近接

- **原因**: spikeの軌道(TOSS_PEAK→SPIKE_LANDING、about→contact間56ユニットの長距離移動)にeaseInCubicを使ったところ、序盤の低速区間でカメラの前進とほぼ同じペースになり、途中でカメラとほぼ並走してしまった
- **採用した解決策**: イージングをeaseOutCubic(打撃の初速が最大でその後減速)に変更。バレーのスパイクは叩いた瞬間が最速という物理的な説得力もある

#### 5-4. u=0.6で球の下半分が地面に埋没

- **原因**: `FALL_LANDING.y=0.1`が、球の見た目半径(1.5)に対して低すぎた。Phase 5-3のdribbleでも同種の埋没があったが、あちらは「バウンド最下点」を一瞬通過するだけだったため許容範囲だった。receiveの開始点は「低い姿勢」を静的に見せる点であるため埋没がより目立った
- **採用した解決策**: `FALL_LANDING.y`を0.55に引き上げ

#### 5-5. u=0.93以降、フィニッシュゲート支柱・画面中央固定のContactカードとの重なり/完全遮蔽

- **原因**: `SPIKE_LANDING`・`CONTACT_REST_OFFSET`を当初Contact中央(x=0付近)に置いた。しかし`ContactVenue()`の既存コメントに「終端カメラの正面は中央固定のContactカードが占めるため、カードに隠れない右サイドに置く」という制約が旧表彰台の設計として既に記録されていた。これを見落とし、中央に着地点を設計してしまった
- **採用した解決策**: `SPIKE_LANDING`・`CONTACT_REST_OFFSET`を旧表彰台と同じ右サイド(x=1.6)へシフト。QA2巡目で、ContactCardに隠れる問題は解消し、ゲート支柱との重なりも「完全に覆う」状態から「部分的な重なり」まで改善したことを確認(完全解消ではないが、ゲートをくぐる演出上許容範囲と判断)

#### 5-6. 円柱台座が球にほぼ埋もれて見えない

- **原因**: 台座(半径1.1〜1.3、高さ0.4)が、乗る球の見た目半径(1.5)に対して小さすぎた
- **採用した解決策**: 半径2.0〜2.3、高さ1.2に拡大。`CONTACT_REST_OFFSET.y`も0.05→1.0に引き上げ、台座上面に球が乗っているように見せた

### 6. 残存する軽微な指摘(未修正・backlogへ)

Phase 5-3の前例(PROJECTSカードとの重なり)と同種のレベルのため、今回は見送りbacklog記録:

- about区間(u≈0.645〜0.68)でネット支柱・ABOUT見出し文字と球がわずかに重なる
- u≈0.87〜0.93でフィニッシュゲート右支柱と球がわずかに重なる(ゲートをくぐる演出上、ある程度は自然)

### 7. PR作成・マージ

`pnpm exec tsc -b`・`pnpm build`(three-coreチャンク732.61KBのままPhase 5-3から変化なし)・`pnpm exec vitest run`(50 tests green)全て確認後、PR #254を作成し `gh pr merge 254 --squash --delete-branch` でマージ。Issue #253は自動クローズ。ローカルブランチ削除・`git remote prune origin`済み。

---

## 確定した判断(却下案含む・再掲)

- **fall水平方向のイージング**: easeOutCubic採用。線形は却下(理由は上記5-1)
- **TOSS_PEAKの位置**: venue中心付近(z相対+1)は却下、z相対-6(カメラより前方)を採用(理由は上記5-2)
- **spikeのイージング**: easeOutCubic採用。easeInCubic(打撃後加速)は却下(理由は上記5-3)
- **FALL_LANDINGの高さ**: y=0.55採用。y=0.1は却下(埋没、理由は上記5-4)
- **Contact着地点の位置**: 旧表彰台と同じ右サイド(x=1.6)採用。中央(x=0)は却下(ゲート・ContactCardとの重なり、理由は上記5-5)
- **台座サイズ**: 半径2.0〜2.3・高さ1.2採用。半径1.1〜1.3・高さ0.4は却下(球に埋もれる、理由は上記5-6)
- **画面占有率テストの閾値**: 0.9採用。0.7は却下(Phase 5-3で意図的に選ばれたfreeThrow終盤の接写(実測0.94〜0.98)を偽陽性として拾ってしまうため)。テスト範囲もRING_U以降(Phase 5-4新規区間)に限定し、Phase 5-3の既存演出を保護した

## 軽微な引き継ぎ・注意事項

- `.wrangler/`・`lighthouse-report*.json`・`test-results/`は今回のセッションでも未追跡のまま(前回から継続、今回の作業とは無関係)
- devサーバーはセッション終了時に停止済み。次セッションで`pnpm dev`が必要
- QAスクリーンショットはセッションscratchpad配下(`qa-phase5-4/round1/`, `round2/`)にあり、OS掃除で消える可能性あり

## リポジトリ状態(このHANDOFF作成時点)

- `main`ブランチ: PR #254マージ済み
- オープンなIssue: #244(ジャンプナビ・Phase 7待ち確定)
- 未着手の技術的懸念(いずれもbacklog記録済み・軽微):
  - transit3の構図単調さ(Phase 6-4予定)
  - dribble地面埋没・PROJECTSカード重なり(Phase 6候補)
  - about区間のネット支柱・見出し重なり、ゲート支柱との部分重なり(今回新規発見)

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験。Phase 5-4(ボールリレー後半)実装・
マージ完了(PR #254)。ボールリレー全区間(idle→dribble→pass→catch→freeThrow→
fall→receive→setToss→spike→rest)がストーリーボード通り完成した。

まず docs/HANDOFF_PHASE3-31.md、docs/plans/2026-07-13-phase5-8-experience-expansion.md、
Obsidian Projects/portfolio/backlog.md(タスク・アイデア台帳、冒頭で必ず確認)を読んで。

【必須マイルストーン】pnpm devでdevサーバーを起動し、ユーザー本人による通しスクロール
確認を実施する(旅の長さの再判定。Obsidian
Decisions/2026-07-14-journey-length-vs-lempens.md の見直し条件に対応)。
この確認結果次第で、Phase 6着手前に経路長やビートのタイミング調整が必要になる
可能性がある。

【今回のスコープ】ユーザーの通しスクロール確認結果を踏まえ、
(a) 調整が必要ならその対応、(b) 問題なければPhase 6(アセットリッチ化)の
候補表提示(3d-assetsスキルの規約に従う。着手前にユーザー承認必須)に進むか、
ユーザーと相談して決める。

【変更禁止事項】クリスタル球の見た目レシピ、パステル夕景の色支配、Bloomでの
グレア対策、Issue→branch→PR→merge厳守(ドキュメントのみでも例外なし)、pnpm必須。

【Obsidian運用(重要)】タスク・アイデア・リサーチ結果は言われなくてもその場で
Projects/portfolio/backlog.md に追記する。設計判断は却下案つきでDecisions/へ。
セッション終了時は詳細なHANDOFF(この文書と同等の粒度)を必ず作成する。
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-15_scroll-3d-phase5-4-ball-relay-back-half.md`(セッション記録)
- `Projects/portfolio/Decisions/2026-07-15-ball-camera-proximity-design.md`に近接歪みの新規パターン(画面占有率)を追記
- `Projects/portfolio/backlog.md`(残存する軽微な指摘2件・画面占有率テストの知見を追記)
