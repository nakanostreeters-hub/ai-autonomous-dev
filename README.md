# AI自律開発システム

美容室「プレミアモデルズ中野」の開発を、AI同士が自律的に進めるシステムです。

## 目的

HANDOFF.md を更新するだけで、Claude と ChatGPT が自動で議論を行い、結果を Notion に保存します。人間（ヒロ）は決裁・承認だけに集中できます。

## システム構成

```
ヒロ（決裁者）
  ↓ 議論
Genspark（マネージャー）
  ↓ 自動保存
Notion（記録・保管）
  ↓ 転記
HANDOFF.md → GitHub push
  ↓ 自動起動
GitHub Actions → aiRelay.js
  ↓ API呼び出し
Claude（一次回答）⇔ ChatGPT（批評・補完）
  ↓ 自動保存
Notion（議論結果を保存）
```

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/nakanostreeters-hub/ai-autonomous-dev.git
cd ai-autonomous-dev
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` に以下の実値を入力してください：

| 変数名 | 説明 |
|--------|------|
| ANTHROPIC_API_KEY | Claude API キー |
| OPENAI_API_KEY | ChatGPT API キー |
| NOTION_API_KEY | Notion Integration トークン |
| NOTION_PAGE_ID | 議論結果を保存する Notion ページの ID |

### 3. GitHub Secrets を登録

リポジトリの Settings > Secrets and variables > Actions で以下を登録：

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `NOTION_API_KEY`
- `NOTION_PAGE_ID`
- `GH_OWNER` → `nakanostreeters-hub`
- `GH_REPO` → `ai-autonomous-dev`

## 使い方

### 自動実行（GitHub Actions）

1. `HANDOFF.md` を編集する（タスクや指示を書く）
2. GitHub に push する
3. GitHub Actions が自動で `aiRelay.js` を実行
4. Claude が一次回答 → ChatGPT が批評・補完
5. 結果が Notion に自動保存される

### ローカル実行

```bash
node aiRelay.js
```

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `HANDOFF.md` | Notion に行けない Claude への引き継ぎ書 |
| `aiRelay.js` | Claude → ChatGPT 自動議論エンジン |
| `.github/workflows/ai-relay.yml` | GitHub Actions ワークフロー定義 |
| `package.json` | 依存パッケージ |
| `.env.example` | 環境変数テンプレート |
| `.gitignore` | Git 除外設定 |

## 重要なルール

- 機密情報（API キー等）は GitHub に書かない
- `.env` の実値はローカルだけで保持する
- Notion が正（マスター）、HANDOFF.md は Claude への橋渡し用コピー# ai-autonomous-dev
AI自律開発システム
