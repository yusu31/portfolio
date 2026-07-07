# HANDOFF Phase 3-18 — Phase B 修正1-7完了記録

**日付:** 2026-07-07
**前回引継ぎ:** `docs/HANDOFF_PHASE3-17.md`
**現在ブランチ:** main（PR #177〜#189 全マージ済み）
**このセッションのモデル:** Sonnet

---

## このセッションで完了したこと

HANDOFF_PHASE3-17.md の「Sonnet 向け修正指示書」7件を全て1件=1 Issue/PR で完了。

| PR | Issue | 内容 |
|----|-------|------|
| #177 | #176 | 修正1: Basketball ゴールの実文法化（バックボード・リング・ネット・支柱） |
| #179 | #178 | 修正2: Volleyball 3点（白帯白飛び・浮遊ライン・ボールサイズ） |
| #181 | #180 | 修正3: Contact 2点（クリスタル球衝突・カード配色規律） |
| #183 | #182 | 修正4: SceneCard pointer-events none →ボタンのみ auto |
| #185 | #184 | 修正5: Soccer ゴールチョーク化（emissive 3.5→0.18・簡易ネット） |
| #187 | #186 | 修正6: Home ナビグリッド絵文字→inline SVG アイコン |
| #189 | #188 | 修正7: prefers-reduced-motion ガード（波紋・warp・パルス） |

---

## 維持された要素（壊していないことを確認済み）

- Home のオーロラ+クリスタル+タイポの三位一体（HomeAurora.tsx 変更なし）
- Soccer の実ピッチ文法（チョーク化・ネット追加のみ。CHALK定数維持）
- Volleyball の紅白支柱（Antennas コンポーネント変更なし）
- クリック波紋（削除ではなくreduced-motion時のみスキップ）

---

## 技術詳細

### Basketball ゴール（BasketballBg.tsx）
- バックボード: `#1a1a1f` opacity 0.85
- シューターズスクエア: 上下左右4辺 boxGeometry・emissive 0.16
- リング emissive: 3.5 → 0.2、色 #ff6d00
- ネット: 縦10ストランド + 横3リング（逆円錐形）
- 支柱: cylinderGeometry 床まで接地
- リング直下 pointLight orange intensity 4

### Volleyball（VolleyballBg.tsx + GlobalCanvas.tsx）
- 上部白帯: emissive 4.0→0.18（色 #c8d8c8）
- AmbientLines コンポーネント削除（y=2 浮遊緑ライン）
- カメラ: `'/volleyball': { position: [0, 2.0, 4.4], lookAt: [0, 0.3, -3] }`

### Contact（ContactScene.tsx + GlobalCanvas.tsx）
- クリスタル: contactシーン限定 x=2.5, y=0.3 に移動・scale 0.6
- CONTACTS 配列: hoverColor フィールド追加。GITHUB/RESUME の color を `rgba(255,255,255,0.9)` に統一

### SceneCard（SceneCard.tsx）
- コンテナ: `pointerEvents: 'none'` 固定
- ボタン要素のみ: `pointerEvents: 'auto'`

### Soccer ゴール（SoccerBg.tsx）
- GOAL_MAT: `{ color: '#e8f0e8', emissive: '#e8f0e8', emissiveIntensity: 0.18 }`
- GoalNet コンポーネント追加（縦8列×横5段、opacity 0.35、非発光）

### Home ナビグリッド（HomeScene.tsx）
- IconSoccer / IconBasketball / IconVolleyball / IconMail のinline SVGコンポーネント
- hover: opacity 1.0 + scale 1.15

### prefers-reduced-motion（GlobalCanvas.tsx + useSceneTransition.ts）
- `REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- HotspotMarker pulse: `REDUCED_MOTION ? 1 : sin式`
- ClickRipple: `if (!REDUCED_MOTION)` ガード
- warpNavigate / warpIn: reduced-motion 時は即遷移・即表示

---

## Playwright 検証パターン（今セッションで確立）

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=False)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto("http://localhost:5173")
    page.wait_for_timeout(6000)  # コールドロード初回5秒以上
    
    page.locator("a[href='/soccer']").first.click()
    page.wait_for_timeout(3500)  # 遷移後3.5秒
    page.screenshot(path="C:/Users/3fort/AppData/Local/Temp/soccer.png")
```

- `page.locator("a[href='/xxx']").first.click()` でナビリンクをクリック（page.goto 禁止）
- 座標クリックは `page.click(x=640, y=500)` で指定

---

## 残タスク（次セッション向け）

### タスク8: Playwright 統合テスト【次優先】
- 全シーン遷移（Home→Soccer→Basketball→Volleyball→Contact→Home）
- 各シーンのホットスポットクリック→SceneCard 表示確認
- finale 動線（全ホットスポット訪問後の finale 出現）
- **375px モバイル検証**（HANDOFF 未検証扱い）

### タスク9: Lighthouse 計測 → Cloudflare Pages 公開
- バンドルサイズ: 2,030kB → `manualChunks` で分割
- Lighthouse: パフォーマンス・アクセシビリティ計測
- Cloudflare Pages へデプロイ

### Resume 接続（ユーザー PDF 待ち）
- 受領後: `public/resume.pdf` + `ContactScene.tsx` の href 1行

---

## 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio の Phase B タスク8開始（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-18.md を読んで、
タスク8（Playwright 統合テスト・全シーン遷移・ホットスポット・finale・375px）を
1件=1 Issue/PR で実施して。
ルール: Issue→branch→PR→merge厳守 / pnpm必須 / Playwright headed必須 /
コンテキスト60%で見切り→HANDOFF_PHASE3-19とロードマップ更新で終了。
```
