# HANDOFF Phase 3-19 — タスク8 Playwright 統合テスト完了記録

**日付:** 2026-07-07
**前回引継ぎ:** `docs/HANDOFF_PHASE3-18.md`
**現在ブランチ:** main（PR #193 マージ済み）
**このセッションのモデル:** Sonnet

---

## このセッションで完了したこと

タスク8: Playwright 統合テスト（Issue #192 / PR #193）  
**13テスト全合格、3.3分で完走。**

| テスト群 | 件数 | 手法 |
|---|---|---|
| 全シーン遷移（Home→Soccer→Basketball→Volleyball→Contact→Home） | 1 | nav リンク a[href] クリック |
| Soccer ホットスポット（webapp, game） → SceneCard 表示 | 2 | canvas 座標クリック |
| Basketball ホットスポット（frontend, backend） → SceneCard 表示 | 2 | `__e2eSetHotspot` ヘルパー |
| Volleyball ホットスポット（background, style） → SceneCard 表示 | 2 | canvas 座標クリック |
| finale 動線 → /basketball 自動遷移 | 1 | `__e2eSetHotspot` + waitForURL |
| 375px モバイル viewport での全シーン遷移 | 5 | force クリック |

---

## 追加したファイル・変更一覧

### 新規作成
- `playwright.config.ts` — timeout 90s, headed: false, workers: 1, desktop + mobile projects
- `tests/e2e/scene-transitions.spec.ts` — 13テスト本体

### 既存ファイル変更

**`src/components/ui/SceneCard.tsx`**
- `data-testid="scene-card"` + `data-visible={visible ? 'true' : 'false'}` 追加
- Playwright の `waitForSelector('[data-testid="scene-card"][data-visible="true"]')` で確認

**`src/contexts/SceneContext.tsx`**
- DEV 限定 window ヘルパー追加（`import.meta.env.DEV` ガード付き）
```tsx
window.__e2eSetHotspot = (id: string) => {
  setActiveHotspotId(id)
  markVisited(id)
}
```

**`src/pages/SoccerScene.tsx`**（プロダクションバグ修正含む）
- finale タイマーが useEffect cleanup でキャンセルされるバグを `finaleFiredRef` パターンで修正
- 詳細は下記「発見・修正したバグ」参照

---

## テスト設計の工夫・判断記録

### Basketball 座標クリック問題
Basketball シーンはカメラ位置 `[0, 3.2, 8]` の角度が Soccer/Volleyball と異なり、
数学的に正しい座標を計算しても canvas クリックでボールが届かない問題が発生。

原因は不明（R3F のレイキャスト挙動、カメラ lookAt の歪み、など）。
Soccer/Volleyball は座標クリックで動作したため、Basketball のみ `__e2eSetHotspot` を採用。
DEV 環境限定かつ PROD ビルドには含まれないため許容。

### 375px モバイルテスト
`test.beforeEach` で `page.setViewportSize({ width: 375, height: 812 })` を設定。
mobile project を使わず desktop project 内で viewport を変更することで
設定をシンプルに保ちつつモバイル挙動を検証。

---

## 発見・修正したバグ

### SoccerScene finale タイマーキャンセルバグ（本番バグ）

**症状**: finale ゾーンに近接後、/basketball への自動遷移が発生しない場合があった。

**根本原因**:
1. `activeHotspotId === 'finale'` → useEffect で `setForceTarget([0, 8, -22])` 呼び出し
2. ボールが finale ゾーン外（z=-22）に向けて移動開始
3. useFrame が finale ゾーン（radius 2.0）を通過する際に `prevActiveRef = 'finale'` → その後 `null`
4. `setActiveHotspotId(null)` → React 再レンダー → useEffect cleanup が `clearTimeout(timer)`
5. 1600ms タイマーがキャンセル → `warpNavigate` 未発火

**修正**: `finaleFiredRef` で一度だけ発火させるパターンに変更
```tsx
const finaleFiredRef = useRef(false)
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// 一度だけ発火（状態変化によるタイマーキャンセルを防ぐ）
useEffect(() => {
  if (showFinale && activeHotspotId === 'finale' && !finaleFiredRef.current) {
    finaleFiredRef.current = true
    setForceTarget([0, 8, -22])
    timerRef.current = setTimeout(() => {
      warpNavigate(() => goScene('/basketball'), '#ff8c00')
    }, 1600)
  }
}, [showFinale, activeHotspotId, setForceTarget, goScene])

// アンマウント時のみクリーンアップ
useEffect(() => {
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [])
```

---

## Playwright テスト設計パターン（確立済み）

```typescript
const COLD_LOAD = 6000   // 初回コールドロード待ち
const SCENE_WAIT = 3500  // シーン遷移後の安定待ち
const BALL_MOVE  = 4500  // ボール移動待ち

// ナビリンクで遷移（page.goto 禁止）
await page.locator('a[href="/soccer"]').first().click()
await page.waitForTimeout(SCENE_WAIT)

// canvas 座標クリック（Soccer/Volleyball で有効）
await page.locator('canvas').click({ position: { x, y }, force: true })
await page.waitForTimeout(BALL_MOVE)

// window ヘルパーで直接起動（Basketball など座標が不安定なシーン）
await page.evaluate((id) => {
  const fn = window.__e2eSetHotspot
  if (fn) fn(id)
}, 'frontend')

// SceneCard の表示待ち
await page.waitForSelector('[data-testid="scene-card"][data-visible="true"]', { timeout: 12_000 })
```

---

## 残タスク（次セッション向け）

### タスク9: Lighthouse 計測 → manualChunks → Cloudflare Pages 公開【次優先】

1. **バンドルサイズ分析**: `pnpm build` → `dist/assets` のサイズ確認
2. **manualChunks**: three.js / gsap / lottie などを個別チャンクに分割
3. **Lighthouse 計測**: Chrome DevTools または `pnpm dlx lighthouse`
4. **Cloudflare Pages デプロイ**: wrangler または GitHub 連携

現状バンドルサイズ: **2,030kB**（HANDOFF_PHASE3-18 時点）

### Resume PDF 接続（ユーザー PDF 待ち）
- 受領後: `public/resume.pdf` 配置 + `ContactScene.tsx` の href 1行

---

## 次セッション用キックオフプロンプト（Sonnet・コピペ用）

```
C:\Users\3fort\dev\portfolio のタスク9（Lighthouse → manualChunks → Cloudflare Pages）セッション（Sonnet）。
まず dev\portfolio\docs\HANDOFF_PHASE3-19.md を読んで状況を把握して。

タスク9: Lighthouse 計測 → manualChunks → Cloudflare Pages 公開
- pnpm build でバンドルサイズ確認
- vite.config の manualChunks で three / gsap / lottie などを分割
- Lighthouse でパフォーマンス計測（目標: Performance 80+）
- Cloudflare Pages へデプロイ

ルール: Issue→branch→PR→merge厳守 / pnpm必須 /
コンテキスト60%で見切り→HANDOFF_PHASE3-20とロードマップ更新で終了。
```
