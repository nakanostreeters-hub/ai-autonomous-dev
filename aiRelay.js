/**
 * aiRelay.js - AI自律開発システム 実行エンジン
 *
 * フロー:
 * 1. HANDOFF.md を読み取る
 * 2. Claude API に送信 → 一次回答を取得
 * 3. ChatGPT API に Claude の回答を送信 → 批評・補完を取得
 * 4. 結果を Notion に保存
 */

const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@notionhq/client');

// OpenAI はオプショナル（インストールされていない場合はClaude単体モードで動作）
let OpenAI;
try {
  OpenAI = require('openai');
} catch {
  console.log('⚠️ openai パッケージが見つかりません。Claude 単体モードで動作します。');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = OpenAI && process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const NOTION_PAGE_ID = process.env.NOTION_PAGE_ID;

// Notion rich_text の2000文字制限を回避するため、テキストを複数パラグラフブロックに分割
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

function readHandoff() {
  const path = './HANDOFF.md';
  if (!fs.existsSync(path)) { console.error('HANDOFF.md not found'); process.exit(1); }
  const content = fs.readFileSync(path, 'utf-8');
  console.log('✅ HANDOFF.md 読み取り完了（' + content.length + '文字）');
  return content;
}

async function askClaude(handoff) {
  console.log('🧠 Claude に送信中...');
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: 'あなたはAI自律開発システムの設計・実行担当です。HANDOFF.mdを読んで次にやるべき作業を具体的に提案してください。日本語で回答。',
    messages: [{ role: 'user', content: 'HANDOFF.md:\n\n' + handoff }]
  });
  const res = msg.content[0].text;
  console.log('✅ Claude 回答取得（' + res.length + '文字）');
  return res;
}

async function askChatGPT(handoff, claudeRes) {
  if (!openai) {
    console.log('⚠️ OpenAI が利用できないため、ChatGPT 批評をスキップします');
    return '（ChatGPT 批評なし — Claude 単体モードで実行）';
  }
  console.log('🔍 ChatGPT に送信中...');
  const comp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'あなたはAI自律開発システムの批評・補完担当です。Claudeの回答を批評し改善案を提案してください。日本語で回答。' },
      { role: 'user', content: '## HANDOFF.md\n' + handoff + '\n\n## Claude の回答\n' + claudeRes + '\n\n批評・補完してください。' }
    ],
    max_tokens: 4096,
  });
  const res = comp.choices[0].message.content;
  console.log('✅ ChatGPT 回答取得（' + res.length + '文字）');
  return res;
}

async function saveToNotion(claudeRes, gptRes) {
  console.log('📝 Notion に保存中...');
  const now = new Date();
  const ts = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  try {
    await notion.pages.create({
      parent: { page_id: NOTION_PAGE_ID },
      properties: { title: { title: [{ text: { content: 'AI議論 ' + ts } }] } },
      children: [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: '🧠 Claude の回答' } }] } },
        ...splitToNotionBlocks(claudeRes),
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ text: { content: '🔍 ChatGPT の批評' } }] } },
        ...splitToNotionBlocks(gptRes),
      ]
    });
    console.log('✅ Notion 保存完了: AI議論 ' + ts);
  } catch (e) { console.error('❌ Notion エラー:', e.message); }
}

async function main() {
  console.log('🚀 aiRelay.js 開始');
  try {
    const handoff = readHandoff();
    const claudeRes = await askClaude(handoff);
    const gptRes = await askChatGPT(handoff, claudeRes);
    await saveToNotion(claudeRes, gptRes);
    console.log('\n🧠 Claude:', claudeRes.substring(0, 500) + '...');
    console.log('\n🔍 ChatGPT:', gptRes.substring(0, 500) + '...');
    console.log('\n✅ aiRelay.js 完了');
  } catch (e) { console.error('❌ エラー:', e.message); process.exit(1); }
}

main();
