# アーキテクチャ設計書 — yusu portfolio v2

## 1. レイヤー設計

画面を2層に完全分離する。

```
┌─────────────────────────────────────────┐
│  UI Layer  (z-index: 10)                │
│  ─ ローダー                              │
│  ─ Nav（固定ヘッダー）                   │
│  ─ カスタムカーソル                      │
│  ─ セクションテキスト（HTML overlay）    │
│  ─ Contactフォーム                       │
│  pointer-events: none（ボタンのみ有効）  │
├─────────────────────────────────────────┤
│  Canvas Layer  (z-index: 0)             │
│  ─ R3F <Canvas> 全画面                  │
│  ─ 3Dシーン（クリスタル・パーティクル） │
│  ─ ポストプロセッシング                  │
│  ─ カメラ（スクロール連動）              │
└─────────────────────────────────────────┘
```

---

## 2. ディレクトリ構成

```
portfolio/
├── src/
│   ├── main.tsx                  # エントリーポイント
│   ├── App.tsx                   # ルートレイアウト（2レイヤー統合）
│   │
│   ├── components/
│   │   ├── canvas/               # R3F Canvas内部
│   │   │   ├── Scene.tsx         # メインシーン（カメラパス管理）
│   │   │   ├── Crystal.tsx       # 既存クリスタルをR3Fで再実装
│   │   │   ├── Particles.tsx     # ダストパーティクル（InstancedMesh）
│   │   │   ├── CameraRig.tsx     # スクロール連動カメラ
│   │   │   └── Effects.tsx       # ポストプロセッシング（Bloom/DOF/Noise）
│   │   │
│   │   ├── ui/                   # UIレイヤー
│   │   │   ├── Cursor.tsx        # 球体カスタムカーソル（Framer Motion）
│   │   │   ├── Loader.tsx        # ローディング画面
│   │   │   └── Nav.tsx           # 固定ナビゲーション
│   │   │
│   │   └── sections/             # 各セクション（HTMLオーバーレイ）
│   │       ├── Hero.tsx
│   │       ├── Impact.tsx
│   │       ├── Story.tsx
│   │       ├── Projects.tsx
│   │       ├── Skills.tsx
│   │       ├── Blog.tsx
│   │       ├── Contact.tsx
│   │       └── Footer.tsx
│   │
│   ├── hooks/
│   │   ├── useScrollProgress.ts  # スクロール進行度（0→1）を返す
│   │   ├── useMouse.ts           # マウス座標（-1→1に正規化）を返す
│   │   └── useLanguage.ts        # i18n切り替えロジック
│   │
│   ├── i18n/
│   │   └── translations.ts       # JP/EN翻訳テーブル（既存から移植）
│   │
│   ├── styles/
│   │   └── global.css            # カラートークン・カーソル・リセット
│   │
│   └── types/
│       └── index.ts              # 共通型定義
│
├── functions/
│   └── api/
│       └── send.ts               # Cloudflare Functions（変更なし）
│
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   ├── sitemap.xml
│   └── robots.txt
│
├── docs/                         # 設計書（本ディレクトリ）
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

---

## 3. データフロー

```
ユーザーのスクロール
    │
    ▼
useScrollProgress() ──→ CameraRig.tsx ──→ Camera.position（lerp補間）
                                       └──→ Crystal.tsx（スケール変化）

ユーザーのマウス移動
    │
    ▼
useMouse() ──→ Cursor.tsx（Framer Motion spring追従）
           └──→ Crystal.tsx（パラックス回転）
```

---

## 4. パフォーマンス設計

| 対策 | 実装方法 |
|---|---|
| Instanced Mesh | パーティクルは`THREE.InstancedMesh`で1draw call |
| モバイル軽量化 | `useMediaQuery`でSP判定 → WebGL無効化・CSS Fallback |
| 遅延ロード | セクションコンテンツは`React.lazy`で分割 |
| `prefers-reduced-motion` | アニメーション一括停止 |
| Pixel Ratio制限 | `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` |

---

## 5. App.tsx の構造イメージ

```tsx
export default function App() {
  return (
    <>
      {/* Canvas Layer - z-index: 0 */}
      <Canvas style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <Scene />
      </Canvas>

      {/* UI Layer - z-index: 10 */}
      <div style={{ position: 'relative', zIndex: 10, pointerEvents: 'none' }}>
        <Loader />
        <Cursor />
        <Nav />
        <main>
          <Hero />
          <Impact />
          <Story />
          <Projects />
          <Skills />
          <Blog />
          <Contact />  {/* pointer-events: auto */}
        </main>
        <Footer />
      </div>
    </>
  );
}
```
