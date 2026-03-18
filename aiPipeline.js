/**
 * aiPipeline.js - AI自律開発パイプライン（新モデル）
 * 
 * フロー:
 * 1. Notion からタスク/調査依頼を読み取り
 * 2. ChatGPT API でリアルタイム調査（後でPerplexityに差し替え可能）
 * 3. Claude API で設計・実装 + セルフレビュー
 * 4. Notion に結果を保存
 */

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { Client } = require('@notionhq/client');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

// 1. Notionからタスクを読み取り
async function readNotionTask() {
  console.log('📖 Notionからタスクを読み取り中...');
  try {
    const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID, page_size: 50 });
    let content = '';
    for (const block of blocks.results) {
      if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0)
        content += block.paragraph.rich_text.map(t => t.plain_text).join('') + '\n';
      else if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0)
        content += '## ' + block.heading_2.rich_text.map(t => t.plain_text).join('') + '\n';
      else if (block.type === 'heading_3' && block.heading_3.rich_text.length > 0)
        content += '### ' + block.heading_3.rich_text.map(t => t.plain_text).join('') + '\n';
      else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text.length > 0)
        content += '- ' + block.bulleted_list_item.rich_text.map(t => t.plain_text).join('') + '\n';
    }
    console.log('✅ Notion読み取り完了（' + content.length + '文字）');
    return content;
  } catch (error) {
    console.error('❌ Notion読み取りエラー:', error.message);
    return null;
  }
}

// 2. ChatGPTで調査（後でPerplexityに差し替え可能）
async function research(taskContent) {
  console.log('🔍 ChatGPTで調査中...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'あなたはマーケティングリサーチの専門家です。与えられたタスクに関連する市場調査、競合分析、トレンド分析を行ってください。回答は日本語で、具体的なデータや数字を含めてください。' },
        { role: 'user', content: '以下のタスク/プロジェクト内容に基づいて、関連する市場調査を行ってください。\n\n' + taskContent }
      ],
      max_tokens: 2000,
    });
    const result = response.choices[0].message.content;
    console.log('✅ ChatGPT調査完了（' + result.length + '文字）');
    return result;
  } catch (error) {
    console.error('❌ ChatGPT調査エラー:', error.message);
    return '調査をスキップしました: ' + error.message;
  }
}

// 3. Claudeで設計・実装 + セルフレビュー
async function designAndReview(taskContent, researchResult) {
  console.log('🧠 Claudeで設計中...');
  const designResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: 'あなたはAI自律開発システムの設計・実装担当です。タスク内容と調査結果を読んで、具体的な設計案または実装案を作成してください。コードが必要な場合はコードも書いてください。回答は日本語で。',
    messages: [{ role: 'user', content: '## タスク内容\n' + taskContent + '\n\n## 調査結果\n' + researchResult + '\n\nこれらを踏まえて、具体的な設計案または実装案を作成してください。' }],
  });
  const designResult = designResponse.content[0].text;
  console.log('✅ Claude設計完了（' + designResult.length + '文字）');

  console.log('🔄 Claudeでセルフレビュー中...');
  const reviewResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: 'あなたは厳格なコードレビュアー・設計批評家です。以下の設計案を批判的にレビューしてください。良い点、問題点、改善提案をそれぞれ具体的に指摘してください。甘い評価は不要です。回答は日本語で。',
    messages: [{ role: 'user', content: '## 元のタスク\n' + taskContent + '\n\n## 設計案\n' + designResult + '\n\nこの設計案をレビューしてください。' }],
  });
  const reviewResult = reviewResponse.content[0].text;
  console.log('✅ セルフレビュー完了（' + reviewResult.length + '文字）');
  return { design: designResult, review: reviewResult };
}

// 4. Notionに結果を保存
async function saveToNotion(researchResult, designResult, reviewResult) {
  console.log('📝 Notionに保存中...');
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  try {
    await notion.pages.create({
      parent: { page_id: NOTION_PAGE_ID },
      properties: { title: { title: [{ text: { content: 'AI Pipeline ' + now } }] } },
      children: [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '🔍 調査結果（ChatGPT）' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: researchResult.substring(0, 2000) } }] } },
        { object: 'block', type: 'divider', divider: {} },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '🧠 設計案（Claude）' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: designResult.substring(0, 2000) } }] } },
        { object: 'block', type: 'divider', divider: {} },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '🔄 セルフレビュー（Claude）' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: reviewResult.substring(0, 2000) } }] } },
      ]
    });
    console.log('✅ Notion保存完了: AI Pipeline ' + now);
  } catch (error) {
    console.error('❌ Notionエラー:', error.message);
  }
}

// メイン実行
async function main() {
  console.log('🚀 aiPipeline.js 開始（新モデル: Notion → ChatGPT調査 → Claude設計+レビュー → Notion）');
  try {
    const taskContent = await readNotionTask();
    if (!taskContent) {
      console.log('⚠️ Notionからタスクを取得できません。HANDOFF.mdにフォールバック。');
      const fs = require('fs');
      const handoff = fs.existsSync('./HANDOFF.md') ? fs.readFileSync('./HANDOFF.md', 'utf-8') : '';
      if (!handoff) { console.error('❌ HANDOFF.mdも見つかりません。終了。'); process.exit(1); }
      const res = await research(handoff);
      const { design, review } = await designAndReview(handoff, res);
      await saveToNotion(res, design, review);
      return;
    }
    const researchResult = await research(taskContent);
    const { design, review } = await designAndReview(taskContent, researchResult);
    await saveToNotion(researchResult, design, review);
    console.log('\n' + '='.repeat(50));
    console.log('📋 パイプライン結果サマリー');
    console.log('='.repeat(50));
    console.log('\n🔍 調査:', researchResult.substring(0, 300) + '...');
    console.log('\n🧠 設計:', design.substring(0, 300) + '...');
    console.log('\n🔄 レビュー:', review.substring(0, 300) + '...');
    console.log('\n✅ aiPipeline.js 完了');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
