# Web UI 層 CLAUDE.md テンプレート

以下のテンプレートを `{{WEB_DIR}}/CLAUDE.md` として生成してください。
Web UI 層が選択された場合のみ生成します。

---

```markdown
# {{WEB_DIR}}/

## このパッケージの役割

{{PROJECT_NAME}} のデスクトップ向け Web UI。{{WEB_FRAMEWORK}} で構築。

## ディレクトリ構成

- `src/features/` — 機能単位のディレクトリ
- `src/components/` — 汎用 UI コンポーネント（layout, common）
- `src/hooks/` — アプリ横断のカスタムフック
- `src/lib/` — ユーティリティ（apiClient, constants）

## 開発サーバー

```bash
{{WEB_DEV_CMD}}
```

## ルール

- 1 コンポーネント 1 ファイル
- ページコンポーネント: `{Name}Page.{{UI_FILE_EXT}}`
- ビューコンポーネント: `{Name}View.{{UI_FILE_EXT}}`
- カスタムフック: `use{Name}.{{FILE_EXT}}`
- API 呼び出し: `{feature}Api.{{FILE_EXT}}`
```

### 補足: フレームワーク別の設定

| フレームワーク | `{{WEB_DEV_CMD}}` | `{{UI_FILE_EXT}}` |
|---|---|---|
| React + Vite | `npm run dev` (port 5173) | `.tsx` |
| Next.js | `npm run dev` (port 3000) | `.tsx` |
| Vue | `npm run dev` (port 5173) | `.vue` |
