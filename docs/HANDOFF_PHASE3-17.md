# HANDOFF Phase 3-17 — Home流体オーロラ + 全5シーン design-review 指示書

**日付:** 2026-07-07 朝
**前回引継ぎ:** `docs/HANDOFF_PHASE3-16.md`
**現在ブランチ:** main（PR #173 マージ済み）
**このセッションのモデル:** Fable 5（週間枠の最終利用。7/8 以降は Sonnet）

---

## このセッションで完了したこと

### 1. Home背景の流体オーロラ（PR #173・Fable 5 先行枠①）

`src/components/canvas/HomeAurora.tsx` 新規。MINAMO/ohzi 系の「コードがリアルタイムに描く」主役演出。

- **構成:** domain-warped fbm（2段）+ マウス軌跡トレイル（直近8点の vec4 uniform 配列。FBO なしの軽量構成）
- **反応設計:** 軌跡サンプルが周囲の流体を押し広げ（warp）+ 淡く発光（glow）。静止時は静か・動かすと生きる
- **炎化の回避:** 大スケール色相ノイズで暖（オレンジ）/寒（鋼青）ゾーンを混在。「細いリボン（等値線バンドパス）+ 淡い残り火」でチョーク的発光を維持
- **集光:** エネルギーはクリスタル側（スクリーン中央やや右下）へ、ヒーロー文字の左上は静粛化
- prefers-reduced-motion: 時間8%速・トレイル無効

### 2. design-review 全5シーン採点（Fable 5 先行枠②）→ 下の指示書へ

---

## 技術知見（今後のシェーダ作業で必須）

1. **EffectComposer のバッファはリニア空間。** sRGB 感覚で書いた色値（例: 背景 #0a0a0f → 0.039）を
   そのまま gl_FragColor に出すと全体が白茶けて「炎と煙」になる。`pow(col, vec3(2.2))` で変換してから出力する。
   `<color attach="background">` が正しく暗いのは three.js が hex→リニア変換しているため
2. **可視域より大きいプレーンでは plane UV のマスクが効かない。** 80×40 のプレーンで可視域は約23×13
   → vUv は 0.36〜0.64 しか動かずマスクがほぼ1.0で一様になる。集光・減光マスクは
   スクリーン空間（`vClip.xy / vClip.w * 0.5 + 0.5`）で計算する
3. Playwright 検証の型は `HANDOFF_PHASE3-16` の知見（コールドロード5秒・ナビクリック遷移・座標クリック）が今回もそのまま有効だった

---

## design-review 採点結果（2026-07-07・taste定義照合済み）

| # | 項目 | Home | Soccer | Basketball | Volleyball | Contact |
|---|------|------|--------|------------|------------|---------|
| 1 | タイポグラフィ階層 | ◎ | ○ | ○ | ○ | ◎ |
| 2 | 余白の一貫性 | ○ | ○ | ○ | ○ | ◎ |
| 3 | 配色 | ○ | ○ | ○ | ○ | △ |
| 4 | 視線誘導 | ○ | ○ | ○ | △ | △ |
| 5 | モーション品質 | ◎ | ○ | ○ | ○ | ○ |
| 6 | 既視感・実在の文法 | ◎ | △ | × | △ | ○ |
| 7 | レスポンシブ | 未検証* | 未検証* | 未検証* | 未検証* | 未検証* |
| 8 | アセット品質 | △ | ○ | ○ | ○ | ○ |
| 9 | マイクロインタラクション | ◎ | ◎ | ○ | ○ | ○ |
| 10 | アクセシビリティ基礎 | ○ | △ | △ | △ | △ |

*375px はタスク8（統合テスト）で検証

**維持すべき点:** Home のオーロラ+クリスタル+タイポの三位一体（署名的演出）。Soccer の実ピッチ文法。
Volleyball の紅白支柱。クリック波紋。これらは修正時に壊さないこと。

---

## Sonnet 向け修正指示書（優先順・1件=1 Issue/PR）

### 修正1: Basketball ゴールの実文法化【⑥×・最優先】

**問題:** バックボードが「発光するオレンジの板」1枚で宙に浮いている。リング・ネット・支柱がなく、
taste「実在の文法」違反の筆頭 + 過剰emissive（ネオンスラブ）。
**直し方** (`src/components/canvas/basketball/BasketballBg.tsx`):
- バックボード: 暗い半透明板（#1a1a1f・opacity 0.85）+ 白のシューターズスクエア枠線（emissive 0.15〜0.18）
- リング: `torusGeometry(0.23, 0.02)` オレンジ #ff6d00・emissive 0.2 以下・バックボード前面下端
- ネット: 白ラインの逆円錐（8〜12本の line か cylinderGeometry openEnded・opacity 0.5）
- 支柱: バックボード背後から床へ伸びる暗いポール（#222・非発光）で接地させる
- リング直下に弱い pointLight（orange・intensity 3〜5）で床に光だまり（taste「光源の整合性」）

### 修正2: Volleyball の3点【⑥△④△】

**問題A:** ネット上端の白帯が白飛び（ネオン化）。
→ 白帯 emissive を 0.15〜0.2 へ（taste 実例: #c8d8c8 × 0.18）。Bloom 閾値 0.3 を超えない
**問題B:** 上空に浮かぶ緑の2本線が接地感ゼロで「実在しない発光ライン」に見える。
→ 遠側コートのラインなら床メッシュの可視範囲を広げて接地させるか、フォグ減衰で消す。単体で浮くなら削除
**問題C（既知）:** ボールが画面に対して大きすぎる。
→ `GlobalCanvas.tsx` の SCENE_CAMERAS['/volleyball'] を position [0,1.8,3.5]→[0,2.0,4.4]・lookAt 微調整。
Playwright で他シーンとボールの見かけサイズを並べて比較検証

### 修正3: Contact の2点【④△③△】

**問題A:** クリスタル球が連絡先カード列と衝突し EMAIL/GITHUB カードのテキストに重なる（「置いたのに見えないUI」）。
→ `ContactScene.tsx` or `GlobalCanvas.tsx`: 球を右側の余白へ（目安 position x +2.2〜2.8, y +0.3）またはスケール 0.45→0.6 にして「Let's work together.」の右横に配置。カード列と分離
**問題B:** カードの行ごとに橙/紫/緑と3アクセント散在（配色規律違反）。
→ アクセントは EMAIL の橙のみ残し、GITHUB/RESUME はテキスト白 90% + hover 時のみ各色、または全て橙系に統一

### 修正4: SceneCard がマーカーを覆いクリックを吸う【既知・⑨】

**問題:** カード出現中、背後のフィールドクリックが効かない領域が広い（Basketball で再確認済み）。
→ `SceneCard.tsx`: コンテナを `pointer-events: none` にし、ボタン等の操作要素だけ `pointer-events: auto`

### 修正5: Soccer ゴールのチョーク化【⑥△】

**問題:** ゴール枠が白飛びネオン。
→ 枠 emissive を 0.18 前後へ・色を #e8f0e8 系に。余力があれば簡易ネット（細線グリッド・opacity 0.35）追加
（※等間隔グリッドのトロン化に注意 — 網目は非発光・低opacityで「布」に見せる）

### 修正6: Home ナビグリッドの絵文字脱却【⑧△】

**問題:** ⚽🏀🏐✉ の絵文字が OS 依存レンダリングで、オーロラ導入後は相対的に最も「安い」要素。
→ lucide-react の線画アイコン等に置換（既依存になければ inline SVG 4個で足りる）。色は各シーンアクセント

### 修正7: prefers-reduced-motion の網羅【⑩△・小】

→ クリック波紋・GSAP 入場 tween・マーカーパルスに `matchMedia('(prefers-reduced-motion: reduce)')` ガード追加。
オーロラ（HomeAurora.tsx）の実装が参考パターン

---

## 残タスク（Phase B・7/8以降 Sonnet）

- 上の修正1〜7（1件ずつ Issue→PR。修正後に design-review で before/after 再採点）
- **タスク8: Playwright 統合テスト** — 全シーン遷移・クリック・finale 動線・375px
- **タスク9: Lighthouse 計測 → Cloudflare Pages 公開** — バンドル 2,030kB → manualChunks
- **Resume 接続**（ユーザー PDF 待ち。受領後: public/resume.pdf + ContactScene.tsx href 1行）

### 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio の Phase B 仕上げセッション（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-17.md の「Sonnet 向け修正指示書」を読んで、
修正1（Basketballゴール実文法化）から順に 1件=1 Issue/PR で進めて。
ルール: Issue→branch→PR→merge厳守 / pnpm必須 / 3D変更は必ずPlaywrightで目視検証
（headed必須・コールドロード初回5秒待ち・以降3.5秒・page.gotoでなくナビリンククリック・座標クリック）/
維持対象（HANDOFF記載）を壊さない / 完了報告前に実行結果で検証 /
コンテキスト60%で見切り→HANDOFF_PHASE3-18とロードマップ更新で終了。
```

## 重要ファイル

| ファイル | 変更内容 |
|---|---|
| `src/components/canvas/HomeAurora.tsx` | 新規: 流体オーロラ（fbm + トレイル + スクリーン空間マスク） |
| `src/components/canvas/HomeBg.tsx` | HomeAurora 組み込み（2行） |
