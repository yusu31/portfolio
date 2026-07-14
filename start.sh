#!/usr/bin/env bash
# portfolio をローカルで起動するスクリプト
# 初回: ./start.sh --setup で依存インストール込みで起動
# 2回目以降: ./start.sh だけでOK
set -e
cd "$(dirname "$0")"

if [ "$1" = "--setup" ]; then
  pnpm install
fi

echo ""
echo "起動しました: http://localhost:4321"
pnpm dev -- --port 4321
