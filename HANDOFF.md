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
