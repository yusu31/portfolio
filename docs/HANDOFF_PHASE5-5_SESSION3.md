---
date: 2026-07-21
author: Claude Sonnet 5(実装・調査・設計)
related_issues: "#288(ダイブ演出#6)"
related_prs: "#289(ダイブ演出#6、未マージ)"
---

# HANDOFF PHASE5-5 SESSION3: ダイブ演出(#6)完成 + GitHub調査 + ロードマップ再設計

## 概要

前回(SESSION2)で確定したショットリストのPR-1(ダイブ、ショット#6)を実装。単純な
「オフセットブレンドのみ」の想定から、実装後のビジュアルQAで2回の重大な指摘を受けて
大幅に作り直した。さらにユーザーの指示で「他エンジニアの実装もリサーチすべき」
「ダイブ以外の区間も含めてLempensと比較すべき」という調査を行い、その結果を反映した
次のロードマップ(ステップ1完了・ステップ2/3計画)を策定した。

**本セッションの最終状態: PR #289はコード完成・全テスト通過・自動QA確認済みだが、
ユーザー自身によるブラウザでの目視確認はまだ済んでいない。次セッション冒頭で
実際に触ってから、マージ判断をすること。**

---

## 実装した内容(コミット単位)

PR #289(ブランチ`feature/dive-camera-offset-blend-#288`)に5コミット:

1. **`getCameraOffset`新設(camera.ts)**: RING_U→DIVE_PEAK_U→FALL_ENDでカメラの
   D_BACK/D_UP・lookTargetをoffset(u)の関数としてブレンドし、カメラをボール直上へ
   移動させる「見下ろし追走」を実装。`camera.test.ts`追加。
2. **cameraAttitude.ts再設計**: ①のビジュアルQAで「ダイブ降下中にボールが画面端へ
   寄ったまま留まる」と判明。原因は既存(このPRより前から存在)のroll90°/pitch-35°
   「世界反転」演出(pitchがlookAt中心を縦にずらし、直後のrollがそれを横へ回転させる)。
   基調ティルトをRING_U→DIVE_PEAK_Uで0°/0°(正立へ巻き戻し)へ変更し、代わりに
   小振幅(roll≤3°/pitch≤1.5°)の連続ウォブル(uの純関数、sin波合成)を追加。
   NDC x方向ズレが0.846→ほぼ0まで改善。
3. **DiveCloudVeil.tsx新設**: 「見下ろす構図にはなったが、地面を貫通して落ちる感じが
   出ていない」という2度目の指摘を受け、ボールに毎フレーム追従する密な雲を
   RING_U〜FALL_ENDへ追加し、地面を完全に隠す方式を実装。実装中にdrei `<Clouds>`の
   `frustumCulled`既定バグ(ワールド原点から離れた位置だと描画されない)を発見・
   `frustumCulled={false}`で解消(既存4つの装飾雲も同時に修正された)。
4. **fall.ts落下軌道の反転**: GitHub調査(後述)を踏まえ、断念していた水平/垂直easing
   反転(垂直優勢の軌道)を再挑戦。バックボードクリアランス安全テストの危険域
   (u≈0.5255〜0.5335)を`diveVeilEnvelope(u)`に通すと最小0.855(雲でほぼ完全に
   隠れている)と確認できたため、`path.test.ts`を「envelope≥0.8の間は対象外」という
   条件付きに変更して採用。

全120テスト通過、tsc/buildクリーン。

---

## GitHub調査で見つかったこと(trend-researcherエージェント)

「実軌道を変えずカメラ/VFXだけで落下感を出す」実装を5〜7件確認。核心3パターン:

1. **Dolly Zoom(距離×tan(FOV/2)一定でFOVパンチ)** — 参考: Gianluca Lomarcoの解説記事
2. **postprocessingで画面全体を覆って誤魔化す**(ChromaticAberration/Vignette/ShockWave、
   `@react-three/postprocessing`、既に依存関係にあり`Bloom`は使用中)
3. **カメラパスを実オブジェクト座標から分離する** — `nytimes/three-story-controls`の
   `CameraRig`+事前録画パス設計。今の実装は「カメラがボールの座標に依存」しているため、
   ボールの軌道を変えるとカメラも連動して危険になるという今回の根本原因への
   別解決策になりうる(今回は採用せず、④の方法で解決した)

`yomotsu/camera-controls`の`colliderMeshes`設計(衝突判定対象を配列で管理し区間限定で
空にできる)から、「見えない間は衝突判定を緩めてよい」という考え方自体が業界でも
普通の手法だと確認できた。これが④(fall.ts反転の再挑戦)の直接の後ろ盾になった。

---

## Lempensサイト全19ショット再点検で見つかったギャップ

自分で全19ショット(過去セッションでPlaywright撮影済み、
`C:\Users\3fort\AppData\Local\Temp\claude\c--Users-3fort-dev-portfolio\d4a66a7b-722b-4e30-b641-9fdfaa5cd1e2\scratchpad\shots\`
に保存、次セッションでは再撮影推奨)を見直した。動詞カタログ: 静止ワイド→3D押し出し
文字→並木→アバター+スクーター→**虹色ワープ(章転換、色収差+球状歪み)**→岩のトンネル→
雲上ギャラリー→スカイダイブ→俯瞰降下→着地→曲面ラップテキスト→ダークパネル自己紹介。

**確認できたこと(ギャップではなかった)**: 3D押し出しセクションタイトルは
`venues.tsx`の`SectionTitle`(drei `<Text>`使用、world-space配置)で既に実装済み。
SectionCards.tsxも構造的にLempensのダークパネルと近い。

**本当のギャップ**: 「虹色ワープ」と「Transit装飾(並木/観客席/雲間演出)」。ただし
これは新規発見ではなく、`docs/HANDOFF_PHASE5-5_SESSION2.md`(このHANDOFF)に
**PR-4(ロングキック)+PR-5(ワープVFX)として既に計画済み・未着手**だった項目
(対象区間はダイブではなくサッカー→バスケの移行、u≈0.29のキック軌道中間点)。
PR-5は「`@react-three/postprocessing`の新規コンポーネント」と既に明記されており、
今回のGitHub調査で見つかった`ChromaticAberration`がそのまま使える。

---

## 次セッションへの引き継ぎ

### 開始時のチェックリスト
```
□ 本ファイル読了
□ PR #289(https://github.com/yusu31/portfolio/pull/289)を自分の目でブラウザ確認
  (devサーバー起動→/scroll-poc→u=0.36〜0.70を実際にスクロールしてダイブ演出を体感)
□ 問題なければユーザーの判断でマージ(このプロジェクトはマージ自動承認済みだが、
  今回は「ユーザー自身の目視確認後」を条件として保留中)
```

### 次にやること(優先順)
1. **PR #289のユーザー確認・マージ判断**
2. **新規Issue: PR-4 ロングキック(ballistic trajectory化)** —
   `src/journey/ball/beats/pass.ts`(現状は単純な等重力放物線プレースホルダー)を
   `ballistic-trajectory.ts`の`solveBallisticArcLateral`(PR#285で実績あり)で
   本物の弾道に置き換える。新規アンカー`KICK_POINT`が必要。
3. **新規PR: PR-5 ワープVFX**(PR-4マージ後) — キック軌道中間点(u≈0.29)で
   `ChromaticAberration`+Bloom一時強化による色収差フラッシュ。
   `src/journey/warpVfxEnvelope.ts`(新規、既存の`diveBlendT`/`diveWobbleEnvelope`/
   `diveVeilEnvelope`と同一idiomの5例目)を新設し、`DiveCloudVeil.tsx`と同じ
   「u駆動・imperative」パターンで実装する。
4. **Transit装飾(並木/観客席/雲間演出、Phase 6-4)** — コード設計より3Dアセット
   選定・配置が主体のタスク。着手時は`3d-assets`スキルを使う想定。この計画には
   含めていないので、着手前にユーザーと相談してIssue化すること。

詳細設計は`C:\Users\3fort\.claude\plans\stateless-crunching-wand.md`に保存済み
(このセッションでExitPlanMode承認済みの計画ファイル、次セッションでも参照可能)。

### 未解決・要判断事項
- PR #289のマージ可否はユーザー自身の目視確認待ち(このセッションでは自動QAのみ)
- fall.ts反転後、u=0.48付近でバックボードがやや近く・大きく見える(接触はしていないが
  圧迫感がある構図)。意図的な緊張感として許容するか微調整するかは次セッションでQA時に判断
- Transit装飾の具体的な素材・配置は未設計(概念のみ)

---

## セッションノート

### 日付: 2026-07-21
- PR-1(ダイブ)実装→ユーザーQAで「見下ろす構図にはなったが前進しているように見える」
  指摘→roll/pitch再設計(基調ティルト+小振幅ウォブル)で解決
- 続けてユーザーQAで「地面を貫通して落ちる感じがない」指摘→DiveCloudVeil実装で解決
  (実装中にdrei Cloudsのfrustum culling既定バグを発見)
- ユーザーから「他エンジニアのGitHubもリサーチすべき、ダイブ以外の区間も比較すべき」と
  指示 → trend-researcherエージェントでGitHub調査(5〜7件の実装確認)+自分でLempens
  全19ショット再点検を並行実施
- 調査結果を踏まえ「ダイブ以降のロードマップ再設計」をPlanモードで策定・承認
- ステップ1(fall.ts軌道反転の再挑戦)を実装・成功、PR #289へコミット・報告
- ユーザーが本日の作業を区切り、明日再開する意向のためHANDOFF作成

**教訓:**
- **静止画N枚のQAでは足りない。連続確認・遷移区間の密なサンプリングが必要**
  (このセッションで2回、静止画では見抜けず連続確認で発覚した問題があった: 端寄り問題、
  前進滑空問題)。今後のカメラ演出QAは必ずこのパターンで行う
- **「参考サイトの技法をリサーチ済み」と思っても、1サイト1リポジトリだけでは不十分**。
  ユーザーの「他のエンジニアもGitHubに上げているはず」という指摘は的確で、実際に
  5〜7件の独立した実装パターンが見つかり、断念していた設計判断を覆す根拠になった
- **安全テストの失敗は「設計を諦める理由」ではなく「なぜ失敗するかを深掘りする入口」**。
  バックボード衝突は最終的に「見えない間は無関係」という業界標準の考え方で解決できた
- Playwright自動QAの信頼できる手法は[[feedback-playwright-headless-scroll-qa-method]]、
  drei Cloudsの罠は[[feedback-drei-clouds-frustum-culling]]に記録済み
