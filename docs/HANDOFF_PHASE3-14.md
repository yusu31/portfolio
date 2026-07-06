# HANDOFF Phase 3-14 — Phase B セッション2（タスク4〜5完了）

**日付:** 2026-07-06
**前回引継ぎ:** `docs/HANDOFF_PHASE3-13.md`
**現在ブランチ:** main（PR #155 / #157 マージ済み）
**Phase B タスクリストの原本:** `Documents\SecondBrain\Projects\roadmap-2026-07.md`

---

## このセッションで完了したこと

### タスク4: About GlassPanel（Volleyball）の視覚強化（PR #155）

- `src/data/about.ts` に `AboutDetail`（marker + heading + text）を追加。
  3項目とも詳細サブカードを持つ: background=タイムライン（10YRS→転機→NOW）/
  style=ナンバリング信条4本 / seeking=チェックリスト。内容は既存 body からの導出のみ
- `VolleyballScene.tsx` のパネルを Soccer/Skills 同等のサブカード形式に再構成
  （ピル + リード文 + 詳細カード群 + 求職中バッジ + タグ）
- **検証で発見した実バグを同梱修正**: `background` ホットスポット [2.5,-1.2,1.0] は
  カメラ([0,1.8,3.5] lookAt[0,0.5,-3])の垂直FOV外（視軸下38.8° > 半FOV30.3°）で
  入場時に画面下へ見切れ、ユーザーから不可視だった → style と対称の [2.5,-1.2,-0.5] へ移動。
  Playwright で3マーカー可視・カード切り替わり（半径競合なし）を確認済み

### タスク5（後半）: Astro遺物と未使用コンポーネントの削除（PR #157）

18ファイル・1,609行削除。Astro遺物11（index/Layout/sections×7/Nav/Footer）+
未使用Canvas3（Soccer/Basketball/VolleyballCanvas）+ 孤児4（Scene/Particles/
FloatingParticles/Hotspot）。CameraRig は HomeBg が使用中のため残置。
全ルート Playwright スモークテスト通過・コンソールエラー0。

### タスク5（前半・未完）: Resume接続 — **ユーザーのPDF提供待ち**

`public/resume.pdf` の実物が存在せず捏造もできないため未実施。
PDFを受け取ったら: ① `public/resume.pdf` に配置 → ② `ContactScene.tsx` の
CONTACTS 配列 Resume エントリの `href: '#'` を `'/resume.pdf'` に変更（1行）。

---

## セッション中に得た知見（次回に効く）

1. **SceneCard は field クリックを吸う** — カード表示中はカード矩形
   （右側なら約 x744-1224 / y550-752 @1280x800）内のクリックが地面に届かず、
   カード背後のマーカーはクリック不可。全シーン共通の既存挙動。タスク7の
   design-review で扱うこと
2. **Playwright はテキストセレクタクリックではなく座標クリックを使う** —
   `page.click('text=...')` はガラスパネルの開閉アニメと相性が悪くフレークした。
   `locator.boundingBox()` → `page.mouse.click(中心座標)` が安定
3. **playwright は npx キャッシュから import** — プロジェクト未導入のため
   `import { chromium } from 'file:///C:/Users/3fort/AppData/Local/npm-cache/_npx/361ceb562f3b3235/node_modules/playwright/index.mjs'`
4. **スクリーンショットの赤いリングはカスタムカーソル**（`Cursor.tsx`）。
   シーン内オブジェクトと誤認しないこと
5. **ポート 5173-5180 が旧 vite プロセスに占有されている**（今回は 5181 で起動）。
   次セッションで検証する場合は起動ログで実ポートを確認すること
6. **`ABOUT_POINTS` の hotspotX/hotspotY は旧2D Hotspot 系の遺物**（Hotspot.tsx 削除済み、
   参照ゼロ）。次の掃除で AboutPoint から外してよい

---

## 残タスク（Phase B: 6〜9 + Resume）

ロードマップ記載の優先順で:

6. **Soccer Grid のトロン感調整**（デジタル感が残っている）
7. **design-review スキルで全5シーン採点→修正**
   - 既知の気づき: クリック移動モードのボールが灰色の岩に見える
     （soccer で顕著。transmission 0.92 / opacity 0.55 が暗背景で沈む）/
     バスケ床の白飛び / SceneCard がマーカーを覆って field クリックを吸う（知見1）
8. **Playwright統合テスト** — 全シーン遷移・クリック・finale 動線の目視確認
9. **Lighthouse計測 → Cloudflare Pages公開** — バンドル 2,030kB（gzip 562kB）警告
   継続中。manualChunks / dynamic import 検討（lottie-web の eval 警告も）
- **Resume接続**（上記・ユーザーPDF待ち）

---

## 重要ファイル（このセッションで変更）

| ファイル | 変更内容 |
|---|---|
| `src/data/about.ts` | AboutDetail 追加（3項目×詳細カード） |
| `src/pages/VolleyballScene.tsx` | パネルをサブカード形式に再構成 |
| `src/data/hotspots/volleyball-hotspots.ts` | background を可視位置 [2.5,-1.2,-0.5] へ |
| （削除18ファイル） | PR #157 参照 |

アーキテクチャ全体は HANDOFF_PHASE3-12 と `docs/04_design.md` を参照。
