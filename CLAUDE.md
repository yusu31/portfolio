# CLAUDE.md - portfolio プロジェクト

## 毎セッション開始時に必ず読むファイル

1. `docs/01_requirements.md` — 要件定義
2. `docs/02_tech-stack.md` — 技術スタック
3. `docs/03_non-functional.md` — 非機能要件
4. `docs/04_design.md` — UIデザイン方針
5. `C:\Users\3fort\Documents\SecondBrain\Preferences\dev-philosophy.md` — 開発哲学

## プロジェクト概要

体育教師→エンジニアへのキャリアチェンジストーリーを持つポートフォリオサイト。
作ったすべての個人プロジェクトのハブになる。

## 開発原則

- **設計が9割**: コーディング前に必ずdocs/を確認・更新する
- **AI議論→リサーチ→提案→ユーザー確認→実装** の順を守る
- UIの変更はClaude DesignのMCPツールでプロトタイプを先に作る
- 最新技術・UXトレンド・データエビデンスにこだわる

## GitHub ワークフロー

- Issue: https://github.com/yusu31/portfolio/issues
- ブランチ: `feature/{説明}-#{Issue番号}` 形式
- main への直接プッシュ禁止

## 技術スタック

→ `docs/02_tech-stack.md` を参照（設計フェーズで確定）

## 応答ルール

- 日本語で応答
- コードは差分のみ表示
- UIコンポーネントはClaude Design MCPで先にデザインしてから実装
