---
description: DDD + レイヤードアーキテクチャのプロジェクトスキャフォールドを生成する (project)
---

## 概要

このコマンドは、DDD（ドメイン駆動設計）+ レイヤードアーキテクチャのプロジェクト構造を対話的に生成します。
テンプレートは `scaffold-templates/` ディレクトリを参照してください。

## Step 1: ヒアリング

ユーザーに以下の情報を質問してください。AskUserQuestion ツールを使って効率的にヒアリングしてください。

### 1-1. プロジェクト基本情報

- **プロジェクト名**（kebab-case、例: `inventory-system`）
- **プロジェクト概要**（1〜2文の日本語説明）
- **パッケージスコープ名**（例: `@inventory`。TypeScript のモノレポ時に使用）

### 1-2. 技術スタック

以下の選択肢から選んでもらう:

| 項目 | 選択肢 |
|------|-------|
| 言語 | TypeScript / Python / Go / その他 |
| モノレポツール | Turborepo / Nx / none |
| API フレームワーク | Azure Functions / Express / Hono / FastAPI / Gin / none |
| Web UI フレームワーク | React + Vite / Next.js / Vue / none |
| Mobile フレームワーク | React Native (Expo) / Flutter / none |
| テストフレームワーク | Vitest / Jest / pytest / go test |
| リンター | ESLint / Biome / Ruff / golangci-lint |
| フォーマッター | Prettier / Biome / Black / gofmt / none |
| 依存チェックツール | dependency-cruiser / import-linter / none（CLAUDE.md ルールで代替） |
| 未使用コード検出 | Knip / none |

### 1-3. レイヤー構成

有効化するレイヤーを確認:

- **Domain 層**（必須 — 常に生成）
- **Application / UseCase 層**（API 層選択時に自動で含む）
- **API 層**（API フレームワーク選択時に生成）
- **Web UI 層**（Web フレームワーク選択時に生成）
- **Mobile UI 層**（Mobile フレームワーク選択時に生成）

## Step 2: 変数の決定

ヒアリング結果から以下の変数を決定する。テンプレート内の `{{VARIABLE}}` をこれらの値で置換する。

### ディレクトリパスの決定

| 変数 | モノレポ時 | 単一プロジェクト時 |
|------|----------|-----------------|
| `{{DOMAIN_DIR}}` | `packages/domain` | `src/domain` |
| `{{API_DIR}}` | `packages/api` | `src` |
| `{{WEB_DIR}}` | `packages/web` | `src` |
| `{{MOBILE_DIR}}` | `packages/mobile` | `src` |

### コマンドの決定

| 変数 | TypeScript (Turborepo) | Python | Go |
|------|----------------------|--------|-----|
| `{{BUILD_CMD}}` | `npm run build` | `python -m build` | `go build ./...` |
| `{{TEST_CMD}}` | `npm run test` | `pytest` | `go test ./...` |
| `{{LINT_CMD}}` | `npm run lint` | `ruff check .` | `golangci-lint run ./...` |
| `{{TYPE_CHECK_CMD}}` | `npm run check-types` | `mypy .` | （Go は静的型なので不要） |
| `{{FORMAT_CMD}}` | `npm run format` | `ruff format .` | `gofmt -w .` |
| `{{DEP_CHECK_CMD}}` | `npm run depcruise` | `lint-imports` | （ツールに依存） |

### ファイル拡張子の決定

| 変数 | TypeScript | Python | Go |
|------|-----------|--------|-----|
| `{{FILE_EXT}}` | `ts` | `py` | `go` |
| `{{UI_FILE_EXT}}` | `tsx` | - | - |

## Step 3: テンプレート参照・ファイル生成

以下のテンプレートファイルを読み込み、変数を置換してプロジェクトファイルを生成する。
**条件ブロック `<!-- IF: ... -->` ～ `<!-- ENDIF -->` は、条件が真の場合のみ内容を出力する。**

### 3-1. プロジェクトルート

1. `scaffold-templates/root/claude-md.md` を読み込み → `{{PROJECT_NAME}}/CLAUDE.md` を生成
2. `scaffold-templates/root/gitignore.md` を読み込み → `{{PROJECT_NAME}}/.gitignore` を生成（言語に応じたセクションを選択）
3. `scaffold-templates/root/readme.md` を読み込み → `{{PROJECT_NAME}}/README.md` を生成

### 3-2. レイヤー別 CLAUDE.md

4. `scaffold-templates/layers/domain/claude-md.md` を読み込み → `{{DOMAIN_DIR}}/CLAUDE.md` を生成
5. （API 層選択時）`scaffold-templates/layers/api/claude-md.md` → `{{API_DIR}}/CLAUDE.md` を生成
6. （Web 層選択時）`scaffold-templates/layers/web/claude-md.md` → `{{WEB_DIR}}/CLAUDE.md` を生成
7. （Mobile 層選択時）`scaffold-templates/layers/mobile/claude-md.md` → `{{MOBILE_DIR}}/CLAUDE.md` を生成

### 3-3. slash command

8. `scaffold-templates/commands/add-domain-entity.md` → `.claude/commands/add-domain-entity.md`
9. （API 層選択時）`scaffold-templates/commands/add-usecase.md` → `.claude/commands/add-usecase.md`
10. （API 層選択時）`scaffold-templates/commands/add-api-endpoint.md` → `.claude/commands/add-api-endpoint.md`
11. （Web 層選択時）`scaffold-templates/commands/add-web-feature.md` → `.claude/commands/add-web-feature.md`
12. （Mobile 層選択時）`scaffold-templates/commands/add-mobile-feature.md` → `.claude/commands/add-mobile-feature.md`
13. `scaffold-templates/commands/review.md` → `.claude/commands/review.md`

### 3-4. ドキュメント

14. `scaffold-templates/docs/constraints-readme.md` → `docs/constraints/README.md`
15. `scaffold-templates/docs/issues-readme.md` → `docs/issues/README.md` + `docs/issues/reports/.gitkeep`
16. `docs/adr/` ディレクトリを作成（`scaffold-templates/docs/adr-template.md` を参考に）

### 3-5. ガードレール設定

17. `scaffold-templates/guardrails/dependency-rules.md` を参照し、選択したツールに応じた依存チェック設定ファイルを生成
    - TypeScript: `.dependency-cruiser.cjs`
    - Python: `pyproject.toml` の `[tool.importlinter]` セクション
    - ツールなし: CLAUDE.md のガードレール②で代替（生成済み）

18. `scaffold-templates/guardrails/git-hooks.md` を参照し、選択したツールに応じた Git フック設定を生成
    - TypeScript: `.husky/pre-commit`, `.husky/pre-push`, `package.json` の `lint-staged`
    - Python: `.pre-commit-config.yaml`
    - Go: `lefthook.yml`

### 3-6. 言語固有の設定ファイル

**TypeScript の場合:**

19. `tsconfig.base.json` を生成（`scaffold-templates/` にはテンプレートなし — 以下を直接生成）:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

20. `turbo.json` を生成（Turborepo 選択時）
21. `eslint.config.mjs` を生成（ESLint 選択時）
22. `.prettierrc` + `.prettierignore` を生成（Prettier 選択時）
23. `knip.json` を生成（Knip 選択時）
24. `.nvmrc` を生成
25. ルート `package.json` を生成（workspaces, scripts, devDependencies）
26. 各パッケージの `package.json` + `tsconfig.json` を生成

**Python の場合:**

19. `pyproject.toml` を生成（依存管理、ツール設定を含む）

**Go の場合:**

19. `go.mod` を生成

### 3-7. ディレクトリ構造の作成

選択したレイヤーに応じて、以下の空ディレクトリ（`.gitkeep` 付き）を作成:

**Domain 層:**
- `{{DOMAIN_DIR}}/src/shared/`

**API 層（選択時）:**
- `{{API_DIR}}/src/{{ENDPOINT_DIR}}/`
- `{{API_DIR}}/src/use-cases/`
- `{{API_DIR}}/src/infrastructure/`
- `{{API_DIR}}/src/shared/`

**Web 層（選択時）:**
- `{{WEB_DIR}}/src/features/`
- `{{WEB_DIR}}/src/components/`
- `{{WEB_DIR}}/src/hooks/`
- `{{WEB_DIR}}/src/lib/`

**Mobile 層（選択時）:**
- `{{MOBILE_DIR}}/src/screens/`
- `{{MOBILE_DIR}}/src/components/`
- `{{MOBILE_DIR}}/src/hooks/`
- `{{MOBILE_DIR}}/src/lib/`
- `{{MOBILE_DIR}}/src/navigation/`

### 3-8. CI パイプライン

27. `.github/workflows/ci.yml` を生成（`scaffold-templates/guardrails/git-hooks.md` の CI テンプレートを参照）

## Step 4: 検証

生成完了後、以下をユーザーに提示する:

1. 生成されたファイル一覧（tree コマンドで表示）
2. 次のステップの案内:
   - `git init && git add -A && git commit -m "Initial scaffold"`
   - 開発環境のセットアップコマンド（言語に応じて）
   - 最初のドメインエンティティの追加: `/project:add-domain-entity <エンティティ名>`

## 注意事項

- テンプレート内の `{{VARIABLE}}` は必ずヒアリング結果で置換すること
- `<!-- IF: CONDITION -->` ～ `<!-- ENDIF -->` は条件判定して出力を制御すること
- テンプレートの markdown コードブロック（` ``` `）内のコンテンツが実際に生成するファイルの内容
- テンプレートのコードブロック外のテキストは Claude への指示（生成ファイルには含めない）
