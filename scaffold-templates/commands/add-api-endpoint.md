# add-api-endpoint slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/add-api-endpoint.md` として生成してください。
API 層が選択された場合のみ生成します。

---

```markdown
---
description: API に新しいエンドポイントを追加する (project)
---

## ガイドライン参照

作業前に必ず以下を読み込む:

- [CLAUDE.md](../../CLAUDE.md) — 設計原則・命名規約・ガードレール
- [{{API_DIR}}/CLAUDE.md](../../{{API_DIR}}/CLAUDE.md) — API 層固有のルール
- 既存のエンドポイント（`{{API_DIR}}/src/{{ENDPOINT_DIR}}/`）を参考に構造を把握する

## 現在のエンドポイント構成

- 既存エンドポイント: !`ls {{API_DIR}}/src/{{ENDPOINT_DIR}}/`

## タスク

`$ARGUMENTS` を `{{API_DIR}}/src/{{ENDPOINT_DIR}}/` に新しいエンドポイントとして追加してください。

### 作成するファイル

```
{{API_DIR}}/src/{{ENDPOINT_DIR}}/{feature}/
└── {endpoint-file}.{{FILE_EXT}}   # {{ENDPOINT_NAMING_CONVENTION}}
```

### 実装ルール（ガードレール遵守）

**ファイル命名（CLAUDE.md 規約）:**

- エンドポイントファイルは {{ENDPOINT_NAMING_CONVENTION}} で命名

**依存方向（ガードレール②）:**

- ユースケース層（`../use-cases/`）への依存: OK（ユースケース経由でドメインロジックを呼ぶ）
- 共通ユーティリティ（`../shared/`）への依存: OK
- ドメイン層への直接依存: 最小限に（型のみ使用可）
- UI 層（web / mobile）への依存: 禁止

**実装方針:**

1. リクエストのバリデーションを行う
2. ビジネスロジックはユースケース層に委譲する（エンドポイントは薄く保つ）
3. レスポンスは統一フォーマットにする
4. エラーは統一的に処理する

### 完了確認

```bash
{{TYPE_CHECK_CMD}} {{API_WORKSPACE_FLAG}}
{{LINT_CMD}} {{API_WORKSPACE_FLAG}}
{{DEP_CHECK_CMD}}
```
```
