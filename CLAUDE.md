# PipingDesignKit

## プロジェクト概要

配管揚程圧損計算ツール。ブラウザ上で動作する静的Webアプリケーション。

**コンセプト: 「根拠が見える圧損計算」** — 計算結果だけでなく、使った摩擦係数・管粗度・局部損失係数・流体物性の出典と値がすべて追跡可能であること。

## ビジョン

詳細は [docs/vision.md](docs/vision.md) を参照。

## 技術スタック

- **言語**: TypeScript
- **UI**: React
- **ビルド**: Vite
- **3D描画**: Three.js or SVG（未確定）
- **ホスティング**: GitHub Pages（静的サイト）
- **データソース**: JSON → ビルド時にバンドル

## アーキテクチャ

```
src/
├── domain/          … 計算ロジック（純粋関数、外部依存なし）
│   ├── fluid/       … 流体物性の型・計算
│   ├── pipe/        … 配管仕様・摩擦損失計算
│   ├── fittings/    … 局部損失計算
│   └── system/      … 系統全体の圧損集計・揚程計算
├── application/     … ユースケース（ルート入力→計算→結果）
├── infrastructure/  … データソース読み込み、エクスポート機能
└── ui/              … React コンポーネント
    ├── components/  … 共通UIコンポーネント
    ├── features/    … 機能別画面
    └── views/       … 3ビュー表示（アイソメ/立面/平面）

data/
├── fluid-properties/   … 流体物性データ (JSON)
├── pipe-specs/         … 配管仕様データ (JSON)
├── fittings-db/        … 継手損失係数データ (JSON)
└── references/         … 出典情報 (JSON)
```

## レイヤールール

- **domain/** は外部ライブラリに依存しない（純粋TypeScript）
- **application/** は domain/ のみに依存
- **infrastructure/** は domain/ と application/ に依存
- **ui/** は全レイヤーを利用可能

## データソース原則

- 計算パラメータはコードにハードコードしない
- `data/` 配下のJSONファイルで管理（形式はJSONに統一）
- 各データファイルに出典（reference）フィールドを含める
- パラメータ変更はデータファイルへのPRで管理し、変更履歴を残す

## テスト方針

- **domain/**: ユニットテスト必須（既知の計算例との照合）
- **application/**: 統合テスト
- **ui/**: 軽量なコンポーネントテスト

## 命名規約

- **ファイル**: PascalCase（コンポーネント）、camelCase（ユーティリティ・関数）
- **型/インターフェース**: PascalCase
- **関数/変数**: camelCase
- **データファイル**: kebab-case.json
