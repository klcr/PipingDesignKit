# review slash command テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.claude/commands/review.md` として生成してください。

---

```markdown
---
description: 現在の変更に対して設計レビューを行う (project)
---

## 現在の状況

- 現在のブランチ: !`git branch --show-current`
- 変更ファイル: !`git diff --name-only HEAD~1 2>/dev/null || git diff --name-only --cached 2>/dev/null || git diff --name-only`

## タスク

以下の手順で現在のブランチの変更内容に対して設計レビューを行ってください:

1. **変更内容の把握**: `git diff` で変更されたファイルの差分を取得し、変更内容を把握する。必要に応じて関連ファイルも読み込む。

2. **ガイドラインの参照**: 変更対象に応じて以下のガイドラインを参照する。
   - `{{DOMAIN_DIR}}/` 配下の変更: [CLAUDE.md](../../CLAUDE.md) のガードレール②③ + [{{DOMAIN_DIR}}/CLAUDE.md](../../{{DOMAIN_DIR}}/CLAUDE.md)
<!-- IF: HAS_API_LAYER -->
   - `{{API_DIR}}/` 配下の変更: [CLAUDE.md](../../CLAUDE.md) のガードレール②③ + [{{API_DIR}}/CLAUDE.md](../../{{API_DIR}}/CLAUDE.md)
<!-- ENDIF -->
<!-- IF: HAS_WEB_LAYER -->
   - `{{WEB_DIR}}/` 配下の変更: [CLAUDE.md](../../CLAUDE.md) のガードレール②③ + [{{WEB_DIR}}/CLAUDE.md](../../{{WEB_DIR}}/CLAUDE.md)
<!-- ENDIF -->
<!-- IF: HAS_MOBILE_LAYER -->
   - `{{MOBILE_DIR}}/` 配下の変更: [CLAUDE.md](../../CLAUDE.md) のガードレール②③ + [{{MOBILE_DIR}}/CLAUDE.md](../../{{MOBILE_DIR}}/CLAUDE.md)
<!-- ENDIF -->

3. **レビュー実施**: 以下の観点でレビューを行う。
   - **アーキテクチャ**: ガードレール②の依存方向ルールに違反していないか（domain が他のレイヤーに依存していないか等）
   - **レイヤー責務**: 各レイヤーの責務（ドメインロジックが UI 層に漏れていないか等）
   - **テスト**: ガードレール③のテスト原則に沿っているか（Domain・Application 層のロジックにテストがあるか）
   - **型定義**: 動的型（`any` 等）の使用がないか、適切な型が定義されているか
   - **命名規約**: CLAUDE.md のファイル命名規約に沿っているか
   - **ファイルサイズ**: 500行超のファイルがないか

4. **結果報告**: 以下の形式でレビュー結果を報告する。重大な問題がない場合は「設計上の問題は見つかりませんでした」と報告する。

```
## レビュー結果

### 良い点
- ...

### 改善提案
- **[ファイル名:行番号]** 問題の説明
  - 提案: ...

### 要修正
- **[ファイル名:行番号]** 問題の説明
  - 理由: ...
  - 修正案: ...
```
```
