# add-web-feature slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/add-web-feature.md` として生成してください。
Web UI 層が選択された場合のみ生成します。

---

```markdown
---
description: Web UI に新しいフィーチャーを追加する (project)
---

## ガイドライン参照

作業前に必ず以下を読み込む:

- [CLAUDE.md](../../CLAUDE.md) — 設計原則・命名規約・ガードレール
- [{{WEB_DIR}}/CLAUDE.md](../../{{WEB_DIR}}/CLAUDE.md) — Web 層固有のルール
- 既存のフィーチャー（`{{WEB_DIR}}/src/features/`）を参考に構造を把握する

## 現在のフィーチャー構成

- 既存フィーチャー: !`ls {{WEB_DIR}}/src/features/`

## タスク

`$ARGUMENTS` を `{{WEB_DIR}}/src/features/` に新しいフィーチャーとして追加してください。

### 作成するファイル構成

```
{{WEB_DIR}}/src/features/{feature-name}/
├── {FeatureName}Page.{{UI_FILE_EXT}}        # ページコンポーネント（ルートから参照）
├── {FeatureName}Page.test.{{UI_FILE_EXT}}   # コンポーネントテスト（ガードレール③）
├── components/                               # フィーチャー専用コンポーネント
│   └── {ComponentName}.{{UI_FILE_EXT}}
└── hooks/                                    # フィーチャー専用カスタムフック ※必要な場合
    └── use{FeatureName}.{{FILE_EXT}}
```

### 実装ルール（ガードレール遵守）

**依存方向（ガードレール②）:**

- ドメイン層（`{{SCOPE_NAME}}/domain`）への依存（型使用）: OK
- 共通コンポーネント（`../../components/`）の使用: OK
- API 呼び出しは `../../lib/apiClient` 経由: OK
- API 層のソースコードへの直接 import: 禁止（HTTP 経由で呼ぶ）
- Mobile 層への依存: 禁止

**テスト原則（ガードレール③）:**

- ビジネスロジックは Domain / Application 層に置き、UI テストは表示・インタラクションに集中
- API 呼び出しはモック化する

**実装方針:**

1. ビジネスロジックを UI に書かない（ドメイン層の型・ロジックを活用）
2. データフェッチは `../../lib/apiClient` 経由
3. グローバルに使える UI は `../../components/common/` へ切り出す

### 完了確認

```bash
{{TYPE_CHECK_CMD}} {{WEB_WORKSPACE_FLAG}}
{{TEST_CMD}} {{WEB_WORKSPACE_FLAG}}
{{DEP_CHECK_CMD}}
```
```
