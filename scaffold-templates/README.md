# DDD + レイヤードアーキテクチャ スキャフォールディングテンプレート

## 概要

このディレクトリには、DDD（ドメイン駆動設計）+ レイヤードアーキテクチャのプロジェクトを新規構築するためのテンプレート群が含まれています。

技術スタック（言語・フレームワーク）に依存しない汎用的な設計パターンを提供し、Claude Code の slash command `/project:init-scaffold` から対話的にプロジェクトを生成できます。

## 使い方

Claude Code で以下を実行:

```
/project:init-scaffold
```

Claude が以下を対話的にヒアリングし、プロジェクトを生成します:

1. プロジェクト基本情報（名前・概要・スコープ名）
2. 技術スタック（言語・フレームワーク・ツールチェイン）
3. レイヤー構成（Domain / API / Web / Mobile）

## ディレクトリ構成

```
scaffold-templates/
├── README.md               ← このファイル
├── root/                   # プロジェクトルートのテンプレート
│   ├── claude-md.md        #   ルート CLAUDE.md
│   ├── gitignore.md        #   .gitignore
│   └── readme.md           #   README.md
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

`{{VARIABLE_NAME}}` 形式でテンプレート内の可変箇所を示します。Claude がヒアリング結果で置換します。

| プレースホルダー | 説明 | 例 |
|---|---|---|
| `{{PROJECT_NAME}}` | プロジェクト名（kebab-case） | `my-project` |
| `{{PROJECT_DESCRIPTION}}` | プロジェクト概要 | `在庫管理システム` |
| `{{SCOPE_NAME}}` | npm/パッケージスコープ名 | `@myproject` |
| `{{LANGUAGE}}` | 主要言語 | `TypeScript` |
| `{{MONOREPO_TOOL}}` | モノレポツール | `Turborepo` |
| `{{API_FRAMEWORK}}` | API フレームワーク | `Azure Functions` |
| `{{WEB_FRAMEWORK}}` | Web UI フレームワーク | `React + Vite` |
| `{{MOBILE_FRAMEWORK}}` | Mobile フレームワーク | `React Native` |
| `{{TEST_FRAMEWORK}}` | テストフレームワーク | `Vitest` |
| `{{LINTER}}` | リンター | `ESLint` |
| `{{FORMATTER}}` | フォーマッター | `Prettier` |
| `{{DEP_CHECK_TOOL}}` | 依存チェックツール | `dependency-cruiser` |
| `{{DOMAIN_DIR}}` | Domain 層のディレクトリパス | `packages/domain` |
| `{{API_DIR}}` | API 層のディレクトリパス | `packages/api` |
| `{{WEB_DIR}}` | Web UI 層のディレクトリパス | `packages/web` |
| `{{MOBILE_DIR}}` | Mobile UI 層のディレクトリパス | `packages/mobile` |
| `{{BUILD_CMD}}` | ビルドコマンド | `npm run build` |
| `{{TEST_CMD}}` | テストコマンド | `npm run test` |
| `{{LINT_CMD}}` | リントコマンド | `npm run lint` |
| `{{TYPE_CHECK_CMD}}` | 型チェックコマンド | `npm run check-types` |
| `{{FORMAT_CMD}}` | フォーマットコマンド | `npm run format` |
| `{{DEP_CHECK_CMD}}` | 依存チェックコマンド | `npm run depcruise` |

### 条件ブロック

`<!-- IF: CONDITION -->` と `<!-- ENDIF -->` で囲まれたセクションは、条件が満たされる場合のみ出力に含めます。

| 条件 | 意味 |
|---|---|
| `HAS_API_LAYER` | API 層が有効 |
| `HAS_WEB_LAYER` | Web UI 層が有効 |
| `HAS_MOBILE_LAYER` | Mobile UI 層が有効 |
| `HAS_MONOREPO` | モノレポ構成を使用 |
| `IS_TYPESCRIPT` | TypeScript を使用 |
| `HAS_DEP_CHECK` | 依存チェックツールを使用 |
| `HAS_FORMATTER` | フォーマッターを使用 |
| `HAS_DEAD_CODE_CHECK` | 未使用コード検出ツールを使用 |

## 設計思想

このテンプレート群は FieldFlowChain プロジェクトの実践から抽出された以下の設計パターンを汎用化したものです:

1. **CLAUDE.md による AI 協業の構造化**: プロジェクト・レイヤーごとの指示書で Claude の作業品質を担保
2. **slash command による定型作業のガイド**: エンティティ追加・ユースケース追加等の定型操作を標準化
3. **8 つのガードレール**: 品質を機械的に担保する仕組み
4. **docs/ による知識の蓄積**: ADR・制約条件・事象管理でプロジェクトの判断履歴を記録
