# デザインシステム — yusu portfolio v2

## 1. カラーパレット

既存のオレンジウォームパレットを継承する。

```css
/* v1から継承（global.css） */
--color-or:    #fb923c;   /* orange-400 — メインアクセント */
--color-or2:   #f97316;   /* orange-500 — ボタン・CTA */
--color-or3:   #fdba74;   /* orange-300 — ライトアクセント */
--color-am:    #fbbf24;   /* amber-400  — Hero・発光 */
--color-am2:   #f59e0b;   /* amber-500 */
--color-cream: #fffbf5;   /* 背景（ライトセクション） */
--color-tx:    #1c0f00;   /* テキスト（メイン） */
--color-sub:   #7c6048;   /* テキスト（サブ） */
--color-bd:    #e8d0b8;   /* ボーダー */

/* v2で追加（3Dシーン用） */
--color-dark:  #0a0a0f;   /* Canvas背景（ダーク） */
--color-glow:  #fbbf24;   /* Bloomターゲット色 */
```

---

## 2. タイポグラフィ

```css
--font-ja: "Noto Sans JP", system-ui, sans-serif;
--font-en: "Plus Jakarta Sans", system-ui, sans-serif;
```

| 用途 | フォント | サイズ | ウェイト |
|---|---|---|---|
| セクション見出し | font-ja | `clamp(1.75rem, 4.5vw, 2.75rem)` | 700 |
| 英語ラベル | font-en | `0.66rem` | 700 |
| 本文 | font-ja | `0.88rem` | 400 |
| ボタン | font-ja | `0.83〜0.87rem` | 700 |

---

## 3. カスタムカーソル仕様（v2刷新）

ohzi.io の球体カーソルに寄せる。

| 要素 | v1 | v2（刷新） |
|---|---|---|
| 形状 | 小ドット（9px） + 輪郭リング（38px） | グレー球体（40px、グラデあり） |
| 追従 | `requestAnimationFrame` lerp | Framer Motion `spring` |
| ブレンド | `mix-blend-mode: multiply` | `mix-blend-mode: difference` |
| ホバー時 | scale拡大 | テキスト出現（"EXPLORE"等） |

```tsx
// Cursor.tsx 設計
const spring = { type: 'spring', stiffness: 150, damping: 20 };

<motion.div
  className="cursor-sphere"
  animate={{ x: mouseX, y: mouseY }}
  transition={spring}
  style={{ mixBlendMode: 'difference' }}
/>
```

---

## 4. アニメーション仕様

### スクロールリビール（UIレイヤー）
```css
/* 既存から継承 */
.reveal { opacity: 0; transform: translateY(22px); transition: 0.7s ease; }
.reveal.in { opacity: 1; transform: none; }
```

### 3Dアニメーション（Canvasレイヤー）

| アニメーション | 実装 | パラメータ |
|---|---|---|
| クリスタル浮遊 | `useFrame` y軸sin | amplitude: 0.18, speed: 0.01 |
| クリスタルパラックス | `useMouse` → rotation lerp | factor: 0.5, lerp: 0.03 |
| カメラスクロール | `useScrollProgress` → `CatmullRomCurve3` | lerp: 0.05 |
| パーティクル回転 | `useFrame` y軸定速 | speed: 0.0003 |
| Bloom発光 | `postprocessing` | luminanceThreshold: 0.85, intensity: 1.2 |

### ローダーアニメーション
```
0%     → ロゴフェードイン
20-90% → プログレスバー + パーセンテージカウント
100%   → 画面全体フェードアウト → メインシーンへ
```

---

## 5. スペーシング・レイアウト

既存の `max-w-5xl mx-auto px-6 py-24` を踏襲。

| 用途 | クラス |
|---|---|
| セクション横幅 | `max-w-5xl mx-auto` |
| セクション縦余白 | `py-24` |
| カード角丸 | `rounded-2xl` |
| ボーダー | `border border-[var(--color-bd)]` |

---

## 6. WebGLマテリアル仕様

### クリスタル（Hero）
```ts
// 外殻
new THREE.MeshPhongMaterial({
  color: 0xea580c, emissive: 0x3b0d00,
  specular: 0xffffff, shininess: 600,
  transparent: true, opacity: 0.2,
})

// ワイヤーフレーム
new THREE.MeshBasicMaterial({
  color: 0xfbbf24, wireframe: true,
  transparent: true, opacity: 0.7,
})
```

### パーティクル
```ts
new THREE.MeshBasicMaterial({
  color: 0xfbbf24,  // Bloom対象色（1.0超で発光）
  toneMapped: false,
})
```
