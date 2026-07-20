# Ball Physics Refactor — ForrestTheWoods方式への移植設計書

**策定日:** 2026-07-20  
**対象:** Phase 5-6（ボール軌道計算のリファクタリング）  
**ステータス:** 設計書（実装前）

---

## Executive Summary

PR-4 で物理エンジン全面導入を試みたが見栄えが劣化。リサーチの結果、ゲーム業界標準は「見た目優先のフェイク物理」であり、既存の sin/cos 設計が実は正解だったことが判明。

**推奨戦略：** 既存の sin/cos 骨格を維持しながら、パラメータを「頂点高さ・開始終了座標」に再構造化し、ForrestTheWoods の `solve_ballistic_arc_lateral` 方式でラップ。これにより：

1. **見た目ベスト（長期 QA で固まった sin/cos パラメータ）を保持**
2. **コード可読性向上**（パラメータが直感的に理解可能）
3. **スケール非依存**（コート 10 倍拡大時も倍率計算のみ）
4. **物理的根拠を付加**（本当の重力加速度を使うが、デザイナー調整可能）

---

## 1. 方針・設計原則

### 1.1 採用理由

| 比較項目 | 既存 sin/cos | PR-4 物理エンジン | **推奨：ForrestTheWoods** |
|--------|-------------|-----------------|----------------------|
| 見た目の一貫性 | 🟢 優秀（長期QA） | 🔴 劣化 | 🟢 既存維持 |
| パラメータの直感性 | 🟢 高（頂点高さ） | 🔴 低（質量・反発係数） | 🟢 高 |
| スケール対応 | 🟡 要素ごと手調整 | 🔴 全面チューニング | 🟢 倍率のみ |
| コード可読性 | 🟡 手計算の弧 | 🔴 複数パラメータの相互依存 | 🟢 数学的に透明 |
| 移植工数 | N/A（既存） | ❌ 実施済み・失敗 | 🟢 中程度（lib_fts移植） |

### 1.2 実装アプローチ

```
既存 sin/cos パラメータ
  ↓ [既存パラメータを新型へ抽出]
「頂点高さ」「飛行時間」「開始終了座標」
  ↓ [ForrestTheWoods で数学的にラップ]
発射速度ベクトル + 必要重力
  ↓ [毎フレーム積分（or 曲線サンプル）]
ボール位置
```

**Key Benefit:** 既存の sin/cos 値がそのまま次フェーズの「ベースライン」になり、修正が最小限。

---

## 2. 既存コード構造の分類

### 2.1 5つのビートパターン

#### パターンA：放物線（pass, freeThrow）

```typescript
const pos = start.clone().lerp(end, t)
pos.y += Math.sin(t * Math.PI) * ARC_HEIGHT
return pos
```

- **既存パラメータ:** ARC_HEIGHT（4.0 for pass, 3.2 for freeThrow）
- **ForrestTheWoods 対応:** `solve_ballistic_arc_lateral`
  - P0: start
  - P1: end
  - h_max: ARC_HEIGHT
  - lateral_speed: (distance) / (time)
  
**変換手順：**
1. 開始終了座標から水平距離を計算
2. ビート所要時間（Δu）からビート時間を逆算
3. 横方向速度 = 水平距離 / ビート時間
4. `solve_ballistic_arc_lateral(P0, lateral_speed, P1, h_max)` を実行
5. 得られた fireVelocity で速度ベクトルを構築

#### パターンB：周期振動（dribble）

```typescript
const bounce = abs(sin(t * π * BOUNCE_CYCLES)) * BOUNCE_HEIGHT
const weave = sin(t * π * WEAVE_CYCLES) * WEAVE_AMPLITUDE
```

- **既存パラメータ:** BOUNCE_CYCLES=9, BOUNCE_HEIGHT=1.3, WEAVE_CYCLES=3.5, WEAVE_AMPLITUDE=3.0
- **ForrestTheWoods 対応:** **部分的（軌道本体 + 振動層）**
  - 基本軌道：線形（Z方向、P0→P1の走行ライン）
  - 振動層：バウンド周期と左右ウィーブを分離して重ね合わせ

**変換手順：**
1. 基本軌道（Z方向の走行）は ForrestTheWoods 不要（単純な時間方向移動）
2. バウンド周期を独立したレイヤーとして保持
3. 左右ウィーブも独立レイヤーとして保持
4. 最終位置 = 線形走行 + バウンドオフセット + ウィーブオフセット

#### パターンC：成分別イージング（fall）

```typescript
const horizontalT = easeOutCubic(t)
const verticalT = easeInCubic(t)
x: lerp(start.x, end.x, horizontalT)
y: lerp(start.y, end.y, verticalT)
z: lerp(start.z, end.z, horizontalT)
```

- **既存パラメータ:** easing関数（easeOutCubic, easeInCubic）
- **ForrestTheWoods 対応:** **カスタムイージング版**
  - 水平軸（x, z）：easeOutCubic で素早く離脱
  - 垂直軸（y）：easeInCubic で自由落下の加速感

**理由：** 無補正だと「リング通過後、水平方向の移動が遅く、カメラと並走して近接歪み（9割占有）が発生」するため、easing を成分別に制御。

#### パターンD：単純イージング補間（receive, setToss, spike, rest）

```typescript
return start.clone().lerp(end, easeOutCubic(t))
```

- **既存パラメータ:** easeOutCubic、start/end座標
- **ForrestTheWoods 対応:** **完全対応**
  - 単純な球面補間 + easing
  - 無視速度計算は不要（キックモーメント → イージング曲線で表現）

---

## 3. パラメータ抽出と対応表

### 3.1 Pass（ロングパス）

```
既存：
  start: dribblePosition(1.0) [DRIBBLE_Z_EXIT付近]
  end: CATCH_POINT
  ARC_HEIGHT: 4.0
  時間: u ∈ [0.202, 0.384] (Δu=0.182)

ForrestTheWoods化：
  P0: start座標（既存と同じ）
  P1: end座標（既存と同じ）
  水平距離: sqrt((end.x - start.x)² + (end.z - start.z)²)
  移動時間: Δu × (total_journey_time) ≈ 0.182 × journey_time
  lateral_speed: 水平距離 / 移動時間
  max_height: start.y + ARC_HEIGHT
  
  → solve_ballistic_arc_lateral(P0, lateral_speed, P1, max_height)
    得られた fireVelocity で毎フレーム積分
```

**見た目ベスト保証:** ARC_HEIGHT=4.0 をそのまま使用。水平速度も既存の直線補間速度から逆算するため、軌跡は既存と一致。

### 3.2 FreeThrow（バスケシュート）

```
既存：
  start: CATCH_POINT
  end: RING_CENTER
  ARC_HEIGHT: 3.2
  時間: u ∈ [0.394, 0.4575] (Δu=0.0635)

ForristTheWoods化：
  P0: CATCH_POINT
  P1: RING_CENTER
  水平距離: sqrt(...)
  lateral_speed: 水平距離 / 移動時間
  max_height: start.y + ARC_HEIGHT
  
  → solve_ballistic_arc_lateral(...)
```

### 3.3 Dribble（ドリブル）

```
既存：
  基本軌道: Z方向線形移動（Z_ENTRY → Z_EXIT）
  バウンス: abs(sin(t·π·9)) × 1.3
  ウィーブ: sin(t·π·3.5) × 3.0
  
ForrestTheWoods化：
  基本軌道は ForrestTheWoods 不要
  バウンス・ウィーブを独立レイヤーとして分離
  
  final_pos = linearTrack(t) + bounceOffset(t) + weaveOffset(t)
  
  ここで：
    linearTrack(t) = Vector3(DRIBBLE_BASE_X, DRIBBLE_GROUND_Y, lerp(Z_ENTRY, Z_EXIT, t))
    bounceOffset(t) = abs(sin(t·π·9)) × 1.3 - 既存値のまま
    weaveOffset(t) = sin(t·π·3.5) × 3.0 - 既存値のまま
```

**理由：** ドリブルは「走行ライン + バウンド + 回避操作」の三層構造。ForrestTheWoods は放物線を逆算するが、ドリブルは周期振動が主体のため、むしろレイヤー構造の方が扱いやすい。

### 3.4 Fall（自由落下）

```
既存：
  水平（x, z）: easeOutCubic
  垂直（y）: easeInCubic
  所要時間: Δu=0.191
  
ForrestTheWoods化：
  成分別イージングを維持（ForrestTheWoods では難しい）
  
  x: lerp(start.x, end.x, easeOutCubic(t))
  y: lerp(start.y, end.y, easeInCubic(t))
  z: lerp(start.z, end.z, easeOutCubic(t))
```

**なぜカスタム？** リング通過直後、カメラから素早く離れる必要があり、水平方向を加速（easeOut）、垂直方向を自然な落下感（easeIn）で表現。ForrestTheWoods の均一な放物線では対応不可。

### 3.5 Receive, SetToss, Spike, Rest

```
すべて同パターン：
  start.clone().lerp(end, easeOutCubic(t))
  
ForrestTheWoods化：
  基本構造は既存のまま
  ただしeaseOutCubic自体を「速度場（velocity field）」として見なすことも可能
  
  → 部分的に ForrestTheWoods の「時間パラメータ」として組み込み可能
```

---

## 4. lib_fts TypeScript移植の実装仕様

### 4.1 対象関数（優先度順）

#### 1️⃣ `solveBallistic(projPos, projSpeed, target, gravity)` — **最重要**
**用途：** 固定ターゲット（フープ）への発射速度を逆算。**業界標準の ForrestTheWoods 方式**
**ユースケース：** freeThrow/spike で「始点 → リング/着地点」の弧を計算

**入出力：**
```typescript
input: {
  projPos: Vector3,        // ボール開始位置
  projSpeed: number,       // 発射速度（スカラー、大きさのみ）
  target: Vector3,         // 目標位置（フープ中心など）
  gravity: number          // 重力加速度（e.g., 9.81 or 20.0）
}
output: {
  valid: boolean,          // 命中可能か（判別式 >= 0）
  s0: Vector3,            // 低角度解（速い弧）
  s1: Vector3,            // 高角度解（swish的な弧）
  numSolutions: number    // 0, 1, or 2
}
```

**アルゴリズムの核（TypeScript版予想コード）:**
```typescript
function solveBallistic(
  projPos: Vector3, projSpeed: number, target: Vector3, gravity: number
): { valid: boolean; s0: Vector3; s1: Vector3 } {
  const diff = target.clone().sub(projPos)
  const diffXZ = new Vector3(diff.x, 0, diff.z)  // 水平面への投影
  const groundDist = diffXZ.magnitude()           // 水平距離 x
  const y = diff.y                               // 高度差 y
  
  // 判別式の計算（これが命中可能性を判定）
  const speed2 = projSpeed * projSpeed
  const speed4 = speed2 * speed2
  const gx = gravity * groundDist
  
  const discriminant = speed4 - gravity * (gravity * groundDist*groundDist + 2*y*speed2)
  
  if (discriminant < 0) {
    return { valid: false, s0: new Vector3(), s1: new Vector3() }  // 到達不可能
  }
  
  const sqrtDisc = Math.sqrt(discriminant)
  
  // 2つの発射角度を計算（atan2 で象限処理も自動化）
  const lowAng  = Math.atan2(speed2 - sqrtDisc, gx)
  const highAng = Math.atan2(speed2 + sqrtDisc, gx)
  
  // 水平方向の正規化（発射方向を確定）
  const groundDir = diffXZ.normalize()
  
  // 発射速度ベクトルを構築（大きさ = projSpeed になるよう cos/sin で配分）
  const s0 = groundDir
    .clone()
    .multiplyScalar(Math.cos(lowAng) * projSpeed)
    .add(new Vector3(0, Math.sin(lowAng) * projSpeed, 0))
    
  const s1 = groundDir
    .clone()
    .multiplyScalar(Math.cos(highAng) * projSpeed)
    .add(new Vector3(0, Math.sin(highAng) * projSpeed, 0))
  
  return { valid: true, s0, s1, numSolutions: (lowAng === highAng) ? 1 : 2 }
}
```

**見た目への影響：**
- 低角度解（s0）：速くて水平的な弧（カメラ前進と並走しやすい）
- 高角度解（s1）：遅くて高い弧（「swish」的な映像的に気持ちいい）
- **既存 ARC_HEIGHT と互換性保証：** 発射角度を選んだあと、`gravity` と `projSpeed` を調整することで、既存の `ARC_HEIGHT = start.y + 3.2` の見た目と一致させられる

#### 2️⃣ `solveBallisticArcLateral(projPos, lateralSpeed, targetPos, maxHeight)`
**用途：** 横速度と頂点高さを指定して、発射速度と必要重力を逆算
**ユースケース：** pass で「見た目の頂点」を先に決めて、そこに達する軌道を自動計算

---

### 4.2 既存との互換性を保証する計算戦略

**ユーザーの既存実装（sin/cos ベース）:**
```typescript
// 既存のpass
export function passPosition(start: Vector3, end: Vector3, t: number): Vector3 {
  const pos = start.clone().lerp(end, t)
  pos.y += Math.sin(t * Math.PI) * 4.0  // ARC_HEIGHT = 4.0
  return pos
}
```

**ForrestTheWoods化のステップ：**

**Step A: 事前計算（初回のみ、またはビート開始時）**
```typescript
// pass ビート開始時に1度だけ実行
const fireVel = solveBallistic(
  start,
  projSpeed,        // 既存: lerp速度から逆算 = distance / delta_time
  end,
  gravity           // 既存: 9.81 or カスタム値（逆算で既存ARC_HEIGHTと一致させる）
)

// 戻ってきた s0, s1 から「見た目がいい方」（通常は高角度解 s1）を選択
```

**Step B: 毎フレーム積分**
```typescript
export function passPosition(start: Vector3, end: Vector3, t: number): Vector3 {
  const elapsedTime = t * beatDuration  // ビート所要時間
  const pos = start.clone()
  const vel = fireVel.clone()  // 事前計算した速度ベクトル
  
  // 標準的な物理統合（Euler法、短時間のため十分な精度）
  pos.add(vel.clone().multiplyScalar(elapsedTime))
  pos.y -= 0.5 * gravity * elapsedTime * elapsedTime
  
  return pos
}
```

**見た目ベスト保証の鍵：**
- `gravity` の値を調整することで、既存の `ARC_HEIGHT` と同じ軌跡を再現可能
- 例: `gravity = 20.0` で既存の `Math.sin(t * π) * 4.0` と視覚的に一致するよう逆算

---

### 4.3 テストケース（実装前の検証計画）

#### Case 1: 命中可能なケース（判別式 > 0）
```typescript
const result = solveBallistic(
  new Vector3(0, 1, 0),    // 発射位置
  20,                       // 発射速度
  new Vector3(10, 5, 0),   // ターゲット
  9.81                     // 重力
)
// 期待値: valid = true, numSolutions = 2（低角・高角の2解）
// 検証: s0, s1 の大きさが両方とも 20 であることを確認
```

#### Case 2: 臨界（判別式 = 0）
```typescript
// 到達ギリギリの条件でも正確に1解を返すことを確認
```

#### Case 3: 到達不可能（判別式 < 0）
```typescript
const result = solveBallistic(
  new Vector3(0, 0, 0),
  5,                        // 速度不足
  new Vector3(100, 50, 0),  // 遠すぎる
  9.81
)
// 期待値: valid = false（着地不可能と正しく判定）
```

#### Case 4: 既存パラメータとの見た目一致検証
```typescript
// 既存の passPosition(start, end, 0.5) と
// 新しい solveBallistic版 passPosition(start, end, 0.5) を
// 視覚的に同じ位置になるまで gravity を調整
```

---

### 4.4 パフォーマンス検討

**計算コスト：**
- 事前計算（ビート開始時）: `sqrt()` 1回 + `atan2()` 2回 = 低コスト
- 毎フレーム: スカラー乗算・加算のみ = 非常に軽量

**既存の sin ベース vs ForrestTheWoods:**
```
既存: Math.sin(t * π * CYCLES) × AMPLITUDE  [毎フレーム計算]
新: 発射速度ベクトル固定 + 重力積分        [毎フレーム計算は同じ、ただし式がシンプル]
```

**最適化オプション（必要に応じて）：**
- ビート中に `fireVelocity` をキャッシュ（事前計算結果を再利用）
- 複数ボール同時発射時は事前計算を共有

---

### 4.5 Ammo.js 教訓の適用（万が一のために）

**もし物理エンジン部分導入を後で検討する場合の罠：**

```javascript
// ❌ 避けるべき: applyForce() は軌道が不安定
body.applyForce(initialForce, body.getWorldPoint(...))

// ✅ 正解: setLinearVelocity() で速度を直接設定
body.setLinearVelocity(fireVelocity)  // solveBallistic() の結果をそのまま使える
```

**理由：** `applyForce()` は加速度ベースで、フレームレート・物理ステップ・衝突の有無などが影響して、軌道が安定しない。`setLinearVelocity()` なら速度を直接制御でき、ForrestTheWoods の計算結果と完全に一致する。

---

## 5. コート 10 倍拡大への対応

### 5.1 スケール非依存設計

**現在の問題：** コート 3 倍拡大時、以下のパラメータを個別に調整した：
- VENUES 座標の再導出
- VENUE_SCALE による大きさ調整
- カメラ-ボール間距離の重新チェック

**ForrestTheWoods での解決：**

```typescript
// Phase 5-5 の相対パラメータ（実測値）から導出
const parametersByVenue = {
  projects: {
    court_size: { width: 39.9, height: 28.5 },  // 実測値（3倍化済み）
    dribble_lane_x: 8.0,  // コート相対（スケール不変）
    pass_arc_height_factor: 0.1,  // 相対値（コート幅の何%）
  },
  // ...
}

// 新しいスケールへの適応
const newCourtSize = baseCourtSize * newScale
const newLaneX = dribble_lane_x * (newCourtSize.width / baseCourtSize.width)
```

**Key Idea:** アンカー座標を「絶対値」ではなく「コート寸法に対する相対比率」で再パラメータ化。

---

## 6. 実装計画（タイムライン）

### Phase 6-1: lib_fts 多項式求解器の TS 移植
- [ ] solveQuadric（2次方程式）
- [ ] solveCubic（3次方程式）
- [ ] solveQuartic（4次方程式）
- [ ] ユニットテスト（既知の根を検証）

**工数:** 3〜4 時間

### Phase 6-2: solveBallisticArcLateral 実装
- [ ] 基本実装
- [ ] 座標系変換テスト
- [ ] 既存パラメータ（ARC_HEIGHT）との互換性確認
- [ ] Pass / FreeThrow での実装・検証

**工数:** 2〜3 時間

### Phase 6-3: Dribble の層構造化
- [ ] 基本軌道 + バウンス + ウィーブの分離
- [ ] 既存パラメータの抽出・確認
- [ ] 視覚 QA

**工数:** 1〜2 時間

### Phase 6-4: Fall のカスタムイージング
- [ ] 成分別イージングの保持
- [ ] 見た目検証

**工数:** 1 時間

### Phase 6-5: 全体統合テスト
- [ ] ユーザー通しスクロール確認
- [ ] 既存との見た目比較
- [ ] パフォーマンステスト

**工数:** 2 時間

**合計工数:** 9〜13 時間（セッション 1〜2 で完了可能）

---

## 7. リスク・制約

### 7.1 既存との見た目一致を保証する条件

| 項目 | 条件 |
|------|------|
| **ARC_HEIGHT の値** | そのまま使用（4.0 for pass, 3.2 for freeThrow） |
| **水平速度の計算** | 既存の直線補間速度 = 水平距離 / ビート時間 |
| **重力定数** | 9.81（物理的）、または既存sin値から逆算した等価値 |
| **開始終了座標** | anchors.ts の座標をそのまま使用 |

### 7.2 エッジケース

1. **Pass / FreeThrow の頂点が開始地点より低い場合**
   - ARC_HEIGHT を絶対値ではなく相対高さとして処理
   - Receive など：`max_height = start.y + height_increment`

2. **Dribble の周期振動がサンプリングノイズを起こす**
   - Bezier曲線でスムージング（オプション）
   - または既存の sin/cos パラメータをそのまま保持

3. **Fall のカメラ-ボール近接距離**
   - 成分別イージングで対応済み
   - ForrestTheWoods では均一な放物線のため、このケースは除外

### 7.3 精度要件

- **多項式求解:** double精度（Graphics Gems 標準）
- **ベクトル演算:** 単位精度（float）で十分
- **時間積分:** Euler法（十分な精度、ビート時間が短いため）

---

## 8. 検証チェックリスト（実装後）

- [ ] lib_fts 移植版が既知の根を正確に返す
- [ ] Pass の軌跡が既存 sin弧と視覚的に一致
- [ ] FreeThrow がリング通過する
- [ ] Dribble のバウンス周期が既存と一致
- [ ] Fall でカメラ-ボール距離が 4u 以上を保つ
- [ ] Receive → SetToss → Spike で連続的に見える
- [ ] ユーザー通しスクロールで「旅」のリズムが既存と同じ
- [ ] パフォーマンステスト（毎フレーム計算 vs 事前計算）

---

## 9. 参考リソース

- **lib_fts:** https://github.com/forrestthewoods/lib_fts
  - 参照実装：C#版 `fts_ballistic_trajectory.cs`
  - ブログ解説：https://www.forrestthewoods.com/blog/solving_ballistic_trajectories/

- **Graphics Gems I**
  - 多項式求解アルゴリズム（Sturm定理、Cardano公式など）

- **業界標準：Fake Physics**
  - Klishin, A. "Fake video game physics"
  - GDC Vault: "Math for Game Programmers: Building a Better Jump"

- **Three.js Curves**
  - https://threejs.org/docs/#api/en/extras/curves/QuadraticBezierCurve3
  - （参考のみ：今回は ForrestTheWoods で実装）

---

## 10. 今後のオプション（Phase 7 以降）

1. **移動目標対応**
   - `solve_ballistic_arc(target_velocity)` の実装
   - 将来的なダイナミックな敵キャラ追加時

2. **複数軌道の選択**
   - `solveBallistic` で「低角度 vs 高角度」の2解
   - ゲーム的なバリエーション追加

3. **衝突・バウンド**
   - 物理エンジン（Cannon-es）への段階的統合
   - ただし今フェーズでは「見た目ベスト」の軌道をまず完成させる

---

## 11. 実装結果（2026-07-20 追記・最終）

### 採用した最終形: 閉形式の放物線バンプ（キャッシュ不要）

lib_fts の `solve_ballistic_arc_lateral` を正規化時間で解き直すと、
「始点a → 中間時刻で頂点b → 終点c を通る等重力放物線」は

```
bump(t) = 4 * H * t * (1 - t)   （H = 頂点の持ち上げ量）
```

という**純関数の閉形式**に潰れる（導出: g=4(2b−a−c)/T², vy=(4b−3a−c)/T を
y(t)=a+vy·t−0.5g·t² に代入して整理）。実装は sin(πt)·H をこの式に置き換えるだけ。

- 頂点・端点は sin弧と完全一致（差は最大5.6%・H=4.0で約0.22u）
- t=1 で bump=0 が構造的に保証される → リング通過判定が厳密
- sin弧は端点で垂直加速度0（ふわっと浮く）、放物線は全区間で一定の重力感

### 却下した中間案: ランタイムキャッシュ + ビート遷移検出（lastU方式）

実装して7テスト落ちた。却下理由:
1. `getBallPose()` は「offsetが唯一の真実」の**純関数**という設計原則に反する
   （module状態lastUは逆スクロール・任意サンプリングで壊れる）
2. 発射速度の事前計算では「飛行時間T」と「ビートのu区間」の整合が取れず、
   t=1で終点に一致しない（CATCH_START境界で4.3uの不連続が実測された）
3. 閉形式が存在する以上、状態管理は複雑さの純増

### 修正した移植バグ

`solveBallisticArcLateral` の初版は g=9.81 固定で移植していたが、lib_fts 原典は
**重力も未知数として解く**（だから終点を厳密に通る）。原典の数式に修正し、
「頂点と終点を厳密に通る」テストを追加済み。

### 成果物

- `src/journey/ball/physics/ballistic-trajectory.ts` — lib_fts移植（solveQuadric/Cubic/Quartic + solveBallistic + solveBallisticArcLateral）
- `src/journey/ball/physics/ballistic-trajectory.test.ts` — 17テスト
- `beats/pass.ts` / `beats/freeThrow.ts` — 閉形式放物線化（純関数のまま）
- 全102テスト green・tsc/build green

### 今後の展開（このモジュールを使う場面）

- fall のバウンド演出（Phase 6以降）: `solveBallistic` の2解選択が活きる
- 移動ターゲット対応: solveQuartic は実装済み（未使用）

## 承認・署名

- **策定者:** Claude（設計レビュー: Fable 5 / 初期実装: Sonnet 5）
- **ステータス:** ✅ 実装完了（2026-07-20）
