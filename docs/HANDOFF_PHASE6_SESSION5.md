---
date: 2026-08-02
author: Claude Opus 5（実装・QA・参考例分析）
related_issues: "#345, #350(closed), #344"
related_prs: "#349, #351（すべてマージ済み）"
reference_doc: docs/references/2026-08-02_x-4examples.md
---

# HANDOFF PHASE6 SESSION5: 輪郭線の実測比較 → retrofit を打ち切り、1から作る方針へ

軽量フォーマット継続（次にやること・未解決事項のみ）。**判断根拠・却下案・時系列は以下に記録済み**:

- `docs/references/2026-08-02_x-4examples.md` ← **次セッションの一次資料。最初に読む**
- `C:\Users\3fort\.claude\state\handoff-latest.md`（復旧メモ付き）
- Obsidian `Projects\portfolio\Decisions\2026-08-02-npr-retrofit-rejected.md`

## 概要

| PR | 内容 |
|---|---|
| #349 | `?outline=1`（深度エッジ輪郭線）/ `?contrast=1\|2`（ライティング）を追加。224 → 242件 |
| #351 | 却下した逆ハル輪郭線を削除（Issue #350 closed）。242 → **240件** |

**このセッションの本質は結論のほう。** retrofit（完成したPBRシーンにNPRの皮をかぶせる）では
参考例の魅力に届かないと実測で確認し、**1からプロトタイプを作って比較する方針へ切り替えた**。

## 次にやること

1. **プロトタイプ3本を作って比較（最優先）**
   方向 A/B/C・共通原則は `docs/references/2026-08-02_x-4examples.md` の末尾にある。
   **現行シーンには一切触らない**。別ルート（`/proto/a` 等）に独立して作る。
   作り込みは粗くてよい（選ぶための試作）。1本1セッションの想定
2. **⑤ Blenderベベルは引き続き保留**。プロトタイプで方向が決まってから再評価
3. Issue #344（地面の穴が見えない）は下記の新事実を踏まえて再評価
4. Issues #328 / #314〜#318 は依然未着手

## 未解決・要判断事項

- **`RING_OFFSET` は絶対に動かさない**（従来どおり）
- **`BasketNet.tsx` の `useMemo` 内 `ensureNetBake()` を消さない**（従来どおり）
- **`toonPreview.tsx` / `DepthOutline.tsx` は検証用**。恒久採用なら実行時 traverse ではなく
  各コンポーネントのマテリアル定義側へ移すこと
- **Issue #344 の原因が判明した**: 穴は `transparent` のアルファ抜きで、three.js は
  `transparent` でも `depthWrite` が既定 true。**深度が書かれるので輪郭線でも縁が立たない**。
  以前 `alphaTest`/`discard` 案は「縁が硬くジャギる」で却下したが、**輪郭線が入るなら
  discard のほうが筋が良い**（深度を書かないので縁が自動的に線になる）。要再評価
- **`olFadeFar` の既定110はフォグの `far=65` より遠い**ため、地平線に硬い線が出て
  フォグの溶け込みを打ち消す。`?olFadeFar=65` で解消する見込みだが**未検証**
- バレーネットのセル0.40がやや粗い（0.32案は**未判断**、従来どおり持ち越し）
- 太陽グレア（u≈0.195〜0.20）・ショット1実機確認は依然未了
- 開発サーバーが 5173 と 5176 で起動したままの可能性がある

## QAスイッチ一覧（このプロジェクトの資産）

Playwright QAは `/scroll-poc` に対して行う（`/` は旧HomeSceneで凍結済み）。

| スイッチ | 効果 | 追加 |
|---|---|---|
| `?freezeWind=1` | ネットの風を止める（3種すべて） | #336 |
| `?hideVeil=1` | ダイブ雲ヴェールを畳む | #343 |
| `?toon=1` | シーンをトゥーンへ差し替える | #346 |
| `?outline=1` | 深度エッジの輪郭線。`olThickness` / `olDepth` / `olCrease` / `olStrength` / `olFadeNear` / `olFadeFar` / `olColor` で調整 | #349 |
| `?contrast=1\|2` | ambient↓ / キーライト↑ / gradientMapの底↓ | #349 |

**スイッチ未指定時は現行の実測値がそのまま入るので、既定の絵は1ピクセルも変わらない**
（`LIGHTING_PRESETS[0]` が従来のハードコード値と一致することをテストで担保）。

## QA手法の訂正

**「連続2枚がピクセル一致するまで待つ」はこのシーンでは永久に成立しない。**
雲が `speed 0.05〜0.08` で常時アニメーションするため。`freezeWind=1` はネットしか止めない。
`scripts/qa-npr-shots.mjs` は上限18回で打ち切るフォールバックを入れてある
（カメラ自体はコールドロード9秒＋ポーリングで確実に収束する）。
