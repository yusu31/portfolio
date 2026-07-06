# HANDOFF Phase 3-15 — Phase B セッション2続き（視覚改善3本）

**日付:** 2026-07-06
**前回引継ぎ:** `docs/HANDOFF_PHASE3-14.md`
**現在ブランチ:** main（PR #161 / #163 / #165 マージ済み）
**Phase B タスクリストの原本:** `Documents\SecondBrain\Projects\roadmap-2026-07.md`

ユーザー指示によりセッション2を延長し、Fable 5 向きの「難しい視覚・インタラクション改善」を
3本連続で実施した。**ユーザーの明示要望: 参考サイト（ohzi.io系）にインタラクティブを寄せ、
UI/デザインを見直してクオリティを上げること。**

---

## このセッションで完了したこと

### タスク6: Soccerピッチの実スタジアム化（PR #161）

トロン感の主因は「縦方向の発光ライン3本」（実ピッチに存在しない格子）と等間隔 Grid。
→ 撤去し、実スタジアムの文法へ: 刈り込みストライプ（#0a1a06 / #16300c 横帯）＋
タッチライン・ゴールライン・ハーフウェーライン・センターサークル・ペナルティボックス・
ペナルティスポット（チョーク #c8d8c8・emissive 0.18 でネオン化回避）。
ボール定位置(0,0)＝キックオフスポットの構図。

### ボールの「灰色の岩」問題を根本解決（PR #163）

原因3つ: ①中心y=-1.2が床面と同一→半埋まりドーム ②transmission 0.92の透過先が
暗背景≒黒＋opacity 0.55→灰色ゴースト ③発光体なのに周囲を照らさない。
→ click-drive時: シェル半径ぶんリフト接地（Crystal内部 `position-y=1.5`、移動ロジック無変更）／
内部pointLight #ff8c42 2.4（床にオレンジの光だまり）／opacity 0.9・transmission 0.85・
emissive #f97316 0.12（0.22は粘土っぽく平板→0.12に調整済み）。Home は不変。

### バスケ床の白飛び＋実コート文法（PR #165）

白飛びの原因は `Environment preset="warehouse"`（明るいHDRI）の反射床への映り込み。
→ night に変更（反射の主役＝リム・ライン・ボールの光）。
ライン十字2本 → サイドライン・エンドライン・ハーフコートライン・センターサークル・
3Pアーク（ringGeometry thetaStart=π）・ペイントエリア＋FTサークル（#c87000 継承）。

---

## セッション中に得た知見（次回に効く）

1. **3シーン共通の構図言語が確立**: ボール定位置＝センターサークル/キックオフスポット。
   「実在するコートの文法」に寄せるとトロン感が消える（soccer/basketball で実証）
2. **背景マウスパララックスは既に全Bgに実装済み**（SoccerBg/BasketballBg の bgRef、
   pointer×0.3/0.15 lerp）。ohzi.io の「背景だけマウス追従」は達成済み
3. **Environment preset が反射材質・ガラス材質の見た目を支配する**。
   暗いシーンに warehouse 等の明るいHDRIを使うと床白飛び・ボール白ゴーストの原因になる
4. **PR #163 のリフトにより volleyball ではボールが画面下中央でやや大きく映る**。
   気になるなら volleyball カメラ [0,1.8,3.5] を少し引く（次回 design-review で判断）

---

## 残タスク（Phase B）

7. **design-review スキルで全5シーン採点→修正**（ボール岩・バスケ床は解消済み。
   残り観点: Home/Volleyball/Contact の仕上げ、SceneCard がマーカーを覆いクリックを吸う問題、
   バスケ上空の茶色いもや感の要否判断）
8. **Playwright統合テスト** — 全シーン遷移・クリック・finale 動線
9. **Lighthouse計測 → Cloudflare Pages公開** — バンドル 2,030kB 警告 → manualChunks
- **Resume接続**（ユーザーの履歴書PDF提供待ち → public/resume.pdf 配置 + ContactScene href 1行）

## 重要ファイル（このセッションで変更）

| ファイル | 変更内容 |
|---|---|
| `src/components/canvas/soccer/SoccerBg.tsx` | 実ピッチ化（ストライプ＋マーキング） |
| `src/components/canvas/Crystal.tsx` | click-drive: リフト接地＋pointLight＋材質調整 |
| `src/components/canvas/basketball/BasketballBg.tsx` | Environment night＋実コートライン |

検証手順・Playwright の型は HANDOFF_PHASE3-14 の知見節を参照。
