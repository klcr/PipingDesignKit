# README.md テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/README.md` として生成してください。

---

```markdown
# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## アーキテクチャ

DDD（ドメイン駆動設計）+ レイヤードアーキテクチャで構築。

| レイヤー | ディレクトリ | 役割 |
|---------|------------|------|
| Domain | `{{DOMAIN_DIR}}/` | 型定義・エンティティ・ビジネスルール（外部依存ゼロ） |
<!-- IF: HAS_API_LAYER -->
| API | `{{API_DIR}}/` | {{API_FRAMEWORK}} バックエンド API |
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
| Web | `{{WEB_DIR}}/` | {{WEB_FRAMEWORK}} デスクトップ UI |
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
| Mobile | `{{MOBILE_DIR}}/` | {{MOBILE_FRAMEWORK}} モバイル UI |
<!-- ENDIF -->

## セットアップ

<!-- IF: IS_TYPESCRIPT -->
```bash
npm install
npm run build
```
<!-- ENDIF -->
<!-- IF: IS_PYTHON -->
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```
<!-- ENDIF -->
<!-- IF: IS_GO -->
```bash
go mod download
go build ./...
```
<!-- ENDIF -->

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `{{BUILD_CMD}}` | ビルド |
| `{{TEST_CMD}}` | テスト実行 |
| `{{LINT_CMD}}` | Lint |
<!-- IF: IS_TYPESCRIPT -->
| `{{TYPE_CHECK_CMD}}` | 型チェック |
<!-- ENDIF -->
<!-- IF: HAS_FORMATTER -->
| `{{FORMAT_CMD}}` | フォーマット |
<!-- ENDIF -->
<!-- IF: HAS_DEP_CHECK -->
| `{{DEP_CHECK_CMD}}` | 依存方向チェック |
<!-- ENDIF -->

## Claude Code との協業

このプロジェクトは Claude Code との協業を前提に設計されています。

- `CLAUDE.md` — プロジェクト全体のガイドライン
- `.claude/commands/` — 定型操作の slash command
- `docs/constraints/` — 制約条件の記録
- `docs/issues/` — 事象管理

主な slash command:

| コマンド | 用途 |
|---------|------|
| `/project:add-domain-entity <名前>` | ドメインエンティティを追加 |
<!-- IF: HAS_API_LAYER -->
| `/project:add-usecase <名前>` | ユースケースを追加 |
| `/project:add-api-endpoint <名前>` | API エンドポイントを追加 |
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
| `/project:add-web-feature <名前>` | Web フィーチャーを追加 |
<!-- ENDIF -->
| `/project:review` | 設計レビューを実行 |
```
