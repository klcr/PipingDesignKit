# API 層 CLAUDE.md テンプレート

以下のテンプレートを `{{API_DIR}}/CLAUDE.md` として生成してください。
API 層が選択された場合のみ生成します。

---

```markdown
# {{API_DIR}}/

## このパッケージの役割

{{PROJECT_NAME}} のバックエンド API。{{API_FRAMEWORK}} で構築。アプリケーション層（ユースケース）とインフラ層（リポジトリ実装、外部連携）を含む。

## ディレクトリ構成

- `src/{{ENDPOINT_DIR}}/` — API エントリポイント（{{ENDPOINT_NAMING_CONVENTION}}）
- `src/use-cases/` — アプリケーションサービス（ユースケース）
- `src/infrastructure/` — インフラ層（DB, Auth, External Services）
- `src/shared/` — 共通ユーティリティ（ApiResponse, ErrorHandler, Logger）

## 新しいエンドポイントを追加する手順

1. `src/{{ENDPOINT_DIR}}/{エンドポイントファイル}` を作成
2. `src/use-cases/{集約名}/{動詞}{名詞}UseCase.{{FILE_EXT}}` を作成
3. 必要に応じて `src/infrastructure/` にリポジトリ実装を追加

## ローカル実行

```bash
{{API_DEV_CMD}}
```
```

### 補足: フレームワーク別の設定

| フレームワーク | `{{ENDPOINT_DIR}}` | `{{ENDPOINT_NAMING_CONVENTION}}` | `{{API_DEV_CMD}}` |
|---|---|---|---|
| Azure Functions | `functions` | kebab-case（`post-resource-create.ts`） | `func start --typescript` |
| Express | `routes` | kebab-case（`resource.routes.ts`） | `npx ts-node src/server.ts` |
| Hono | `routes` | kebab-case（`resource.ts`） | `npx tsx src/index.ts` |
| FastAPI | `api/routes` | snake_case（`resource.py`） | `uvicorn src.main:app --reload` |
| Gin | `handlers` | snake_case（`resource.go`） | `go run ./cmd/server` |
