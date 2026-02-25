# add-domain-entity slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/add-domain-entity.md` として生成してください。

---

```markdown
---
description: ドメイン層に新しいエンティティ（集約）を追加する (project)
---

## ガイドライン参照

作業前に必ず以下を読み込む:

- [CLAUDE.md](../../CLAUDE.md) — 設計原則・命名規約・ガードレール
- [{{DOMAIN_DIR}}/CLAUDE.md](../../{{DOMAIN_DIR}}/CLAUDE.md) — ドメイン層固有のルール
- 既存の集約（例: `{{DOMAIN_DIR}}/src/` 配下）を参考に構造を把握する

## 現在のドメイン構成

- 既存集約: !`ls {{DOMAIN_DIR}}/src/`

## タスク

`$ARGUMENTS` を `{{DOMAIN_DIR}}/src/` に新しい集約として追加してください。

### 作成するファイル構成

<!-- IF: IS_TYPESCRIPT -->
```
{{DOMAIN_DIR}}/src/{aggregate-name}/
├── {AggregateName}.ts          # エンティティ本体（PascalCase）
├── {AggregateName}.test.ts     # ユニットテスト（ガードレール③: 全ロジックをテスト）
├── {AggregateName}Types.ts     # 型定義・Value Object
├── {AggregateName}Policy.ts    # ドメインルール（ビジネスポリシー）※必要な場合
├── {AggregateName}Policy.test.ts # ポリシーのテスト ※Policyを作る場合
├── I{AggregateName}Repository.ts # Repositoryインターフェース
└── index.ts                    # 公開 API のエクスポート
```
<!-- ENDIF -->
<!-- IF: IS_PYTHON -->
```
{{DOMAIN_DIR}}/src/{aggregate_name}/
├── __init__.py                 # 公開 API のエクスポート
├── {aggregate_name}.py         # エンティティ本体
├── {aggregate_name}_test.py    # ユニットテスト
├── {aggregate_name}_types.py   # 型定義・Value Object
├── {aggregate_name}_policy.py  # ドメインルール ※必要な場合
└── {aggregate_name}_repository.py # Repositoryインターフェース（ABC）
```
<!-- ENDIF -->
<!-- IF: IS_GO -->
```
{{DOMAIN_DIR}}/{aggregate_name}/
├── {aggregate_name}.go         # エンティティ本体
├── {aggregate_name}_test.go    # ユニットテスト
├── types.go                    # 型定義・Value Object
├── policy.go                   # ドメインルール ※必要な場合
└── repository.go               # Repositoryインターフェース
```
<!-- ENDIF -->

### 実装ルール（ガードレール遵守）

1. **外部依存ゼロ**: `{{DOMAIN_DIR}}/` 外のパッケージを import してはいけない
2. **基底型を継承/利用**: `shared/EntityBase` を基底としてエンティティを定義する
3. **イミュータブル設計**: 状態変更はメソッドで新インスタンスを返す（または Result 型で返す）
4. **テスト必須**: 全ての public メソッドに対してテストを書く（ガードレール③）
5. **型安全**: `any`（動的型）は使用禁止。Value Object は専用の型定義ファイルに定義する

### exports の更新

<!-- IF: IS_TYPESCRIPT -->
`{{DOMAIN_DIR}}/src/index.ts` に新しい集約のエクスポートを追加すること。
<!-- ENDIF -->
<!-- IF: IS_PYTHON -->
`{{DOMAIN_DIR}}/src/__init__.py` に新しい集約のエクスポートを追加すること。
<!-- ENDIF -->

### 完了確認

```bash
{{TYPE_CHECK_CMD}} {{DOMAIN_WORKSPACE_FLAG}}
{{TEST_CMD}} {{DOMAIN_WORKSPACE_FLAG}}
{{DEP_CHECK_CMD}}
```
```
