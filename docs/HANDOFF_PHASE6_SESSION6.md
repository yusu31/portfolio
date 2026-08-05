# HANDOFF Phase6 SESSION6 — プロトタイプB

- 日時: 2026-08-06
- main = `7d6103b`。テスト **451件** green。作業ツリークリーン

| PR | 内容 |
|---|---|
| #356 | プロトタイプB(`/proto/b`)。Issue #355 closed |

## 次にやること

1. **プロトタイプC(`/proto/c` 箱庭カード)を作る**。参考は②のモジュラー思想
   (手前に流れてくる浮島 / 章が独立した小さな世界)。一次資料は
   `docs/references/2026-08-02_x-4examples.md`。**現行シーンにも A/B にも触らない**
2. 3本そろったら `/proto/a` `/proto/b` `/proto/c` を横並びで比較して方向を決める
3. ⑤ Blenderベベル・Issue #344(discard案での再評価)・`?olFadeFar=65` は方向決定まで保留

## 未解決事項

### プロトタイプB に残っているもの(方向として採用するなら直す)

- **Amber区間のオーバーレイ文字が読めない**。`accent`(#ff7a3c)を橙の空(#f0c9a4)に
  重ねているため。A の Dusk 章で起きたのと同じ問題で、UI側の対処が要る
- **建物が無地の板**。窓・看板が無いので、近景の壁が大きな単色面になる
- **三角コーンが多く彩度も高い**。差し色が画面に散りやすい
- 最寄りの上部構造が近すぎて画面を強く覆う瞬間がある(間隔を詰めた副作用)

### 判断待ち

- B のパレットは**位置ごとに焼いてある**(`paletteAt(t)`)。区間の色を変えると
  街の色が丸ごと変わるので、調整するならパレット定義だけで完結する

## 制約(引き続き)

- **現行シーン(`/scroll-poc`)は今回も一切触っていない**。`RING_OFFSET` / `ensureNetBake()` も従来どおり
- **プロトタイプA(`/proto/a`)にも触っていない**。B は `journey/` も `proto/a/` も import していない

## 復旧メモ

- **`/` は旧HomeSceneで凍結済み。現行シーンの実体は `/scroll-poc`。プロトタイプは `/proto/a` `/proto/b`**
- `App.tsx` の `LegacyChrome` は `/scroll-poc` と `/proto/*` を除外している。
  **`/proto/` 配下に置けば自動で効く**(除外しないとローダーが永久に画面を覆う)
- QAは `scripts/qa-proto-shots.mjs <route> <outDir> <plansJson>`。
  **Git Bash からは `MSYS_NO_PATHCONV=1` が必須**
- **プロトタイプ側に区間を直接指定するクエリを必ず入れる**。
  A は `?ch=N` / `?cut=0〜1`、B は `?leg=N` / `?at=0〜1`。**Bも全カット2回目のポーリングで収束した**。
  B では**主役の歩行アニメーションも `?leg` 指定時に止めている**(動きが残ると収束しない)
- B 固有: `?ol=0` で輪郭線を外して同じ構図と比較できる
- 詳細な設計判断とQAで見つけたバグは Obsidian
  `Projects\portfolio\Decisions\2026-08-06-proto-b-perspective-street.md` に記録済み
