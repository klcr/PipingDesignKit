# add-usecase slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/add-usecase.md` として生成してください。
API 層が選択された場合のみ生成します。

---

```markdown
---
description: アプリケーション層に新しいユースケースを追加する (project)
---

## ガイドライン参照

作業前に必ず以下を読み込む:

- [CLAUDE.md](../../CLAUDE.md) — 設計原則・命名規約・ガードレール
- [{{API_DIR}}/CLAUDE.md](../../{{API_DIR}}/CLAUDE.md) — API 層固有のルール
- 既存のユースケース（`{{API_DIR}}/src/use-cases/`）を参考に構造を把握する

## 現在のユースケース構成

- 既存ユースケース: !`find {{API_DIR}}/src/use-cases -name "*.{{FILE_EXT}}" ! -name "*.test.*" 2>/dev/null | head -20`

## タスク

`$ARGUMENTS` を `{{API_DIR}}/src/use-cases/` に新しいユースケースとして追加してください。

### 作成するファイル構成

```
{{API_DIR}}/src/use-cases/{feature}/
├── {UseCaseName}UseCase.{{FILE_EXT}}      # ユースケースクラス/関数
└── {UseCaseName}UseCase.test.{{FILE_EXT}} # ユニットテスト（ガードレール③: 全フローをテスト）
```

### 実装ルール（ガードレール遵守）

**依存方向（ガードレール②）:**

- ドメイン層（`{{SCOPE_NAME}}/domain`）への依存: OK
- インフラ層のインターフェース（I〇〇Repository）への依存: OK
- UI 層（web / mobile）への依存: 禁止
- インフラ実装（DB 等）の直接 import: 禁止（インターフェース経由で）

**テスト原則（ガードレール③）:**

- Repository などのインフラ依存はモックに置き換える
- 正常系・異常系・境界値をテストする
- テストはユースケースファイルの隣に `.test.{{FILE_EXT}}` で配置する

**実装方針:**

1. コンストラクタインジェクション（または関数引数）で Repository インターフェースを受け取る
2. ドメインロジックはドメイン層に委譲する
3. ユースケース自体は「何をするか」のオーケストレーションのみ担う

### 完了確認

```bash
{{TYPE_CHECK_CMD}} {{API_WORKSPACE_FLAG}}
{{TEST_CMD}} {{API_WORKSPACE_FLAG}}
{{DEP_CHECK_CMD}}
```
```
