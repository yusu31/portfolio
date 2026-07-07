# HANDOFF Phase 3-22 — V3 Journey Phase 1 完了・Phase 2 準備

**日付:** 2026-07-07  
**前回引継ぎ:** `docs/HANDOFF_PHASE3-21.md`  
**現在ブランチ:** main（クリーン）  
**PR:** #205（マージ済み）  
**このセッションのモデル:** Sonnet  

---

## このセッションで完了したこと

### Phase 1: 状態機械 + ボール追従カメラ（Issue #204 / PR #205）

**新規ファイル: `src/hooks/useSceneStateMachine.ts`**

| シーン | 状態シーケンス |
|---|---|
| Soccer | dribble_1 → cut_1 → cut_2 → long_pass |
| Basketball | catch_wait → shoot_rise → apex → drop → through |
| Volleyball | receive_wait → receive → toss → spike |

- シーン切替時に自動リセット
- `advance()` を1回呼ぶと次の状態へ進む

**変更ファイル: `src/components/canvas/GlobalCanvas.tsx`**

| 変更箇所 | 内容 |
|---|---|
| `BallFollowCameraRig`（新規） | Journey シーンで `FixedCameraRig` を置き換え。`camera.lerp(ball.pos + CAMERA_OFFSETS[state], 0.06)` + `camera.lookAt(ball)` |
| `CAMERA_OFFSETS` | 14状態分のオフセット定義（HANDOFF_PHASE3-21 設計に準拠） |
| `ClickBallMover` | `onAdvanceState` prop 追加。クリックごとに `advance()` を呼ぶ |
| `CrystalRoot` | `ballPosRef` / `onAdvanceState` を受け取り ClickBallMover へ渡す |
| `GlobalCanvas` | `useSceneStateMachine()` を呼び、`isJourney` フラグでカメラを切り替え |

**動作確認:**
- TypeScript コンパイルエラーなし
- JS ランタイムエラーなし（headless 確認）
- Home / Contact は `FixedCameraRig` のまま変更なし

---

## 現状（Phase 1 終了時点）

```
状態機械 ✅  クリック→advance ✅  カメラ追従 ✅
ボールアニメーション（Phase 2）❌
ボール連続遷移（Phase 3）❌
背景リアリズム（Phase 4）❌
```

---

## 次フェーズ実装計画（Phase 2）

### 目標: ボールアニメーション（状態別回転 + Y座標管理）

| # | 作業 | ファイル |
|---|---|---|
| 5 | `Crystal.tsx` に状態別回転（axis・speed・dir）を追加 | `src/components/canvas/Crystal.tsx` |
| 6 | ドリブル時: 前転（X軸逆回転 speed 2.0） / シュート時: バックスピン（X軸正） | Crystal |
| 7 | ボールY座標の状態別管理（接地 vs 滑空） | Crystal / GlobalCanvas |

### 状態別回転設計（HANDOFF_PHASE3-21 参照）

```typescript
// Crystal.tsx に追加する rotation map（案）
const STATE_ROTATION: Record<JourneyState, { axisX: number; axisZ: number; speed: number }> = {
  dribble_1:  { axisX: -1, axisZ: 0, speed: 2.0 },  // 前転
  cut_1:      { axisX: -1, axisZ: 1, speed: 1.8 },  // 斜め転がり
  cut_2:      { axisX: -1, axisZ: -1, speed: 1.8 }, // 逆斜め
  long_pass:  { axisX: -1, axisZ: 0, speed: 3.0 },  // 高速前転
  shoot_rise: { axisX:  1, axisZ: 0, speed: 1.5 },  // バックスピン
  through:    { axisX:  1, axisZ: 0, speed: 2.5 },  // 高速バックスピン
  spike:      { axisX: -1, axisZ: 0, speed: 4.0 },  // 急降下
  // idle/その他はデフォルト移動ベクトルベース
}
```

### 実装上の注意

- `Crystal.tsx` が `currentState` を受け取る必要がある → `CrystalRoot` 経由で渡す
- `useSceneStateMachine` は GlobalCanvas で1箇所だけ呼ぶ。Crystal にも渡すには props chain か context が必要
- Y座標管理: `long_pass` / `shoot_rise` / `apex` / `drop` / `spike` では Y が変化する → Phase 2 では簡易版（Y固定のまま回転だけ変える）でもよい

---

## 変更しない範囲

- **Home シーン**（Crystal + Aurora + 4ナビグリッド）← 完成品
- **Contact シーン** ← 完成品
- **ローダー**（Lottieサッカーボール）← 変更なし
- **FOVワープ遷移 / フラッシュカラー** ← 変更なし
- **React Router 5ルート** ← 変更なし
- **Bloom ポストプロセッシング** ← 変更なし

---

## 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio の V3 Journey Phase 2 実装セッション（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-22.md を読んで状況を把握して。

【Phase 2 タスク】
1. Crystal.tsx に currentState prop を追加
   - mode='click-drive' のとき、状態別回転（STATE_ROTATION map）を適用
   - 既存の「移動ベクトルベースの転がり」は idle/未定義状態で継続

2. CrystalRoot → Crystal へ currentState を渡す（GlobalCanvas から props chain）

3. 動作確認:
   - dribble_1: 前転（X軸逆 speed 2.0）
   - shoot_rise: バックスピン（X軸正 speed 1.5）
   - through: 高速バックスピン（speed 2.5）

ルール: Issue→branch→PR→merge厳守 / pnpm必須 /
実装前に既存 Crystal.tsx と GlobalCanvas.tsx を必ず読む /
コンテキスト60%で見切り→HANDOFF_PHASE3-23で締め
```
