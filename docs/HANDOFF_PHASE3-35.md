---
date: 2026-07-19
author: Claude Sonnet (PR-1/2実装・再調整)
related_issues: "#272, #274, #276"
related_prs: "#272, #274, #276"
---

# HANDOFF PHASE3-35: チェイスカム化基盤完成(PR-0/1/2マージ完了)

## 概要

3D旅程のカメラシステムを「独立経路」から「ボール追従(チェイスカム)」へ抜本移行。ボールが常に画面下寄りに追従する視点を実装し、ユーザーの「置き去り感」を根本解消。同時にボール軌道のコンテキスト化(座標参照)へのアーキテクチャ基礎を整備。

**今日のセッション達成:**
- ✅ PR-0(PR #272): カメラ姿勢反転演出実装・マージ
- ✅ PR-1(PR #274): BallFrame基盤(chase.ts)実装・マージ
- ✅ PR-2(PR #276): チェイスカム移行・距離再調整・マージ

**テスト:** 各段階でtsc/build/vitest全green
**devサーバー:** 稼働確認済み

---

## PR-0: カメラ姿勢反転演出(PR #272)

**役割:** チェイスカムのベース姿勢層。ボール移行後も機構無変更で後段に乗る設計。

**実装内容:**
- `src/journey/cameraAttitude.ts`: pitch・roll角度の時間軸マッピング(KEYFRAMES)
- `src/journey/cameraAttitude.test.ts`: グレア安全マージン・二部構成不変条件テスト
- `src/journey/skyConfig.ts`: 太陽位置定数
- `src/journey/useReducedMotionScale.ts`: 視覚プリファレンス対応

**設計理由:** バスケのフリースロー落下からバレーのスパイク着地へのカメラダイブを時間軸で定義し、姿勢演出を純粋なoffset関数に落とす(状態無し)。これが後続のチェイスカムと合成しても効くアーキテクチャを実現。

**現在値:**
- pitch: バスケ区間-35°、fall区間で-35°→-5°へ遷移、バレー着地で-5°
- roll: バスケ-15°、バレー+15°

---

## PR-1: BallFrame基盤(PR #274)

**役割:** チェイスカムが必要とする「ボール位置+進行方向」の純関数インターフェース。

**実装:**
```ts
export interface BallFrame {
  anchor: THREE.Vector3    // カメラの追従基点
  heading: THREE.Vector3   // 水平進行方向(y=0)の単位ベクトル
}
export function getBallFrame(u: number, out?: BallFrame): BallFrame
```

**実装パターン:** `roll.ts`に倣い、モジュール初期化時に`getBallPose(i/2048)`をサンプリング、heading水平変位のみから算出し±0.006u移動平均で平滑化、anchorはxz弱・y強平滑。

**テスト9件:**
- heading隣接Δ角上限40°(dribbleウィーブ由来、ジッター定量化)
- 静止区間ホールド(シード→初動飛び6.5°)
- 決定性・端点一致

**視覚影響:** ゼロ(消費者不在)

---

## PR-2: チェイスカム移行本体(PR #276)

**役割:** 「独立スプライン」から「ボール追従」への全面切り替え。ユーザー不満#1を最速解消。

### 初期実装(Fable5)
**定数:** D_BACK=10, D_UP=3, LOOK_AHEAD=3, LOOK_UP=1
→ NDC下2/3バンド(y∈[-0.6,-0.05])目標を達成だが、ユーザーフィードバック「引きすぎ」→ 再調整

### 再調整(Sonnet)
**新定数:** D_BACK=4.5, D_UP=3, LOOK_AHEAD=2, LOOK_UP=1.5

**変更理由:** ボール見かけ大きさの1.9倍拡大が狙い。「上3分の2が見える」を以下の条件に数値化:
- ボール中心NDC y ≤ -0.45(画面下寄り)
- ボール上端(中心+見かけ半径)がフレーム内(y > -1、下側クロップ許容)

**実測結果(N=1000):**
- 中心最大値: -0.538 ✓
- 上端最小値: -0.877 ✓
- 見かけサイズ平均: 0.327→0.62(1.9倍) ✓
- 下側クロップ率: 約29%

### 安全マージン(全域再実測)
| 項目 | 実測値 | 閾値 | 余裕 |
|---|---|---|---|
| カメラ-ボール距離(最小) | 4.85 | 2.0 | 2.4倍 |
| バックボード表面距離(最小) | 0.76 | 0.5 | 1.5倍 |
| フープ支柱距離(最小) | 1.89 | 1.2 | 1.6倍 |
| グレア角度(姿勢区間最小) | 90.26° | 55° | 十分 |
| 地面クリアランス(最小y) | 2.955 | 2.5 | 十分 |

**実装ファイル:**
- `src/journey/camera.ts`: `poseJourneyCamera(camera, u, reducedMotionScale)` 新設
  - getBallFrame(u)→camPos計算→lookTarget計算→applyCameraAttitude後段適用
  - 4定数はスカラー(将来keyframe化の余地あり)
- `src/journey/CameraRig.tsx`: useFrameループをposeJourneyCamera呼び出しに一本化
- `src/journey/path/curves.ts`: CAMERA_PATH/LOOKAT_PATH全廃(PATH_END_OFFSET/PAGES存続)
- **テスト3ファイル改修:**
  - `ballPath.test.ts`: cameraAt()ヘルパーをposeJourneyCamera共有化、NDC意味論アップデート
  - `cameraAttitude.test.ts`: buildCamera()同様、共有化+実測値反映
  - `path.test.ts`: CAMERA_PATH依存テスト削除、構造物3D距離・終端角度を再実測

**設計哲学:**
- **offsetが唯一の真実** — フレーム間状態なし、ScrollControls damping(0.25)のみで平滑化
- **getBallFrame契約のみ消費** — 軌道が将来物理式化しても、シグネチャ無変更で動く
- **ヘルパー重複を共有化で恒久解消** — CameraRig/2つのテスト/全てがposeJourneyCamera使用
- **後から修正しづらくならない** — 将来の軌道複雑化・カメラ距離調整を吸収する設計

**テスト:** 79件全green(既存64+新規15、PR-1由来9除く)

---

## 次セッション開始時のチェックリスト(PR-3向け)

```
□ main を最新pull(`git pull`)
□ PR-0/1/2がマージ済み(git log --oneline -5で確認)
□ src/journey/camera.ts が存在し、poseJourneyCamera関数がexport済み
□ devサーバーが生きていればそのまま(CTRL+C時は pnpm dev でバックグラウンド起動)
□ docs/HANDOFF_PHASE3-35.md(本ファイル)読了
□ C:\Users\3fort\.claude\plans\3-c-a-quiet-tome.md の「PR-3」セクション精読
```

---

## PR-3への引き継ぎ内容

**タスク:** COURT_SIZES再導出(1.5〜2倍拡大)・VENUES.x再計算・フープ開口実測拡大

**制約:**
- ヴェニュー中心のz座標は動かさない(PAGES/transitの再設計を避ける)
- リング開口目標: torusGeometry `[3.0, 0.14, 8, 32]`(開口直径5.72)確定
- 実測: スクラッチパッド→拡大後コートAABB・transit帯・freeThrow弧NDC・リング通過性を確認→COURT_SIZES値決定

**未解決の軽微事項:**
- PROJECTS/SKILLSパネル視認性(チェイスカム構図で再評価要)
- PR5視覚QA要調整4件(構図前提変わったため陳腐化見込み)
- dribbleバウンド地面埋没(Phase 6で見直し予定)

---

## 技術的な重要な決定

### モデル使い分けの実証
- **計画・設計:** Fable5が高品質(6PR全体構成の判断)
- **実装:** Sonnet5で十分(実行速度・制約対応)
- **結論:** Fable利用枠制限あるため、計画後の実装・修正はSonnet基調

### アーキテクチャ原則
1. **offsetが唯一の真実** — 状態持ち込み厳禁
2. **フレーム時間ダンピング禁止** — ScrollControlsの平滑化で十分
3. **インターフェース契約による疎結合** — BallFrame/poseJourneyCamera型を介して、実装の詳細が変わっても機構は不変

---

## 完了状況

| PR | Issue | ファイル数 | テスト | 状態 |
|---|---|---|---|---|
| PR-0(#272) | 既存の設計PR | 4新規+1改修 | 171新規 | ✅ Merged |
| PR-1(#274) | #273 | 2新規 | 9新規 | ✅ Merged |
| PR-2(#276) | #275 | 1新規+6改修 | 79全green | ✅ Merged |

**総テスト:** 85件全green、devサーバー稼働確認済み

---

## セッションノート

### 日付: 2026-07-19
- 09:30: PR-0マージ→PR-1実装開始(Fable5)
- 12:00: Fable5セッション上限切れ → Sonnet5へ切り替え
- 15:00: PR-2実装完了 → devサーバー確認
- 17:00: ユーザー見た結果「もっと寄る」→ PR-2距離再調整開始(Fable試行)
- 19:00: Fable週次枠切れ → Sonnet再開
- 21:00: PR-0/1/2全マージ完了

**教訓:**
- Fable/Sonnetの適切な使い分けが効率化のカギ
- スクラッチパッド実測 → tsc/build/vitest → devサーバーQAの流れが安定
- 計画段階のFable投資が後の実装スピード向上を実現

---

## 次セッションへの注釈

**重要:** PR-3は「スケール調整」であり、これが後続PR-4/5(物理軌道化)の前提になる。軌道チューニングが最終ジオメトリに対して1回で完結するよう、このPRで各コート寸法を確定させること。

Fable利用枠の次リセットまで残り時間があれば計画・設計段階でFable利用を検討。実装がメインのPR-4/5以降はSonnetで対応可能な見込み。
