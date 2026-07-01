# スクロール連動ボールジャーニー 設計書

**作成:** 2026-07-01  
**対象フェーズ:** Phase 3-9（Soccer / Basketball / Volleyball スポーツシーン実装）  
**前提PR:** #60（OHZIリアーキテクチャ骨格）マージ済み

---

## 1. アーキテクチャ概要

### 1-1. Canvas配置方針（GlobalCanvas 1本集約方式）

```
App.tsx
├── <GlobalCanvas>  position:fixed, zIndex:0, alpha:false  ← 全3Dコンテンツを集約
│     ├── Crystal（常駐・ルートをまたいで生き続ける）
│     ├── JourneyCameraRig（scrollProgress連動カメラ）
│     ├── JourneyEffects（接触エフェクト群）
│     └── [ルート別3D背景を条件レンダリング]
│           ├── / → HomeBg（CameraRig・波紋シェーダー）
│           ├── /soccer → SoccerBg（芝・ゴール・観客席シルエット）
│           ├── /basketball → BasketballBg（コート床・バックボード・ラインマーキング）
│           └── /volleyball → VolleyballBg（グリッド床・ネット・アンテナ）
├── <GlobalNav>         zIndex: 100
├── <RouteTransition>   zIndex: 500
└── <AppRoutes>  ← HTML UIのみ（3DはGlobalCanvas側で処理）
      ├── / → HomeScene（HEY.テキスト・4グリッドナビ）
      ├── /soccer → SoccerScene（SceneCard・Hotspot）
      ├── /basketball → BasketballScene（SceneCard・Hotspot）
      ├── /volleyball → VolleyballScene（SceneCard・Hotspot）
      └── /contact → ContactScene
```

**全3DコンテンツはGlobalCanvas 1本に集約する。**  
2Canvas構成（GlobalCanvas + BgCanvas）は採用しない。理由：Crystal.tsx の `meshPhysicalMaterial`（transmission）は `alpha:false`・暗背景が必須であり、透明Canvasを上に重ねるとtransmission効果が失われるため。  
背景色（`<color attach="background">`）もルートに応じて切り替える。

**HomeSceneへの影響：** 現行 `Scene.tsx`（HomeScene専用Canvas）内のCrystalを削除し、GlobalCanvasの `HomeBg` コンポーネントに波紋・CameraRigのみ残す。Crystalの所有権はGlobalCanvasに移転。

**Crystalのインタラクションモード：**  
- HomeScene: `mode="interactive"`（ドラッグ回転・クリックorb生成を有効）  
- スポーツシーン: `mode="journey"`（スクロール連動軌道に専念・ドラッグ無効）

### 1-2. ルート遷移時のCrystal連続性

1. Soccerシーン末端：ボールが画面外（右上）へ向かう
2. ボールが画面端に達した瞬間に `RouteTransition` フラッシュ発動
3. フラッシュ中に `useNavigate` でURLを切り替え
4. フラッシュ明けに新シーンのBgCanvasがマウント
5. GlobalCanvas上のCrystalは**フラッシュ中も生き続け**、次シーンの開始位置から動き始める

ボールの画面上XY座標を `location.state` で引き継ぐことで視覚的連続性を演出。

---

## 2. スクロール実装

### 2-1. Lenis再導入方針

- **対象ルート:** `/soccer` `/basketball` `/volleyball` のみ
- **除外ルート:** `/`（HomeScene）と `/contact` は Lenis 不要（スクロールなし）
- 各スポーツシーンのページコンポーネント内で `Lenis` をマウント・アンマウント

```
SoccerScene
  └── useEffect: new Lenis() → rafLoop → destroy on unmount
```

### 2-2. GSAP ScrollTrigger連携

```
scrollProgress: 0 → 1
  ↓
GSAP ScrollTrigger.create({
  trigger: scrollContainer,
  start: "top top",
  end: "bottom bottom",
  onUpdate: (self) => scrollProgressRef.current = self.progress
})
```

`scrollProgressRef.current` を GlobalCanvas の `useFrame` 内で参照し、Crystal の位置・回転・速度を制御する。

### 2-3. ホットスポット付近での自動スロー

ScrollTrigger の `onUpdate` コールバック内で、`scrollProgress` が各ホットスポットの閾値（±0.02）に入ったら Lenis の `velocity` を 0 に収束させる。

```
各シーンのホットスポット閾値（例: Soccer）
  Phase2折り返し1: progress ≈ 0.18
  Phase2折り返し2: progress ≈ 0.32
  Phase2折り返し3: progress ≈ 0.48
  Phase2折り返し4: progress ≈ 0.62
```

スロー中に `SceneCard` をフェードイン。スクロール再開で `SceneCard` がフェードアウトしてボールが動き出す。

---

## 3. ボールジャーニー詳細設計

### 3-1. 全体構成

```
[Soccer 300vh]
  Phase1: ドリブル開始（芝を転がりながら前進）
  Phase2: ジグザグ×4折り返し ← Hotspot×4（Projects）
  Phase3: ゴール前・ロングパスで右上へ高い弧
  末端: NEXT → /basketball（フラッシュ）

[Basketball 250vh]
  Phase1: 左上からボール飛来→キャッチエフェクト
  Phase2: シュートモーション→高い放物線 ← Hotspot×3（Skills）
  Phase3: リング通過→FPV的演出→ボール落下
  末端: NEXT → /volleyball（フラッシュ）

[Volleyball 250vh]
  Phase1: 上から落下→レシーブエフェクト（低弾道）← Hotspot×1（Background）
  Phase2: セッターへのパス→高いトス ← Hotspot×1（Work Style）
  Phase3: スパイク急降下→着地エフェクト ← Hotspot×1（Looking For）
  末端: NEXT → /contact
```

### 3-2. Crystalの軌道計算

各シーンの軌道は `src/data/trajectories/` 以下のデータファイルで管理する。

```ts
// 例: soccer-trajectory.ts
export const SOCCER_WAYPOINTS: Waypoint[] = [
  { progress: 0.00, pos: [-3, 0, 2],   rot: [0, 0, 0],    speed: 1.0 },
  { progress: 0.18, pos: [-1, 0, 0],   rot: [0, 0.3, 0],  speed: 0.0 }, // Hotspot1
  { progress: 0.32, pos: [1,  0, -2],  rot: [0, -0.3, 0], speed: 0.0 }, // Hotspot2
  // ...
  { progress: 0.90, pos: [4,  3, -8],  rot: [0, 0, 0],    speed: 2.0 }, // ロングパス
]
```

`scrollProgress` → ウェイポイント間の線形補間 → Crystal の `position` と `rotation` に適用。  
スピードは回転速度（`Crystal.tsx` の `shellRef.rotation.y`）へのスケールとして使用。

---

## 4. 接触演出（エフェクトのみ）

3Dハンドモデルは使わない。「何かに当たった」瞬間をエフェクトで表現。

### 4-1. 共通エフェクト仕様

| トリガー | エフェクト |
|---|---|
| Soccer折り返し（ジグザグ） | 小さな衝撃波リング（水平）+ 芝が揺れるパーティクル |
| Basketballキャッチ | 大きな衝撃波リング×2同心円 + Bloomスパーク |
| Basketballリング通過 | 縦向き衝撃波リング（リング形状）+ 緑のパーティクルシャワー |
| Volleyballレシーブ | 低い角度の衝撃波エリプス + 青いパーティクル |
| Volleyballスパイク着地 | 下方向への衝撃波 + カメラシェイク（0.3秒） |

エフェクトはすべて `GlobalCanvas` 内の `JourneyEffects` コンポーネントで管理。Three.jsの `RingGeometry` + `MeshStandardMaterial` + `emissiveIntensity` アニメーションで実装。

---

## 5. SceneCard（ohzi.io参考のコンテンツカード）

### 5-1. 既存GlassPanelとの関係

| コンポーネント | 用途 | 方針 |
|---|---|---|
| `GlassPanel` | HomeSceneのプロジェクト詳細（右端スライドイン） | そのまま維持 |
| `SceneCard` （新規） | スポーツシーンのホットスポット表示 | 新規作成 |

### 5-2. SceneCardの仕様

**配置:** 画面下部（左 or 右）。ボールがいる側と**反対側**に出す。  
**スタイル:** ohzi.io準拠

```
┌─────────────────────────────────┐
│  CATEGORY LABEL                 │  ← 小さいUPPERCASEテキスト
│                                 │
│  **太字タイトル（プロジェクト名等）**  │  ← font-size: 1.1rem, font-weight: 800
│                                 │
│  説明テキスト。1〜2行程度。        │  ← font-size: 0.8rem, color: #888
│                                 │
│  [EXPLORE →]          [NEXT ↓]  │  ← アクションボタン
└─────────────────────────────────┘
背景: rgba(10, 10, 20, 0.75), backdrop-filter: blur(12px)
border-radius: 16px
border: none（ボーダーなし）
幅: min(480px, 45vw)
```

**出現アニメーション:**  
- `opacity: 0 → 1`、`translateY(20px) → 0` を 0.4s ease-out
- Lenisが自動スローしたタイミングで発火（ScrollTrigger `onEnter`）
- スクロール再開で `opacity: 0`、`translateY(-10px)` に退場

---

## 6. 背景シーン（BgCanvas）仕様

### 6-1. 輝度方針

**全シーン共通：暗いベース + 色温度のみで差別化。輝度変化による目への負担なし。**

| シーン | 背景色 | アクセント色 |
|---|---|---|
| Soccer | `#050b1a`（深夜ブルー） | `#4fc3f7`（青白い照明） |
| Basketball | `#0d0a02`（暗アンバー） | `#ffb300`（コート灯） |
| Volleyball | `#021a12`（暗ティール） | `#69f0ae`（蛍光サイアン） |

### 6-2. 各シーンのプロップス

**Soccer（SoccerBg.tsx — GlobalCanvas内に条件レンダリング）**
- 芝フロア（`PlaneGeometry 40×40`、`#0d2210`）
- ゴール枠（白・発光、奥 z=-10）
- 観客席シルエット（遠景 z=-25、`BoxGeometry` の群れ、極低輝度 `emissiveIntensity: 0.05`）
- 環境フォグ（`#0a1128`, near:12, far:40）

**Basketball（BasketballBg.tsx）**
- コート床（`PlaneGeometry 20×30`、`#120c00`、木目風 `roughness: 0.6`）
- バックボード + リング（奥 z=-8）
- コートライン3Dマーキング（`LineSegments`、`#2a1800`、ライン幅細め）
- 環境フォグ（`#110900`, near:10, far:35）

**Volleyball（VolleyballBg.tsx）**
- グリッド床（`PlaneGeometry` + `GridHelper`、`#012010`）
- ネット（中央 z=-3）
- アンテナ（ネット左右に赤白ポール）
- 遠景ライン照明（薄いエミッシブ水平ライン × 4本、`#69f0ae` 極低輝度）
- 環境フォグ（`#010f08`, near:8, far:30）

---

## 7. カメラワーク

Crystalはシーン中央付近に常時存在。カメラがCrystalを追従し、**背景がボールの周りを流れる**ように見せる。

| シーン | カメラ基本位置 | 特記 |
|---|---|---|
| Soccer Phase1 | 後方・地面スレスレ（y=-0.2） | ドリブル感 |
| Soccer Phase2 | 後方30°・左右に揺れる | ジグザグに合わせた体重移動 |
| Soccer Phase3 | 引き気味・ゴール枠をフレーム内に | ロングパスの距離感 |
| Basketball Phase1 | 正面・やや見上げ | ボールが迫ってくる迫力 |
| Basketball Phase2 | 後方45°・リングが視野内 | 放物線追従 |
| Basketball Phase3 | ズームイン → 引いてバックボード全体 | リング通過FPV |
| Volleyball Phase1 | 低アングル・上から見下ろし | レシーブの低弾道感 |
| Volleyball Phase2 | 横から・ネット全体を視野内に | トスの高さ |
| Volleyball Phase3 | スパイク方向に追従 | 着地でカメラシェイク |

カメラは `GlobalCanvas` 内の `JourneyCameraRig` コンポーネントが制御。`scrollProgress` + 現在シーン（`useLocation`）でウェイポイントを切り替え。

---

## 8. ルート遷移詳細

### Soccer → Basketball
1. Phase3末端（progress≈0.92）：ロングパス弧でCrystalが右上へ
2. Crystalが画面右端（x > 1.2 NDC）に達した瞬間にフラッシュ発動
3. フラッシュ色：ミッドナイトブルー → アンバー（`#050b1a` → `#ffb300`）
4. URL: `/basketball`、`location.state = { ballEntryX: 'left-top', ballEntryY: 'high' }`
5. フラッシュ明け：Crystalは左上から右下への弧の続きで飛来 → キャッチエフェクト

### Basketball → Volleyball
1. Phase3末端：リング通過後にCrystalが下方へ落下
2. フラッシュ色：アンバー → サイアン（`#ffb300` → `#69f0ae`）
3. URL: `/volleyball`、`location.state = { ballEntryX: 'center', ballEntryY: 'top' }`
4. フラッシュ明け：Crystalが上から落下 → レシーブエフェクト

---

## 9. ファイル構成（新規・変更対象）

```
src/
├── App.tsx                              ← GlobalCanvas追加・Scene.tsx依存除去
├── components/
│   ├── canvas/
│   │   ├── GlobalCanvas.tsx             ← 【新規】全3Dコンテンツのルート（Canvas要素はここのみ）
│   │   ├── JourneyCameraRig.tsx         ← 【新規】scrollProgress連動カメラ
│   │   ├── JourneyEffects.tsx           ← 【新規】接触エフェクト群
│   │   ├── Crystal.tsx                  ← 【変更】mode prop追加（"interactive" | "journey"）
│   │   ├── Scene.tsx → HomeBg.tsx       ← 【改名・変更】Crystal削除・波紋+CameraRigのみ
│   │   ├── soccer/SoccerBg.tsx          ← 【新規/書き換え】Canvas要素なし・groupのみ
│   │   ├── basketball/BasketballBg.tsx  ← 【新規/書き換え】同上
│   │   └── volleyball/VolleyballBg.tsx  ← 【新規/書き換え】同上
│   └── ui/
│       └── SceneCard.tsx                ← 【新規】ohzi.io風コンテンツカード
├── data/
│   └── trajectories/
│       ├── soccer-trajectory.ts         ← 【新規】ウェイポイント定義
│       ├── basketball-trajectory.ts     ← 【新規】
│       └── volleyball-trajectory.ts     ← 【新規】
└── hooks/
    └── useScrollProgress.ts             ← 【新規】Lenis + ScrollTrigger統合フック
```

> **注意:** `Soccer/Basketball/VolleyballBg.tsx` は R3F `<group>` のみで構成し Canvas 要素を含まない。GlobalCanvas 内で `useLocation` を使い現在ルートを判定して条件レンダリングする。

---

## 10. 実装順序（推奨）

1. `GlobalCanvas` + Crystal移植（App.tsxに追加）
2. `useScrollProgress` フック（Lenis再導入）
3. Soccer軌道データ + `JourneyCameraRig` 基本動作確認
4. `SceneCard` コンポーネント
5. Soccer全フェーズ完成
6. Basketball実装
7. Volleyball実装
8. ルート遷移の連続性調整
9. `JourneyEffects`（エフェクト実装）

---

## 決定事項サマリー

| 項目 | 決定内容 |
|---|---|
| Canvas構成 | GlobalCanvas 1本集約（Crystal常駐・ルート別Bgを条件レンダリング） |
| スクロール | GSAP ScrollTrigger + Lenis（スポーツシーンのみ） |
| 接触演出 | エフェクトのみ（3Dモデルなし） |
| コンテンツカード | SceneCard新規作成（ohzi.io参考、下部配置） |
| Soccer背景 | 芝 + ゴール + 観客席シルエット（遠景・極低輝度） |
| Basketball背景 | コート床 + バックボード + コートラインマーキング |
| Volleyball背景 | グリッド床 + ネット + アンテナ + 遠景ライン照明 |
| 輝度方針 | 全シーム暗いベース統一・色温度のみで差別化 |
