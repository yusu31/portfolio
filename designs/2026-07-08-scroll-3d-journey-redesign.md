# 設計書: 3Dスクロール体験ポートフォリオ（ゼロベース設計）

**日付:** 2026-07-08
**ステータス:** 確定（オープンクエスチョン決着済み・実装フェーズ着手可）
**方針:** 既存コードは実装のベースにしない。引き継ぐのは「コンテンツ（文章・データ・配色）」のみ。
アーキテクチャ・コンポーネント構造・状態管理はすべて新規に設計する。実装は別ウィンドウ（新規セッション）で
ゼロから書き起こす前提。

---

## 1. なぜゼロから作るか

クリック駆動の状態機械（旧V3 Journey）に ScrollControls / Spline を後付けする案を一度検討したが、
以下の理由でボツにした。

- 3Dスクロール体験は機能追加ではなく **体験の構造そのもの**。既存のHTML UIレイヤー・クリックイベント・
  GSAPタイムラインの上にR3Fのスクロール制御を重ねると、z-index / スクロール制御の主導権が競合し、
  「直しては壊す」の繰り返しになる（実際に前回そうなった）。
- 旧コードが持っていた未解決の視覚バグ（他シーンへの演出残留、カードの視認性、ボールの質感）も
  すべて「既存構造に演出を足し算していった結果」であり、構造ごと作り直す方が早い。

→ **既存コードは参照せず、コンテンツだけを新設計に写経する。**

---

## 2. コンテンツインベントリ（既存から抽出・引き継ぐ素材）

### 2.1 サイト全体のトーン
- コンセプトコピー: 「体育教師 → エンジニア転身中」バッジ、「スポーツが育てた思考で、プロダクトを作る」
- 求職ステータス: 「求職中 — 2026年度 入社希望」、自社開発・スタートアップ・副業に積極的
- 背景: 10年間体育教師 → 2024年からコードを書き始め、RaiseTech卒
- ベースカラー: 背景 `#0a0a0f`、アクセントオレンジ `#ff6b2b`
- フォント: "Plus Jakarta Sans" 系（既存UIで使用）

### 2.2 セクション構成とスポーツのメタファー
| セクション | スポーツ | テーマ色 | 内容 |
|---|---|---|---|
| Projects | サッカー | `#4fc3f7`（青） | 作ったもの |
| Skills | バスケットボール | `#ffb300`（オレンジ） | できること |
| About | バレーボール | `#69f0ae`（緑） | 自分について |
| Contact | — | `#ce93d8`（紫） | 連絡先 |

### 2.3 Projects（サッカー相当）— 4カテゴリ・6件
- **Webアプリ** `#4fc3f7`: Task Management（Spring Boot/React/MySQL/Docker、live、GitHub連携あり）、
  Event Finder（Spring Boot/React/MySQL、live、GitHub連携あり）
- **ゲーム** `#ffb300`: TYPING DUNGEON（Phaser.js/TS/Gemini API、planned）、
  MARATHON RPG（React/Samsung Health API/Phaser.js、planned）
- **Webサイト / LP** `#69f0ae`: このポートフォリオ自体（React/Three.js/R3F/GSAP、live）
- **ツール / 自動化** `#ce93d8`: エラー翻訳くん（TS/Chrome Extension API/Gemini API、planned）

各プロジェクトは `name / description / tech[] / status(live|planned) / githubUrl?`

### 2.4 Skills（バスケットボール相当）— 3カテゴリ・17件（level 1〜3）
- **Frontend** `#4fc3f7`: React 19(3), TypeScript(2), Three.js/R3F(2), GSAP(2), Tailwind CSS v4(3), Vite 6(2)
- **Backend** `#ffb300`: Java(2), Spring Boot(2), MySQL(2), REST API(3), JUnit 5(2), MyBatis(1)
- **Infrastructure** `#69f0ae`: AWS EC2/RDS/S3(1), Docker(2), GitHub Actions(2), Cloudflare Pages(2), Git/GitHub(3)

### 2.5 About（バレーボール相当）— 3ポイント
- **Background**: 10年間体育教師→テクノロジーとの出会い→エンジニア。詳細3項目（10YRS体育教師 / 転機 / NOW）
  タグ: 10年間の教員経験・キャリアチェンジ・2024年〜
- **Work Style**: 設計が9割・1機能特化・言葉で先に解く・チームで動く。詳細4項目
  タグ: 設計重視・チームプレー・言語化力
- **Looking For**: 自社開発・成長×価値提供・副業/スタートアップ歓迎。詳細3項目
  タグ: 自社開発・スタートアップ・副業歓迎

各ポイントは `label / title / body / details[](marker,heading,text) / tags[]`

### 2.6 Contact
- Email: 3.fortschritt@gmail.com（`mailto:`）
- GitHub: github.com/yusu31
- Resume: PDF ダウンロード（**未接続 — 履歴書PDF提供待ち、`public/resume.pdf` 配置が必要**）
- フッター表記: "Made with React + Three.js · 2026 · yusu31"

### 2.7 素材・アセット
- テクスチャ: `public/textures/leafy_grass_*`（芝生の diffuse/normal/roughness、サッカー地面用）
- ローダー: `public/sport-loading-white.json`（Lottieサッカーボールアニメーション）
- 写真・実画像は無し（すべて手続き型3D + テキストデータ）
- og-image / favicon あり（サイトメタ情報用、変更不要）

### 2.8 ナビゲーション構造（4項目 + Home）
`Home → Projects(サッカー) → Skills(バスケ) → About(バレー) → Contact` の一直線ジャーニーとして
成立していた（既存はクリック等でシーン間を移動する5ルート構成）。新設計でもこの5コンテンツ塊を
「ホーム + 4セクション」として引き継ぐ。ルーティング方式（React Router 5ルート vs 1ページ内スクロール）
は §5 で再検討する。

---

## 3. 参考サイト分析

**Sébastien Lempens** — https://www.sebastien-lempens.com/ / https://github.com/sebastien-lempens

- スクロール量に応じてカメラが3D空間内を前進・旋回しながら進んでいく体験が核
- セクション切り替えが「ページ遷移」ではなく「同じ空間を進んでいく」感覚で表現されている
- 造形・質感のクオリティが高い（Splineベースの3Dアセットと推測される作り）

**この案件で真似したい要素（優先順位順）:**
1. スクロールでカメラが空間を前進する感覚そのもの（★最重要）
2. 3Dオブジェクトの造形・質感のクオリティ（Spline活用）
3. カメラワークの自然さ（1の結果として付いてくる）

---

## 4. 体験コンセプト

**「1本道をスクロールで進んでいくと、体育教師からエンジニアへのキャリアの旅が空間として展開する」**

- Home（イントロ）→ Projects → Skills → About → Contact を、ページ遷移ではなく
  **1本の連続したスクロール空間**として設計する（従来の5ルートSPA構造は見直し対象）
- 各セクションはスポーツのモチーフ（サッカー/バスケ/バレー）を3D空間の"場"として表現し、
  スクロールで通過していく
- カード型UI（プロジェクト詳細・スキル詳細・About詳細）は3D空間に埋め込まず、
  **常に画面に固定されたHTMLオーバーレイ**として表示する（3D空間内Html配置による視認性低下を避ける）

---

## 5. アーキテクチャ全体像（新規設計）

```
[App]
 └─ 1本の <ScrollControls>（drei）でスクロール量を一元管理
     ├─ <Scroll> (3D空間) — セクションごとの3Dシーン（Spline or R3Fプリミティブ）を
     │                       スクロールオフセットに沿って配置。カメラはこのoffsetの関数として移動
     └─ <Scroll html> (DOM) — 各セクションの見出し・カード・CTAをHTMLで重ねる
```

### 5.1 ルーティングの見直し
- 旧: React Router 5ルート（/, /soccer, /basketball, /volleyball, /contact）を維持するか、
  1ページ内スクロール（アンカー的セクション）に統合するかは**要決定事項**（§9）
- ゼロベース設計としての推奨: **1ページ内スクロール構成**（URLは `/` のみ、セクションはハッシュ or
  スクロール位置で識別）。理由: Lempens系の体験は「ページ間を移動している」感覚を消すのが肝であり、
  ルート遷移を挟むと没入が切れる

### 5.2 状態管理
- クリックで状態機械を進める旧方式は廃止。**スクロール位置（0〜1のoffset）が唯一の真実の状態**
- カード表示・カメラ位置・3Dオブジェクトのvisibilityはすべて offset の関数として導出する
  （派生値であり、独立したstateを持たせない）

### 5.3 アニメーションライブラリの役割分担
- **ScrollControls (drei)**: スクロール量の取得・damping・仮想ページ管理 — カメラ移動の主導権はこちらに一本化
- **GSAP**: スクロールと独立した単発演出のみ（ボタンhover、初回イントロ、カード開閉トランジション）
- **lenis**: 導入しない（ScrollControls と二重にスクロール制御を持つと衝突するため見送り）

---

## 6. スクロール・カメラ設計

- 全体を1本の `pages`（仮想スクロールページ数）で管理し、5つの意味的セクション
  （Home / Projects / Skills / About / Contact）に区間分割する
- 各セクション区間内に、コンテンツ数に応じたカメラのウェイポイントを配置
  （例: Projects=4カテゴリ分、Skills=3カテゴリ分、About=3ポイント分）
- ウェイポイント間はスプライン補間（Catmull-Rom等）でカメラpositionとlookAtを滑らかに繋ぐ
- セクション毎の背景色・フォグ・環境光は offset 区間に応じてクロスフェード

---

## 7. 3D質感の方針（R3Fプリミティブ・確定）

- **Splineは導入しない**（§10参照: 実測でバンドルサイズが2MB超・gzip586KB増となり却下）
- 各セクションの3D造形（サッカーボール的モチーフ、バスケゴール的モチーフ等）はR3Fプリミティブ
  （`MeshTransmissionMaterial`等のdrei標準マテリアル）で質感（transmission/ガラス感/発光）を作り込む
- 新規依存追加なし。既存の `three` / `@react-three/drei` の範囲でマテリアル調整のみで実現する
- 「ボールが画面下1/3だけ透明感を出て見える」という質感要求は、マテリアル設定 or
  カメラのフレーミング（ボールを画面下端でクロップする構図）で実現する

---

## 8. UI/情報表示レイヤー設計

- カードUI（プロジェクト/スキル/About詳細）は `<Scroll html>` 内に配置し、
  該当セクションのoffset区間でのみ opacity/pointer-events を有効化する
- 情報構造は §2 のデータをそのまま使う（型定義も content-onlyで移植、ロジックは新規実装）
- Contactセクションのみ、3Dスクロール空間の終着点として「静止したまとめ画面」に近い演出にする
  （既存 ContactScene の一覧UIのトーンを踏襲）

---

## 9. 実装フェーズ計画（別ウィンドウでゼロから実装する前提）

| Phase | 内容 |
|---|---|
| 0 | 本design docのレビュー確定・オープンクエスチョン（§10）の意思決定 |
| 1 | 新規ブランチで白紙からプロジェクト構造を作成。ScrollControls + 1セクション（Home→Projects間）だけで「スクロールでカメラが進む」感覚を検証 |
| 2 | R3Fプリミティブでの質感テスト（`MeshTransmissionMaterial`等、1オブジェクトで検証） |
| 3 | Projects/Skills/Aboutの3セクションを§2データで実装、カードUI（Scroll html）を実装 |
| 4 | Contactセクションを実装、全体を通しでスクロールして体験を確認 |
| 5 | レスポンシブ（375px含む）・reduced-motion対応・Lighthouse・公開 |

Phase 1で「スクロールでカメラが空間を進む」という★1の核体験だけを最速で検証し、
手触りが良ければ Phase 2以降（Spline・コンテンツ拡充）に進む。

---

## 10. オープンクエスチョン（決定済み・2026-07-08）

1. **ルーティング方式 → 1ページ内スクロールに決定**。§6の設計（Home/Projects/Skills/About/Contactを
   1本のスクロール空間として、各セクションをスポーツの"場"として通過する）が、バスケ・バレーも
   場面転換する前提を最初から満たしているため、複数ルート維持の折衷案は不要と判断
2. **Spline vs R3Fプリミティブ → R3Fプリミティブに決定**。使い捨てブランチで
   `@splinetool/react-spline` を実際にインストールし、動的importでダミーシーンをビルドして
   バンドルサイズを実測した結果、ベースライン最大チャンク732KB(gzip190KB)に対し
   追加チャンクが2MB超(gzip586KB)、さらにphysics(1.98MB)・gaussian-splat-compression・
   navmesh・boolean演算・howler・opentype等が芋づる式にバンドルされることが判明。
   パフォーマンス要件と相容れないため却下し、質感強化はR3F側のマテリアル調整
   （transmission/clearcoat等）で行う
3. **実装場所 → 既存リポジトリに新ブランチを切る方式に決定**
4. **Resume PDF**: 引き続き未接続。ユーザーからのPDF提供待ち
5. pnpm必須・Issue→branch→PR→merge厳守は変わらず適用する
