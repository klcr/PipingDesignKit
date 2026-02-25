# DDD Scaffold Templates

## プロジェクト概要

DDD（ドメイン駆動設計）+ レイヤードアーキテクチャのプロジェクトを新規構築するためのスキャフォールディングテンプレート集。技術スタック（言語・フレームワーク）に依存しない汎用的な設計パターンを提供する。

## 使い方

```
/project:init-scaffold
```

Claude Code が対話的にヒアリングし、フォルダ構造・設定ファイル・CLAUDE.md・ガードレール一式を生成する。

## リポジトリ構成

- `.claude/commands/init-scaffold.md` — メインの slash command
- `scaffold-templates/` — テンプレートファイル群（19 ファイル）

```
scaffold-templates/
├── README.md               # テンプレート全体の説明
├── root/                   # プロジェクトルートのテンプレート
│   ├── claude-md.md
│   ├── gitignore.md
│   └── readme.md
├── layers/                 # レイヤー別 CLAUDE.md テンプレート
│   ├── domain/claude-md.md
│   ├── api/claude-md.md
│   ├── web/claude-md.md
│   └── mobile/claude-md.md
├── commands/               # slash command テンプレート
│   ├── add-domain-entity.md
│   ├── add-usecase.md
│   ├── add-api-endpoint.md
│   ├── add-web-feature.md
│   ├── add-mobile-feature.md
│   └── review.md
├── docs/                   # ドキュメントテンプレート
│   ├── constraints-readme.md
│   ├── issues-readme.md
│   └── adr-template.md
└── guardrails/             # ガードレール設計テンプレート
    ├── dependency-rules.md
    └── git-hooks.md
```

## テンプレート記法

### プレースホルダー

`{{VARIABLE}}` — Claude がヒアリング結果で置換する変数。主要な変数:

- `{{PROJECT_NAME}}` — プロジェクト名
- `{{PROJECT_DESCRIPTION}}` — プロジェクト概要
- `{{SCOPE_NAME}}` — パッケージスコープ名
- `{{LANGUAGE}}` — 主要言語
- `{{API_FRAMEWORK}}` — API フレームワーク
- `{{DOMAIN_DIR}}`, `{{API_DIR}}`, `{{WEB_DIR}}`, `{{MOBILE_DIR}}` — 各レイヤーのディレクトリパス

全変数一覧は `scaffold-templates/README.md` を参照。

### 条件ブロック

`<!-- IF: CONDITION -->` 〜 `<!-- ENDIF -->` — 条件付きで含める/除外するセクション。

- `HAS_API_LAYER`, `HAS_WEB_LAYER`, `HAS_MOBILE_LAYER` — レイヤーの有無
- `IS_TYPESCRIPT`, `IS_PYTHON`, `IS_GO` — 言語判定
- `HAS_MONOREPO`, `HAS_DEP_CHECK`, `HAS_FORMATTER` — ツールの有無

## 対応言語・フレームワーク

| カテゴリ | 選択肢 |
|---------|-------|
| 言語 | TypeScript / Python / Go |
| モノレポ | Turborepo / Nx / none |
| API | Azure Functions / Express / Hono / FastAPI / Gin / none |
| Web UI | React+Vite / Next.js / Vue / none |
| Mobile | React Native / Flutter / none |
| テスト | Vitest / Jest / pytest / go test |
| リンター | ESLint / Biome / Ruff / golangci-lint |
| フォーマッター | Prettier / Biome / Black / gofmt / none |
| 依存チェック | dependency-cruiser / import-linter / none |

## 生成されるガードレール（8 種）

1. **slash command によるコンテキスト構造化** — `.claude/commands/` に定型操作コマンドを配置
2. **依存方向の制御** — レイヤー間の依存方向を機械的にチェック
3. **レイヤーごとのテスト原則** — Domain 90%+, Application 全フロー, UI 軽量
4. **Git フックによる品質チェック** — pre-commit: lint, pre-push: 全体チェック
5. **レビューコマンド** — `/project:review` でガイドライン違反を検出
6. **制約条件の記録** — `docs/constraints/` に設計判断を蓄積
7. **事象管理** — `docs/issues/` にブロッカーを記録・追跡
8. **クロスプラットフォーム開発環境の保護** — lockfile 汚染防止ルール

## テンプレートの編集

テンプレートを編集する際は以下に注意:

1. プレースホルダー `{{VAR}}` の命名は `scaffold-templates/README.md` の一覧に合わせる
2. 条件ブロック `<!-- IF: CONDITION -->` は対応する `<!-- ENDIF -->` を必ず閉じる
3. テンプレート内の markdown コードブロック（` ``` `）が実際に生成されるファイルの内容
