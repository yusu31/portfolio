# UIデザイン方針

## デザインコンセプト

**「動く経歴書」ではなく「体験できるストーリー」**

採用担当者がスクロールするたびに、体育教師→エンジニアへの軌跡が展開される。
技術力は説明するのではなく、サイト自体で体感させる。

---

## カラーパレット（ダークファースト）

研究結果: スマートフォンユーザーの82%以上がダークモード使用 → ダークモードを基準に設計。

### ダークモード（デフォルト）

```css
:root[data-theme="dark"] {
  --color-bg:        #0a0a0a;   /* ほぼ黒・目に優しい */
  --color-surface:   #111111;   /* カード・サーフェス */
  --color-border:    #222222;   /* ボーダー */
  --color-text:      #e8e8e8;   /* メインテキスト */
  --color-muted:     #888888;   /* サブテキスト */
  --color-accent:    #22c55e;   /* グリーン（フィールドの緑・スポーツ感） */
  --color-accent2:   #86efac;   /* ライトグリーン（ホバー） */
}
```

**グリーンを選んだ理由:**
- 体育教師のアイデンティティ（グラウンド・フィールドの緑）
- 「成長・生命力・挑戦」のメタファー
- 採用担当者に「技術感」×「スポーツ感」を一色で伝えられる
- シアン/青よりも差別化できる（競合ポートフォリオの8割が青系）

### ライトモード

```css
:root[data-theme="light"] {
  --color-bg:        #f5f5f0;   /* オフホワイト・目に優しい */
  --color-surface:   #ffffff;
  --color-border:    #e0e0e0;
  --color-text:      #1a1a1a;
  --color-muted:     #666666;
  --color-accent:    #16a34a;   /* ダーク目のグリーン（コントラスト確保） */
  --color-accent2:   #15803d;
}
```

---

## タイポグラフィ

```css
/* 日本語: 読みやすさ・信頼感 */
--font-ja: "Noto Sans JP", sans-serif;

/* 英語/数字: 技術感・モダン */
--font-en: "Inter Variable", sans-serif;  /* 可変フォント */

/* コード表示 */
--font-mono: "JetBrains Mono", monospace;
```

### フォントサイズスケール

```
Hero見出し:  clamp(2.5rem, 8vw, 6rem)   /* 流体タイポグラフィ */
大見出し(H2): clamp(1.5rem, 4vw, 2.5rem)
小見出し(H3): clamp(1.1rem, 2vw, 1.5rem)
本文:         1rem (16px)
サブテキスト: 0.875rem (14px)
```

---

## レイアウト

### グローバル構造

```
[Hero - full viewport height]
[About - scroll-reveal]
[Skills - Bento Grid]
[Works - カードグリッド]
[Blog - OGPリンク一覧]
[Contact - フォーム]
[Footer]
```

### Hero セクション

- テキストを画面中央に配置
- 「元体育教師のエンジニア」をサブタイトルとして冒頭に出す（隠さない）
- スクロールダウンで名前・職種・キャッチコピーが時差アニメーションで出現（GSAP）
- 背景: パーティクル or グリッドライン（軽量・JSインパクト最小）

### Skills セクション — Bento Grid

```
┌──────────────┬──────┬──────┐
│              │ Java │ SQL  │
│  Languages   ├──────┼──────┤
│              │  TS  │React │
├──────┬───────┴──────┴──────┤
│Tools │  Spring Boot        │
├──────┴─────────────────────┤
│  Learning Now...           │
└────────────────────────────┘
```

Bento Gridを採用する理由:
- Appleが普及。採用担当者に「整理されている」印象を与える
- About・Skills・Projects・Contactを1画面で見渡せる
- Tailwind CSSの `grid` ユーティリティで実装が容易

### Works セクション

- ホバーでケーススタディ（課題→解決策→学び）がオーバーレイ表示
- デモURLとGitHubボタンを各カードに配置
- フィルター: 「すべて / Web / Game / Tool」

---

## アニメーション詳細

### Hero（GSAP + ScrollTrigger）

```js
// 入場アニメーション
gsap.timeline()
  .from(".hero-subtitle", { y: 20, opacity: 0, duration: 0.6 })
  .from(".hero-name",     { y: 30, opacity: 0, duration: 0.8 }, "-=0.3")
  .from(".hero-cta",      { y: 20, opacity: 0, duration: 0.5 }, "-=0.2")

// スクロールでフェードアウト
gsap.to(".hero-content", {
  scrollTrigger: { trigger: ".hero", scrub: true },
  y: -100,
  opacity: 0
})
```

### セクション出現（CSS Scroll-Driven Animations）

```css
.reveal {
  animation: fade-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 30%;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(2rem); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### ページ遷移（View Transitions API）

```astro
<!-- astro.config.mjs -->
export default defineConfig({
  experimental: { viewTransitions: true }
})
```

---

## インタラクション原則

1. **アニメーションは目的を持つ** — 「動くから動かす」ではなく、視線誘導・情報の優先順位を伝えるため
2. **必ず `prefers-reduced-motion` 対応** — アクセシビリティは妥協しない
3. **モバイルでも同等の体験** — デスクトップ専用のインタラクションを作らない
4. **パフォーマンスを損なわない** — アニメーションによってCore Web Vitalsが下がるなら削除

---

## 参考サイト・インスピレーション

| サイト | 参考にする要素 |
|---|---|
| `cassie.codes` | SVGアニメーション + 遊び心 + 技術力の両立 |
| `bruno-simon.com` | インタラクティブな技術力の見せ方（参考・方向は異なる） |
| Awwwards Animation部門 | 毎月最新トレンドを確認する |

---

## UIプロトタイプ

→ Claude Design MCP で作成予定（設計完了後に実施）
