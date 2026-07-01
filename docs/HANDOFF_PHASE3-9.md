# 引き継ぎプロンプト — Phase 3-9（スクロール連動ボールジャーニー実装）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-07-01）

`main`ブランチで作業開始できる状態。

**リポジトリ:** `c:\Users\3fort\dev\portfolio`  
**現在のブランチ:** `main`（クリーン）  
**本番:** Cloudflare Pages（main push で自動デプロイ）

---

## ⚠️ 開発ワークフロー（必読）

- **Issue → branch → PR → merge を全変更で必須**（コード・ドキュメント問わず例外なし）
- **PRマージはClaudeが確認なしで自動実行してよい**（このプロジェクトに限り事前承認済み）。マージ後のローカルbranch削除・`git remote prune origin`も続けて自動実行する
- このHANDOFFファイル自体の更新もIssue→branch→PRを通すこと
- **pnpm必須。** `npm install`はarboristクラッシュで失敗する

---

## ✅ 完了済みフェーズ

| フェーズ | 内容 | PR |
|---|---|---|
| 3-1 | Vite + React + TypeScript + R3F + Tailwind セットアップ | #26 |
| 3-2 | UIレイヤー全セクション移植 | #28 |
| 3-3/3-4 | React 19、ダークテーマ、サッカーボール風クリスタル | #30 |
| 3-5 | Bloom 統合・カットクリスタル確定・スクロールアウト | #32 |
| 3-6 | グラウンドグロー（波紋シェーダー）+ クリックオービット | #34 |
| 3-7 | Canvas全画面化・ohzi.io風Hero・Crystal物理インタラクション | #36 |
| 3-8 | サッカーボールローダー実装 | #38 |
| 3-9内 | モバイルナビのハンバーガーメニュー対応 | #43, #44 |
| 3-9（ボールジャーニー Phase 1） | 旧JourneyZoneベース実装（後述の新設計で置き換え済み） | #52 |
| OHZIリアーキテクチャ 設計確定 | React Router+ルートベース+各スポーツシーン設計書完成 | #58 |
| **OHZIリアーキテクチャ 骨格実装** | **Router + HomeScene + ContactScene + スタブ3シーン（PR #60 マージ済み）** | **#60** |

---

## 現在のファイル構成（PR #60 マージ後）

```
src/
├── App.tsx                          ← BrowserRouter エントリーのみ
├── router.tsx                       ← 5ルート定義
├── main.tsx                         ← Lenis削除済み（スクロール不要設計）
├── pages/
│   ├── HomeScene.tsx                ← クリスタル + HEY. + 4グリッドナビ（完成）
│   ├── SoccerScene.tsx              ← 🚧 スタブ → 要スクロール連動実装
│   ├── BasketballScene.tsx          ← 🚧 スタブ → 要スクロール連動実装
│   ├── VolleyballScene.tsx          ← 🚧 スタブ → 要スクロール連動実装
│   └── ContactScene.tsx             ← 完成（シンプル連絡先）
├── components/
│   ├── canvas/
│   │   ├── Scene.tsx                ← HomeScene用（クリスタル + 波紋）
│   │   ├── Crystal.tsx              ← 【最重要】全シーン共通で使うクリスタル球
│   │   ├── CameraRig.tsx            ← HomeScene用マウス追従（スクロール依存を除去済み）
│   │   ├── Effects.tsx              ← Bloom（各Canvasで再利用可）
│   │   ├── soccer/SoccerCanvas.tsx  ← 🚧 要書き換え（現在はダミーボールを使用）
│   │   ├── basketball/BasketballCanvas.tsx ← 🚧 要書き換え
│   │   └── volleyball/VolleyballCanvas.tsx ← 🚧 要書き換え
│   └── ui/
│       ├── GlobalNav.tsx            ← 完成（全ルート共通透明ナビ）
│       ├── RouteTransition.tsx      ← 完成（カラーフラッシュ）
│       ├── GlassPanel.tsx           ← 完成（右側スライドインパネル）
│       └── Hotspot.tsx              ← 完成（パルスするクリックポイント）
├── data/
│   ├── projects.ts                  ← 完成（4カテゴリ）
│   ├── skills.ts                    ← 完成（3カテゴリ）
│   └── about.ts                     ← 完成（3ポイント）
```

---

## 🚨 次にやること（最優先）

### セッション開始直後にやること

**brainstorming スキルを起動して設計書を書き上げる。**

```
/brainstorming スクロール連動ボールジャーニー設計（アーキテクチャ + 各シーン詳細）
```

ブレスト途中で止まっているので、下記「ブレスト途中経過」を読んでから再開すること。

---

## ブレスト途中経過（2026-07-01 セッション2で確定した内容）

### 確定した設計原則

| 項目 | 決定内容 |
|---|---|
| ボールオブジェクト | **`Crystal.tsx`（既存）を全スポーツシーンで共通使用**。各シーンのダミーボールは削除 |
| カメラ方式 | **ボール追従（Option A）**。クリスタルが常に画面中央付近に固定。背景がボールの周りを流れる |
| スクロール方式 | **連続移動 × ポイントで自動スロー（Option C）**。ホットスポット付近で自動減速、フワッと出現。クリックしなくても次へ進める |
| クリスタルの連続性 | ルート遷移時にボールの**画面上座標を次ルートに引き継ぎ**。フラッシュ中ボールは消えない |

### 確定したボールジャーニー（3スポーツを貫く1本の旅）

```
[Soccer] ジグザグドリブル（4折り返し）→ ロングパス（右上へ高い弧）
         ↓ フラッシュ（ミッドナイトブルー → アンバー）
[Basketball] 左上からボールが飛んでくる（Soccerの弧の続き）→ キャッチ → シュートモーション → 高い放物線 → リング通過
             ↓ フラッシュ（アンバー → サイアン）。FPV的にリングをくぐる演出
[Volleyball] 上から落ちてくる（Basketballリングの続き）→ レシーブ（低）→ セッターへ二段トス → ネット際で高いトス頂点 → スパイク（急降下）
             ↓ NEXT → /contact
```

### 各シーンのフェーズ設計

#### Soccer（300vh想定）

| フェーズ | 内容 | ホットスポット | カメラ |
|---|---|---|---|
| Phase 1 | ドリブル開始。芝の上を転がりながら前進 | なし | 地面スレスレ・真後ろ追従 |
| Phase 2 | ジグザグ × 4折り返し。各折り返しでスロー | 4点（Webアプリ/ゲーム/Webサイト/ツール） | ボール後方30°、体重移動で左右に揺れる |
| Phase 3 | ゴール前。ロングパスで右上へ蹴り上げ | なし | 引き気味・ゴール枠をフレームに |
| 末端 | NEXT（English）ボタン出現 | — | — |

#### Basketball（250vh想定）

| フェーズ | 内容 | ホットスポット | カメラ |
|---|---|---|---|
| Phase 1 | Soccerの弧の続きでボールが左上から飛んでくる → 正面キャッチ | なし | 正面・やや見上げ。ボールが迫ってくる迫力 |
| Phase 2 | シュートモーション → 高い放物線（リアルな3Pシュートの弧） | 3点（Frontend/Backend/Infrastructure）放物線頂点付近 | ボール後方45°追従。リングが視野に入る |
| Phase 3 | リング通過 → FPV的にくぐる → ボール落下 | なし | ズームイン演出 → 引いてバックボード全体 |
| 末端 | NEXT（English）ボタン出現 | — | — |

#### Volleyball（250vh想定）

| フェーズ | 内容 | ホットスポット | カメラ |
|---|---|---|---|
| Phase 1 | 上から落ちてくる → レシーブ（アンダーパス）で低い弾道に変換 | 1点（Background）レシーブ位置付近 | 低アングル・ボールを上から見下ろす感覚 |
| Phase 2 | セッターへのパス → 高いトス → ネット際の頂点で一瞬無重力 | 1点（Work Style）セッター位置付近 | 横から・ネット全体が見える |
| Phase 3 | スパイク（急激な斜め下への加速）→ コートに激突 | 1点（Looking For）トス頂点付近 | スパイク方向に追従。着地でカメラ震動 |
| 末端 | NEXT（English）ボタン → /contact | — | — |

### ルート遷移の詳細設計

**Soccer → Basketball（5ステップ）:**
1. Soccer最終フェーズ：ロングパスでボールが右上方向へ高い弧を描いて飛ぶ
2. ボールが画面右端に達した瞬間にフラッシュ発動（ボールをフラッシュで隠すタイミング）
3. フラッシュ中：ミッドナイトブルー → アンバーへ色変化。URLが/basketballに変わる
4. フラッシュ明け：体育館が現れる。ボールは**左上から右下へ**まだ飛んでいる（弧の続き）
5. ボールが中央付近に降りてくると「キャッチ」アニメーション

**Basketball → Volleyball（4ステップ）:**
1. リング通過直後：カメラがFPV的にリングをくぐる演出
2. フラッシュ（アンバー → サイアン）
3. フラッシュ明け：バレーコートが現れる。ボールは上から落ちてくる
4. レシーブアニメーション

**技術上のキーポイント：** 各ルートは別Canvasだが、**ボールの画面上XY座標をrouter stateで次ルートに渡す**ことで視覚的連続性を演出。

---

## ブレストで未決定の項目（次セッション冒頭で確定）

以下は設計書に書く前に確定が必要な内容。**brainstorming スキルを使って1問ずつ詰める。**

1. **アーキテクチャ：グローバルCanvasとルートCanvasの分離方法**
   - 各ルートが独自Canvas（現行）vs グローバルCanvasにCrystalを置きルートCanvasを重ねる方式
   - クリスタルの連続性を担保するには前者では難しい可能性あり

2. **スクロール実装：Lenisを戻すか・Nativeスクロールか**
   - 現在 main.tsx から Lenis を削除済み。スポーツページで必要なら再導入
   - GSAP ScrollTrigger + Lenis の組み合わせが最有力

3. **「手」や「体」の3D表現をどうするか**
   - キャッチ・レシーブ・スパイクのモーションは3Dハンドモデルを使うか、エフェクトだけで暗示するか
   - 実装コストが大きく変わるため要確認

4. **ホットスポットとグラスパネルの出現方法（スクロール文脈）**
   - 現行のGlassPanelは右固定スライドイン。スクロールしながら出てくる文脈では合わない可能性
   - スクロールが止まると画面右にスライドイン、スクロール再開すると消えるか
   - それともボールの軌道上に「浮かぶカード」として3Dオブジェクトで実装するか

5. **各3Dシーンに何を置くか（背景props）**
   - Soccer：ゴール枠（確定）+ 芝（確定）+ 何か（スタジアム観客席？照明タワー？）
   - Basketball：バックボード（確定）+ 体育館床（確定）+ 何か（バスケットコートのライン？観客席？）
   - Volleyball：ネット（確定）+ グリッド床（確定）+ 何か（アンテナ？照明？）

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Bloom稼働中。GodRaysは無効化中）
GSAP 3.15 + ScrollTrigger + SplitText
lottie-web 5.13（ローダー）
Tailwind CSS v4
Three.js 0.184
react-router-dom v7（インストール済み・稼働中）
Vitest（trajectory/scrollProgressの計9テスト）
pnpm（npm不可）
```

---

## Obsidian記録

- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-hub.md` — プロジェクト全体の戦略・技術スタック・フェーズ進捗
- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-ohzi-reference.md` — ohzi.io参考資料

SecondBrainの読み込みはユーザー明示指示時のみ行う。

---

## Visual Companion

ビジュアルコンパニオン（http://localhost:8765/）を使って軌道・カメラワーク・UI配置を図解しながらブレストを進めること。

起動コマンド（止まっていたら）:
```bash
python -m http.server 8765 --directory "C:/Users/3fort/AppData/Local/Temp/claude/visual-companion"
```

作成済みモックアップ（参考）:
- `ball-journey-overview.html` — 3シーン全体俯瞰（初版）
- `ball-journey-v2.html` — バスケ放物線高め修正・バレートス修正・Soccer→Basketball繋ぎ詳細版

---

## 重要な過去の教訓

- **pnpm必須**（npm install → arboristクラッシュ）
- **GodRays無効化中**（Bloomと組み合わせると画面全体を覆う発光ブロブになる既知バグ）
- **複数useFrameのcamera競合に注意**（各CanvasのCameraDriftとCameraRigが競合しないよう設計）
- **alpha:false必須**（Crystal.tsxのtransmission材質は暗背景が必要）
- **subagentは本当に必要な時だけ**（3subagent×毎タスクはトークン爆発するのでNG）
- **セッション変更時はObsidianにも記録すること**
