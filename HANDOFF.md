# HANDOFF — AI自律開発システム

> このファイルは Notion にアクセスできない Claude への引き継ぎ書です。
> Notion の開発ログ・議論結果をここに転記し、Claude が文脈を持って作業できるようにします。

---

## システム概要

美容室「プレミアモデルズ中野」の開発を、AI同士が自律的に進めるシステム。

### 各AIの役割

| 役割 | 担当 |
|------|------|
| 👑 決裁者 | ヒロ（議論・承認のみ） |
| 👔 マネージャー | Genspark（Notion保存・GitHub読み・全体管理） |
| 🧠 設計・実行① | Claude（GitHubを読んで一次回答・コード作成） |
| 🔍 批評・補完② | ChatGPT（Claudeの回答を批評・補完） |
| ⚡ 自動起動 | GitHub Actions（HANDOFF.md更新時にaiRelay.jsを実行） |
| 🔧 実行エンジン | aiRelay.js（Claude・ChatGPTへのAPI呼び出し） |
| 📝 記録・保管 | Notion（議事録・企画書・AI議論結果を保存） |
| 📁 橋渡し | GitHub HANDOFF.md（NotionとClaudeを繋ぐ） |

### 自動化フロー

```
ヒロ → Genspark議論     👑 ヒロが話す
Genspark → Notion保存    ✅ 自動
Notion → HANDOFF.md転記  ❌ 手動（課題）
HANDOFF.md → GitHub push ❌ 手動（課題）
GitHub Actions起動       ✅ 自動（設定済み）
aiRelay.js実行           ✅ 自動
Claude・ChatGPT議論      ✅ 自動
結果 → Notion保存        ✅ 自動
```

### 現在の課題

**Notion → HANDOFF.md の転記が手動**。ここを自動化すれば全フローが自動化される。

検討中の方法:
- Genspark Workflow で自動転記
- Genspark Claw で完全自律化
- Make.com + Notion API + GitHub API

---

## 関連リポジトリ

| リポジトリ | 用途 |
|-----------|------|
| （このリポジトリ） | AI自律開発システム本体 |
| salon-phone-system（別リポ） | 電話受付→SMS→Slack自動化（HANDOFF.md別管理） |

---

## 実証済みフロー

### サロンボード ブログ投稿フロー（Claude in Chrome経由）

2026/3/15に実証済み。Claude in Chrome拡張を使い、サロンボードのブログ投稿を自動化できることを確認。

#### フロー

```
1. Claude in Chrome でサロンボード（salonboard.com）にアクセス
   ※ログインは手動（パスワード入力はセキュリティ上Claude不可）
2. ブログ > 新規投稿画面を開く（Claude操作可能）
3. Claudeがブログ内容を生成（タイトル・本文・ハッシュタグ）
4. フォームに直接入力（typeコマンドで入力 ※form_inputだと反映されない）
   - 投稿者: ドロップダウン選択 → OK
   - カテゴリ: ドロップダウン選択 → OK
   - タイトル: typeコマンド → OK（全角25文字以下）
   - 本文: typeコマンド → OK（全角1000文字以下、改行80回以下）
5. 「確認する」ボタン → 確認画面（Claude操作可能）
6. 「登録・反映する」or「登録・未反映にする」（Claude操作可能）
```

#### 技術的な注意点

- **サロンボードの2度押しエラー対策**: JS経由の `value` 設定（form_input）ではフォーム側が検知しない。`type` コマンド（キーボード入力）なら反映される
- **Chrome拡張のボタン**: Chrome拡張が注入したUI（AIブログ生成ボタン等）はClaude in Chromeからクリックしても反応しない。拡張のイベントリスナーに到達しないため
- **解決策**: Chrome拡張のAIブログ生成機能を使わず、Claudeが直接ブログ内容を生成してフォームにtype入力すればOK
- **ログイン**: パスワード入力はClaude不可。手動ログイン後にClaude操作を開始する

#### Chrome拡張 vs Claude in Chrome 使い分け

| | Chrome拡張（サロンボードAIアシスタント） | Claude in Chrome |
|--|---------------------------------------|-----------------|
| 用途 | 日常の繰り返し作業 | その場の「これやって」 |
| 常駐 | ✅ 常に使える | ❌ 会話中のみ |
| AI生成 | 拡張内のAPI呼び出し | Claudeが直接生成 |
| 入力方式 | 📋コピーボタン方式 | typeコマンドで直接入力 |
| 投稿フロー | 手動コピペ必要 | 全自動（ログイン以外） |

---

## 開発ログ

> Notion の開発ログをここに時系列で追記していく。

### 2026/3/15 — サロンボード自動投稿フロー実証

- Claude in Chrome でサロンボードのブログ投稿が可能なことを確認
- typeコマンドによるフォーム入力が有効（form_inputは無効）
- Chrome拡張ボタンはClaude in Chromeからクリック不可（制約として記録）
- テスト投稿「春のヘアスタイルで気分も軽やかに☆」を未反映で登録完了

### 2026/3/14 — GitHub Actions設定完了

#### ✅ 完成したこと
- GitHub ActionsでaiRelayを自動実行する仕組みを設定

#### 🛠️ やったこと
1. `.github/workflows` フォルダを作成
2. `ai-relay.yml` ファイルを作成（HANDOFF.mdが更新されてpushされたら自動でaiRelay.jsを実行）
3. GitHub Secrets にAPIキーを全部登録

| Secret名 | 状態 |
|----------|------|
| OPENAI_API_KEY | ✅ 登録済み |
| ANTHROPIC_API_KEY | ✅ 登録済み |
| GITHUB_OWNER | ✅ 登録済み |
| GITHUB_REPO | ✅ 登録済み |
| NOTION_API_KEY | ✅ 登録済み |
| NOTION_PAGE_ID | ✅ 登録済み |

#### 📌 次回やること（Claudeと作業）
1. `.github/workflows/ai-relay.yml` を GitHubにpush
2. HANDOFF.mdを更新してpush → 自動実行テスト
3. GitHub Actionsの実行結果を確認
4. ngrok固定URL設定（有料プラン）
5. Genspark Workflow から `/run-relay` を自動起動

#### 💡 重要な理解
- GitHub Secrets = 暗号化されたAPIキー置き場（安全）
- GitHub Actions = Mac不要・24時間動くクラウドサーバー
- HANDOFF.mdが更新されるたびにAI議論が自動スタート

---

## AI に共有するときの説明テンプレート

以下をそのまま AI に渡せます。

```text
このプロジェクトは「AI自律開発システム」です。
美容室の開発タスクをAI同士が自律的に議論・実行します。

構成:
- ヒロ（決裁者）→ Genspark（マネージャー）→ Notion（記録）
- HANDOFF.md（橋渡し）→ GitHub Actions → aiRelay.js
- Claude（一次回答）⇔ ChatGPT（批評・補完）

現在の状態:
- GitHub Actions設定済み
- aiRelay.js実装済み
- サロンボード自動投稿フロー実証済み（Claude in Chrome経由）
- 課題: Notion → HANDOFF.md の自動転記

このリポジトリの HANDOFF.md を読んで、最新の開発ログに基づいて作業してください。
```

---

## 備考

- 機密情報（APIキー等）は GitHub に書かない
- 開発ログは日付付きで末尾に追記していく
- Notion が正（マスター）、HANDOFF.md はClaudeへの橋渡し用コピー# HANDOFF — AI自律開発システム

> このファイルは Notion にアクセスできない Claude への引き継ぎ書です。
> Notion の開発ログ・議論結果をここに転記し、Claude が文脈を持って作業できるようにします。

---

## システム概要

美容室「プレミアモデルズ中野」の開発を、AI同士が自律的に進めるシステム。

### 各AIの役割

| 役割 | 担当 |
|------|------|
| 👑 決裁者 | ヒロ（議論・承認のみ） |
| 👔 マネージャー | Genspark（Notion保存・GitHub読み・全体管理） |
| 🧠 設計・実行① | Claude（GitHubを読んで一次回答・コード作成） |
| 🔍 批評・補完② | ChatGPT（Claudeの回答を批評・補完） |
| ⚡ 自動起動 | GitHub Actions（HANDOFF.md更新時にaiRelay.jsを実行） |
| 🔧 実行エンジン | aiRelay.js（Claude・ChatGPTへのAPI呼び出し） |
| 📝 記録・保管 | Notion（議事録・企画書・AI議論結果を保存） |
| 📁 橋渡し | GitHub HANDOFF.md（NotionとClaudeを繋ぐ） |

### 自動化フロー

```
ヒロ → Genspark議論     👑 ヒロが話す
Genspark → Notion保存    ✅ 自動
Notion → HANDOFF.md転記  ❌ 手動（課題）
HANDOFF.md → GitHub push ❌ 手動（課題）
GitHub Actions起動       ✅ 自動（設定済み）
aiRelay.js実行           ✅ 自動
Claude・ChatGPT議論      ✅ 自動
結果 → Notion保存        ✅ 自動
```

### 現在の課題

**Notion → HANDOFF.md の転記が手動**。ここを自動化すれば全フローが自動化される。

検討中の方法:
- Genspark Workflow で自動転記
- Genspark Claw で完全自律化
- Make.com + Notion API + GitHub API

---

## 関連リポジトリ

| リポジトリ | 用途 |
|-----------|------|
| （このリポジトリ） | AI自律開発システム本体 |
| salon-phone-system（別リポ） | 電話受付→SMS→Slack自動化（HANDOFF.md別管理） |

---

## 開発ログ

> Notion の開発ログをここに時系列で追記していく。

### 2026/3/14 — GitHub Actions設定完了

#### ✅ 完成したこと
- GitHub ActionsでaiRelayを自動実行する仕組みを設定

#### 🛠️ やったこと
1. `.github/workflows` フォルダを作成
2. `ai-relay.yml` ファイルを作成（HANDOFF.mdが更新されてpushされたら自動でaiRelay.jsを実行）
3. GitHub Secrets にAPIキーを全部登録

| Secret名 | 状態 |
|----------|------|
| OPENAI_API_KEY | ✅ 登録済み |
| ANTHROPIC_API_KEY | ✅ 登録済み |
| GITHUB_OWNER | ✅ 登録済み |
| GITHUB_REPO | ✅ 登録済み |
| NOTION_API_KEY | ✅ 登録済み |
| NOTION_PAGE_ID | ✅ 登録済み |

#### 📌 次回やること（Claudeと作業）
1. `.github/workflows/ai-relay.yml` を GitHubにpush
2. HANDOFF.mdを更新してpush → 自動実行テスト
3. GitHub Actionsの実行結果を確認
4. ngrok固定URL設定（有料プラン）
5. Genspark Workflow から `/run-relay` を自動起動

#### 💡 重要な理解
- GitHub Secrets = 暗号化されたAPIキー置き場（安全）
- GitHub Actions = Mac不要・24時間動くクラウドサーバー
- HANDOFF.mdが更新されるたびにAI議論が自動スタート

---

## AI に共有するときの説明テンプレート

以下をそのまま AI に渡せます。

```text
このプロジェクトは「AI自律開発システム」です。
美容室の開発タスクをAI同士が自律的に議論・実行します。

構成:
- ヒロ（決裁者）→ Genspark（マネージャー）→ Notion（記録）
- HANDOFF.md（橋渡し）→ GitHub Actions → aiRelay.js
- Claude（一次回答）⇔ ChatGPT（批評・補完）

現在の状態:
- GitHub Actions設定済み
- aiRelay.js実装済み
- 課題: Notion → HANDOFF.md の自動転記

このリポジトリの HANDOFF.md を読んで、最新の開発ログに基づいて作業してください。
```

---

## 備考

- 機密情報（APIキー等）は GitHub に書かない
- 開発ログは日付付きで末尾に追記していく
- Notion が正（マスター）、HANDOFF.md はClaudeへの橋渡し用コピー# HANDOFF — AI自律開発システム

> このファイルは Notion にアクセスできない Claude への引き継ぎ書です。
> Notion の開発ログ・議論結果をここに転記し、Claude が文脈を持って作業できるようにします。

---

## システム概要

美容室「プレミアモデルズ中野」の開発を、AI同士が自律的に進めるシステム。

### 各AIの役割

| 役割 | 担当 |
|------|------|
| 👑 決裁者 | ヒロ（議論・承認のみ） |
| 👔 マネージャー | Genspark（Notion保存・GitHub読み・全体管理） |
| 🧠 設計・実行① | Claude（GitHubを読んで一次回答・コード作成） |
| 🔍 批評・補完② | ChatGPT（Claudeの回答を批評・補完） |
| ⚡ 自動起動 | GitHub Actions（HANDOFF.md更新時にaiRelay.jsを実行） |
| 🔧 実行エンジン | aiRelay.js（Claude・ChatGPTへのAPI呼び出し） |
| 📝 記録・保管 | Notion（議事録・企画書・AI議論結果を保存） |
| 📁 橋渡し | GitHub HANDOFF.md（NotionとClaudeを繋ぐ） |

### 自動化フロー

```
ヒロ → Genspark議論     👑 ヒロが話す
Genspark → Notion保存    ✅ 自動
Notion → HANDOFF.md転記  ❌ 手動（課題）
HANDOFF.md → GitHub push ❌ 手動（課題）
GitHub Actions起動       ✅ 自動（設定済み）
aiRelay.js実行           ✅ 自動
Claude・ChatGPT議論      ✅ 自動
結果 → Notion保存        ✅ 自動
```

### 現在の課題

**Notion → HANDOFF.md の転記が手動**。ここを自動化すれば全フローが自動化される。

検討中の方法:
- Genspark Workflow で自動転記
- Genspark Claw で完全自律化
- Make.com + Notion API + GitHub API

---

## 関連リポジトリ

| リポジトリ | 用途 |
|-----------|------|
| （このリポジトリ） | AI自律開発システム本体 |
| salon-phone-system（別リポ） | 電話受付→SMS→Slack自動化（HANDOFF.md別管理） |

---

## 開発ログ

> Notion の開発ログをここに時系列で追記していく。

### 2026/3/14 — GitHub Actions設定完了

- AI自律開発システムの構成図を作成
- 各AI（ヒロ・Genspark・Claude・ChatGPT）の役割を定義
- GitHub Actions設定完了（HANDOFF.md更新 → aiRelay.js自動実行）
- 手動/自動の整理完了。残課題は Notion → HANDOFF.md の自動転記

---

## AI に共有するときの説明テンプレート

以下をそのまま AI に渡せます。

```text
このプロジェクトは「AI自律開発システム」です。
美容室の開発タスクをAI同士が自律的に議論・実行します。

構成:
- ヒロ（決裁者）→ Genspark（マネージャー）→ Notion（記録）
- HANDOFF.md（橋渡し）→ GitHub Actions → aiRelay.js
- Claude（一次回答）⇔ ChatGPT（批評・補完）

現在の状態:
- GitHub Actions設定済み
- aiRelay.js実装済み
- 課題: Notion → HANDOFF.md の自動転記

このリポジトリの HANDOFF.md を読んで、最新の開発ログに基づいて作業してください。
```

---

## 備考

- 機密情報（APIキー等）は GitHub に書かない
- 開発ログは日付付きで末尾に追記していく
- Notion が正（マスター）、HANDOFF.md はClaudeへの橋渡し用コピー
