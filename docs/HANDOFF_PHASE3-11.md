# HANDOFF Phase 3-11 — Gemini連携・視覚品質改善・パフォーマンス修正

**日付:** 2026-07-04  
**前回引継ぎ:** `docs/HANDOFF_PHASE3-10.md`  
**現在ブランチ:** main（全PR マージ済み）

---

## このセッションで完了したこと

### PR #123 — FOVワープ遷移・非対称構図・DOMブラー
- `src/hooks/useSceneTransition.ts` 新規作成（`fovRef` / `warpNavigate` / `warpIn`）
- `warpNavigate()`: FOV 60→92 膨張 + DOM blur後にルート切替
- `warpIn()`: 新シーンmount時にFOV収束 + blur解除
- Basketball camOffset X を1.7倍に拡大（ohzi.io的非対称構図）
- SoccerScene / BasketballScene / VolleyballScene に `data-scene-ui` 属性付与

### PR #125 — FogExp2・FloatingParticles・パララックス微調整
- `THREE.FogExp2` をシーン別密度で追加
- `FloatingParticles.tsx` 新規（後にパフォーマンス理由で無効化）
- マウスパララックス係数縮小（後に完全除去）
- Basketball非対称構図さらに拡大

### PR #127 — フラッシュワープ・Glassmorphism・Soccer地面
- `data-warp-flash` オーバーレイでシーン遷移のカット感を光で隠蔽
- SceneCard / GlassPanel: `rgba(255,255,255,0.08)` + `backdrop-filter` ガラス化
- SoccerBg: Drei `<Grid>` でピッチディテール追加、既存線形fog除去

### PR #129 — Single Canvas化（後に撤退）・フラッシュカラー強化・フォント
- `warpNavigate(navigate, flashColor)` に行き先カラー引数追加
  - Soccer→Basketball: `#ff8c00`（アンバー）
  - Basketball→Volleyball: `#69f0ae`（ティール）
- Glassmorphism強化: box-shadow / text-shadow / `letterSpacing: -0.02em`
- `Plus Jakarta Sans` フォントを SceneCard に明示適用
- Single Canvas化（全Bg常駐）→ **PR #131で撤退**

### PR #131 — 緊急パフォーマンス修正（現在のmain）
- **JourneyCameraRig: マウスパララックス完全除去**
  - 理由: カメラ位置 + lookAt + 背景の3軸同時移動で酔いやすかった
  - カメラはwaypoint専従に変更
- GlobalCanvas: 条件レンダリングに復元（Single Canvas撤退）
- FloatingParticles: 一時無効化

---

## 現在の技術スタック

```
React 19 + Vite 6 + R3F v9 + Tailwind v4
GSAP (warpNavigate/warpIn)
Three.js FogExp2, MeshReflectorMaterial, SpotLight with shadows
```

---

## 現在の状態と既知の問題

### 解決済み
- Crystal journey モードのフローティング停止
- Soccer床のY座標修正
- バスケットスピン（rotSpeed負値）
- isEnteringRef による入場アニメーション競合
- FOVワープ遷移（expo.in/out）
- Glassmorphism UI

### 未解決 / 今後の課題

#### 優先度 高
1. **波動のタイミング・位置の不自然さ** — ボール軌道のスプライン補間が自然でない部分がある
2. **参考サイト(ohzi.io)との差** — カメラ固定・ボール自由移動・マウスで背景わずかに動く構造への完全移行
   - 現在は「カメラがwaypointを追う」構造
   - 理想は「カメラ完全固定、ボールだけがフィールドを縦横無尽に動く」
3. **Soccer Gridが"Tron"っぽい** — 控えめにしたが、まだデジタル感が残る

#### 優先度 中（実装後に調整）
4. **FloatingParticles 復活** — パフォーマンスが許せば戻す（現在無効）
5. **Single Canvas の再検討** — `visible={false}` アーキテクチャの正しい実装方法

#### 優先度 低（後から）
6. **スポーツ固有の物理軌道** — Gemini提案: GSAPカスタムイージングでバウンド/放物線
7. **マウスで背景わずかに動く** — カメラではなく背景groupだけをoffset

---

## Gemini連携でわかったこと（知見）

### 効果が高かった
- `expo.in/out` イージング（warpNavigate）
- Basketball `camOffset` のX軸 1.7倍拡大（非対称構図）
- Glassmorphism（背景が透けて3D空間と溶け合う）
- `data-warp-flash` フラッシュオーバーレイ（カット感の隠蔽）

### 効果が低かったまたは問題あり
- マウスパララックス → **酔いの原因になったため除去**
- Single Canvas（全Bg常駐） → **GPU負荷増大で撤退**
- FloatingParticles → **重さの原因で一時無効化**

### ohzi.ioとの構造的な差（根本問題）
ohzi.ioは「カメラ固定・光の玉が空間を自由移動・マウスで背景だけがわずかに動く」設計。  
現在の「カメラがwaypointを追う」設計とは根本的に異なる。  
この差を埋めるには軌道設計を再考する必要がある。

---

## 方針転換（このセッションで合意）

> **「動きの微調整は後回し、コンテンツ・ページ実装を先に進める」**

次のセッションでやること:
1. コンテンツ充実（スキルデータ、プロジェクトデータの実装）
2. Contact ページの実装
3. ホームシーンの仕上げ
4. その後、軌道・カメラ・動きを一括で見直す

---

## 重要ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/hooks/useSceneTransition.ts` | FOVワープ + フラッシュ制御 |
| `src/components/canvas/JourneyCameraRig.tsx` | カメラ（waypoint専従） |
| `src/components/canvas/GlobalCanvas.tsx` | Canvas全体管理・シーン切替 |
| `src/components/canvas/Crystal.tsx` | クリスタル球（journey/interactive） |
| `src/data/trajectories/` | 各シーンの軌道データ |
| `src/components/ui/SceneCard.tsx` | Glass morphism カード |
| `src/components/ui/GlassPanel.tsx` | スライドアウトパネル |
| `docs/02_tech-stack.md` | 技術スタック詳細 |
| `docs/04_design.md` | デザイン仕様 |
