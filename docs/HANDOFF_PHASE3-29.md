# HANDOFF Phase 3-29 — Phase 5-1残QA完了・Phase 5-2(経路延長)実装・マージ完了

**日付:** 2026-07-14
**前回引継ぎ:** `docs/HANDOFF_PHASE3-28.md`
**このセッションのモデル:** Sonnet(全工程。構図判断の難所も明白な改善だったためFableへの切替なし)

---

## このセッションでやったこと(時系列)

### 1. PR #239(Phase 5-1残QA)の完了・マージ

前回引き継がれた残QA2件を実施:

- **境界±ε確認**: `node scripts/qa-shots.mjs` で offset 0.613/0.623/0.868/0.878 を撮影。
  - 0.613→SKILLS、0.623→ABOUT(境界0.618を挟んで正確に切替)
  - 0.868→ABOUT、0.878→CONTACT(境界0.873を挟んで正確に切替)
  - 揺れ・撮影アーティファクトの再現なし。**PASS**
- **about中間の構図目視判断**: before(main, offset 0.625) vs after(ブランチ, offset 0.759) を比較。
  - beforeは柵ポール1本のクローズアップで"AB"の文字が見切れる窮屈な構図
  - afterはABOUTタイトル全体+ネット全体+ボールが見える引き構図で、明確に改善
  - 劣化ではなく明白な向上だったため、Fableへの切替は不要と判断して**PASS**
  - 比較手法: `git worktree add` でmainを別ディレクトリに展開し、別ポート(5174)でdevサーバーを並行起動して同時比較(ブランチ往来なしで効率的)
- 両方PASSにより `gh pr merge 239 --squash` でマージ。ローカルブランチ削除・`git remote prune origin` 実行済み

### 2. Phase 5-2実装(Issue #242 → PR #243、マージ済み)

#### 設計プロセス

経路延長は「今の経路を機械的に3倍する」のではなく、以下の手順で新規設計した:

1. **目標設定**: カメラ経路の弧長を66→約200ユニットに延長(3倍弱)。ヴェニュー間にtransit区間(骨格のみ)を3つ追加
2. **制御点の再設計**: Node.jsスクリプトで `THREE.CatmullRomCurve3` を直接実行し、`getLength()` で弧長を試算しながら手動チューニング。最終的にカメラ経路199.66、視線経路197.15に着地
3. **SECTION_RANGESの再導出で判明した重要な罠**: カメラ経路(CAMERA_PATH)と視線経路(LOOKAT_PATH)は別々のCatmullRomCurve3インスタンスであり、**同じu値が「物語上の同じ瞬間」を指すとは限らない**。
   - 実測: projectsヴェニューについて、LOOKATが最接近するuは0.169、CAMERAがそのz座標に到達するuは0.216 → **0.05近いズレ**
   - もし単純にカメラ側のu(二分法)だけでSECTION_RANGESの中心を決めていたら、「カードは表示されているのに視線はヴェニューから外れている」という事故になっていた
   - **解決策**: 全区間サンプリング(1000〜2000分割)でLOOKAT_PATHの各ヴェニューへの最接近uを実測し、それを区間の中心に据える。そのうえでカメラ側のz制約(区間開始時点でカメラがまだヴェニューに到達していない/区間終了までにヴェニュー近傍まで到達する)も満たすかを別途検証する、という二段階の設計にした
4. **fogのfar値についての気づき**: Three.jsのfogは常にカメラからの相対距離であり、経路の絶対長とは無関係。当初「経路を3倍にしたのでfogも3倍にすべきか」と迷ったが、原理を確認した結果、ヴェニュー間隔(約45〜50ユニット)をカバーできる程度(46→65)で十分と判断。過剰な変更を避けられた

#### 実装内容(ファイル単位)

| ファイル | 変更内容 |
|---|---|
| `src/journey/path/curves.ts` | CAMERA_PATH/LOOKAT_PATHの制御点を全面再設計。`PATH_END_OFFSET` 0.982→0.9915。`PAGES` 7→21 |
| `src/journey/path/venues.ts` | VENUES z座標を再配置: projects -17→-33 / skills -31→-80 / about -45→-128 / contact -58→-191(x座標・符号は据え置き) |
| `src/journey/path/sections.ts` | SECTION_RANGESを新設計値に再導出(下表) |
| `src/journey/path/transit.ts`(新規) | TRANSIT_SPANS定義(transit1/2/3のcenterZ・length) |
| `src/journey/Transit.tsx`(新規) | transit区間の骨格コンポーネント(Transit1/Transit2/Transit3、プレースホルダー地面のみ) |
| `src/journey/path/index.ts` | TRANSIT_SPANS等のexportを追加 |
| `src/pages/ScrollJourneyPoc.tsx` | Ground平面の奥行き130→270・position調整、fog far 46→65、雲配置の追加/移動、WarmOrbsを4→10箇所に拡張、Transit1〜3をシーンに配線 |
| `src/journey/path/path.test.ts` | 経路長レンジ・終端ポーズ・sectionAt期待値・PAGES期待値を新設計値に更新 |

#### 最終的な設計値(次回この経路を触るときの参照用)

**CAMERA_PATH制御点(centripetal, 13点):**
```
(0, 1.00, 10)      開始点
(0.5, 1.05, -4)
(-0.9, 1.12, -19)
(-1.8, 1.20, -33)   Projects(左)に寄る
(1.0, 1.28, -54)    transit1 wiggle
(1.9, 1.35, -80)    Skills(右)に寄る
(-0.9, 1.42, -104)  transit2 wiggle
(-1.7, 1.48, -128)  About(左)に寄る
(-1.0, 1.42, -149)
(0.6, 1.46, -166)   transit3 wiggle
(0, 1.50, -181)
(0, 1.52, -187)     フィニッシュゲート通過
(0, 1.49, -189)     延長終点(PATH_END_OFFSET=0.9915でz≈-187.3に静止)
```
弧長: 199.66ユニット

**LOOKAT_PATH制御点(centripetal, 10点):**
```
(0, 1.0, 0)
(-2.2, 1.0, -18)
(-4.0, 1.0, -33)     Projectsヴェニュー
(0, 1.2, -56)
(4.3, 1.4, -80)      Skillsヴェニュー
(-2.8, 1.15, -116)
(-4.2, 1.05, -125)   Aboutヴェニュー
(-0.6, 1.15, -167)
(0, 1.0, -191)       Contactプラザ
(0, 0.95, -195)      延長終点
```
弧長: 197.15ユニット

**SECTION_RANGES:**
| id | start | end |
|---|---|---|
| home | 0.0 | 0.06 |
| projects | 0.1285 | 0.2085 |
| skills | 0.3715 | 0.4515 |
| about | 0.619 | 0.699 |
| contact | 0.95 | 1.01 |

**TRANSIT_SPANS:**
| id | centerZ | length |
|---|---|---|
| transit1(Projects→Skills) | -48 | 33 |
| transit2(Skills→About) | -96 | 34 |
| transit3(About→Contact) | -154 | 50 |

#### 検証結果

- Vitest 20件全green(`pnpm exec vitest run`)
- `pnpm build`成功、three-coreチャンク732.61KB(予算内、Phase 5-1から不変)
- offsetフルスイープ24点(0.0〜1.0を均等よりストーリー単位で分割)をSonnetサブエージェントに委任してQA → **PASS**
  - カード⇔3D背景のズレなし、構図破綻なし
  - **transit3(About→Contact、最長区間)がやや単調との指摘**: 19/20/21番(offset 0.78/0.85/0.90)が「空+地平線+遠くの看板」で代わり映えしない。骨格実装として致命的ではないが、**Phase 6-4での装飾追加時に優先対応すべき項目としてObsidian `Projects/portfolio/backlog.md` に記録済み**

### 3. ユーザーとの議論

#### 3-1. 「まっすぐしか進まない」への回答

ユーザー指摘を受け、現状はtransit区間が骨格(空の地面)のみでボール演出(Phase 5-3/5-4)が未実装のため、カーブ自体は緩くwiggleしているが通過中に見るものがなく単調に感じるのは設計上想定内、と説明。Phase 5-3(ボールリレー)とPhase 6(アセットリッチ化)のロードマップを提示。

#### 3-2. 旅の長さ vs パリのサイト(Lempens)

ユーザー質問「サイトとしては短い方がいいのかもだけど、ポートフォリオとしてはどうだろう？パリのサイトと比べて長さはどのくらい？」に対し、以下を実施:

- **数値比較**: ピクセル単純比較(現状は約1/12)は無意味(サイトごとにスクロール速度が違う)と判断し、体感時間ベースで比較。元サイト「十数秒」×3倍 ≈ 35〜40秒 ≈ Lempensの約半分、という見積もりを提示
- **4ペルソナ議論**(リサーチャー/クリエイティブディレクター/エンジニア/批評家)を実施し、「3〜4倍」という当初の落としどころが妥当、Lempensへの完全一致はそもそも訪問者の意図が違うため筋違い、という結論に至った
- 結論はObsidian `Decisions/2026-07-14-journey-length-vs-lempens.md` に却下案・見直し条件つきで記録済み
- **見直し条件**: Phase 5-3(ボールリレー)実装後、transit区間に動きが入った状態で再度ユーザーが通しスクロールし、長い/短いと感じたら調整する

#### 3-3. ジャンプナビゲーションのアイデア → Issue #244

ユーザー提案「採用担当がパッと見れるようにすぐページに跳べるような実装」を受け、技術的実現性(offsetが唯一の真実の状態なのでSECTION_RANGESの該当offsetへスクロールさせるだけで実装可能)を説明した上で、**今すぐ着手せずIssue化してバックログに積む**選択(ユーザー選択の「1」)。Issue #244に技術方針・未決定事項(見た目)・優先度(Phase 5-3前 or Phase 7候補)を記載。

### 4. Obsidian・メモリ運用の見直し(重要・今後も継続)

セッション終盤、ユーザーから「Obsidianに記録する理由と記録内容を理解しているか」と問われ、以下を確認・実行:

- **今回のセッションではリアルタイムで記録できておらず、聞かれてから遡って記録した**ことを認めた
- 遡って以下を記録:
  - `Projects/portfolio/2026-07-14_scroll-3d-phase5-2-path-extension.md`(セッション記録: 実装内容・技術のキモ・ユーザー議論の経緯)
  - `Decisions/2026-07-14-journey-length-vs-lempens.md`(旅の長さの判断・却下案・見直し条件)
- Vault実態を調査した結果、`Projects/portfolio/sessions/` サブフォルダは2026-07-07以降使われておらず、`Projects/portfolio/` 直下にフラットに置く運用に変わっていたことが判明 → メモリ `feedback-obsidian-session-recording` を実態に合わせて修正
- ユーザーから追加指示:「セッションをまたいでも詳細に理解できるように記録を忘れないこと」「タスク管理もしてほしい。オブシディアンにタスクやアイディアを都度記録し、いちいち言わなくてもまとめておいて」
  - → **`Projects/portfolio/backlog.md` を新規作成**(タスク・アイデア・リサーチログの持続的な台帳。GitHub Issueは正式決定タスク、backlog.mdはそれ以前の思考・調査を拾う場所という役割分担)
  - → 新規メモリ `feedback-proactive-task-and-idea-tracking` を作成し、「言われなくてもその場で記録する」を標準運用として明文化
- さらにユーザーから:「簡単なのではなく、しっかりと引き継げる、詳細なHANDOFFが毎回必要」という明示指示 → **このHANDOFFはその指示を反映した初回**。以降のHANDOFFもこの詳細度を維持すること

---

## 確定した判断(却下案含む・再掲)

- **SECTION_RANGES中心の決め方**: カメラ側のu二分法だけで決める案を却下 → LOOKAT側の最接近u実測を中心に据え、カメラz制約を別途検証する二段階方式を採用(理由: カメラ経路とLOOKAT経路のパラメータ化がズレるため)
- **fog far**: 経路延長に比例して3倍にする案を検討したが却下 → fogはカメラ相対距離のため、ヴェニュー間隔をカバーできる65で十分と判断
- **旅の長さ**: Lempensの絶対量(約200,000px)に合わせる案を却下 → 3〜4倍(体感時間でLempensの約半分)が妥当。訪問者の意図(採用担当の短時間閲覧 vs 制作会社サイトのじっくり閲覧)が違うため完全一致は筋違い
- **ジャンプナビ**: 今すぐ実装する案とバックログ化する案を提示し、ユーザーはバックログ化(Issue #244)を選択。Phase 5-2のスコープではないため

## 軽微な引き継ぎ・注意事項

- README.md・start.shの変更、`.wrangler/`・`lighthouse-report*.json`・`test-results/` はセッション開始前から存在する未コミットの変更/成果物で、今回のPhase 5-2作業とは無関係。触れていない(削除もコミットもしていない)
- devサーバーはセッション終了時に停止済み。次セッションで再度 `pnpm dev` が必要
- QA画像はセッションscratchpad(`...\0347a03f-...\scratchpad\qa\{boundary,about_before,about_after,phase5-2}`)にあり、OS掃除で消える可能性あり。必要なら再撮影
- git worktree(`portfolio-main-qa`)は使用後に削除済み。次回before/after比較する際は同じ手法(`git worktree add <path> main` → 別ポートでdevサーバー)が再利用できる

## リポジトリ状態(このHANDOFF作成時点)

- `main` ブランチ: PR #239・PR #243ともにマージ済み
- オープンなIssue: #244(ジャンプナビ・バックログ)、#247(このHANDOFF)
- 未着手の技術的懸念: transit3(About→Contact)の構図単調さ(Phase 6-4で対応予定、`backlog.md`に記録)

---

## 次セッション用キックオフプロンプト(コピペ用)

```
C:\Users\3fort\dev\portfolio の3Dスクロール体験・Phase 5-3(ボールリレー)着手セッション。

まず docs/HANDOFF_PHASE3-29.md、docs/plans/2026-07-13-phase5-8-experience-expansion.md、
Obsidian Projects/portfolio/backlog.md(タスク・アイデア台帳、冒頭で必ず確認)を読んで。

【モデル運用】Sonnet始動。機械的実装・検証・PR事務はSonnetのまま。
構図判断・ボールの動きの演出調整など難所だけ/modelでFableに切替え、終わったら戻す。

【今回のスコープ】Phase 5-3/5-4(ボールリレー実装):
新モジュール src/journey/ball/ を新設。ストーリーボード「サッカーでドリブル→ロングパス→
バスケでキャッチ→フリースローシュート→リング通過→落下→バレーでレシーブ→トス→アタック→
Contactへ」をビート列として実装。ボール位置はoffsetを入力とする純粋関数(カメラ・カードと同じ
「offsetが唯一の真実」原則)。詳細設計は計画書のPhase 5-3/5-4節を参照。
CrystalBall.tsxにoffset連動positionを追加(材質は不変)。サッカー/バスケ/バレーの静的ボールと
Contact表彰台+3ボールは撤去。

【必須マイルストーン】実装完了後、transit区間に動きが入った状態で再度ユーザーの通しスクロール
確認を挟む(旅の長さの再判定・Obsidian Decisions/2026-07-14-journey-length-vs-lempens.md の
見直し条件に対応)。

【判断が必要な分岐】Issue #244(ジャンプナビ)をPhase 5-3の前に挟むか、Phase 7まで待つか、
セッション開始時にユーザーに確認する。

【変更禁止事項】クリスタル球の見た目レシピ、パステル夕景の色支配、Bloomでのグレア対策、
Issue→branch→PR→merge厳守(ドキュメントのみでも例外なし)、pnpm必須。/scroll-poc配下PRは
マージ可、/昇格だけは保持。

【Obsidian運用(重要)】タスク・アイデア・リサーチ結果は言われなくてもその場で
Projects/portfolio/backlog.md に追記する。設計判断は却下案つきでDecisions/へ。
セッション終了時は詳細なHANDOFF(この文書と同等の粒度)を必ず作成する。
```

---

## Obsidian記録

- `Projects/portfolio/2026-07-14_scroll-3d-phase5-2-path-extension.md`(セッション記録)
- `Decisions/2026-07-14-journey-length-vs-lempens.md`(旅の長さの判断)
- `Projects/portfolio/backlog.md`(新規: タスク・アイデア・リサーチ台帳)
