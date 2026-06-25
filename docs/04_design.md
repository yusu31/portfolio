# UIデザイン方針（v2 確定版）

> このドキュメントは React + R3F 移行後の確定方針。v1（Astro + Dave Holloway インスパイア）の内容は破棄済み。

## デザインコンセプト

**「OHZI Interactive 的 — 暗い宇宙を漂うクリスタルが出迎えるポートフォリオ」**

採用担当者が開いた瞬間に「他と違う」インパクトを与え、スクロールするほど体育教師→エンジニアへの軌跡が展開される。技術力は説明するのではなく、サイト自体で体感させる。

### 参考サイト

| 参考 | 実装する要素 |
|---|---|
| **OHZI Interactive** | ダーク背景・3D クリスタル・カスタムカーソル・glassmorphism |
| **Bruno Simon** | スクロール連動カメラ・WebGL 全面活用の発想 |

---

## カラーパレット（ダークテーマ）

```css
/* ベース */
--color-dark:  #0a0a0f;  /* body / 最暗面 */
/* セクションは #0d0d18 と #0a0a0f を交互に使い奥行きを出す */

/* カード・グラスモーフィズム */
rgba(255,255,255,.05)  /* カード背景 */
rgba(255,255,255,.10)  /* ボーダー */

/* テキスト */
--color-tx:  rgba(255,255,255,.90);  /* メイン */
--color-sub: rgba(255,255,255,.50);  /* サブ */
--color-bd:  rgba(255,255,255,.10);  /* ボーダー */

/* アクセント（オレンジ系 — 変更なし） */
--color-or:  #fb923c;
--color-or2: #f97316;
--color-am:  #fbbf24;
--color-am2: #f59e0b;
```

---

## レイアウト構成

```
Hero         ← 透明背景 / クリスタル球がバックに輝く
Impact       ← #0d0d18 / 4枚の数値カード
Story        ← #0d0d18 / タイムライン
Projects     ← #0a0a0f / 3枚 PSI カード（ダーク glassmorphism）
Skills       ← #0d0d18 / タグクラウド 2 カラム
Blog         ← #0d0d18 / Coming Soon
Contact      ← #0a0a0f / フォーム
Footer       ← #0a0a0f / リンク＋ページトップ
```

---

## Hero セクション（v2 確定）

```
┌─────────────────────────────────────────────────────────┐
│  [透明 / 3D Crystal がバックに回転・浮遊]               │
│                                                          │
│  ┌──────────────────────┐                                │
│  │  glassmorphism card  │    🔮 サッカーボール風クリスタル │
│  │  rgba(255,255,255,.06)│    IcosahedronEdges + emissive │
│  │  [🟡 badge]           │    オレンジ発光               │
│  │  HEY.                │                                │
│  │  元体育教師...        │                                │
│  │  [Works] [連絡]       │                                │
│  └──────────────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

**背景:** 透明（Canvas の Crystal が透けて見える）+ 右側にオレンジのラジアルグロー

---

## 3D / Canvas 設計

### サッカーボール風クリスタル（`Crystal.tsx`）

```
構成要素:
1. 外殻球体: SphereGeometry(1.5) + MeshStandardMaterial(opacity: 0.15, metalness: 0.25)
2. パネルライン: EdgesGeometry(IcosahedronGeometry(1.52, 1)) + LineBasicMaterial(#fbbf24, opacity: 0.88)
3. 内部コア: IcosahedronGeometry(0.95, 1) + emissive(#f97316, intensity: 2.8) パルス
4. 中心点: SphereGeometry(0.28) + emissive(#fbbf24, intensity: 12)

アニメーション:
- 浮遊: Math.sin(t * 0.65) * 0.14
- 自転: rotation.y += delta * 0.18
- マウス視差: rotation.x ← state.pointer.y * -0.4 (lerp 0.05)
- コアパルス: emissiveIntensity = 2.8 + sin(t * 2.2) * 1.4
```

### シーンライティング（`Scene.tsx`）

```
- ambientLight: intensity 0.15（暗め）
- pointLight orange(#fb923c): position [4,4,6], intensity 40
- pointLight amber(#fbbf24): position [-4,-3,-4], intensity 20
- pointLight white: position [0,0,8], intensity 8
```

### カメラリグ（`CameraRig.tsx`）

```
useScrollProgress() → camera.position.y を scroll%に応じて lerp
```

### ポストプロセッシング（Phase 3-5 予定）

```
Effects.tsx: EffectComposer + Bloom
理由で除外中: @react-three/postprocessing の互換性確認後に再統合
```

---

## タイポグラフィ

```css
--font-ja: "Noto Sans JP";    /* 日本語本文 */
--font-en: "Plus Jakarta Sans"; /* 英語・見出し・数字 */
```

```
Hero HEY.:      clamp(3.4rem, 7vw, 5.2rem) — weight 800
セクション H2:  clamp(1.75rem, 4.5vw, 2.75rem) — weight 700
本文:           0.85–0.9rem
ラベル上部:     0.66rem, letter-spacing 0.22em, UPPERCASE, --color-or
```

---

## インタラクション

### カスタムカーソル
```
#cd: 9px 白丸（mix-blend-mode: difference）
#cr: 38px 枠円（遅延追従）
モバイル: cursor: auto に戻す
```

### 3D カードチルト（Projects）
```
mousemove → perspective(900px) rotateY/rotateX
radial-gradient グレア
mouseleave → バネ戻し cubic-bezier(.23,1,.32,1)
```

### GSAP SplitText（Hero）
```
SplitText.create('#hey', { type: 'chars', mask: 'chars' })
gsap.from(chars, { yPercent: 110, duration: .85, stagger: .06, ease: 'power3.out' })
try/catch でフォールバック（opacity + y）
```

---

## プロジェクト表示フォーマット（PSI）

```
Problem  → rgba(249,115,22,.08) bg / rgba(249,115,22,.35) border
Solution → rgba(217,119,6,.08) bg  / rgba(251,191,36,.35) border
Impact   → rgba(194,65,12,.10) bg  / #f97316 border + bold orange text
```

---

## アニメーション原則

1. `prefers-reduced-motion` 対応必須
2. Canvas（3D）は全画面常時描画 → 他セクションで追加 Three.js は使わない
3. ScrollTrigger の `kill()` を useEffect return で必ず実行（メモリリーク防止）
4. モバイルでカーソルエフェクト無効

---

## フェーズ別実装ロードマップ（v2）

### Phase 3-1 ✅ 完了（PR #26）
- Vite + React + TypeScript + R3F + Tailwind セットアップ

### Phase 3-2 ✅ 完了（PR #28）
- UIレイヤー全セクション移植（Hero / Impact / Story / Projects / Skills / Blog / Contact / Footer）

### Phase 3-3/3-4 ✅ 完了（PR #30）
- React 19 アップグレード（R3F v9 互換）
- ダークテーマ全面移行
- サッカーボール風クリスタル実装

### Phase 3-5 🔲 未着手
- `Effects.tsx` 再統合（Bloom ポストプロセッシング）
- クリスタル発光感の最大化

### Phase 3-6 🔲 未着手
- スクロール連動カメラ（CatmullRomCurve3 パス）
- セクション到達でカメラ角度変化

### Phase 3-7 🔲 未着手
- ローダーアニメーション（GSAP + count）

### Phase 3-8 🔲 未着手
- 統合テスト・最適化・デプロイ確認
- Lighthouse 計測・Core Web Vitals

---

## UIプロトタイプ（旧 v1 参考のみ）

- v5（旧）: https://claude.ai/design/p/78ac1661-3928-4101-92c1-00741eeaba5b?file=portfolio-v5.dc.html
- ※ v2 では React + R3F で直接実装のため Claude Design プロトタイプは参照のみ
