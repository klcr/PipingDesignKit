# .gitignore テンプレート

以下のテンプレートを `{{PROJECT_NAME}}/.gitignore` として生成してください。
言語・フレームワークに応じて適切な項目を選択してください。

---

## 共通（全言語）

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
out/

# Environment
.env
.env.*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

## TypeScript 固有

```
# TypeScript
*.tsbuildinfo
.turbo/

# Vite
.vite/

# Expo
.expo/

# Coverage
coverage/

# Azure Functions
local.settings.json
```

## Python 固有

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
.eggs/

# Virtual environments
.venv/
venv/
env/

# Testing
.pytest_cache/
htmlcov/
.coverage
.coverage.*

# Type checking
.mypy_cache/
.pytype/
```

## Go 固有

```
# Go
*.exe
*.exe~
*.dll
*.so
*.dylib
*.test
*.out
vendor/
```
