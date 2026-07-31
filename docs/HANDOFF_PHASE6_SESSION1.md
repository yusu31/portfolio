---
date: 2026-08-01
author: Claude Sonnet 5(実装・検証)
related_issues: "#312, #314〜#320, #322(本HANDOFF)"
related_prs: "#313(未追跡ファイル整理・マージ済み), #321(fall.ts物理化・マージ済み)"
---

# HANDOFF PHASE6 SESSION1: Phase6着手判断→fall.ts物理化マージ完了、Blenderリッチ化は設計途中

軽量フォーマット継続(次にやること・未解決事項のみ)。判断の経緯・却下案・技術的発見の詳細は
`C:\Users\3fort\.claude\state\handoff-latest.md`とObsidian `Projects/portfolio/backlog.md`
(2026-08-01エントリ)に記録済み。

## 概要

Phase5-5完了を受けてPhase6(アセットリッチ化)着手の要否を相談したところ、壁打ちが
「クリスタル球もチープ」「Blender導入」「バスケネットの実物理シミュレーション」
「ボール軌道全般の実物化」まで拡大した。**fall.ts(ダイブ落下)の物理弾道化のみ実装・QA・
マージまで完了**(PR #321)。Phase6本体(Blenderでの構造物リッチ化)は技術選定までで
設計が中断しており、docs/plans/への書き出し前の状態。

## 次セッション開始時のチェックリスト

```
□ main を最新pull
□ 本ファイルと C:\Users\3fort\.claude\state\handoff-latest.md の両方を読了
□ ユーザーにOpus5への切り替え希望を確認(バスケネット物理・ボール軌道設計向け)
□ Phase1(Blenderリッチ化)の設計再開: パイプライン設計から
```

## 次にやること(優先順)

1. **モデル確認**: バスケネット物理・ボール軌道実物化はユーザーがOpus5活用を希望。
   `/model opus`切り替えの意向を確認してから該当設計に着手する。
2. **Phase1(Blender構造物リッチ化)の設計を完了させる**: 技術選定(全構造物にベベル徹底/
   バスケネットはLathe回転体+アルファテクスチャ/サッカーゴールは1本カーブ+Bevelでメッシュ化)
   までは決定済み。残りはパイプライン設計(bpyスクリプト置き場所・GLB出力先・R3F組み込み・
   gltfjsx活用)→docs/plans/への設計書化→ユーザー承認→writing-plansスキルで実装計画。
3. **バスケネットのリアルタイム物理(ボール通過時になびく)を独立設計する**(mass-spring/
   Verlet等、静的Blenderメッシュとは別の話。パフォーマンス予算・トリガー条件・減衰を含む)。
4. **サッカーゴールの風なびきを軽量設計・実装**(常時ゆらぐsin波程度、Phase1と合わせても可)。
5. **ボール軌道実物化の対象範囲を確定**: pass.ts/freeThrow.ts/spikeの最終弧/fall.tsは
   既に物理弾道(arcHeightAt)済み。未対応はdribble.tsのバウンド(sin近似)とspikeの前半2段
   (単純easing)。PR-4とfall.tsの教訓(「物理的に正しいが見栄えは別」になりうる)を踏まえ、
   物理化前に見た目のリスクを検証してから着手する。
6. Issues #314(dribble地面埋没)〜#318(dribble開始時カード重なり)は全て未着手。

## 未解決・要判断事項

- Blender 4.5 LTSは`C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`に
  インストール済み・bpy動作確認済みだがデフォルトPATH未登録。
- PlaywrightでこのアプリをQAする際は`/`ではなく`/scroll-poc`を使うこと(`src/router.tsx`)。
  実スクロール要素は`document.scrollingElement`ではなくクラス名なしの`<div>`(詳細は
  `handoff-latest.md`の復旧メモ参照)。
- headless Chromiumでアセットローダーが無限に居座るケースを発見(原因未特定)。headed
  (`headless=False`)で回避可能。
- 太陽グレア(u≈0.195〜0.20)・ショット1実機確認は依然未了(SESSION4から持ち越し)。
