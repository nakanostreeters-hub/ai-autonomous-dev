/**
 * aiPipeline.js - AI自律開発システム 新パイプライン
 * 
 * 新モデル（Claude主体 + Perplexity補助）:
 * 1. HANDOFF.md を読み取る
 * 2. Perplexity API でWeb検索（補助情報収集）
 * 3. Claude API に HANDOFF.md + Perplexity結果を送信 → 一次回答を取得
 * 4. 結果を Notion に保存
 * 
 * 旧モデル（aiRelay.js）との違い:
 * - ChatGPT を除外（Claude が主体的に設計・実行）
 * - Perplexity を追加（リアルタイムWeb検索で補助情報を提供）
 * - Claude が一次回答 + 自己レビューまで担当
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
  // 「📌 次回やること」「## 次にやること」などのセクションを探す
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

  // タスクセクションが見つからない場合は全文を使う
  console.log('⚠️ タスクセクションが見つからないため、HANDOFF.md全文を使用します');
  return handoffContent;
}

// ===== Perplexity API でWeb検索（補助情報収集） =====
async function searchWithPerplexity(task) {
  if (!PERPLEXITY_API_KEY) {
    console.log('⚠️ PERPLEXITY_API_KEY が未設定のため、Web検索をスキップします');
    return null;
  }

  console.log('🔍 Perplexity でWeb検索中...');

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'あなたは開発タスクの補助リサーチャーです。与えられたタスクに関連する最新の技術情報、ベストプラクティス、APIドキュメント等を調査して、簡潔にまとめてください。日本語で回答してください。'
          },
          {
            role: 'user',
            content: `以下の開発タスクに関連する技術情報を調査してください:\n\n${task}`
          }
        ],
        max_tokens: 2000,
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

    console.log('✅ Perplexity の調査結果を取得しました（' + result.length + '文字）');

    let output = result;
    if (citations.length > 0) {
      output += '\n\n参考文献:\n' + citations.map((c, i) => `[${i + 1}] ${c}`).join('\n');
    }

    return output;
  } catch (error) {
    console.error('⚠️ Perplexity 検索エラー（スキップします）:', error.message);
    return null;
  }
}

// ===== Claude API 呼び出し（主体的な設計・実行） =====
async function askClaude(handoffContent, task, perplexityResult) {
  console.log('🧠 Claude に送信中...');

  // Perplexityの結果がある場合は補助情報として追加
  let supplementary = '';
  if (perplexityResult) {
    supplementary = `\n\n## 🔍 Perplexityによる補助調査結果\n${perplexityResult}`;
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `あなたはAI自律開発システムの「主任エンジニア」です。

## あなたの役割
- HANDOFF.md の内容を読み、タスクを理解する
- Perplexityの調査結果（あれば）を参考にする
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
        content: `以下はHANDOFF.md の内容です。タスクを理解して、設計・実装を進めてください。\n\n## HANDOFF.md全文\n${handoffContent}\n\n## 抽出されたタスク\n${task}${supplementary}`
      }
    ]
  });

  const claudeResponse = message.content[0].text;
  console.log('✅ Claude の回答を取得しました（' + claudeResponse.length + '文字）');
  return claudeResponse;
}

// ===== Notion に保存 =====
async function saveToNotion(claudeResponse, perplexityResult, task) {
  console.log('📝 Notion に保存中...');

  const now = new Date();
  const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const title = `AI Pipeline ${timestamp}`;

  // Notion のブロック（children）を構築
  const children = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '📋 タスク' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: task.substring(0, 2000) } }]
      }
    },
  ];

  // Perplexity結果があれば追加
  if (perplexityResult) {
    children.push(
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '🔍 Perplexity 調査結果' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: perplexityResult.substring(0, 2000) } }]
        }
      }
    );
  }

  // Claude回答を追加
  children.push(
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ text: { content: '🧠 Claude の回答（設計・実装）' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ text: { content: claudeResponse.substring(0, 2000) } }]
      }
    }
  );

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
  console.log('🚀 AI自律開発システム - aiPipeline.js 開始（新モデル）');
  console.log('='.repeat(50));
  console.log('モデル: Claude（主体） + Perplexity（補助）');
  console.log('='.repeat(50));

  try {
    // 1. HANDOFF.md を読み取る
    const handoffContent = readHandoff();

    // 2. タスクを抽出
    const task = extractTask(handoffContent);
    console.log('📋 タスク抽出完了（' + task.length + '文字）');

    // 3. Perplexity でWeb検索（補助）
    const perplexityResult = await searchWithPerplexity(task);

    // 4. Claude に設計・実装を依頼
    const claudeResponse = await askClaude(handoffContent, task, perplexityResult);

    // 5. Notion に保存
    await saveToNotion(claudeResponse, perplexityResult, task);

    // 6. 結果サマリーを出力
    console.log('\n' + '='.repeat(50));
    console.log('📋 パイプライン結果サマリー');
    console.log('='.repeat(50));
    console.log('\n🧠 Claude:');
    console.log(claudeResponse.substring(0, 500) + '...');
    if (perplexityResult) {
      console.log('\n🔍 Perplexity:');
      console.log(perplexityResult.substring(0, 300) + '...');
    }
    console.log('\n✅ aiPipeline.js 完了');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
