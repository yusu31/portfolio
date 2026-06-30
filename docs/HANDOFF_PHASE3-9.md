# 引き継ぎプロンプト — Phase 3-9（統合テスト・最適化・デプロイ）

このファイルを読んで作業を再開してください。

---

## 現在の状態（2026-06-30）

`main`ブランチで作業開始できる状態。ボールジャーニー演出 **Phase 1（共通基盤+サッカーシーン）の実装が完了しマージ済み**。次はPhase 2（バスケットボールシーン）。

**リポジトリ:** `c:\Users\3fort\dev\portfolio`
**現在のブランチ:** `main`（クリーン）
**本番:** Cloudflare Pages（main push で自動デプロイ）
**最新コミット:** `b8d15e3`（`git log --oneline -5` で確認）

---

## ⚠️ 開発ワークフロー（必読）

- **Issue → branch → PR → merge を全変更で必須**（コード・ドキュメント問わず例外なし）
- **PRマージはClaudeが確認なしで自動実行してよい**（このプロジェクトに限り事前承認済み）。マージ後のローカルbranch削除・`git remote prune origin`も続けて自動実行する
- このHANDOFFファイル自体の更新もIssue→branch→PRを通すこと

---

## Obsidian記録

- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-hub.md` — プロジェクト全体の戦略・技術スタック・フェーズ進捗
- `C:\Users\3fort\Documents\SecondBrain\Projects\portfolio-ohzi-reference.md` — ohzi.io参考資料（Gemini解析の評価・採用/不採用判断・技術リサーチまとめ）

詳細な背景を知りたいときはユーザーに読み込み許可を取った上で参照する（SecondBrainの読み込みはユーザー明示指示時のみ）。

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
| 3-8 | サッカーボールローダー実装 | #38 |
| 3-9内 | モバイルナビのハンバーガーメニュー対応 | #43, #44 |
| 3-9（ボールジャーニー Phase 1） | サッカーシーン+共通基盤の実装 | #52 |

---

## ✅ 完了：ボールジャーニー演出 Phase 1（サッカーシーン）

ohzi.io風の演出強化として、Hero〜Impact間にスクロール連動の「サッカードリブル＋ロングパス」3Dシーンを実装した。

### ドキュメント
- 設計書: [`docs/superpowers/specs/2026-06-30-ball-journey-transition-design.md`](superpowers/specs/2026-06-30-ball-journey-transition-design.md)（PR #46）
- 実装計画（Phase 1: 共通基盤+サッカーシーン、14タスク）: [`docs/superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md`](superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md)（PR #48）
- 実装PR: #52（`superpowers:subagent-driven-development`でTask 1〜14を実行）

### 実装した主な構成要素（`src/components/canvas/journey/`）
- `scrollProgress.ts` / `trajectory.ts`: セクション内スクロール進捗とボール軌道（放物線・ドリブルバウンド）の純粋関数（Vitestでテスト済み）
- `useJourneySectionProgress.ts`: セクションのスクロール進捗をR3F用にrefで返すフック
- `Floodlights.tsx` / `CourtSurface.tsx` / `GrassField.tsx`: ナイター照明・PBRテクスチャのコート地面・風になびく芝
- `SoccerScene.tsx` / `BallJourney.tsx`: ドリブル→ロングパスのボール演出本体とカメラドリー追従
- `src/components/sections/JourneyZone.tsx`: Hero-Impact間の透明トランジション区間（`prefers-reduced-motion`時は高さ0でシーン自体を無効化）

### 統合検証で発見・修正した実機バグ（個別タスクのレビューでは検出できなかったもの）
Playwrightで実際にスクロールさせて検証した結果、サッカーボールが画面に表示されない不具合があり、5つの原因が複合していた:
1. `useJourneySectionProgress`がセクション位置をキャッシュしたまま使い回し、レイアウトシフトで進捗計算がズレていた → scroll/resizeのたびに測り直すよう修正
2. `CameraRig`がHero区間を超えても`camera.position`への制御を続け、SoccerSceneと毎フレーム奪い合っていた → Hero範囲外では早期returnして制御を手放すよう修正
3. `CrystalContainer`のGSAP `onComplete`がタイマー駆動でクリスタルを復活させ、JourneyZone以降の演出と重なっていた → スクロール位置に応じて強制非表示にするガードを追加
4. `Floodlights`の`emissiveIntensity=6` + `toneMapped=false`がBloomと相互作用し、画面を覆う発光ブロブと化していた → 強度を調整
5. `Effects`内のGodRaysは(4)を直してもdensity/weight/exposureをどう下げても同様にブロブ化したため、**Phase 1では`GOD_RAYS_ENABLED = false`で無効化**（`sunMesh`の配線自体は将来の再チューニングのため維持）

### 既知の制約・フォローアップ
- **GodRaysは現在無効**（`src/components/canvas/Effects.tsx`の`GOD_RAYS_ENABLED`定数）。Bloomとの組み合わせ方を見直す再チューニングタスクが必要
- Hero区間判定の閾値（`window.innerHeight * 0.65`）は`src/components/canvas/heroScrollRange.ts`に集約済み。今後Hero区間に関わる新規コンポーネントを追加する場合は必ずこの関数を使うこと（重複実装すると今回と同種の値ズレバグを再発する）

### 設計上の重要な発見（Phase 2/3実装時にも踏まえること）
1. **Hero以外の全セクションが不透明背景**（[Impact.tsx:60](../src/components/sections/Impact.tsx#L60)等）のため、3D Canvasは通常そこでは見えない。`JourneyZone`のような透明な高さ確保用セクションが各シーンの区間ごとに必要
2. OHZIサイトの「カメラが前進する没入感」は、単なる縦スクロールではなく**カメラがCatmullRomCurve3に沿って3D空間を移動するドリーモデル**として実装する方針（Phase 1のサッカーシーンでは単純な`lerp`+`lookAt`で実装。Phase 2/3でカーブベースに発展させるかは要検討）
3. 山岳地形等のOHZI固有の創作物は模倣しない方針。背景は「ナイター（投光器）+ 風になびく芝（インスタンスシェーダー）+ 実写CC0 PBRテクスチャ」で質感を担保する（GodRaysは上記の通りPhase 1では無効化）
4. 人物パーツ（手など、バスケ/バレーで必要）はMixamo/Sketchfab CC0素材を`MeshToonMaterial`でワイヤーフレーム発光調にスタイライズし、フリー素材の出自を消す（Phase 2のバスケで着手）
5. CC0テクスチャ等の外部素材を追加する際は、配置ディレクトリに`CREDITS.md`を残す（`public/textures/CREDITS.md`参照）
6. **複数のuseFrameコンポーネントが同じ`camera.position`やグローバルなスクロール状態を操作する場合、区間外では明示的に制御を手放す（早期return）か、状態を一元管理しないと競合する**。Phase 1で実際に踏んだ問題（CameraRig×SoccerScene、GSAP×scroll位置）なので、Phase 2/3で新しいシーンを追加する際は同じ轍を踏まないよう設計段階で確認する

### 次にやること
バスケットボールシーン（Phase 2）の実装計画を新規作成する。Phase 1で確立した`scrollProgress.ts` / `trajectory.ts` / `useJourneySectionProgress.ts` / `JourneyZone.tsx` / `heroScrollRange.ts`の共通基盤を再利用する。手モデル（Mixamo/Sketchfab CC0）の調達から着手が必要。

---

## 技術スタック（確定）

```
React 19.2.7 + Vite 6 + TypeScript 5.7
@react-three/fiber v9.6.1
@react-three/drei v10.7.7
@react-three/postprocessing v3.0.4（Bloom稼働中。GodRaysは実装済みだが無効化中）
GSAP 3.15 + ScrollTrigger + SplitText
lottie-web 5.13（ローダーのcanvasレンダリング）
Lenis 1.3
Tailwind CSS v4
Three.js 0.184
Vitest 4.1.9（Phase 1で導入。trajectory/scrollProgressの計9テスト）
```

`@rive-app/react-canvas` と `lottie-react` はPhase 3-8で未使用と判明し削除済み。

**重要: このリポジトリは実体としてpnpmで運用されている**（`pnpm-lock.yaml`がgit管理対象、`node_modules`がpnpm形式）。`npm install`はarboristのクラッシュで失敗するため、**`pnpm install` / `pnpm add` / `pnpm test` / `pnpm dev` / `pnpm build`を使うこと**。

---

## 現在のアーキテクチャ

### Canvas（App.tsx）
```tsx
<Canvas
  style={{
    position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100vh', zIndex: 0,
  }}
  camera={{ position: [0, 0, 5], fov: 60 }}
  gl={{ antialias: true, alpha: false }}
  dpr={[1, 2]}
>
  <Suspense fallback={null}>
    <Scene />
  </Suspense>
</Canvas>
```
`<Loader />` はSuspense外（UI Layer内）に配置し、`useProgress`でCanvas内のロード状況を監視。
`<main>`内は `Hero → JourneyZone(id="journey-soccer") → Impact → Story → ...` の順。

### Nav.tsx（モバイル対応済み）
768px未満でハンバーガーメニュー→`createPortal`で`document.body`直下にフルスクリーンオーバーレイを描画。`nav`要素の`backdrop-filter`がposition:fixedのcontaining blockになる問題を回避するためportal化している（詳細はPR #44参照）。

---

## 既知の注意点

1. **`alpha: false` 必須**: transmission が暗背景を必要とする
2. **楕円防止**: Crystal の x/z 座標はずらさない（y=-0.4 はOK）
3. **Lenis**: `main.tsx` のモジュールレベル（`autoRaf: false`）。移動しない
4. **LF警告**: Windows CRLF変換警告は無視してよい
5. **不透明背景**: Hero以外の全セクションは不透明背景。3D演出を見せたい区間は`JourneyZone`のような透明スペーサーが必要
6. **pnpm必須**: `npm install`は使わない（上記「技術スタック」参照）
7. **GodRays無効化中**: `Effects.tsx`の`GOD_RAYS_ENABLED = false`。Bloomとの組み合わせ方を再チューニングするまで触らない
8. **Hero区間閾値**: `heroScrollRange.ts`の`getHeroScrollRange()`に集約。重複実装しない

---

## Phase 3-9 残りスコープ

```
1. ボールジャーニー Phase 2（バスケットボールシーン、手アセット調達含む）
2. ボールジャーニー Phase 3（バレーボールシーン）
3. GodRaysの再チューニング（Bloomとの組み合わせ方見直し）
4. 全セクション（Hero〜Footer）のスクロール・インタラクション通し確認
5. モバイル/タブレットでのレスポンシブ確認（Canvas DPR・パフォーマンス）
6. テクスチャの圧縮・最適化（leafy_grass系3枚が現状計約3MB未圧縮）
7. Lighthouse等でのパフォーマンス計測・改善
8. Cloudflare Pages 本番デプロイ設定の確認・最終リリース
```

---

## セッション開始チェックリスト

1. `git log --oneline -5` → 最新が `b8d15e3` であることを確認
2. `docs/HANDOFF_PHASE3-9.md` を読む（このファイル）
3. Phase 2の実装計画がまだなければ、設計書を踏まえて新規作成する（`superpowers:writing-plans`等）
4. `superpowers:subagent-driven-development` スキルで計画をタスクごとに実行する

---

## フェーズロードマップ（残り）

| フェーズ | 内容 | 状態 |
|---|---|---|
| 3-9（ボールジャーニー Phase 1） | サッカーシーン+共通基盤の実装 | ✅完了（PR #52） |
| 3-9（ボールジャーニー Phase 2） | バスケットボールシーン（手アセット調達含む） | **← 次にやる** |
| 3-9（ボールジャーニー Phase 3） | バレーボールシーン | 🔲未着手 |
| 3-9（残り） | GodRays再チューニング・統合テスト・Lighthouse計測・Cloudflareデプロイ | 🔲未着手 |
