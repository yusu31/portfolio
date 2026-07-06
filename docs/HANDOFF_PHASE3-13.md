# HANDOFF Phase 3-13 — Phase B セッション1（タスク1〜3完了）

**日付:** 2026-07-06
**前回引継ぎ:** `docs/HANDOFF_PHASE3-12.md`
**現在ブランチ:** main（PR #147 / #149 / #151 マージ済み）
**Phase B タスクリストの原本:** `Documents\SecondBrain\Projects\roadmap-2026-07.md`

---

## このセッションで完了したこと

### タスク1: ボールジャーニーUX根本修正 → 検証の結果ほぼ解消済みと判明（PR #147）

HANDOFF_PHASE3-10 の Priority 1（float無効化・FLOOR_Y・trajectory Y座標・入場瞬間移動）は
**PR #145 のクリック移動アーキテクチャ移行ですべて解消済み**だった。
`src/data/trajectories/` はディレクトリごと削除済み。ロードマップの記載は #145 以前の情報。

Playwright 検証で代わりに発見した実バグを修正:

- **バスケシーンでボールが視界外**: カメラ (0,2.5,5) がリム (0,2.6,-9) を水平注視 →
  ボール定位置 (0,-1.2,0) が視軸36°下＝FOV50°の外で入場時に見えなかった。
  `SCENE_CAMERAS['/basketball']` を `[0,3.2,8] fov55 lookAt[0,0.6,-7.5]` に変更、BOUNDS zMax 3→2
- **カメラ tween 中のクリック誤動作**: 遷移直後（約1.7秒）は移動中カメラのレイで
  視覚上のクリック位置と大きくズレた地点にボールが移動していた。
  `gsap.isTweening(e.camera.position)` でガード

### タスク2: HomeScene仕上げ・モバイル対応（PR #149）

- interactive モード（ドラッグ回転・クリックOrb生成・EXPLORE遷移）は Playwright で動作確認済み
- **縦画面FOV補正**: `responsiveFov()` を FixedCameraRig に追加。aspect < 16/9 で垂直FOVを
  拡大（上限78°）。モバイルでクリスタルが画面幅いっぱい・soccer の左右ホットスポットが
  視野外になる問題を解消
- **FOVワープ演出の復活**: `fovRef` は旧 JourneyCameraRig の削除（#145）以降**読み手ゼロで死んでいた**。
  FixedCameraRig で「シーン基準fov(tween) + ワープオフセット(fovRef−60)」を毎フレーム合成して復活

### タスク3: ボール移動のベジェ曲線化（PR #151）

- 指数lerp直線移動 → `QuadraticBezierCurve3` + GSAP power2.out（duration 0.7〜1.8s 距離比例）
- 制御点は中点を進行方向寄りへ距離25%横オフセット（勢いを引き継ぐ膨らみ）
- 移動中の再クリックで曲線を引き直し（滑らかな転回）。forceTarget（finale）も同経路

---

## セッション中に得た知見（次回に効く）

1. **ナビ遷移直後の検証クリックは3.5秒待つ** — warp遷移＋入場アニメ＋カメラtweenが
   完了するまで約1.7〜2秒。早すぎるクリックはガードで無視される（仕様）
2. **Playwright headless は WebGL 非対応** — headed モード必須（3-10の教訓を再確認）
3. **フルリロード（page.goto）はローディング画面を挟む** — クライアントサイドナビ
   （`page.click('a[href=...]')`）で実ユーザー動線を再現すること
4. **entry effect が2回発火する**（Suspense/StrictMode 再マウント起因とみられる）。
   実害は入場アニメ再生のみで許容中。根本対応するなら要調査
5. **ballEntry は現在どこからも設定されていない**（location.state 経由の消費のみ、実質デッドコード）

---

## 残タスク（Phase B: 4〜9）

ロードマップ記載の優先順で:

4. **About GlassPanel（Volleyball）の視覚強化** — Projects/Skills 同等のリッチさに
5. **小物** — Resume接続（public/resume.pdf 設置 → ContactScene.tsx の href 修正）・
   Astro遺物削除（src/components/sections/*.astro・src/pages/index.astro・未使用 *Canvas.tsx・
   Nav.astro/Layout.astro 等。grep で参照確認してから削除）
6. **Soccer Grid のトロン感調整**
7. **design-review スキルで全5シーン採点→修正**
   - 気づき（未対応）: クリック移動モードのボールが灰色の岩のように見えるシーンがある
     （soccer は特に。transmission 0.92 / opacity 0.55 が暗い背景で沈む）。
     バスケの床が白飛び気味なのも要チェック
8. **Playwright統合テスト** — 全シーン遷移・クリック・finale 動線の目視確認
9. **Lighthouse計測 → Cloudflare Pages公開** — バンドル 2,027kB（gzip 561kB）警告あり。
   manualChunks / dynamic import での分割を検討（lottie-web の eval 警告も確認）

---

## 重要ファイル（変更のあったもの）

| ファイル | 変更内容 |
|---|---|
| `src/components/canvas/GlobalCanvas.tsx` | SCENE_CAMERAS/BOUNDS 調整・responsiveFov・ワープ合成・ベジェ移動 |

アーキテクチャ全体は HANDOFF_PHASE3-12 と `docs/04_design.md` を参照。
