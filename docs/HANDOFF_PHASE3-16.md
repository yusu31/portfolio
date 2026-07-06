# HANDOFF Phase 3-16 — クリック波紋（署名的インタラクション）

**日付:** 2026-07-06 夜
**前回引継ぎ:** `docs/HANDOFF_PHASE3-15.md`
**現在ブランチ:** main（PR #169 マージ済み）

**背景:** ユーザーが X の事例（MINAMO: コードがリアルタイムに描く水面 / Taste skill）を共有し、
「こういうインタラクティブさを追求したい」と要望。Fable 5 の週間残枠が少ないため
（7/6 夜時点で71%消費・利用は7/7まで）、確実に効く署名的1本に絞って実施した。

---

## このセッションで完了したこと

### クリック波紋（PR #169）

フィールドクリック受理地点に、シーンアクセント色の発光リングが広がる
（メイン 0.9s easeOutCubic + 0.18s 遅れのエコーリング、toneMapped=false で Bloom）。
「入力→即フィードバック」の欠落が最大の"安さ"だった。実装は `GlobalCanvas.tsx` の
`ClickRipple` + `RIPPLE_COLORS`。ガードで無視されたクリック（入場中・カメラtween中）には
出さない＝受理の合図として設計。波紋は最大6個プール。

---

## セッション中に得た知見（次回の検証で必須）

1. **コールドロード直後の初回シーンは Playwright で5秒待つ**。シェーダコンパイルで
   フレームが凍ると GSAP の入場 tween が wall-clock 3.5秒を超えて残り、
   ガードが正しくクリックを弾く（デバッグログで実証: entering:true / camTween:true）。
   2シーン目以降は3.5秒でよい
2. **TaskStop で pnpm dev を止めてもポートが解放されないことがある**（Windows で node が孤児化）。
   現在 5173〜5183 が概ね占有済み。次セッションは起動ログの実ポートを必ず確認。
   気になる場合は `taskkill /IM node.exe /F`（他の node 作業がないときのみ）で一掃
3. 検証スクリプトの型: `scratchpad/ripple.mjs` 参照（座標クリック・連写・console中継）

---

## 残タスク（Phase B）

7. **design-review スキルで全5シーン採点→修正**（残り: Home/Volleyball/Contact 仕上げ・
   SceneCardがマーカーを覆いクリックを吸う問題・volleyballのボールがやや大きい件）
8. **Playwright統合テスト** — 全シーン遷移・クリック・finale 動線
9. **Lighthouse計測 → Cloudflare Pages公開** — バンドル 2,030kB → manualChunks
- **Resume接続**（ユーザーPDF待ち）

### 次の「インタラクティブ追求」候補（ユーザーの参考事例に寄せる・優先度はユーザーと相談）

- ボールの軌跡トレイル（移動中に残る発光の尾）
- Home 背景のシェーダ化（マウスに反応する流体/オーロラ。MINAMO 的な「コードが描く」主役）
- ホバー中のホットスポットマーカーの呼吸強調

## 重要ファイル

| ファイル | 変更内容 |
|---|---|
| `src/components/canvas/GlobalCanvas.tsx` | ClickRipple / RIPPLE_COLORS / handleFieldClick に波紋スポーン |
