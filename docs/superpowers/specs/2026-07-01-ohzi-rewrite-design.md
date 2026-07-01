# OHZIスタイル全面リアーキテクチャ 設計書

> **ステータス:** 全セクション確定（2026-07-01 brainstormingセッション完了）

---

## 背景・判断に至った経緯

### Phase 1実装後の課題

2026-07-01のセッションにて、Phase 1（サッカーシーン）の実装結果をブラウザで確認したところ、以下の問題が発覚した：

1. **Heroに芝・投光器が映り込む**（SoccerScene の CourtSurface/GrassField/Floodlights がスクロール進捗に関係なく常時レンダリングされており、Hero初期ビューに地面が見えてしまう実装バグ）
2. **芝のクオリティが著しく低い**（単色グラデーションの棒ポリゴンが密集しているだけ。フォグなし・シャドウなし・ライト応答なし）
3. **ohzi.ioの設計思想から根本的にずれている**

### ohzi.ioの設計パターン（スクショ20枚を分析した結論）

| 要素 | ohzi.ioの実態 |
|---|---|
| ページ構造 | **別々のURL（ルーティング）** `/who-we-are` `/how-we-do-it` `/our-work` `/contact` |
| 各ルート内 | 1つの3Dビネット（フルスクリーン透明UI） + クリック連動 + グラスパネル |
| ルート遷移 | ナビクリック → ブランドカラーフラッシュ → 新ルート |
| リッチさの正体 | 強烈な**シーン全体の色グレーディング（フォグ）**＋ **数個のシグネチャープロップ** |
| 中央オブジェクト | ページごとに異なる発光アウトラインの幾何学図形（フレーム形状）が主役 |
| UIレイヤー | 全ページ透明。情報はグラスパネル（backdrop-blur）でオーバーレイ |
| 素材 | PBR（物理ベースレンダリング）＋影＋反射 |

### Geminiプロンプトへの評価

演出的・視覚的な分析は参考にするが以下は注意：
- 「Canvasがfixedされていない」→ **事実誤認**（App.tsxでposition:fixed実装済み）
- ミリ秒精度の数値・cubic-bezierの値 → **Geminiの創作**。実装後に目視チューニング必須

---

## 確定した設計

### ルート構造

```
/              → HomeScene      クリスタル + HEY. + 4グリッドナビ
/soccer        → SoccerScene   Projects（4カテゴリ）
/basketball    → BasketballScene  Skills（3カテゴリ）
/volleyball    → VolleyballScene  About（3ポイント）
/contact       → ContactScene   シンプルな連絡先
```

**旧 `/work` ルートは廃止。** Impact〜Footer のコンテンツは各ルートに分散統合。

### 各ルートの役割（確定）

| ルート | 役割 | クリックポイント |
|---|---|---|
| `/` | 第一印象・全ページへのナビ | — |
| `/soccer` | **Projects** — 作ったもの | 4カテゴリ |
| `/basketball` | **Skills** — できること | 3カテゴリ |
| `/volleyball` | **About** — 自分について | 3ポイント |
| `/contact` | **Contact** — シンプル | — |

### ページ順の根拠

**Projects → Skills → About** の順を採用。採用担当は仕事を先に見たい（業界標準）。
About の補完は Home の1行自己紹介で行う。

### 透明化の適用範囲

| ルート | UIの背景 | 3Dシーン |
|---|---|---|
| `/` | 透明（現行Heroと同じ） | クリスタル（現行のまま） |
| `/soccer` | 透明（全面3D背景） | サッカービネット |
| `/basketball` | 透明 | バスケットボールビネット |
| `/volleyball` | 透明 | バレーボールビネット |
| `/contact` | 不透明（シンプルページ） | なし |

### コンポーネント変更方針

**新規追加:**
- `react-router-dom` v7（pnpm add。React 19対応済み）
- `src/router.tsx` — ルート定義
- `src/pages/HomeScene.tsx` — クリスタル + HEY. + 4グリッドナビ
- `src/pages/SoccerScene.tsx` — Projects（4カテゴリ + グラスパネル）
- `src/pages/BasketballScene.tsx` — Skills
- `src/pages/VolleyballScene.tsx` — About
- `src/pages/ContactScene.tsx` — シンプル連絡先
- `src/components/canvas/journey/RouteTransition.tsx` — フラッシュ遷移
- `src/components/ui/GlobalNav.tsx` — 透明グローバルナビ
- `src/components/ui/GlassPanel.tsx` — 再利用可能なグラスパネル
- `src/components/ui/Hotspot.tsx` — パルスするクリックポイント

**書き換え:**
- `src/App.tsx` → Routerエントリーポイントのみ

**維持（再利用）:**
- `src/components/canvas/journey/scrollProgress.ts` / `trajectory.ts`

**削除（リアーキテクチャ完了後）:**
- `src/components/canvas/journey/SoccerScene.tsx`（旧JourneyZoneベース）
- `src/components/sections/JourneyZone.tsx`

### Canvas配置

**旧:** App.tsx内の1つのCanvas（position:fixed）が全ページ共通
**新:** 各ルートページが自前のCanvasを持つ。ルート遷移時にReact RouterのアンマウントでCanvas切り替わる

→ 複数のuseFrameによるcamera.position競合問題が根本解決される。

### ルート間トランジション演出

1. ナビクリック or シーン終盤でトランジション開始
2. **ボールは消えずに残り続ける**（視覚的連続性）
3. 画面全体が次シーンのブランドカラーで**フラッシュ**
4. React Routerがルート切り替え → 次シーン開始時ボールが画面内にいる

ワープトンネルは使用しない（スポーツ感と合わないため）。

### グローバルナビゲーション

全ページに共通の透明ナビバーを表示：
- 左: ロゴ（YS）
- 右: Soccer / Basketball / Volleyball / Contact のテキストリンク
- 現在ルートをハイライト
- クリックでフラッシュトランジション発動

---

## シーン設計（確定）

### クリックインタラクション（全スポーツ共通）

1. 3Dシーン上にパルスするリング（ホットスポット）が浮遊
2. クリック → そのホットスポットに対応する**グラスパネル**がフェードイン
3. グラスパネル: `backdrop-filter: blur(12px)` + `rgba(10,10,20,0.75)` + 白テキスト
4. 3Dシーンは背景で動き続ける（停止しない）
5. 別のホットスポットをクリック or ✕で閉じる

---

### HomeScene (`/`)

**コンテンツ:**
- 既存クリスタル（変更なし）
- "HEY." テキスト
- 1行自己紹介: `体育教師 → エンジニア。スポーツが育てた思考で、プロダクトを作る。`
- 4グリッドナビ（⚽ Projects / 🏀 Skills / 🏐 About / ✉ Contact）

**3Dシーン:** 現行のクリスタル + グラウンドグロー（変更なし）

---

### SoccerScene (`/soccer`) — Projects

**役割:** 作ったものを種類別に見せる

**クリックポイント（4つ）:**

| カテゴリ | 現在 | 将来（予定） |
|---|---|---|
| 🌐 Webアプリ | TaskManagement・EventFinder | FORMate・MESHILOG・KIRA GIFT・RECOVER LOG・TAIIKU BASE... |
| 🎮 ゲーム | — | TYPING DUNGEON・MARATHON RPG・PROMPT CRAFT... |
| 🖥 Webサイト/LP | このポートフォリオ | 地元店LP・TAIIKU BASE LP... |
| 🔧 ツール/自動化 | — | Chrome拡張・CLI・MCPサーバー・n8nテンプレート... |

グラスパネル内の各プロジェクトに「Live Demo」「GitHub」「Coming Soon」バッジを表示。

**カメラワーク:** Z軸前進ドリー（地面スレスレのローアングル）、GSAP scrub:1〜1.5

**フレーム形状:** 発光するサッカーゴール枠（白、Bloom）→ トランジションのポータルにも兼用

**色グレーディング:** ミッドナイトブルー系フォグ（`#0a1128`付近）

**芝マテリアル:** シャドウ有効化（castShadow/receiveShadow）、PBR、インスタンス芝ブレードへのライト応答追加

---

### BasketballScene (`/basketball`) — Skills

**役割:** 技術スタックを3カテゴリで見せる

**クリックポイント（3つ）:**

| カテゴリ | 内容 |
|---|---|
| Frontend | React / TypeScript / Three.js / R3F / GSAP / Tailwind CSS |
| Backend | Java / Spring Boot / MySQL / REST API |
| Infrastructure | AWS / Docker / GitHub Actions / Cloudflare Pages |

グラスパネル内はアイコン + 技術名 + 習熟度の簡易表示。

**カメラワーク:** Y軸上昇（シュート追従）、頂点でタメ、GSAP scrub

**フレーム形状:** 発光するバックボード（四角形アウトライン、Bloom）

**色グレーディング:** 体育館アンバー（`#b35a00`付近）

**床マテリアル:** `MeshReflectorMaterial`（木目テクスチャ + 反射）

---

### VolleyballScene (`/volleyball`) — About

**役割:** 自分という人間を伝える

**クリックポイント（3つ）:**

| ポイント | 内容 |
|---|---|
| バックグラウンド | 体育教師10年 → プログラミングと出会い → エンジニアへ転身。教えることと作ることをコードでつないだ |
| 仕事スタイル | 設計9割・チームで動く・ユーザーが迷わない1機能特化を信条とする |
| 求める環境 | 自社開発・スタートアップ志向。プロダクトを共に育てる環境 |

**カメラワーク:** レシーブ→トス（Y上昇・タメ）→スパイク（急加速・衝撃波）の3段階

**フレーム形状:** 発光するバレーネット帯（横長の白ライン、Bloom）

**色グレーディング:** サイアン/エメラルド系（`#004d40`付近）

**床マテリアル:** 抽象的グリッドライン（サイバースペース調）

---

### ContactScene (`/contact`)

**コンテンツ:**
- Email リンク
- GitHub プロフィールリンク
- Resume PDF ダウンロード
- （あれば）Zenn / LinkedIn リンク

**3Dシーン:** なし（シンプルな不透明ページ）。軽い背景グラデーションのみ。

---

## マテリアル・ライティング刷新方針

- **影:** `castShadow` / `receiveShadow` を各スポーツシーンで有効化
- **PBR:** roughness / metalness / normalMap を各マテリアルに設定
- **Bloom:** 既存パラメータを維持しつつ各シーンの発光色に合わせてチューニング（目視調整）
- **GodRays:** 引き続き無効化（`GOD_RAYS_ENABLED = false`）。再チューニングは実装完了後の別タスク
- **フォグ:** 各スポーツシーンにシーン固有の `<fog>` を追加（色グレーディングの核心）

---

## 参照資料

- ohzi.ioスクリーンショット分析（2026-07-01セッション）: 合計20枚のスクショを目視確認
- Obsidian: `portfolio-ohzi-reference.md`（Gemini動画解析の評価・採用/不採用の根拠）
- アイデアリスト: `C:\Users\3fort\Documents\SecondBrain\Projects\idea-brainstorm.md`（プロジェクトカテゴリの根拠）
- 旧設計書（JourneyZoneベース、参考用）: `docs/superpowers/specs/2026-06-30-ball-journey-transition-design.md`
- 旧Phase 1実装計画（参考用）: `docs/superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md`
