# add-mobile-feature slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/add-mobile-feature.md` として生成してください。
Mobile UI 層が選択された場合のみ生成します。

---

```markdown
---
description: Mobile UI に新しいフィーチャーを追加する (project)
---

## ガイドライン参照

作業前に必ず以下を読み込む:

- [CLAUDE.md](../../CLAUDE.md) — 設計原則・命名規約・ガードレール
- [{{MOBILE_DIR}}/CLAUDE.md](../../{{MOBILE_DIR}}/CLAUDE.md) — Mobile 層固有のルール
- 既存の画面（`{{MOBILE_DIR}}/src/screens/`）を参考に構造を把握する

## 現在の画面構成

- 既存画面: !`ls {{MOBILE_DIR}}/src/screens/`

## タスク

`$ARGUMENTS` を `{{MOBILE_DIR}}/src/` に新しいフィーチャーとして追加してください。

### 作成するファイル構成

```
{{MOBILE_DIR}}/src/screens/
└── {FeatureName}Screen.{{UI_FILE_EXT}}       # 画面コンポーネント

{{MOBILE_DIR}}/src/components/
└── {ComponentName}.{{UI_FILE_EXT}}            # フィーチャー専用コンポーネント ※必要な場合

{{MOBILE_DIR}}/src/hooks/
└── use{FeatureName}.{{FILE_EXT}}              # フィーチャー専用フック ※必要な場合
```

### 実装ルール（ガードレール遵守）

**依存方向（ガードレール②）:**

- ドメイン層（`{{SCOPE_NAME}}/domain`）への依存: OK
- API 層のソースコードへの直接 import: 禁止（HTTP 経由で呼ぶ）
- Web 層への依存: 禁止

**テスト原則（ガードレール③）:**

- ビジネスロジックは Domain / Application 層に置き、UI テストは表示・インタラクションに集中
- ネイティブモジュールはモック化する

**実装方針:**

1. オフラインファーストを考慮する（ローカル保存 → 同期）
2. ビジネスロジックを UI に書かない
3. ナビゲーション定義を更新する

### 完了確認

```bash
{{TYPE_CHECK_CMD}} {{MOBILE_WORKSPACE_FLAG}}
{{TEST_CMD}} {{MOBILE_WORKSPACE_FLAG}}
{{DEP_CHECK_CMD}}
```
```
