# HANDOFF Phase 3-30 — Phase 5-3(ボールリレー前半)実装・マージ完了

**日付:** 2026-07-15
**前回引継ぎ:** `docs/HANDOFF_PHASE3-29.md`
**このセッションのモデル:** Sonnet(全工程。近接歪みの原因調査もSonnetで実測ベースに解決できたためFableへの切替なし)

---

## このセッションでやったこと(時系列)

### 1. セッション開始時の分岐確認

HANDOFF_PHASE3-29のキックオフプロンプトに従い、着手前にユーザーへ2点確認した:

- **Issue #244(ジャンプナビ)の着手タイミング**: 「Phase 7まで待つ」を選択。ボールリレーを最優先で進める判断
- **PRの分割方針**: 「5-3のみ先に実装」を選択。前半(サッカー→バスケ)を先にPR化してQA・レビューの粒度を保ち、後半(バレー→Contact)は別セッションに回すことに

### 2. 実装設計(既存コード調査 → 数値実測 → 実装)

着手前に`CrystalBall.tsx`・`CameraRig.tsx`・`venues.tsx`・`path/`一式を読み、既存の「offsetが唯一の真実」原則とVENUESの単一ソース構造を確認した上で設計した:

- `src/journey/ball/anchors.ts`: リング中心・キャッチ点などの共有ワールド座標。`VENUES`(既存の単一ソース)からの相対オフセットとして定義
- `src/journey/ball/beats.ts` + `beats/dribble.ts` `beats/pass.ts` `beats/freeThrow.ts`: ビート境界(offset u)と軌道計算
- `src/journey/ball/ballPath.ts`: `getBallPose(u) → {position, focusWeight}` のdispatcher
- `CrystalBall.tsx`: 固定positionから`useScroll`+`getBallPose`による自走に変更(CameraRigと同じ自律パターン)
- `CameraRig.tsx`: `focusWeight`でLOOKAT_PATHとボール位置をブレンド(見せ場だけ視線をボールへ寄せる)
- `venues.tsx`: サッカー/バスケの静的ボールメッシュを撤去。バスケのリング座標(`HOOP_GROUP_OFFSET`/`RING_OFFSET`)を`anchors.ts`からインポートする形にリファクタし、フリースローの着弾点とコートの見た目がズレない構造にした

ビート境界のoffset値(DRIBBLE_START/END、CATCH_START/END、RING_U等)は、既存の`SECTION_RANGES`(Phase 5-2で実測済み)から導出できるものはそれを再利用し、新規に必要な値(ドリブル開始地点のz座標、リング通過タイミング)はスクラッチパッドに使い捨てのNode/Vitestスクリプトを書いて`CAMERA_PATH`/`LOOKAT_PATH`を直接サンプリング・二分法で実測した(Phase 5-2のSECTION_RANGES導出と同じ手法)。使い捨てスクリプトはコミットしていない(経緯はコード中のコメントに残した)。

各ビート関数の境界での連続性は、**「前のビートの終端値を次のビートの計算に直接使う」構造**で数値的に保証した(例: `idlePose`は`dribblePosition(0)`をそのまま終端値として使う、`pass`は`dribblePosition(1)`を起点にする、等)。2つの独立した値が「たまたま一致する」ことに頼らない設計。

### 3. テスト設計

Vitestに2種類の一次防衛線を追加(`src/journey/ball/ballPath.test.ts`、35 tests green):

1. **ビート継ぎ目の連続性**: 全境界(HOME_HOLD_END, DRIBBLE_START/END, CATCH_START/END, RING_U, SETTLE_END)で前後の位置差が閾値未満であることを確認。加えて0〜1を500分割してサンプルし、隣接フレーム間の最大移動量が異常でないこともチェック
2. **NDCフレーム内収まり**: `THREE.PerspectiveCamera`を使い、CameraRigと同じロジック(CAMERA_PATH位置+LOOKAT_PATHとボール位置をfocusWeightでブレンドしたlookAt)でボール位置を投影し、`|x|<0.9, |y|<0.85`を見せ場の代表offsetで確認

`pnpm exec tsc -b`・`pnpm build`も実施し、three-coreチャンクは732.61KBのままPhase 5-2から変化なしを確認。

### 4. QA(2巡)で発見・修正したバグ

Sonnetサブエージェントにスクリーンショット撮影+目視レビューを2巡委任した。**両方とも「カメラとボールの距離が近すぎると、わずかな角度ズレがNDC座標で激烈に増幅される」という同根の近接歪みバグ**だった。

#### 4-1. idle→dribble移行中(u≈0.09)に球が画面外へ消失

- **現象**: Home区間の静止位置(z=0)からドリブル開始地点(z=-22)への移行中、u=0.09付近でNDC x=-21.7という極端な値になり、球が完全に見えなくなった
- **原因**: イージングに`easeInOutCubic`(始動が遅い)を使っていたため、序盤でカメラの前進に追い抜かれ、球とカメラがほぼ同じz座標(距離2.98)ですれ違う瞬間ができていた
- **却下した案**: カメラzからの一定リード距離で位置を決める方式(`z = camZ(u) - lead`)。Home開始位置(リードが負=球がカメラよりわずかに手前)からドリブル開始位置(リードが正)への遷移で、理論上必ずリードがゼロを通過するため根本解決にならないと判明
- **採用した解決策**: イージングを`easeOutCubic`(急発進)に変更。序盤で素早くカメラより前方へ抜け出すことで、近接区間を実質的に解消(QAで再現しないことを確認)

#### 4-2. フリースロー終端(u=0.4515、リング通過の瞬間)で過度な接写

- **現象**: カメラ-ボール間距離が2.14まで縮まり、画面のほぼ全面をボールが占有。リングがかろうじて透ける程度になった
- **経緯**: 当初「カメラ経路がRING_CENTERのz座標に到達するu」を二分法で算出(u≈0.46)したが、その時点でカメラがリングとほぼ同じz座標(距離1程度)まで肉薄しており、NDCがフレーム外(|x|=0.98)に吹き飛んだ。次にskillsセクション終端(0.4515、Phase 5-2で「venue近傍の良好な構図」として検証済みのu)を試したが、それでも距離2.14と近すぎた
- **採用した解決策**: セクション終端よりわずかに手前(`skillsRange.end - 0.0065` ≈ 0.445、距離3.3程度)に調整。ダイナミックな接写感を保ちつつリングも視認できる構図になることをQAで確認

#### 4-3. 教訓(次回への申し送り)

NDCの「フレーム内かどうか」テストだけでは「近すぎる」を検出できない(4-2はテスト上は合格していた)。Phase 5-4で新しいビート(fall/receive/setToss/spike)を追加する際は、**両端点の座標だけでなくその時間帯のカメラ実座標を必ず数値で確認する**こと。詳細はObsidian `Decisions/2026-07-15-ball-camera-proximity-design.md`に記録済み。

### 5. QAで見つかった軽微な指摘(未修正・backlogへ)

機能的な破綻ではないため今回は見送り、Obsidian `Projects/portfolio/backlog.md`に記録:

- dribble中のボールがバウンド最下点で地面にやや埋没して見える(Phase 6のContactShadows導入時に見直すと良さそう)
- dribble開始時(offset≈0.13)にPROJECTSカードの見出し文字とボールがやや重なる(カード本体やテキスト可読性は阻害していないため許容範囲と判断)

### 6. PR作成・マージ

`pnpm exec tsc -b`・`pnpm build`・`pnpm exec vitest run`(35 tests green)全て確認後、PR #250を作成し `gh pr merge 250 --squash --delete-branch` でマージ。ローカルブランチは`gh`が自動削除、`git remote prune origin`で追跡ブランチも整理済み。

---

## 確定した判断(却下案含む・再掲)

- **ジャンプナビ(Issue #244)**: Phase 7まで待つ(ユーザー選択)
- **PR分割**: 5-3のみ先に実装(ユーザー選択)。5-4は次セッション
- **idle→dribbleのイージング**: `easeOutCubic`採用。`easeInOutCubic`・カメラ相対リード方式は却下(理由は上記4-1)
- **フリースロー通過タイミング(RING_U)**: `skillsRange.end - 0.0065`採用。「カメラ経路とリングのz一致」「セクション終端そのまま」は却下(理由は上記4-2)
- **maxStepテストの閾値**: 1.5→3.0に緩和。idle→dribbleの意図的な高速遷移(実測ピーク1.84)は設計意図であり、閾値が過度に厳しかったと判断

## 軽微な引き継ぎ・注意事項

- `.wrangler/`・`lighthouse-report*.json`・`test-results/`は今回のセッションでも未追跡のまま(HANDOFF_PHASE3-29から継続。今回のPhase 5-3作業とは無関係、触れていない)
- devサーバーはセッション終了時に停止済み。次セッションで`pnpm dev`が必要
- QAスクリーンショットはセッションscratchpad配下(`qa-phase5-3/`、`round2/`)にあり、OS掃除で消える可能性あり
- (このセッションと無関係の別スレッド)`feature/about-panel-enhancement-#139`ブランチがローカルに残存。PR #141で反映済みと確認済みだが`git branch -D`がツール権限で拒否されたまま。ユーザー操作待ち

## リポジトリ状態(このHANDOFF作成時点)

- `main`ブランチ: PR #250マージ済み
- オープンなIssue: #244(ジャンプナビ・Phase 7待ち確定)、#251(このHANDOFF)
- 未着手の技術的懸念: transit3の構図単調さ(Phase 6-4予定)、dribbleの地面埋没・PROJECTSカード重なり(Phase 6候補、両方backlog記録済み)

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 5-4(ボールリレー後半)着手セッション。

まず docs/HANDOFF_PHASE3-30.md、docs/plans/2026-07-13-phase5-8-experience-expansion.md、
Obsidian Projects/portfolio/backlog.md(タスク・アイデア台帳、冒頭で必ず確認)、
Decisions/2026-07-15-ball-camera-proximity-design.md(前回セッションの技術教訓)を読んで。

【モデル運用】Sonnet始動。機械的実装・検証・PR事務はSonnetのまま。
構図判断・ボールの動きの演出調整など難所だけ/modelでFableに切替え、終わったら戻す。

【今回のスコープ】Phase 5-4(ボールリレー後半): fall(自由落下)→receive(バレーでレシーブ)→
setToss(トス)→spike(アタック)→rest(Contact着地)を`src/journey/ball/beats/`に追加し、
beats.ts/ballPath.tsに配線する。ContactVenue()の表彰台+3ボールを撤去し、
プレースホルダーの円柱台座(旅路のミニチュアジオラマの本実装はPhase 6-5)に置き換える。
anchors.tsのPOST_RING_REST(Phase 5-3のプレースホルダー静止点)は実際のfallビートの
起点として置き換わる想定。詳細設計は計画書のPhase 5-3/5-4節を参照。

【必須の教訓(前回セッションで2回踏んだ罠)】新しいビートの端点座標を決めるときは、
両端点だけでなく「その時間帯にCAMERA_PATHがどこにいるか」を必ず数値で確認してから
決めること。カメラとボールの距離が近すぎる(2〜3ユニット程度)と、わずかな角度ズレが
NDC座標で激烈に増幅される(画面外への吹き飛び/画面占有)。NDCの「フレーム内かどうか」
テストだけでは「近すぎる」を検出できないので、目視QAでも距離感を必ず確認する。
実測にはスクラッチパッドの使い捨てNode/Vitestスクリプト(CAMERA_PATH直接サンプリング+
二分法)が有効(前回セッションの実例あり、コミットはしない)。

【必須マイルストーン】Phase 5-4完了後、transit区間に動きが入った状態で再度ユーザーの
通しスクロール確認を挟む(旅の長さの再判定・Obsidian
Decisions/2026-07-14-journey-length-vs-lempens.md の見直し条件に対応)。

【変更禁止事項】クリスタル球の見た目レシピ、パステル夕景の色支配、Bloomでのグレア対策、
Issue→branch→PR→merge厳守(ドキュメントのみでも例外なし)、pnpm必須。

【Obsidian運用(重要)】タスク・アイデア・リサーチ結果は言われなくてもその場で
Projects/portfolio/backlog.md に追記する。設計判断は却下案つきでDecisions/へ。
セッション終了時は詳細なHANDOFF(この文書と同等の粒度)を必ず作成する。
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-15_scroll-3d-phase5-3-ball-relay-front-half.md`(セッション記録)
- `Decisions/2026-07-15-ball-camera-proximity-design.md`(近接歪みの判断・却下案)
- `Projects/portfolio/backlog.md`(ジャンプナビのPhase7確定・軽微な指摘2件を追記)
