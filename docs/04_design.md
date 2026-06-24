# UIデザイン方針

## デザインコンセプト

**「Dave Holloway × OHZI Interactive — 明るく・触れる・キャラクターがいるポートフォリオ」**

採用担当者が開いた瞬間にインパクトを受け、スクロールするほど体育教師→エンジニアへの軌跡が展開される。
技術力は説明するのではなく、サイト自体で体感させる。

### 参考サイト（実装方針）

| フェーズ | 参考サイト | 実装する要素 |
|---|---|---|
| 現在（v5 HTML prototype） | Dave Holloway | 2カラムヒーロー・SVGキャラクター・明るい Electric Blue |
| 現在（v5 HTML prototype） | OHZI Interactive | ガラスカード・磁気ボタン・3Dチルト・カスタムカーソル |
| 現在（v5 HTML prototype） | Three.js r169 | IcosahedronGeometry クリスタル（ヒーローのみ） |
| 中期（Three.js 習得後） | OHZI Interactive | WebGL カーソル歪み・本物の ShaderMaterial |
| 長期（Astro 実装） | Bruno Simon 発想 | インタラクティブ 3D シーン・体験型構成 |

---

## カラーパレット（ライトファースト・Dave Holloway 方向）

Dave Holloway インスパイアの明るいパレット。ヒーローはElectric Blueで印象付け、コンテンツ域はウォームクリームで可読性確保。

```css
:root {
  /* Hero */
  --blue:   #1d4ed8;  /* Electric Blue — ヒーロー背景グラデーション基調 */
  --blue2:  #1e40af;
  --blue3:  #2563eb;

  /* Content */
  --cream:  #f5f4f0;  /* ウォームクリーム — コンテンツセクション背景 */
  --white:  #ffffff;

  /* Text */
  --tx:     #0f0f0f;  /* メインテキスト */
  --sub:    #6b7280;  /* サブテキスト */
  --bd:     #e0dcd5;  /* ボーダー */

  /* Accent */
  --ac:     #22c55e;  /* グリーン — 体育教師のアイデンティティ */
  --ac2:    #16a34a;  /* ダークグリーン — テキスト用 */
}
```

**グリーンアクセントを維持する理由:**
- 体育教師のアイデンティティ（グラウンド・フィールドの緑）
- 「成長・生命力・挑戦」のメタファー
- Electric Blue との組み合わせで高コントラスト・視認性◎

---

## レイアウト構成

### グローバルセクション順

```
Hero（2カラム — ヒーローカード + キャラクター + Three.js）
  ↓ Wave 区切り
Impact（数値インパクト 4 カード）
Story（タイムライン）
Projects（PSI フォーマット 3 カード）
Capabilities（スキルタグ）
Contact（フォーム）
Footer
```

### Hero セクション（v5 確定）

```
┌─────────────────┬───────────────────────┐
│  Glass Card     │  SVG Character        │
│  ─────────────  │  ─────────────        │
│  [badge]        │  眼鏡・キャップ       │
│  HEY.           │  青ジャージ           │
│  元体育教師...  │  ラップトップ持参     │
│  [Works] [連絡] │  目がマウス追従       │
│                 │  + Three.js Crystal   │
│                 │  （IcosahedronGeom）  │
└─────────────────┴───────────────────────┘
```

**背景:** Electric Blue グラデーション + アニメーションブロブ（filter: blur）

---

## タイポグラフィ

```css
--font-ja: "Noto Sans JP", sans-serif;   /* 日本語: 読みやすさ・信頼感 */
--font-en: "Plus Jakarta Sans", sans-serif;  /* 英語/数字: モダン・Dave Holloway 風 */
```

### フォントサイズ

```
Hero HEY.:  clamp(3.5rem, 7vw, 5.5rem) — weight 800
セクション H2: clamp(1.9rem, 5vw, 2.9rem) — weight 800
本文:         0.85–0.9rem
ラベル:       0.66rem, letter-spacing 0.22em, uppercase
```

---

## 3D / インタラクション

### Three.js クリスタル（Hero のみ）

```js
// IcosahedronGeometry — detail 1（面が適度に細かい）
// ソリッド: MeshPhongMaterial, blue, opacity 0.22
// ワイヤー: MeshBasicMaterial, green, wireframe
// エッジ:  LineSegments, green
// 内側宝石: 小さい IcosahedronGeometry, green, opacity 0.55
// ライト: AmbientLight + 緑 PointLight + 青 PointLight + 白 PointLight（強度が脈動）
// マウス追従: rotation.y / rotation.x がなめらかに追従
// ボブ: Math.sin(t) でゆっくり上下
```

### Web Audio API（ユーザーが ON/OFF 切替可能）

```
ホバー音: sine 660Hz → フェードアウト 100ms
クリック音: square 200Hz + sine 400Hz の 2 音重ね
```

### GSAP SplitText（Hero テキスト）

```js
SplitText.create('#hey', { type: 'chars', mask: 'chars' })
gsap.from(chars, { yPercent: 110, duration: .85, stagger: .06, ease: 'power3.out' })
// CDN 失敗時の fallback: opacity + y アニメーション
```

### カスタムカーソル

```
#cd: 9px 白丸, mix-blend-mode: difference
#cr: 38px 枠円, 遅延追従
ホバー時: 両方 scale 拡大
モバイル: 非表示 (cursor: auto に戻す)
```

### 3D カードチルト

```js
// mousemove で perspective(900px) rotateY / rotateX
// radial-gradient のグレア効果
// mouseleave でバネ戻し cubic-bezier(.23,1,.32,1)
```

### 磁気ボタン

```js
// data-mag 属性で指定
// mousemove で translate(dx, dy) — 42% 引き寄せ
// mouseleave でバネ戻し
```

---

## プロジェクト表示フォーマット（PSI）

```
Problem  → 赤ボーダー左 — 解決前の痛みを具体的に
Solution → 緑ボーダー左 — 何を作ったか
Impact   → 黄ボーダー左 — 数字で示す成果（太字・緑色）
```

**採用担当者リサーチより:**
- 「React 使いました」は刺さらない
- 「10名テストで作業時間80%削減」は刺さる
- 数字・ビフォーアフターがあるプロジェクトは通過率 3 倍

---

## アニメーション原則

1. `prefers-reduced-motion` 必須対応 — アクセシビリティ妥協なし
2. Three.js はヒーローセクションのみ — ページ全体パフォーマンス保護
3. SVG フィルタ（feTurbulence）はキャンバスのみに適用 — position:fixed との z-index 競合回避
4. モバイルではカーソルエフェクト無効化

---

## フェーズ別実装ロードマップ

### Phase 1（今ここ）— HTML Prototype
- Claude Design で v5 プロトタイプ完成
- Dave Holloway 2カラム + SVGキャラクター + Three.js + Web Audio

### Phase 2 — Astro 実装
- `C:\Users\3fort\dev\portfolio\` に Astro 6 プロジェクト初期化
- Tailwind CSS v4 + GSAP + Three.js + Lenis 1.3.23
- Cloudflare Pages デプロイ

### Phase 3（中期・Three.js 習得後）
- WebGL カーソル歪み（本物の ShaderMaterial）
- OHZI Interactive 的な深度・パーティクル追加

### Phase 4（長期）
- Bruno Simon 発想の体験型構成
- インタラクティブ 3D シーン

---

## UIプロトタイプ

→ Claude Design 作成済み
- v4: https://claude.ai/design/p/78ac1661-3928-4101-92c1-00741eeaba5b?file=portfolio-v4.dc.html
- **v5（最新）: https://claude.ai/design/p/78ac1661-3928-4101-92c1-00741eeaba5b?file=portfolio-v5.dc.html**
