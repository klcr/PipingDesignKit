# Mobile UI 層 CLAUDE.md テンプレート

以下のテンプレートを `{{MOBILE_DIR}}/CLAUDE.md` として生成してください。
Mobile UI 層が選択された場合のみ生成します。

---

```markdown
# {{MOBILE_DIR}}/

## このパッケージの役割

{{PROJECT_NAME}} のモバイル UI。{{MOBILE_FRAMEWORK}} で構築。

## ディレクトリ構成

```
src/
├── screens/            — 画面コンポーネント
├── components/         — 共通 UI コンポーネント
├── hooks/              — カスタムフック
├── lib/                — ユーティリティ・インフラ
├── navigation/         — ナビゲーション定義
└── App.{{UI_FILE_EXT}} — エントリポイント
```

## 開発コマンド

```bash
{{MOBILE_DEV_CMD}}
```

## 設計方針

- **オフラインファースト:** ローカルストレージに保存 → ネットワーク監視 → バックグラウンド同期
- **ドメイン層共有:** `{{SCOPE_NAME}}/domain` の型を活用
- **状態管理:** フレームワーク標準の状態管理を優先
- **テスト:** ユニットテストフレームワーク + ネイティブモジュールのモック

## ファイル命名規約

- 画面: PascalCase（`HomeScreen.{{UI_FILE_EXT}}`）
- コンポーネント: PascalCase（`CameraButton.{{UI_FILE_EXT}}`）
- フック: camelCase with `use` prefix（`useCamera.{{FILE_EXT}}`）
- ライブラリ: camelCase（`syncEngine.{{FILE_EXT}}`）
- テスト: 対象ファイルの隣に `.test.{{FILE_EXT}}` / `.test.{{UI_FILE_EXT}}`
```

### 補足: フレームワーク別の設定

| フレームワーク | `{{MOBILE_DEV_CMD}}` | `{{UI_FILE_EXT}}` |
|---|---|---|
| React Native (Expo) | `npx expo start` | `.tsx` |
| Flutter | `flutter run` | `.dart` |
