/**
 * aiPipelinePerplexity.js - AI自律開発システム（Perplexity批評版）
 *
 * フロー:
 * 1. HANDOFF.md を読み取る
 * 2. Claude API に送信 → 設計・提案を取得
 * 3. Perplexity API（sonar）に Claude の回答を送信 → Web検索ベースの批評・補完を取得
 * 4. 結果を Notion に保存
 *
 * PERPLEXITY_API_KEY が未設定の場合は Claude 単体モードにフォールバック
 */

const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@notionhq/client');

// ===== 設定 =====
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

// ===== Notion rich_text 2000文字制限を回避する分割関数 =====
function splitToNotionBlocks(text, limit = 2000) {
  const blocks = [];
  for (let i = 0; i < text.length; i += limit) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: text.substring(i, i + limit) } }]
      }
    });
  }
  return blocks;
}

// ===== HANDOFF.md を読み取る =====
function readHandoff() {
  const handoffPath = './HANDOFF.md';
  if (!fs.existsSync(handoffPath)) {
    console.error('❌ HANDOFF.md が見つかりません');
    process.exit(1);
  }
  const content = fs.readFileSync(handoffPath, 'utf-8');
  console.log('✅ HANDOFF.md を読み取りました（' + content.length + '文字）');
  return content;
}

// ===== HANDOFF.md からタスクを抽出 =====
function extractTask(handoffContent) {
  const patterns = [
    /📌\s*次回やること[\s\S]*?(?=\n##|\n---|\n📌|$)/,
    /##\s*次にやること[\s\S]*?(?=\n##|\n---|\n📌|$)/,
    /##\s*現在のタスク[\s\S]*?(?=\n##|\n---|\n📌|$)/,
    /##\s*TODO[\s\S]*?(?=\n##|\n---|\n📌|$)/,
  ];

  for (const pattern of patterns) {
    const match = handoffContent.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  console.log('⚠️ タスクセクションが見つからないため、HANDOFF.md全文を使用します');
  return handoffContent;
}

// ===== Claude API 呼び出し（設計・提案） =====
async function askClaude(handoffContent, task) {
  console.log('🧠 Claude に送信中...');

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `あなたはAI自律開発システムの「主任エンジニア」です。

## あなたの役割
- HANDOFF.md の内容を読み、タスクを理解する
- 具体的な設計案・実装コード・次のアクションを提案する
- 自分の提案を自己レビューし、問題点があれば修正する

## 出力フォーマット
以下のセクションで回答してください:

### 📋 タスク理解
（何をやるべきか、簡潔に）

### 🏗️ 設計・実装
（具体的な提案、コードがあればコードも）

### ✅ 自己レビュー
（自分の提案の良い点・懸念点・改善案）

### 📌 次回やること
（このタスクの次のステップ）

回答は日本語でお願いします。`,
    messages: [
      {
        role: 'user',
        content: `以下はHANDOFF.md の内容です。タスクを理解して、設計・実装を進めてください。\n\n## HANDOFF.md全文\n${handoffContent}\n\n## 抽出されたタスク\n${task}`
      }
    ]
  });

  const claudeResponse = message.content[0].text;
  console.log('✅ Claude の回答を取得しました（' + claudeResponse.length + '文字）');
  return claudeResponse;
}

// ===== Perplexity API 呼び出し（Web検索ベースの批評・補完） =====
async function askPerplexity(handoffContent, claudeResponse) {
  if (!PERPLEXITY_API_KEY) {
    console.log('⚠️ PERPLEXITY_API_KEY が未設定のため、Claude 単体モードで動作します');
    return null;
  }

  console.log('🔍 Perplexity に送信中...');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'あなたはAI自律開発システムの調査・批評担当です。Webの最新情報を検索し、Claudeの回答を批評・補完してください。特に市場動向、競合分析、技術トレンドの観点から調査してください。回答は日本語で。'
          },
          {
            role: 'user',
            content: `## HANDOFF.md\n${handoffContent}\n\n## Claude の回答（設計・提案）\n${claudeResponse}\n\n上記のClaudeの提案をWeb検索に基づいて批評・補完してください。`
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('⚠️ Perplexity APIエラー:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const result = data.choices[0].message.content;
    const citations = data.citations || [];

    console.log('✅ Perplexity の批評を取得しました（' + result.length + '文字）');

    let output = result;
    if (citations.length > 0) {
      output += '\n\n参考文献:\n' + citations.map((c, i) => `[${i + 1}] ${c}`).join('\n');
    }

    return output;
  } catch (error) {
    console.error('⚠️ Perplexity エラー（Claude 単体モードにフォールバック）:', error.message);
    return null;
  }
}

// ===== Notion に保存 =====
async function saveToNotion(claudeResponse, perplexityResult, task) {
  console.log('📝 Notion に保存中...');

  const now = new Date();
  const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const title = `AI Pipeline (Perplexity版) ${timestamp}`;

  const children = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📋 タスク' } }]
      }
    },
    ...splitToNotionBlocks(task),
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🧠 Claude の回答（設計・提案）' } }]
      }
    },
    ...splitToNotionBlocks(claudeResponse),
  ];

  if (perplexityResult) {
    children.push(
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🔍 Perplexity の調査・批評（Web検索ベース）' } }]
        }
      },
      ...splitToNotionBlocks(perplexityResult)
    );
  }

  try {
    await notion.pages.create({
      parent: { page_id: NOTION_PAGE_ID },
      properties: {
        title: {
          title: [{ text: { content: title } }]
        }
      },
      children: children
    });

    console.log('✅ Notion に保存しました: ' + title);
  } catch (error) {
    console.error('❌ Notion 保存エラー:', error.message);
  }
}

// ===== メイン処理 =====
async function main() {
  console.log('🚀 AI自律開発システム - aiPipelinePerplexity.js 開始');
  console.log('='.repeat(50));
  if (PERPLEXITY_API_KEY) {
    console.log('モデル: Claude（設計・提案） + Perplexity/sonar（批評・補完）');
  } else {
    console.log('モデル: Claude 単体モード（PERPLEXITY_API_KEY 未設定）');
  }
  console.log('='.repeat(50));

  try {
    // 1. HANDOFF.md を読み取る
    const handoffContent = readHandoff();

    // 2. タスクを抽出
    const task = extractTask(handoffContent);
    console.log('📋 タスク抽出完了（' + task.length + '文字）');

    // 3. Claude に設計・提案を依頼
    const claudeResponse = await askClaude(handoffContent, task);

    // 4. Perplexity に批評・補完を依頼
    const perplexityResult = await askPerplexity(handoffContent, claudeResponse);

    // 5. Notion に保存
    await saveToNotion(claudeResponse, perplexityResult, task);

    // 6. 結果サマリーを出力
    console.log('\n' + '='.repeat(50));
    console.log('📋 パイプライン結果サマリー');
    console.log('='.repeat(50));
    console.log('\n🧠 Claude（設計・提案）:');
    console.log(claudeResponse.substring(0, 500) + '...');
    if (perplexityResult) {
      console.log('\n🔍 Perplexity（批評・補完）:');
      console.log(perplexityResult.substring(0, 500) + '...');
    }
    console.log('\n✅ aiPipelinePerplexity.js 完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
