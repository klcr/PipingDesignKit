# DDD Scaffold Templates

DDD（ドメイン駆動設計）+ レイヤードアーキテクチャのプロジェクトを新規構築するためのスキャフォールディングテンプレート集。

## 特徴

- **技術スタック非依存**: TypeScript / Python / Go いずれにも対応
- **Claude Code 統合**: `/project:init-scaffold` コマンドで対話的にプロジェクトを生成
- **8 つのガードレール**: 品質を機械的に担保する仕組みを自動構築
- **DDD パターン**: Domain / Application / Infrastructure / Presentation の 4 層構造

## クイックスタート

1. このリポジトリをクローンまたはテンプレートとして使用
2. Claude Code で以下を実行:

```
/project:init-scaffold
```

3. 対話的にプロジェクト構成をヒアリング:
   - プロジェクト名・概要
   - 技術スタック（言語、フレームワーク、ツールチェイン）
   - レイヤー構成（Domain / API / Web / Mobile）

4. フォルダ構造・設定ファイル・ガードレール一式が自動生成

## 生成されるもの

| カテゴリ | 内容 |
|---------|------|
| CLAUDE.md | プロジェクト全体の AI 向けガイドライン + ガードレール定義 |
| レイヤー別 CLAUDE.md | 各レイヤー固有のルール・ディレクトリ構成・命名規約 |
| slash command | `/project:add-domain-entity`, `/project:add-usecase`, `/project:review` 等 |
| docs/ | ADR テンプレート、制約条件管理、事象管理 |
| 設定ファイル | .gitignore, Git フック, CI パイプライン, 依存チェック, リンター設定 |

## 生成されるプロジェクト構造例

### TypeScript + Turborepo + Azure Functions + React

```
my-project/
├── .claude/commands/           # slash command 群
├── CLAUDE.md                   # ガイドライン + ガードレール
├── docs/                       # ADR, constraints, issues
├── packages/
│   ├── domain/                 # ドメイン層（外部依存ゼロ）
│   ├── api/                    # Azure Functions + ユースケース
│   └── web/                    # React + Vite
├── package.json, turbo.json, tsconfig.base.json
├── .dependency-cruiser.cjs     # 依存方向チェック
└── .husky/                     # Git フック
```

### Python + FastAPI

```
my-project/
├── .claude/commands/
├── CLAUDE.md
├── docs/
├── src/
│   ├── domain/
│   ├── use_cases/
│   ├── infrastructure/
│   └── api/
├── tests/
├── pyproject.toml
└── .pre-commit-config.yaml
```

## テンプレート構成

```
scaffold-templates/
├── README.md               # テンプレートの詳細説明
├── root/                   # ルート設定テンプレート
├── layers/                 # レイヤー別 CLAUDE.md テンプレート
├── commands/               # slash command テンプレート
├── docs/                   # ドキュメントテンプレート
└── guardrails/             # ガードレール設計テンプレート
```

詳細は [`scaffold-templates/README.md`](scaffold-templates/README.md) を参照。

## 8 つのガードレール

生成されるプロジェクトには以下のガードレールが組み込まれます:

| # | ガードレール | 目的 |
|---|-------------|------|
| 1 | slash command | 定型操作を標準化し、Claude への文脈提供を構造化 |
| 2 | 依存方向チェック | レイヤー間の不正な依存を機械的に検出 |
| 3 | テスト原則 | レイヤーごとの適切なテスト戦略を定義 |
| 4 | Git フック | commit / push 時に自動で品質チェック |
| 5 | レビューコマンド | 設計ガイドライン違反を AI が検出 |
| 6 | 制約条件記録 | 技術的制約・トレードオフを文書化 |
| 7 | 事象管理 | ブロッカー・課題を追跡 |
| 8 | 環境保護 | クロスプラットフォーム開発での lockfile 汚染を防止 |

## ライセンス

MIT
