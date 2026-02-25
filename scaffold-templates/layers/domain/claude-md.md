# Domain 層 CLAUDE.md テンプレート

以下のテンプレートを `{{DOMAIN_DIR}}/CLAUDE.md` として生成してください。

---

```markdown
# {{DOMAIN_DIR}}/

## このパッケージの役割

{{PROJECT_NAME}} のドメイン層。型定義、エンティティ、ビジネスルール、リポジトリインターフェース。

## 外部依存は禁止

このパッケージは外部ライブラリへの runtime dependency を持ってはならない。

## ディレクトリ構成

```
src/
├── {aggregate-name}/           # 集約単位のサブディレクトリ
│   ├── {AggregateName}.{{FILE_EXT}}          # エンティティ本体
│   ├── {AggregateName}.test.{{FILE_EXT}}     # ユニットテスト
│   ├── {AggregateName}Types.{{FILE_EXT}}     # 型定義・Value Object
│   ├── {AggregateName}Policy.{{FILE_EXT}}    # ドメインルール（必要な場合）
│   ├── I{AggregateName}Repository.{{FILE_EXT}} # Repositoryインターフェース
│   └── index.{{FILE_EXT}}                    # 公開APIエクスポート
└── shared/                     # 集約横断の共通要素
    ├── EntityBase.{{FILE_EXT}} # エンティティ基底型
    ├── DomainEvent.{{FILE_EXT}}# ドメインイベント基底型
    └── Errors.{{FILE_EXT}}     # ドメイン固有エラー型
```

## ファイル配置ルール

- 新しい集約: `src/{集約名}/` ディレクトリを作成
- 型定義: `{集約名}Types.{{FILE_EXT}}`
- ビジネスルール: `{集約名}Policy.{{FILE_EXT}}`
- リポジトリIF: `I{集約名}Repository.{{FILE_EXT}}`
- テスト: 対象ファイルの隣に `.test.{{FILE_EXT}}`

## 既存の集約

（プロジェクト初期化時は空）

## 共通要素 (shared/)

- `EntityBase.{{FILE_EXT}}` — エンティティ基底型
- `DomainEvent.{{FILE_EXT}}` — ドメインイベント基底型
- `Errors.{{FILE_EXT}}` — ドメイン固有エラー型
```

### 補足: 言語別の命名規約

| 言語 | ファイル名 | クラス/型名 |
|-----|-----------|-----------|
| TypeScript | PascalCase（`Case.ts`） | PascalCase |
| Python | snake_case（`case.py`） | PascalCase |
| Go | snake_case（`case.go`） | PascalCase（exported） |
