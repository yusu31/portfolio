# 引き継ぎプロンプト — Phase 3-8（ローダー実装）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-06-26）

Phase 3-7 の PR #36 がマージ済み。**現在 `main` ブランチで作業開始できる状態。**

**リポジトリ:** `c:\Users\3fort\dev\portfolio`  
**現在のブランチ:** `main`（クリーン）  
**本番:** Cloudflare Pages（main push で自動デプロイ）

---

## 完了済みフェーズ

| フェーズ | 内容 | PR |
|---|---|---|
| 3-1 | Vite + React + TypeScript + R3F + Tailwind セットアップ | #26 |
| 3-2 | UIレイヤー全セクション移植 | #28 |
| 3-3/3-4 | React 19、ダークテーマ、サッカーボール風クリスタル | #30 |
| 3-5 | Bloom 統合・カットクリスタル確定・スクロールアウト | #32 |
| 3-6 | グラウンドグロー（波紋シェーダー）+ クリックオービット | #34 |
| 3-7 | Canvas全画面化・ohzi.io風Hero・Crystal物理インタラクション | #36 |

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Effects.tsx で稼働中）
GSAP 3.15 + ScrollTrigger + SplitText
Lenis 1.3
Tailwind CSS v4
Three.js 0.184
```

---

## 現在のアーキテクチャ（Phase 3-7 確定版）

### Canvas（App.tsx）
```tsx
<Canvas
  style={{
    position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100vh', zIndex: 0,
    // maskImage は削除済み（全画面なので不要）
  }}
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]}
>
```

### Hero レイアウト（Hero.tsx）
- **フルスクリーンオーバーレイ**：glassmorphism カード廃止
- 左上：バッジ + HEY. + サブコピー（paddingLeft: clamp(3rem, 7vw, 6rem)）
- 下部中央：EXPLORE ボタン（角丸アウトライン、ホバーで白塗り）
- EXPLORE クリック → `explore-click` イベント発火 → クリスタル横移動 + スクロール

### Crystal（Crystal.tsx）
```
外殻: IcosahedronGeometry(1.5, 2) + flatShading=true（サッカーボール多角形面）
マテリアル: MeshPhysicalMaterial color="#ffe8cc" transmission=0.70 clearcoat=1.0
内部コア: オレンジ球(r=0.80, emissiveIntensity=2.2) + 白熱点(r=0.22, emissiveIntensity=6)
```

**インタラクション（Phase 3-7で追加）:**
- **ドラッグで転がす**: window.pointermove で慣性回転（DAMPING 0.93, ohzi.io調査値）
- **クリックでバウンス**: バネ物理（重力9、反発係数40%）
- **Orbが中心から浮き出る**: easeOutCubic 1.4秒で軌道半径まで展開
- **最大10個のOrb**: 1クリックで2〜3個ずつ増える（大中小混在 size 0.05〜0.15）

### Scene.tsx
- `CrystalContainer`: EXPLORE クリック時に右移動（x=5）+ スケールダウンで退場
- `GroundRipple`: 波紋シェーダー（circleGeometry r=3.5、3波重ね合わせ）
- クリスタルグループ: `position={[0, -0.4, 0]}`（テキストと分離）

### CameraRig.tsx
```tsx
const targetY = -(scrollY.current / window.innerHeight) * 4.8
camera.position.y += (targetY - camera.position.y) * 0.15
```
スクロールでクリスタルが上に退場（Hero65%スクロール時点で完全退場）

---

## 既知の注意点

1. **`alpha: false` 必須**: transmission が暗背景を必要とする
2. **楕円防止**: Crystal の x/z 座標はずらさない（y=-0.4 はOK）
3. **Lenis**: `main.tsx` のモジュールレベル（`autoRaf: false`）。移動しない
4. **LF警告**: Windows CRLF変換警告は無視してよい

---

## Phase 3-8 でやること：ローダー実装

現在 `src/components/ui/Loader.tsx` が存在するが中身は未実装（またはプレースホルダー）。

### 実装方針
```
1. 初回ロード時に全画面を覆うローダーを表示
2. Three.js アセット（Environment, Geometry）のロードが完了したら
3. フェードアウトしてメインコンテンツを表示
4. ローダー中にプログレスバーまたはアニメーションを表示
```

### 技術的アプローチ
- R3F の `useProgress` フック（`@react-three/drei`）でロード進捗を取得
- GSAP でフェードアウトアニメーション
- ローダーのデザイン：オレンジ発光のシンプルなアニメーション（クリスタルのブランドカラーに合わせる）

```tsx
import { useProgress } from '@react-three/drei'

function Loader() {
  const { progress, active } = useProgress()
  // progress: 0〜100
  // active: ロード中は true
}
```

---

## セッション開始チェックリスト

1. `git log --oneline -3` → 最新が Phase 3-7 のコミットであることを確認
2. `docs/HANDOFF_PHASE3-8.md` を読む（このファイル）
3. `src/components/ui/Loader.tsx` の現状を確認
4. Issue 作成 → ブランチ作成 → 実装

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| 3-8 | ローダー実装 | **← 次にやる** |
| 3-9 | 統合テスト・最適化・Cloudflare デプロイ | 未着手 |
