# 依存方向ルール テンプレート

このテンプレートは、プロジェクトのレイヤー間依存方向を制御するためのガードレール設計指針です。
技術スタックに応じて、適切な強制手段を選択してください。

## 基本原則: 依存方向は内側（ドメイン）に向かう

```
┌──────────────────────────────────────────┐
│  Presentation (Web / Mobile / CLI)       │
│  ┌────────────────────────────────────┐  │
│  │  Application (Use Cases)           │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Domain (Entities, Rules)    │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘

依存の矢印は常に外側 → 内側
```

## パッケージ間のルール（モノレポの場合）

| From | To Domain | To API | To Web | To Mobile |
|------|-----------|--------|--------|-----------|
| **Domain** | - | 禁止 | 禁止 | 禁止 |
| **API** | OK | - | 禁止 | 禁止 |
| **Web** | OK（型のみ） | 禁止（HTTP経由） | - | 禁止 |
| **Mobile** | OK | 禁止（HTTP経由） | 禁止 | - |

## API 層内部のルール

| From | To Functions/Routes | To Use Cases | To Infrastructure | To Domain |
|------|-------------------|--------------|-------------------|-----------|
| **Functions/Routes** | - | OK | 最小限 | 型のみ |
| **Use Cases** | 禁止 | - | IF経由 | OK |
| **Infrastructure** | 禁止 | 禁止 | - | OK |

## 強制手段の選択

### TypeScript プロジェクト

**推奨: dependency-cruiser**

`.dependency-cruiser.cjs` に以下のルールを定義:

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // Domain → 他レイヤーへの依存を禁止
    {
      name: 'domain-must-not-depend-on-api',
      severity: 'error',
      from: { path: '^{{DOMAIN_DIR}}/' },
      to: { path: '^{{API_DIR}}/' },
    },
    // ... 他のレイヤーペアも同様に定義
    // 循環依存の禁止
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: ['node_modules', '\\.test\\.ts$', 'dist/', '\\.turbo/'],
    },
  },
};
```

実行コマンド: `depcruise packages --config .dependency-cruiser.cjs`

### Python プロジェクト

**推奨: import-linter**

`pyproject.toml` または `.importlinter` に定義:

```toml
[tool.importlinter]
root_packages = ["{{PROJECT_NAME}}"]

[[tool.importlinter.contracts]]
name = "Domain layer independence"
type = "independence"
modules = ["{{PROJECT_NAME}}.domain"]

[[tool.importlinter.contracts]]
name = "Layered architecture"
type = "layers"
layers = [
    "{{PROJECT_NAME}}.api",
    "{{PROJECT_NAME}}.use_cases",
    "{{PROJECT_NAME}}.domain",
]
```

実行コマンド: `lint-imports`

### Go プロジェクト

**推奨: go-cleanarch または CLAUDE.md ルールでの代替**

`go-cleanarch` が使える場合:

```bash
go-cleanarch -application usecase -domain domain -infrastructure infrastructure
```

使えない場合は CLAUDE.md のルール記載 + `/project:review` コマンドで Claude にチェックさせる。

### CLAUDE.md ルールでの代替（ツールなしの場合）

dependency-cruiser 等のツールが使えない場合、CLAUDE.md のガードレール②に依存ルールを記載し、
`/project:review` コマンドで Claude が変更差分を検証する方式で代替できます。
