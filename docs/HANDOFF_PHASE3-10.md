# HANDOFF Phase 3-10: Ball Journey 軌道・回転・UX 根本修正

**作成日:** 2026-07-02  
**前回:** HANDOFF_PHASE3-9  
**ブランチ:** main（PR #111 マージ済み）

---

## 現在の状態サマリー

Ball Journey（Soccer → Basketball → Volleyball）は基本動作するが、
**以下の根本問題が残っており、感覚的UXが悪い状態**。

---

## 解決済みの問題（本セッション）

| 対処 | PR |
|---|---|
| Catmull-Rom スプライン軌道 | 過去 |
| ホイール1回→次ホットスポット停止方式 | 過去 |
| クリック・キーボードナビゲーション | 過去 |
| 白い波動エフェクト（impact即時発火）| PR #107 |
| バスケットリム座標修正（旧推測→実測値） | PR #111 |
| サッカーフィールド座標修正（観客席→フィールド内）| PR #111 |

---

## 未解決の根本問題（次セッションで対処）

### 1. Crystal 回転が全シーンで同一（最重要）

**ファイル:** `src/components/canvas/Crystal.tsx:153`

```typescript
// 現在: 常にY軸のみ回転・journeySpeedRef は 2.5か0.3の2値のみ
shellRef.current.rotation.y += delta * 0.18 * speed
```

**問題:**
- ドリブル中: ボールは前転（X軸回転）すべきだが Y軸回転のまま
- バスケットシュート: バックスピン（X軸逆回転）が必要だが未実装
- `rotSpeed` ウェイポイント値は `trajectory.ts` に定義されているが **どこにも使われていない**

**修正方針:**
- ウェイポイントから `rotAxis: 'x' | 'y' | 'z'` と `rotSpeed` を使って軸と速度を制御
- または `useScrollProgress` から現在の移動方向ベクトルを計算して回転軸を自動決定

### 2. journeyモードでも浮遊アニメーションが動いている

**ファイル:** `src/components/canvas/Crystal.tsx:144`

```typescript
// 常に動く → 床接地時もY方向に±0.14揺れる → 床めり込み原因
floatRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.65) * 0.14 + bounceY.current
```

**修正方針:**
```typescript
// journey モードでは浮遊を無効化
if (mode !== 'journey') {
  floatRef.current.position.y = Math.sin(...) * 0.14 + bounceY.current
}
```

### 3. シーン入場時にボールが変な位置から出る

**ファイル:** `src/components/canvas/GlobalCanvas.tsx:80-88`

```typescript
// GSAP で [0,0,0] へアニメートしようとするが、
// CrystalJourneyMover が毎フレーム waypoints[0].pos を上書きするため
// ボールは即座に [-12, 12, 6]（basketball の場合）に飛ぶ
useEffect(() => {
  grpRef.current.position.set(ballEntry.x, ballEntry.y, ballEntry.z)
  gsap.to(grpRef.current.position, { x:0, y:0, z:0, ... }) // ← 効かない
}, [ballEntry, isHome])
```

**修正方針:**
- `CrystalJourneyMover` 内で「入場アニメーション中フラグ」を尊重する
- または `scrollProgressRef` をシーン入場時に少し前の値からスタートしてスムーズに接続

### 4. ウェイポイント Y 座標と視覚的床のズレ

| シーン | 視覚床 Y | FLOOR_Y クランプ | 「地面」ウェイポイント Y |
|---|---|---|---|
| Soccer | -1.2 | **0.0** ← まだズレてる | 0.0（1.2u 浮いてる）|
| Basketball | -1.2 | **-1.2**（修正済み）| -1.0 〜 -0.8 ✓ |
| Volleyball | -1.2 | -1.2 ✓ | -1.2 ✓ |

**修正:** Soccer も FLOOR_Y を -1.2 に変更し、Soccer waypoints の Y=0.0 地面 → Y=-1.0 に変更

---

## 3D シーン実座標マップ（次回の設計基準）

### BasketballBg.tsx
```
Floor mesh:   Y = -1.2 (plane at position [0,-1.2,-4])
Backboard:    group position [0, 3.0, -9]
Rim (torus):  relative [0, -0.4, 0.23] → world [0, 2.6, -8.77]
Rim radius:   0.225 ユニット
Court:        X ±10, Z: -14 〜 +6 (plane 20×20 centered at Z=-4)
```

### SoccerBg.tsx
```
Floor mesh:   Y = -1.2 (plane at position [0,-1.2,-10], size 30×40)
Field range:  X ±15, Z: +10 〜 -30
Goal frame:   group position [0, -0.2, -20]
  Left post:  world [-3.66, 1.02, -20]
  Right post: world [3.66, 1.02, -20]
  Crossbar:   world [0, 2.24, -20], width 7.32m = 7.32 units → 1 unit ≈ 1m
Penalty area: 16.5m from goal → edge at Z = -3.5
Center field: Z = -10
Audience:     Z = -28 〜 -32 (建物外、軌道はここに入れない)
```

### VolleyballBg.tsx（未読取・次回確認）
```
Net:   Y=1.0, Z=-3.0（推定、既存 volleyball-trajectory.ts のコメントより）
Floor: Y=-1.2
```

---

## 現在の軌道ファイル状態

### basketball-trajectory.ts（PR #111、実座標対応済み）
```
Catch    [0,  -0.2, 0  ] hotspot 0
Release  [0,   0.5, 0  ] impact
Apex     [2.5, 7.0, -6 ] hotspot 1
Near rim [0,   3.0, -8.5] hotspot 2
Rim      [0,   2.6, -8.8] impact → basket cam
Floor    [0,  -1.0, -8.8]
```

### soccer-trajectory.ts（PR #111、フィールド内に修正済み）
```
Start:  Z=+6  （自陣、ゴールから26m）
Zigzag: Z=-9 〜 -15 （フィールド中盤〜アタッキングサード）
Kick:   Z=-17  （ペナルティエリア内）
Arc:    Z=-21 〜 -32 （ゴール越え）
```
※ Soccer FLOOR_Y は今も 0.0（次回 -1.2 に変更すること）

### volleyball-trajectory.ts（PR #109 の軽微修正のみ、大きな問題なし）

---

## アーキテクチャ概要（変更なし）

```
useScrollProgress        ← ホイール/クリック/キー → GSAP tween
  ↓ scrollProgressRef（module-level ref）
JourneyCameraRig         ← useFrame: pos + camOffset → camera.position/lookAt
CrystalJourneyMover      ← useFrame: pos → grpRef.position（FLOOR_Y クランプ付き）
JourneyEffects           ← useFrame: impactTriggerRef → 波動エフェクト
Crystal                  ← 内部: floatRef, shellRef（回転）
```

**重要:** camera は常に `lookAt(ball)` → リングを「見ながら」撮るためには
ball の後方から ball 越しにリングが見える位置に camera を置くしかない（lookAt を変えるのは大改造）

---

## 次セッションの優先タスク

### Priority 1（最低限の品質）
1. **`Crystal.tsx`: journeyモードで float 無効化**（5分）
   ```typescript
   if (mode !== 'journey') {
     floatRef.current.position.y = Math.sin(...) * 0.14
   }
   ```

2. **`GlobalCanvas.tsx`: Soccer FLOOR_Y 0.0 → -1.2**（1行）
   ```typescript
   '/soccer': -1.2,
   ```

3. **`soccer-trajectory.ts`: 地面 waypoint Y を -1.0 に変更**（全体）

### Priority 2（回転の改善）
4. **`Crystal.tsx`: journey モードの回転軸を移動方向から計算**
   - 移動方向ベクトルの水平成分（XZ）に垂直な軸で X回転を加算
   - バスケットシュートフェーズでは逆回転（バックスピン）
   - `rotSpeed` ウェイポイント値を実際に活用

### Priority 3（シーン入場）
5. **シーン遷移時のボール入場をスムーズに**
   - 入場アニメーション中は `CrystalJourneyMover` を無効化
   - 専用の entry アニメーション（例: 前シーンの最終位置から最初のウェイポイントへ GSAP補間）

---

## 関連ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/components/canvas/Crystal.tsx` | 球体の見た目・回転・浮遊アニメ |
| `src/components/canvas/GlobalCanvas.tsx` | FLOOR_Y クランプ・シーン切り替え |
| `src/components/canvas/JourneyCameraRig.tsx` | カメラ位置・lookAt |
| `src/hooks/useScrollProgress.ts` | スクロール→GSAP連携 |
| `src/data/trajectories/basketball-trajectory.ts` | バスケット軌道 |
| `src/data/trajectories/soccer-trajectory.ts` | サッカー軌道 |
| `src/data/trajectories/volleyball-trajectory.ts` | バレーボール軌道 |
| `src/components/canvas/basketball/BasketballBg.tsx` | バスケ背景（実座標の根拠）|
| `src/components/canvas/soccer/SoccerBg.tsx` | サッカー背景（実座標の根拠）|

---

## このセッションでわかった教訓

1. **シーンファイルを先に読む** - 軌道設計前に必ず `*Bg.tsx` を読んで実座標を確認
2. **Crystal の動作を把握してから軌道を設計する** - floatアニメ・回転軸など内部挙動が軌道の見え方を左右する
3. **Playwright headless は WebGL に非対応** - スクショによる確認には headed モードが必要（または別の方法）
4. **`rotSpeed` ウェイポイント値は現状デッドコード** - 実装する前提で設計されていたが実装されていない
