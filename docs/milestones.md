# PipingDesignKit — 実装状況とマイルストーン計画

> 最終更新: 2026-02-25 (MS4.5 Phase 1–3 実施後)

---

## 現在の実装状況

### 完了済み

| モジュール | 状態 | 内容 | PR |
|-----------|------|------|----|
| `domain/fluid` | ✅ 完了 | 水物性補間 (IAPWS-IF97, 0–200 °C) | #2 |
| `domain/pipe` | ✅ 完了 | 管形状計算、摩擦係数 3 手法 (Churchill / Swamee-Jain / f_T)、直管圧損 (Darcy-Weisbach) | #2 |
| `domain/fittings` | ✅ 完了 | K 値 4 手法 (Crane L/D, Darby 3-K, Cv 変換, 固定 K)、継手損失集計 | #2 |
| `domain/system` | ✅ 完了 | 10 ステップセグメント圧損パイプライン、マルチセグメント直列計算、単位変換 (7 圧力・3 流量・4 長さ・3 温度単位)、揚程計算 | #2, #5 |
| `domain/route` | ✅ 完了 | ルート幾何 (3D 距離・方向・高低差)、エルボ検出 (0/45/90/180°)、ルート → セグメント変換 | #6 |
| `domain/types` | ✅ 完了 | FluidProperties, PipeSpec, SegmentInput/Result, SystemInput/Result, Route 型, Reference 追跡型 | #2, #5, #6 |
| `data/` | ✅ 完了 | 水物性 (20 温度点), ANSI B36.10M (14 NPS), JIS G3452, 表面粗度 (16 材質), Crane TP-410 継手 (24 種 + 入口/出口 8 種), Darby 3-K, f_T 値 (24 サイズ), 出典 | #2 |
| `application/` | ✅ 完了 | calcSingleSegment, calcMultiSegment, calcRoute ユースケース + 入出力型 | #4, #5, #6 |
| `infrastructure/` | ✅ 完了 | dataLoader (JSON 一元管理), pipeSpecResolver (ANSI/JIS), materialResolver | #4 |
| `ui/features` | ✅ 完了 | PipeLossCalculator (リファクタ済), MultiSegmentCalculator (セグメント追加/削除/並替), RouteEditor (ノードテーブル + エルボプレビュー) — 3 タブ構成 | #4, #5, #6, #7 |
| `ui/views` | ✅ 完了 | PlanView (平面), ElevationView (立面), IsometricView (アイソメ) — SVG ベース、ViewSyncContext (ビュー間ハイライト同期) | #7 |
| `ui/i18n` | ✅ 完了 | 日本語/英語 (各 70+ キー)、言語切替 | #2+ |
| `ui/components` | ✅ 完了 | FormLayout (Section/Field/ResultRow), formatters (formatNum/formatPa) — 共通 UI 抽出 | #14 |
| `ui/views/viewConstants` | ✅ 完了 | ビュー共通定数 (PADDING, NODE_RADIUS, COLOR_*) を集約 | #14 |
| テスト | ✅ 完了 | 189 テストケース / 18 ファイル (domain + application + infrastructure + views), Vitest + jsdom | #2–#7, #14 |
| CI/CD | ✅ 完了 | ci.yml (型チェック + テスト + ビルド), deploy.yml (GitHub Pages) | #4, #8 |

### 未着手

| 項目 | ビジョン優先度 | 備考 |
|------|-------------|------|
| 流体セレクタ拡張 | P1 | 水のみ。蒸気・油など未対応 |
| 計算書出力 | P2 | PDF / Markdown |
| ポンプ選定補助 | P2 | ポンプカーブとの重ね描き |
| データロード検証 (H-1) | — | Zod 等によるランタイムバリデーション |
| UX 改善 (M-1〜M-6) | — | useCallback, アクセシビリティ, ErrorBoundary 等 |

---

## マイルストーン計画

### MS1: 開発基盤の強化 — ✅ 完了 (PR #4)

> UI に混在するロジックをレイヤー分離し、CI/CD を整備する

**実績サマリ:**
- `application/`, `infrastructure/` レイヤーを新設し `PipeLossCalculator.tsx` から計算・データロジックを分離
- ci.yml による型チェック + テスト + ビルドの自動実行を導入
- pipeSpecResolver, materialResolver, calcSingleSegment のテスト追加

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/infrastructure/dataLoader.ts` | JSON データ読み込みの一元管理 |
| `src/infrastructure/pipeSpecResolver.ts` | NPS + Schedule → PipeSpec 解決 |
| `src/infrastructure/materialResolver.ts` | 材質 ID → PipeMaterial 解決 |
| `src/application/calcSingleSegment.ts` | 単セグメント計算ユースケース |
| `src/application/types.ts` | アプリケーション層の入出力型 |
| `.github/workflows/ci.yml` | テスト・ビルド・型チェック自動実行 |

---

### MS2: マルチセグメント計算 — ✅ 完了 (PR #5)

> 単セグメント → 複数セグメントの直列計算に対応

**実績サマリ:**
- `systemPressureDrop.ts` で複数セグメント直列連結・合計圧損・揚程算出を実装
- MultiSegmentCalculator.tsx でセグメント追加/削除/並べ替え UI を実装
- calcMultiSegment ユースケース + 結合テスト追加

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/domain/system/systemPressureDrop.ts` | 複数 SegmentInput 直列連結、系統全体の合計圧損・揚程算出 |
| `src/domain/types.ts` 拡張 | SystemInput / SystemResult 型追加 |
| `src/application/calcMultiSegment.ts` | マルチセグメント計算ユースケース |
| `src/ui/features/MultiSegmentCalculator.tsx` | セグメント追加・削除・並べ替え UI、系統サマリ表示 |

---

### MS3: 配管ルート入力とノード管理 — ✅ 完了 (PR #6)

> ノード座標 (X, Y, Z) による配管ルート定義と自動エルボ検出

**実績サマリ:**
- `domain/route/` に routeGeometry, elbowDetection, routeToSegments を実装 (純粋関数)
- RouteEditor.tsx でノード座標テーブル入力・エルボ/直管長プレビューを実装
- calcRoute ユースケース + L 字・コの字・立体ルートのテスト追加

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/domain/route/routeGeometry.ts` | ノード間距離・方向ベクトル・高低差算出 (純粋関数) |
| `src/domain/route/elbowDetection.ts` | 3 ノード方向変化からエルボ角度 (0/45/90°) 検出 |
| `src/domain/route/routeToSegments.ts` | Route → SegmentInput[] 自動変換 |
| `src/ui/features/RouteEditor.tsx` | ノード座標テーブル入力、エルボ/直管長プレビュー |

---

### MS4: 3 ビュー表示 (アイソメ / 立面 / 平面) — ✅ 完了 (PR #7)

> 配管ルートの視覚化で「図面と計算書の乖離」を解消する

**技術方針:** SVG ベース (計画通り)

**実績サマリ:**
- PipeViewRenderer.ts で 3D → 2D 投影変換 (平面/立面/アイソメ) を実装
- PlanView, ElevationView, IsometricView の 3 SVG ビューを実装
- ViewSyncContext でビュー間ハイライト同期を実現
- 投影変換のユニットテスト追加

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/ui/views/PipeViewRenderer.ts` | 3D 座標 → 各ビュー投影変換 (平面: X-Y, 立面: Z-Y, アイソメ: 等角投影) |
| `src/ui/views/PlanView.tsx` | 平面図 (SVG) |
| `src/ui/views/ElevationView.tsx` | 立面図 (SVG) |
| `src/ui/views/IsometricView.tsx` | アイソメ図 (SVG) |
| `src/ui/views/ViewSyncContext.tsx` | ビュー間ハイライト同期 |

---

### MS4.5: コード品質改善 — 🔧 Phase 1–3 完了

> コードレビュー (2026-02-25) に基づく技術的改善

#### アーキテクチャ準拠性評価

| 評価項目 | 状態 |
|---------|------|
| レイヤールール (CLAUDE.md) | ✅ 完全準拠 — domain/ は外部依存ゼロ |
| データソース原則 (JSON + 出典) | ✅ 準拠 — 全パラメータが `data/` 配下の JSON |
| 「根拠が見える」原則 | ✅ Reference 追跡が計算パイプライン全体で機能 |
| 命名規約 | ✅ 準拠 |

#### Critical: 計算正確性に影響するリスク — ✅ 全件対応済み

| ID | 対象ファイル | 問題 | 対応状況 |
|----|------------|------|---------|
| C-1 | `fittingLoss.ts` | Cv override が配管寸法 (id_mm) に対する妥当性を検証していなかった | ✅ K 値の妥当性チェック (K<0.001, K>500) + FittingResult.warning フィールド追加 |
| C-2 | `systemPressureDrop.ts` | セグメント間の密度一致チェックなし | ✅ 密度一致アサーション追加 (1% 許容) |
| C-3 | `elbowDetection.ts` | `resolveElbowFittingId` が 0° で空文字列を返していた | ✅ 戻り値を `string \| null` に変更、detectElbows に null ガード追加 |

#### High: 保守性・信頼性の改善

| ID | 対象 | 問題 | 対応状況 |
|----|------|------|---------|
| H-1 | `dataLoader.ts` | `as unknown as T` キャストのみでスキーマ検証なし | ⬜ 未対応 — Zod 導入は次フェーズ |
| H-2 | `application/calc*.ts` | `/ 3600` ハードコード重複 3 箇所 | ✅ `flowRateToM3s()` に置換 |
| H-3 | `ui/features/` 3 ファイル | Section, Field, ResultRow, formatNum, formatPa が重複定義 | ✅ `ui/components/FormLayout.tsx` + `formatters.ts` に共通抽出 |
| H-4 | `ui/views/` 3 ファイル | PADDING, NODE_RADIUS, COLOR_* が重複定義 | ✅ `ui/views/viewConstants.ts` に集約 |
| H-5 | `vite.config.ts` | `test.environment: 'node'` で UI テスト不可 | ✅ `jsdom` 環境に変更 + `.test.tsx` パターン追加 |
| H-6 | `ci.yml` | lint ステップとカバレッジなし | ⬜ 未対応 — ESLint + カバレッジは次フェーズ |

#### Medium: UX・コード品質 — ⬜ 未対応

| ID | 対象 | 問題 | 推奨対応 |
|----|------|------|---------|
| M-1 | `ui/features/` 全般 | イベントハンドラに `useCallback` なし | パフォーマンス改善 (特に MultiSegmentCalculator のリスト操作) |
| M-2 | UI 全般 | アクセシビリティ機能なし (aria-labels, roles) | 主要操作要素に aria 属性追加 |
| M-3 | エラーメッセージ | 英語のみ、i18n 未対応 | エラーメッセージキーを i18n ファイルに追加 |
| M-4 | `ui/views/` | ErrorBoundary なし。描画エラーでアプリ全体がクラッシュ | view コンポーネントを ErrorBoundary でラップ |
| M-5 | `MultiSegmentCalculator.tsx` | グローバル `segmentIdCounter` がコンポーネント再マウントでリセットされない | `useRef` または `React.useId()` に変更 |
| M-6 | UI 全般 | インラインスタイルのみ (CSS モジュールなし) | 段階的に CSS Modules へ移行 |

---

### MS5: 計算書出力とデータ永続化 — 🔧 一部着手

> 計算結果のエクスポートと作業データの保存/読み込み

**進捗:**
- ✅ GitHub Pages デプロイワークフロー (`deploy.yml`) — PR #8 で導入
- ✅ ファイル import/export (`fileIO.ts`, `projectFile.ts`) — PR #11 で導入
- ⬜ Markdown エクスポート — 未着手
- ⬜ PDF エクスポート — 未着手
- ⬜ localStorage 永続化 — 未着手
- ⬜ ReportView / ProjectManager UI — 未着手

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/infrastructure/export/markdownExporter.ts` | 10 ステップ計算過程 + 出典のMarkdown出力 |
| `src/infrastructure/export/pdfExporter.ts` | ブラウザ内 PDF 変換 (3 ビュー図面埋め込み) |
| `src/infrastructure/persistence/localStorage.ts` | プロジェクト保存/読み込み (名前付き複数管理) |
| `src/infrastructure/persistence/fileIO.ts` | JSON 形式ファイル import/export |
| `src/ui/features/ReportView.tsx` | 計算書プレビュー、ダウンロードボタン |
| `src/ui/features/ProjectManager.tsx` | プロジェクト管理 UI |

- テスト: エクスポートスナップショット、保存/読み込みラウンドトリップ

---

### MS6: ポンプ選定補助と仕上げ

> 圧損計算から機器選定までワンストップで完結させる

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/domain/system/pumpSelection.ts` | 全揚程 (TDH) 計算、配管抵抗曲線、運転点算出、NPSHa 計算 |
| `data/pump-curves/` | サンプルポンプカーブデータ (JSON) |
| `src/ui/features/PumpChart.tsx` | SVG H-Q 特性曲線、抵抗曲線重ね描き、運転点マーキング |

> `.github/workflows/deploy.yml` は PR #8 で完了済み（MS5 参照）

- テスト: 全揚程計算・運転点算出のユニットテスト

---

## 依存関係

```
MS1 (基盤強化)            ✅ PR #4
 ├──→ MS2 (マルチセグメント)  ✅ PR #5
 │     └──→ MS3 (ルート入力)   ✅ PR #6
 │           └──→ MS4 (3ビュー表示)  ✅ PR #7
 │                  │
 │           MS4.5 (コード品質改善) 🔧 Phase 1–3 完了
 │                  │
 └──→ MS5 (出力・永続化)  🔧 一部着手 (deploy.yml + fileIO)
       └──→ MS6 (ポンプ・仕上げ)  ⬜
```

- **MS1–MS4**: すべて完了
- **MS4.5**: Critical 3 件 + High 4 件を対応済み。残り: H-1 (Zod), H-6 (ESLint), M-1〜M-6 (UX)
- **MS5**: deploy.yml (PR #8) + fileIO (PR #11) は完了。コア機能（計算書出力・localStorage 永続化）は未着手
  - Markdown 出力は MS2 完了済みのため着手可能
  - PDF 出力は MS4 完了済みのため 3 ビュー埋め込みが可能
- **MS6**: MS5 コア機能の完了が前提

---

## ビジョンとの対応

| ビジョン (vision.md) | マイルストーン | 状態 |
|---------------------|-------------|------|
| P0: 圧損計算エンジン | (初期実装) | ✅ 完了 |
| P0: 配管ルート入力 | **MS3** | ✅ 完了 (PR #6) |
| P0: 3 ビュー表示 | **MS4** | ✅ 完了 (PR #7) |
| P1: 流体セレクタ | **MS5** (流体データ追加で対応) | ⬜ 未着手 |
| P1: 配管スペック選択 | (初期実装 + MS1 UI 改善) | ✅ 完了 |
| P2: 計算書出力 | **MS5** | ⬜ 未着手 |
| P2: ポンプ選定補助 | **MS6** | ⬜ 未着手 |
| —: GitHub Pages デプロイ | **MS5** (PR #8) | ✅ 完了 |

**P0 機能はすべて完了。** P1/P2 機能 (MS5, MS6) と技術的改善 (MS4.5) が残りの開発スコープ。

---

## 次のアクション（推奨順序）

1. ~~**Critical バグリスク修正** (C-1, C-2, C-3)~~ — ✅ 完了
2. ~~**コード重複解消** (H-2, H-3, H-4)~~ — ✅ 完了
3. ~~**テスト環境整備** (H-5 jsdom)~~ — ✅ 完了
4. **ESLint + カバレッジ** (H-6) — CI 品質ゲートの強化
5. **データロード検証** (H-1) — Zod 導入によるランタイムバリデーション
6. **MS5: 計算書出力とデータ永続化** — Markdown/PDF エクスポート、localStorage 永続化
7. **UX 改善** (M-1〜M-6) — MS5/MS6 と並行して段階的に対応
8. **MS6: ポンプ選定補助** — 最終マイルストーン
