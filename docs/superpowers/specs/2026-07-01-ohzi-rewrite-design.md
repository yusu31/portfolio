# OHZIスタイル全面リアーキテクチャ 設計書

> **ステータス:** アーキテクチャセクション確定・シーン設計セクション未完（次セッションで完成）

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
| 各ルート内 | 1つの3Dビネット（フルスクリーン透明UI） + スクロール連動 + 2〜3枚のテキストカード |
| ルート遷移 | ナビクリック → ワープトンネル演出（遷移先のブランドカラーを先取り）→ 新ルート |
| リッチさの正体 | 強烈な**シーン全体の色グレーディング（フォグ）**＋ **数個のシグネチャープロップ** |
| 中央オブジェクト | ページごとに異なる発光アウトラインの幾何学図形（フレーム形状）が主役 |
| UIレイヤー | 全ページ透明。テキストは3D空間の手前に浮遊するカード（backdrop-blur or slim glass panel） |
| 素材 | PBR（物理ベースレンダリング）＋影＋反射。自社制作のオリジナルモデル（CCスタジオ業態のため） |

### Geminiプロンプトへの評価（2026-07-01セッション）

Geminiの視覚的・演出的な分析は有用（カメラワーク・軸の分析・PBR・リフレクター床など）。ただし以下は採用時に注意：
- 「Canvasがfixedされていない」→ **事実誤認**（既にApp.tsxでposition:fixedを実装済み）。Canvasが不透明セクション背景に隠れているのが原因で、固定できていないわけではない
- ミリ秒精度のタイムライン数値・cubic-bezierの正確な値 → **Geminiの創作**。実装後に目視チューニングが必要

---

## 確定した設計（アーキテクチャセクション）

### ルート構造

```
/              → HomeScene     現Hero（クリスタル + HEY. + EXPLORE → /soccer へ）
/soccer        → SoccerScene   サッカービネット（フルスクリーン透明 + スクロール連動3D）
/basketball    → BasketballScene
/volleyball    → VolleyballScene → /work へ
/work          → WorkScene     現行の不透明スクロールサイト（Impact → Footer）そのまま
```

### 透明化の適用範囲

| ルート | UIの背景 | 3Dシーン |
|---|---|---|
| `/` | 透明（現在のHeroと同じ） | クリスタル（現行のまま） |
| `/soccer` | 透明（全面3D背景） | サッカービネット（全面リアーキテクチャ） |
| `/basketball` | 透明 | バスケットボールビネット（新規） |
| `/volleyball` | 透明 | バレーボールビネット（新規） |
| `/work` | 不透明（現行のまま） | なし（現行のクリスタル背景のみ） |

### コンポーネント変更方針

**新規追加:**
- `react-router-dom` v7（pnpm add。React 19対応済み）
- `src/router.tsx` — ルート定義
- `src/pages/HomeScene.tsx` — 現Hero相当
- `src/pages/SoccerScene.tsx` — フルスクリーン化した新サッカービネット
- `src/pages/BasketballScene.tsx`
- `src/pages/VolleyballScene.tsx`
- `src/pages/WorkScene.tsx` — 現行のUIレイヤー全体をラップ
- `src/components/canvas/journey/RouteTransition.tsx` — フラッシュ遷移演出

**書き換え:**
- `src/App.tsx` → Routerエントリーポイントのみに（Canvasを各ルートページが持つ形へ移行）

**基本的に維持（/work内で再利用）:**
- `src/components/sections/Impact.tsx` 〜 `Footer.tsx`（内容変更なし）
- `src/components/canvas/journey/scrollProgress.ts` / `trajectory.ts`（純粋関数として再利用）

**旧実装の扱い:**
- `src/components/canvas/journey/SoccerScene.tsx`（旧・JourneyZoneベース）→ 新`/soccer`ページに統合・昇格後に削除
- `src/components/sections/JourneyZone.tsx` → `/work`に移した後は不要になるが、削除はリアーキテクチャ完了後

### Canvas配置の変え方

**旧:** App.tsx内の1つのCanvas（position:fixed）が全ページ共通  
**新:** 各ルートページが**自前のCanvas**を持つ。ルート遷移時にはReact RouterのアンマウントによってCanvas自体が切り替わる

**この変更の最大の利点:** 複数のuseFrameコンポーネントが同じ`camera.position`を奪い合う競合問題（Phase 1で発生したCameraRig×SoccerSceneの競合）がルートの物理的分離によって根本解決される。

### ルート間トランジション演出（確定）

1. 各スポーツルート終盤（ボールが「フレーム形状」に近づく）でトランジション開始
2. **ボールは消えずに画面に残り続ける**（3スポーツを貫く視覚的連続性の象徴）
3. 画面全体が次シーンのブランドカラーで**フラッシュ**
4. React Routerがルート切り替え → 次シーン開始時すでにボールが画面内にいる

ワープトンネルは使用しない（スポーツ感と合わないため）。FOVのわずかな一時的拡張（Gemini提案、50→70〜80程度）は遷移の緊張感として採用を検討するが、数値は実装後に目視調整。

### 各スポーツルートのテキストカード

- 1ルートあたり2〜3枚のテキストカード（OHZI標準と同等）
- 「体育教師→エンジニア」ストーリーの文脈で各スポーツに対応したキャッチコピー
- スタイル: 半透明の暗いglassパネル（`backdrop-filter: blur` + rgba背景）+ 白テキスト
- テキストコピーの詳細: **次セッションで決定**

---

## 未完了（次セッションで設計を完成させる）

以下のセクションはbrainstormingセッション途中でユーザーがセッション終了を選択したため、次セッションで詰める。

### シーン設計セクション（未確定）

各ルートについて以下を決める：

**サッカー (`/soccer`)**
- [ ] カメラワーク: Z軸前進ドリー（地面スレスレのローアングル）、GSAP scrub:1〜1.5
- [ ] フレーム形状: 発光するサッカーゴール枠（白、Bloom）→ トランジションのポータルにも兼用
- [ ] 色グレーディング: ミッドナイトブルー系フォグ（`#0a1128`付近）
- [ ] 芝マテリアル: シャドウ有効化、PBR（既存のPoly Haven CC0を活用）、インスタンス芝ブレードへのライト応答追加
- [ ] テキストカード内容（コピー）: TBD

**バスケットボール (`/basketball`)**
- [ ] カメラワーク: Y軸上昇（シュート追従）、頂点でタメ、GSAP scrub
- [ ] フレーム形状: 発光するバックボード（四角形アウトライン）
- [ ] 色グレーディング: 体育館アンバー（`#b35a00`付近）
- [ ] 床マテリアル: `MeshReflectorMaterial`（木目テクスチャ + 反射）
- [ ] テキストカード: TBD

**バレーボール (`/volleyball`)**
- [ ] カメラワーク: レシーブ→トス（Y上昇・タメ）→スパイク（急加速・衝撃波）の3段階
- [ ] フレーム形状: 発光するバレーネット帯（横長の白ライン）
- [ ] 色グレーディング: サイアン/エメラルド系（`#004d40`付近）
- [ ] 床マテリアル: 抽象的グリッドライン（サイバースペース調）
- [ ] テキストカード: TBD

### マテリアル・ライティング刷新セクション（未確定）

- [ ] 影（castShadow/receiveShadow）の有効化方針
- [ ] PBRマテリアルの各シーンへの適用詳細
- [ ] Bloomパラメータの見直し
- [ ] GodRays再チューニングの是非（現在無効化中）

---

## 参照資料

- ohzi.ioスクリーンショット分析（2026-07-01セッション）: 合計20枚のスクショを目視確認
- Obsidian: `portfolio-ohzi-reference.md`（Gemini動画解析の評価・採用/不採用の根拠）
- 旧設計書（JourneyZoneベース、参考用）: `docs/superpowers/specs/2026-06-30-ball-journey-transition-design.md`
- 旧Phase 1実装計画（参考用）: `docs/superpowers/plans/2026-06-30-ball-journey-soccer-phase1.md`
