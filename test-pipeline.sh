#!/bin/bash
# test-pipeline.sh - aiPipeline.js ローカルテスト用
#
# 使い方:
#   1. .env ファイルにAPIキーを設定
#   2. chmod +x test-pipeline.sh
#   3. ./test-pipeline.sh
#
# 必要な.envの内容:
#   ANTHROPIC_API_KEY=sk-ant-...
#   NOTION_API_KEY=ntn_...
#   NOTION_PAGE_ID=325275cc-ca58-810a-ab86-cb766a94c935
#   PERPLEXITY_API_KEY=pplx-... (任意、なくても動く)

echo "========================================="
echo "aiPipeline.js ローカルテスト"
echo "========================================="

# .env ファイルから環境変数を読み込む
if [ -f .env ]; then
  echo "✅ .env ファイルを読み込みます"
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ .env ファイルが見つかりません"
  echo "   .env.example を参考に .env を作成してください"
  exit 1
fi

# 必須キーの確認
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY が未設定です"
  exit 1
fi

if [ -z "$NOTION_API_KEY" ]; then
  echo "❌ NOTION_API_KEY が未設定です"
  exit 1
fi

if [ -z "$NOTION_PAGE_ID" ]; then
  echo "❌ NOTION_PAGE_ID が未設定です"
  exit 1
fi

if [ -z "$PERPLEXITY_API_KEY" ]; then
  echo "⚠️ PERPLEXITY_API_KEY が未設定です（Perplexity検索はスキップされます）"
fi

echo ""
echo "実行開始..."
echo ""

node aiPipeline.js
