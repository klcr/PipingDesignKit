# Git フック構成テンプレート

このテンプレートは、Git フックによる品質チェック（ガードレール④）の設定指針です。
技術スタックに応じて適切なツール・設定を選択してください。

## 基本方針

```
git commit → pre-commit: 変更ファイルのみ lint + format（高速）
git push   → pre-push:   全体 lint + 型チェック（包括的）
CI         → 全チェック（lint / type-check / test / dep-check / dead-code）
```

## TypeScript プロジェクト

### ツール

- **husky**: Git フック管理
- **lint-staged**: 変更ファイルのみにツールを適用

### セットアップ

```bash
npm install --save-dev husky lint-staged
npx husky init
```

### `.husky/pre-commit`

```bash
# ガードレール④: pre-commit — 変更ファイルのみ lint + format で品質チェック
npx lint-staged
```

### `.husky/pre-push`

```bash
# ガードレール④: pre-push — lint + 型チェックで全体品質チェック
{{LINT_CMD}} && {{TYPE_CHECK_CMD}}
```

### `package.json` の lint-staged 設定

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

## Python プロジェクト

### ツール

- **pre-commit**: Git フック管理（Python エコシステム標準）

### `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.13.0
    hooks:
      - id: mypy
        additional_dependencies: []

  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        types: [python]
        pass_filenames: false
        stages: [pre-push]
```

### セットアップ

```bash
pip install pre-commit
pre-commit install
pre-commit install --hook-type pre-push
```

## Go プロジェクト

### ツール

- **lefthook** または **pre-commit**: Git フック管理

### `lefthook.yml`（lefthook 使用の場合）

```yaml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: "*.go"
      run: golangci-lint run --fix {staged_files}
    fmt:
      glob: "*.go"
      run: gofmt -w {staged_files}

pre-push:
  parallel: true
  commands:
    lint:
      run: golangci-lint run ./...
    test:
      run: go test ./...
    vet:
      run: go vet ./...
```

### セットアップ

```bash
go install github.com/evilmartians/lefthook@latest
lefthook install
```

## CI パイプライン テンプレート

### GitHub Actions（共通構造）

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # --- 言語セットアップ（選択に応じて） ---

      - name: Build
        run: {{BUILD_CMD}}

      # --- ガードレール③: テスト ---
      - name: Test
        run: {{TEST_CMD}}

      # --- ガードレール④: Lint ---
      - name: Lint
        run: {{LINT_CMD}}

      # --- ガードレール②: 依存方向違反の検出 ---
      - name: Dependency Check
        run: {{DEP_CHECK_CMD}}
```
