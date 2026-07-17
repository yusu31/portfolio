# HANDOFF Phase 3-33 — Phase 5-5設計確定 + PR1(ローリング回転)実装・マージ完了

**日付:** 2026-07-17
**前回引継ぎ:** `docs/HANDOFF_PHASE3-32.md`
**このセッションのモデル:** Fable 5(会話本体・設計委任先とも。ユーザーが/modelで切替)

---

## このセッションでやったこと(時系列)

### 1. Phase 5-5の設計(brainstorming続き→Fable 5 Planエージェント委任)

前セッション(HANDOFF_PHASE3-32)で方針確認済みだったPhase 5-5(コート3倍拡大+ボール動線複雑化)の詳細設計を、Fable 5のPlanエージェントに委任して作成した。エージェントは全関連ファイル(sections.ts/transit.ts/全beats/ballPath.ts等)を事実確認し、**提案経路をnode評価でシミュレーション**(NDCサンプル16点全pass・最小カメラ-ボール距離4.34・画面占有率最大0.76)してから設計をまとめた。

途中、Anthropicサーバーの529 Overloadedで2回中断したが、SendMessageで同一エージェントに再開指示することで調査済みコンテキストを引き継いで完走した(この再開手順は有効だと実証された)。

### 2. 設計の骨子(ユーザー承認済み)

- **タッチライン際カメラ構図**: 各コートの近い側のサイドラインを道の中心線(x=0)に一致させる。カメラは引かない(ユーザー明言「ボールが見てる視点でいい」)。カメラのwiggle(±1.9)がそのまま「サイドライン内側すれすれの並走」になる
- 新VENUES: projects(-13.5,0,-40) / skills(10.5,0,-105) / about(-10.5,0,-170) / contact(0,0,-245)。経路全長約200→253.5、PAGES 21→27目安(実測確定)
- **Contactプラザは1x据え置き**(ユーザーがAskUserQuestionで明示承認): ゲートくぐり体感とQA済み構図の保護を優先
- **ローリング回転はuの純関数テーブル方式**: 初期化時にu=0→1(2048分割)の累積回転quaternionを事前計算。スクラブ逆再生で逆回転が自動成立、リロード/HMRで向き再現
- PR分割: ①ローリング回転 → ②世界3倍化(原子的) → ③動線パラメータ

設計書は `docs/plans/2026-07-17-phase5-5-court-expansion.md` としてPR #260でマージ済み(Issue #259)。**全ての具体値(制御点座標・アンカー新値・テスト閾値・§5の再導出手順)はこの設計書が唯一の正典**。

### 3. PR1: 進行連動ローリング回転の実装(PR #262マージ済み・Issue #261)

- `src/journey/ball/roll.ts` 新規: 累積回転テーブル+`getBallRollQuaternion(u)`+`getHorizontalSpeed(u)`。水平移動成分のみが転がりを生む(垂直バウンドで回転しない)
- `CrystalBall.tsx`: 定速Y軸スピン(0.18 rad/s)をローリングに置換。静止区間(home hold/contact rest)は水平速度ゲート(smoothstep 10〜60ユニット/u)でアイドルスピンを温存。回転は外殻shellのみ、材質・発光パルス不変
- `roll.test.ts` 新規7テスト: 純関数性・クランプ・静止区間(回転ゼロ+速度ゼロ)・転がり方向(前転、期待軸との内積>0.9)・滑らない転がりの角度整合(±10%)・継ぎ目連続性(1000サンプル、上限1.0 rad)
- 検証: tsc/build(three-core 732.61kB不変)/vitest 57全green/Playwrightスモーク(スクロール4点、コンソールエラーなし、外殻の向きがoffsetで変化することをスクリーンショット確認)

### 4. 実装中に得た教訓

- **quaternionの決定性検証はangleToではなくコンポーネント一致で行う**: `angleTo`は内部のacosにより、完全に同一のquaternion同士でも浮動小数点ノイズ(≈3e-7)が出る。`toBe`によるコンポーネント一致か`equals()`を使う
- PlaywrightでViteのdevサーバーに繋ぐときは`waitUntil: 'networkidle'`が不安定(タイムアウトすることがある)。`'load'`+固定待機が安定
- drei ScrollControlsのスクロールコンテナは「スクロール可能量が最大のdiv」を実行時に探すのが確実

---

## 確定した判断(却下案含む・再掲)

設計書§8に完全版があるため要点のみ:

- `<group scale={3}>`一括スケール却下(描画イプシロンが地面下に沈む・単一ソース計算が監査不能)
- ヴェニュー座標据え置き却下(フープ支柱が道のド真ん中x≈-0.6に出現、実測)
- フレーム間差分によるローリング積分却下(HMRで向き非再現・純関数テスト不能)
- WEAVE_AMPLITUDEのVENUE_SCALE連動却下(NDC制約で決まるフレーミング値であり結合させない)
- 目標PAGES/距離の先行決定却下(距離は結果指標というユーザー方針)

## 軽微な引き継ぎ・注意事項

- ローリングの「見え方の質」(高速ビートでのストロボ感)は未確認。ROLL_GAIN(roll.ts、現1.0)を0.6〜0.8へ下げる調整余地をPR3に残してある
- `beats.ts`の定数名は変えない(カメラ姿勢反転演出のplan `C:\Users\3fort\.claude\plans\typed-snuggling-wirth.md` がu境界名に依存)
- `.wrangler/`・`lighthouse-report*.json`・`test-results/`は未追跡のまま(従来から継続・無関係)
- devサーバーはセッション終了時に停止済み

## リポジトリ状態(このHANDOFF作成時点)

- `main`: PR #260(設計書)・PR #262(ローリング回転)マージ済み、クリーン
- オープンなIssue: #244(ジャンプナビ・Phase 7待ち)
- Phase 5-5の残り: PR2(世界の3倍化)・PR3(動線パラメータ)。完了後にユーザー通しスクロール→カメラ姿勢反転演出へ

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験。Phase 5-5(コート3倍拡大+ボール動線複雑化)
の設計確定済み(docs/plans/2026-07-17-phase5-5-court-expansion.md=唯一の正典)、
PR1(ローリング回転、PR #262)マージ済み。

まず docs/HANDOFF_PHASE3-33.md と設計書 docs/plans/2026-07-17-phase5-5-court-expansion.md、
Obsidian Projects/portfolio/backlog.md を読んで。

【今回のスコープ】PR2(世界の3倍化+経路・セクション再導出)を実装する。
- 実装前に必ずスクラッチパッドの使い捨てスクリプトで新経路を実測(設計書§5の手順)
- 対象: path/venues.ts(VENUE_SCALE/COURT_SIZES/新座標)/venues.tsx(3倍+接地補正0.8)/
  ball/anchors.ts/path/curves.ts(新制御点・PATH_END_OFFSET≈0.9933・PAGES=27)/
  path/transit.ts/path/sections.ts/ball/beats.ts(実測系定数のみ・定数名不変)/
  ScrollJourneyPoc.tsx(Ground [70,330]@z=-100・ORBS・雲)/path.test.ts(AABBテスト置換・
  構造物クリアランス新規)/ballPath.test.ts(ステップ閾値4.0・占有率テスト全域化)
- venues/curves/sections/anchors/beatsは相互拘束が強いため原子的に1PRで(分割禁止が設計判断)
- QA: tsc/build/vitest→Playwright offset直指定スクリーンショット→Sonnetサブエージェント2巡
- PR2マージ後、余裕があればPR3(dribble BOUNCE_CYCLES 9/BOUNCE_HEIGHT 1.3/WEAVE 3.5・3.0、
  pass ARC_HEIGHT 4.0、freeThrow ARC_HEIGHT 3.2)

【変更禁止事項】クリスタル球の材質レシピ、パステル夕景の色支配、Bloomでのグレア対策、
Issue→branch→PR→merge厳守(ドキュメントのみでも例外なし)、pnpm必須、物理エンジン不導入、
beats.tsの定数名変更禁止。

【Obsidian運用(重要)】タスク・アイデア・リサーチは言われなくてもその場で
Projects/portfolio/backlog.md に追記。設計判断は却下案つきでDecisions/へ
(トップレベルのSecondBrain/Decisions/直下)。セッション終了時は詳細なHANDOFFを必ず作成。
```
