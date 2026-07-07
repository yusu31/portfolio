# HANDOFF Phase 3-21 — V3 Journey インタラクション全面再建 設計確定

**日付:** 2026-07-07  
**前回引継ぎ:** `docs/HANDOFF_PHASE3-20.md`  
**現在ブランチ:** main（クリーン）  
**このセッションのモデル:** Sonnet  

---

## このセッションで判明したこと（重大）

ブラウザ実機確認でインタラクション設計の根本的ズレを発見。

### 問題の根本原因

**Phase 3-13（PR #145）で何が消えたか：**

| 失われたもの | 理由 |
|---|---|
| スポーツごとの軌道（Soccer ドリブル・Basketball シュート弧・Volleyball スパイク） | `src/data/trajectories/` を全削除 |
| カメラがボールを追う体験 | 固定カメラ（シーン別）に変更 |
| 3D空間を前進する感覚（OHZI的体験） | スクロール連動を廃止 |
| ボールの連続性（シーン間で消えない） | 設計が失われた |

Fable5 セッション（Phase3-15〜17）は視覚改善に特化しており、コアアーキテクチャは変えていない。
「きれいに動くが意図と違う」状態が Phase3-13 から継続していた。

---

## 確定した V3 設計

### コアコンセプト

```
「何をするか」 → シーンが決める（スポーツシーケンス）
「どこでするか」 → プレイヤーが決める（クリック位置）
「カメラ」     → 常にボールを追う
「ボール」     → 全シーンを通じて消えない・連続する
```

### インタラクション仕様（完全確定）

**Soccer（4クリック）:**
```
Click 1: dribble_1  — クリック位置へドリブル（前転・X軸逆回転 speed 2.0）
Click 2: cut_1      — 斜めに切り返してドリブル
Click 3: cut_2      — また切り返してドリブル
Click 4: long_pass  — ゴール上部めがけてロングパス弧 → Basketball へ
```

**Basketball（4クリック）:**
```
入場:    catch_wait  — Soccer弧の続きで飛来 → クリック待機
Click 1: shoot_rise  — シュートモーション → 放物線上昇中（バックスピン）
Click 2: apex        — 放物線最高点
Click 3: drop        — リングめがけて落下 → リング目前
Click 4: through     — リング通過確実 → 下落 → Volleyball へ
```

**Volleyball（3クリック）:**
```
入場:    receive_wait — Basketball から落下継続 → クリック待機
Click 1: receive      — レシーブ（アンダーパス）
Click 2: toss         — トス（高い垂直弧）
Click 3: spike        — スパイク（相手コートへ急降下）→ Contact へ
```

### カメラ設計（ボール追従）

```typescript
// GlobalCanvas.tsx で毎フレーム実行
const targetCamPos = ball.position.clone().add(new THREE.Vector3(...CAMERA_OFFSETS[currentState]))
camera.position.lerp(targetCamPos, 0.06)
camera.lookAt(ball.position)
```

状態別オフセット（抜粋）:
```typescript
const CAMERA_OFFSETS = {
  dribble_1:  [0,  2.5,  5.0],  // 後方低め・地面スレスレ
  long_pass:  [0,  4.0,  8.0],  // 引き気味・ゴール全体
  shoot_rise: [-2, 3.0,  6.0],  // 斜め後方45°
  through:    [0,  0.5,  2.0],  // タイトな真後ろ・劇的
  spike:      [2,  5.0,  3.0],  // 上から斜め・急降下追従
}
```

### ボール連続性（遷移設計）

```
Soccer Click 4: ボールが長い放物線弧を開始
  → フラッシュ（ミッドナイトブルー→アンバー）
  → SoccerBg消 / BasketballBg現
  → ボールは弧を継続（Crystalは消えない）
  → Basketball catch_wait 位置に到達

Basketball Click 4: ボールがリングを通過して落下
  → フラッシュ（アンバー→サイアン）
  → BasketballBg消 / VolleyballBg現
  → ボールは落下継続
  → Volleyball receive_wait 位置に到達
```

### 背景リアリズム（ohzi.io基準）

**原則: ボールの光以外はネオンなし**

| 要素 | V3方針 |
|---|---|
| コート/フィールド素材 | roughness 0.85・非発光・PBR感 |
| 照明 | SpotLight 4点・シャドウあり・コントラスト強 |
| ゴール/リム/ネット | emissive 0.15以下・非ネオン |
| 大気 | FogExp2 + 遠景シルエット観客席 |
| ボールのみ | オレンジEmissive OK（主役） |

Soccer 追加: 観客シルエット（遠景BoxGeometry・フォグ溶け）・ナイター投光器4本  
Basketball 追加: パーケット床素材・バックボード+リム+ネット改修・天井ライト  
Volleyball 修正: ネット白帯emissive削減・浮遊する緑線を削除  

---

## 実装計画（次セッション以降）

### Phase 1（最優先・次セッション）: 状態機械 + カメラ

**目標:** クリックするたびに状態が進み、カメラがボールを追う

| # | 作業 | ファイル |
|---|---|---|
| 1 | `useSceneStateMachine.ts` 新規作成 | `src/hooks/` |
| 2 | `GlobalCanvas.tsx` カメラシステム書き換え（固定→追従） | 既存 |
| 3 | クリックハンドラ → 状態advance + 位置制約適用 | GlobalCanvas 内 |
| 4 | 各シーンページ（Soccer/Basketball/Volleyball）に状態機械を接続 | 既存pages |

**終了条件:** 4クリックでSoccerが進み、カメラがボールを追う

### Phase 2（2セッション目）: ボールアニメーション

| # | 作業 | ファイル |
|---|---|---|
| 5 | `Crystal.tsx` に状態別回転（axis・speed・dir）を追加 | 既存 |
| 6 | ドリブル時: 前転（X軸逆）/ シュート時: バックスピン（X軸正） | Crystal |
| 7 | ボールY座標の状態別管理（接地 vs 滑空） | Crystal / GlobalCanvas |

### Phase 3（3セッション目）: ボール連続遷移

| # | 作業 | ファイル |
|---|---|---|
| 8 | Soccer→Basketball: ロングパス弧が体育館へ継続 | GlobalCanvas |
| 9 | Basketball→Volleyball: リング通過落下がコートへ継続 | GlobalCanvas |
| 10 | 遷移中のフラッシュタイミングとボール位置の同期 | useSceneTransition |

### Phase 4（4セッション目）: 背景リアリズム

| # | 作業 | ファイル |
|---|---|---|
| 11 | Soccer: SpotLight 4本追加・観客シルエット | SoccerBg |
| 12 | Basketball: パーケット素材・バックボード改修 | BasketballBg |
| 13 | Volleyball: ネット白帯修正・浮遊線削除 | VolleyballBg |

---

## 変更しない範囲

- **Home シーン**（Crystal + Aurora + 4ナビグリッド）← 完成品
- **Contact シーン** ← 完成品
- **ローダー**（Lottieサッカーボール）← 変更なし
- **FOVワープ遷移 / フラッシュカラー** ← 変更なし（拡張のみ）
- **React Router 5ルート** ← 変更なし
- **Bloom ポストプロセッシング** ← 変更なし
- **Soccer コートマーキング**（Phase3-15）← 照明追加のみ
- **Basketball コートマーキング**（Phase3-15）← 素材調整のみ

---

## 関連Obsidianノート

- 設計書: `Projects/portfolio/2026-07-07_journey-v3-architecture.md`
- 記事素材: `Projects/portfolio/article-drafts/2026-07-07_portfolio-v3-journey-rebuild.md`
- OHZI参考: `Projects/portfolio-ohzi-reference.md`

---

## 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio の V3 Journey 実装セッション（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-21.md を読んで状況を把握して。

【Phase 1 タスク】
1. src/hooks/useSceneStateMachine.ts を新規作成
   - Soccer: 4状態（dribble_1 / cut_1 / cut_2 / long_pass）
   - Basketball: 4状態（catch_wait / shoot_rise / apex / drop / through）
   - Volleyball: 3状態（receive_wait / receive / toss / spike）
   - onCanvasClick(worldPos) で状態advance + 位置制約適用

2. GlobalCanvas.tsx のカメラをボール追従に変更
   - camera.position.lerp(ball.pos + CAMERA_OFFSETS[state], 0.06)
   - camera.lookAt(ball.position)
   - CAMERA_OFFSETS は HANDOFF_PHASE3-21.md の設計を参照

3. 動作確認: 4クリックでSoccerが進み、カメラがボールを追うこと

ルール: Issue→branch→PR→merge厳守 / pnpm必須 /
実装前に既存GlobalCanvas.tsxとCrystal.tsxを必ず読む /
コンテキスト60%で見切り→HANDOFF_PHASE3-22とロードマップ更新で終了
```
