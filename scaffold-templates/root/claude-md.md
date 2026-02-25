# ルート CLAUDE.md テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/CLAUDE.md` として生成してください。
条件ブロック（`<!-- IF: ... -->`）はヒアリング結果に基づいて含める/除外してください。

---

```markdown
# {{PROJECT_NAME}}

## プロジェクト概要

{{PROJECT_DESCRIPTION}}

## アーキテクチャ

- DDD（ドメイン駆動設計）+ レイヤードアーキテクチャ
<!-- IF: HAS_MONOREPO -->
- モノレポ（{{MONOREPO_TOOL}}）
<!-- ENDIF -->

## パッケージ構成

- `{{DOMAIN_DIR}}/` — ドメイン層（型定義、エンティティ、ビジネスルール）。外部依存ゼロ。
<!-- IF: HAS_API_LAYER -->
- `{{API_DIR}}/` — {{API_FRAMEWORK}}（アプリケーション層 + インフラ層）
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
- `{{WEB_DIR}}/` — {{WEB_FRAMEWORK}}（デスクトップ UI）
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
- `{{MOBILE_DIR}}/` — {{MOBILE_FRAMEWORK}}（モバイル UI）
<!-- ENDIF -->

## ビルドコマンド

- `{{BUILD_CMD}}` — 全パッケージビルド
- `{{TEST_CMD}}` — 全テスト実行
- `{{LINT_CMD}}` — 全パッケージ lint
<!-- IF: IS_TYPESCRIPT -->
- `{{TYPE_CHECK_CMD}}` — 型チェック
<!-- ENDIF -->
<!-- IF: HAS_FORMATTER -->
- `{{FORMAT_CMD}}` — コードフォーマット
<!-- ENDIF -->
<!-- IF: HAS_DEP_CHECK -->
- `{{DEP_CHECK_CMD}}` — 依存方向違反の検出
<!-- ENDIF -->
<!-- IF: HAS_DEAD_CODE_CHECK -->
- `{{DEAD_CODE_CMD}}` — 未使用コードの検出
<!-- ENDIF -->

## 設計原則

1. 1ファイル1責務。500行超は分割必須。
2. ディレクトリ構造が設計を語る。
3. 型定義を信頼の源とする。
4. テストは対象ファイルの隣に配置（`.test.{{FILE_EXT}}`）。
5. ドメイン層は外部依存ゼロ。

## ファイル命名規約

<!-- IF: IS_TYPESCRIPT -->
- ドメイン層: PascalCase（`Case.ts`, `Event.ts`）
- API エンドポイント: kebab-case（`post-resource-create.ts`）
- React コンポーネント: PascalCase（`DetailView.tsx`）
<!-- ENDIF -->
<!-- IF: IS_PYTHON -->
- モジュール: snake_case（`case.py`, `event.py`）
- クラス: PascalCase（`Case`, `Event`）
<!-- ENDIF -->
<!-- IF: IS_GO -->
- パッケージ: lowercase（`case/`, `event/`）
- ファイル: snake_case（`case.go`, `event_test.go`）
<!-- ENDIF -->

---

## ガードレール

品質を機械的に担保するための仕組み。AIへのコンテキスト提供と自動チェックの両方で機能する。

### ガードレール①: slash command によるコンテキスト構造化

`.claude/commands/` にレイヤー × 機能単位の slash command を用意。
Claude に作業させる際は必ず対応する `/command` を起点にすること。

| コマンド | 用途 |
| --- | --- |
| `/project:add-domain-entity` | ドメイン層へのエンティティ追加 |
<!-- IF: HAS_API_LAYER -->
| `/project:add-usecase` | アプリケーション層へのユースケース追加 |
| `/project:add-api-endpoint` | API エンドポイント追加 |
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
| `/project:add-web-feature` | Web UI へのフィーチャー追加 |
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
| `/project:add-mobile-feature` | Mobile UI へのフィーチャー追加 |
<!-- ENDIF -->
| `/project:review` | 設計レビュー（ガイドライン違反チェック） |

### ガードレール②: 依存方向の制御

**許可される依存方向:**

<!-- IF: HAS_WEB_LAYER -->
- `{{WEB_DIR}}` → `{{DOMAIN_DIR}}`（型のみ）
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
- `{{MOBILE_DIR}}` → `{{DOMAIN_DIR}}`
<!-- ENDIF -->
<!-- IF: HAS_API_LAYER -->
- `{{API_DIR}}` → `{{DOMAIN_DIR}}`
<!-- ENDIF -->

**禁止される依存:**

- `{{DOMAIN_DIR}}` → 他の全レイヤー（外部依存ゼロ）
<!-- IF: HAS_API_LAYER -->
- `{{API_DIR}}` → UI 層（web / mobile）
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
- `{{WEB_DIR}}` → `{{API_DIR}}`（HTTP 経由でのみ通信）
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
- `{{MOBILE_DIR}}` → `{{API_DIR}}`（HTTP 経由でのみ通信）
<!-- ENDIF -->
- 循環依存: 禁止

<!-- IF: HAS_DEP_CHECK -->
確認コマンド: `{{DEP_CHECK_CMD}}`
<!-- ENDIF -->

### ガードレール③: レイヤーごとのテスト原則

**Domain 層 (`{{DOMAIN_DIR}}/`)**

- 原則: **全ロジックにユニットテストを書く**
- カバレッジ目標: 90% 以上
- テスト対象: エンティティのメソッド、ドメインルール（Policy）、バリデーション
- モック: 原則不要（外部依存ゼロのため）

<!-- IF: HAS_API_LAYER -->
**Application 層（ユースケース）**

- 原則: **全ユースケースにユニットテストを書く**
- インフラ層（Repository・外部サービス）はモック化
- テスト対象: ユースケースの処理フロー、エラーハンドリング

**Infrastructure 層**

- 原則: 統合テストで実際の接続先を検証
- ローカル開発ではエミュレーター使用を推奨
<!-- ENDIF -->

<!-- IF: HAS_WEB_LAYER -->
**Web UI 層 (`{{WEB_DIR}}/`)**

- 原則: コンポーネント単体テスト
- ビジネスロジックは Domain / Application 層に置き、UI テストを軽量に保つ
<!-- ENDIF -->

<!-- IF: HAS_MOBILE_LAYER -->
**Mobile UI 層 (`{{MOBILE_DIR}}/`)**

- 原則: コンポーネント単体テスト
- ビジネスロジックは Domain / Application 層に置き、UI テストを軽量に保つ
<!-- ENDIF -->

### ガードレール④: Git フックによる品質チェック

```
git commit → pre-commit: 変更ファイルのみ lint + format
git push   → pre-push:   全体 lint + 型チェック
CI         → 全チェック（lint / type-check / test / dep-check / dead-code）
```

### ガードレール⑤: `/project:review` コマンドによるレビュー

コミット前に `/project:review` を実行し、設計ガイドライン違反がないか確認する。

### ガードレール⑥: 制約条件の記録（`docs/constraints/`）

実装過程で発見・決定された制約条件は `docs/constraints/` に記録する。

**対象:**

- 暫定措置（後で解消が必要な技術的制約）
- 設計判断により生じた制約（トレードオフの選択）
- レイヤー間の結合に関する取り決め
- 外部依存・インフラに起因する制限

**ルール:**

1. 新しい制約が生じたら `docs/constraints/{連番3桁}-{kebab-case}.md` を作成
2. テンプレート（`docs/constraints/README.md` 参照）に従い、背景・詳細・影響範囲・今後の対応を記述
3. `docs/constraints/README.md` の一覧テーブルにも追記
4. 制約が解消された場合は、ドキュメント内に「解消日」と「解消方法」を追記し、一覧テーブルの状態を「解消」に変更

### ガードレール⑦: 事象管理（`docs/issues/`）

実装中に発生したブロッカーや課題を `docs/issues/` に記録する。

**対象:**

- 実装の詰まり（技術的なブロッカー）
- 原因調査中の不具合
- 外部要因による作業停滞

**ルール:**

1. 新しい事象が発生したら `docs/issues/reports/{連番3桁}-{kebab-case}.md` を作成
2. テンプレート（`docs/issues/README.md` 参照）に従い、発生状況・調査経緯を記述
3. `docs/issues/README.md` の一覧テーブルにも追記
4. 事象が解決したかどうかはユーザーが判定する。解決確認後、レポートに「解決日」と「解決方法」を追記し、一覧テーブルの状態を「解決済」に変更

### ガードレール⑧: クロスプラットフォーム開発環境の保護

Claude Code は Linux 上で動作する。ユーザーの開発環境（Windows/macOS）との差異により問題が発生しうる。

**ルール:**

1. lockfile（package-lock.json / poetry.lock / go.sum 等）を不必要に変更しない
2. パッケージの追加・削除時のみ lockfile を更新する
3. やむを得ず変更した場合は `git checkout -- <lockfile>` で復元する
4. lockfile の変更は原則コミットしない（例外: ユーザーが明示的にパッケージ操作を指示した場合のみ）
```
