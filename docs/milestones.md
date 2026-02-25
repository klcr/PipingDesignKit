# PipingDesignKit — 実装状況とマイルストーン計画

> 最終更新: 2026-02-25

---

## 現在の実装状況

### 完了済み

| モジュール | 状態 | 内容 |
|-----------|------|------|
| `domain/fluid` | ✅ 完了 | 水物性補間 (IAPWS-IF97, 0–200 °C) |
| `domain/pipe` | ✅ 完了 | 管形状計算、摩擦係数 3 手法 (Churchill / Swamee-Jain / f_T)、直管圧損 (Darcy-Weisbach) |
| `domain/fittings` | ✅ 完了 | K 値 4 手法 (Crane L/D, Darby 3-K, Cv 変換, 固定 K)、継手損失集計 |
| `domain/system` | ✅ 完了 | 10 ステップセグメント圧損計算パイプライン、単位変換 (7 圧力単位・3 流量単位・4 長さ単位・3 温度単位)、揚程計算 |
| `domain/types` | ✅ 完了 | FluidProperties, PipeSpec, SegmentInput/Result, FittingInput/Result, Reference 追跡型 |
| `data/` | ✅ 完了 | 水物性 (20 温度点), ANSI B36.10M (14 NPS), JIS G3452, 表面粗度 (16 材質), Crane TP-410 継手 (24 種 + 入口/出口 8 種), Darby 3-K, f_T 値 (24 サイズ), 出典 |
| `ui/features` | ⚠️ 基本 | 単セグメント計算フォーム (`PipeLossCalculator.tsx`), 結果表示、フィッティング追加/削除 |
| `ui/i18n` | ✅ 完了 | 日本語/英語 (各 70+ キー)、言語切替 |
| テスト | ✅ 良好 | 65+ テスト (domain 層全カバー), Vitest |
| ビルド | ✅ 完了 | Vite + TypeScript + React 19 |

### 未着手

| 項目 | ビジョン優先度 | 備考 |
|------|-------------|------|
| `application/` 層 | — | ディレクトリのみ。計算呼び出しロジックが UI に混在 |
| `infrastructure/` 層 | — | ディレクトリのみ。データ読み込みが UI に混在 |
| CI/CD | — | GitHub Actions なし |
| マルチセグメント計算 | P0 相当 | 単セグメントのみ対応 |
| 配管ルート入力 | P0 | ノード座標 → 自動エルボ検出 |
| 3 ビュー表示 | P0 | アイソメ / 立面 / 平面 |
| 流体セレクタ拡張 | P1 | 水のみ。蒸気・油など未対応 |
| 計算書出力 | P2 | PDF / Markdown |
| ポンプ選定補助 | P2 | ポンプカーブとの重ね描き |
| データ永続化 | — | 保存/読み込み機能なし |

---

## マイルストーン計画

### MS1: 開発基盤の強化

> UI に混在するロジックをレイヤー分離し、CI/CD を整備する

#### 背景

`PipeLossCalculator.tsx` がデータ読み込み・配管スペック解決・計算実行を全て担っており、`CLAUDE.md` のレイヤールールに違反している。マルチセグメント対応前にこの負債を解消する。

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/infrastructure/dataLoader.ts` | JSON データ読み込みの一元管理 |
| `src/infrastructure/pipeSpecResolver.ts` | NPS + Schedule → PipeSpec 解決 |
| `src/infrastructure/materialResolver.ts` | 材質 ID → PipeMaterial 解決 |
| `src/application/calcSingleSegment.ts` | 単セグメント計算ユースケース |
| `src/application/types.ts` | アプリケーション層の入出力型 |
| `.github/workflows/ci.yml` | テスト・ビルド・型チェック自動実行 |

- `PipeLossCalculator.tsx` リファクタリング (394 行 → 約 200 行、表示とステート管理のみに)
- テスト追加: pipeSpecResolver, calcSingleSegment

---

### MS2: マルチセグメント計算

> 単セグメント → 複数セグメントの直列計算に対応

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/domain/system/systemPressureDrop.ts` | 複数 SegmentInput 直列連結、系統全体の合計圧損・揚程算出 |
| `src/domain/types.ts` 拡張 | SystemInput / SystemResult 型追加 |
| `src/application/calcMultiSegment.ts` | マルチセグメント計算ユースケース |
| `src/ui/features/MultiSegmentCalculator.tsx` | セグメント追加・削除・並べ替え UI、系統サマリ表示 |

- テスト: 2–3 区間の直列計算結合テスト

---

### MS3: 配管ルート入力とノード管理

> ノード座標 (X, Y, Z) による配管ルート定義と自動エルボ検出

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/domain/route/routeGeometry.ts` | ノード間距離・方向ベクトル・高低差算出 (純粋関数) |
| `src/domain/route/elbowDetection.ts` | 3 ノード方向変化からエルボ角度 (0/45/90°) 検出 |
| `src/domain/route/routeToSegments.ts` | Route → SegmentInput[] 自動変換 |
| `src/ui/features/RouteEditor.tsx` | ノード座標テーブル入力、エルボ/直管長プレビュー |

- テスト: L 字・コの字・立体ルートでのエルボ検出・変換テスト

---

### MS4: 3 ビュー表示 (アイソメ / 立面 / 平面)

> 配管ルートの視覚化で「図面と計算書の乖離」を解消する

**技術方針:** 初期は SVG ベース。Three.js は将来拡張とする。

#### 成果物

| ファイル | 内容 |
|---------|------|
| `src/ui/views/PipeViewRenderer.ts` | 3D 座標 → 各ビュー投影変換 (平面: X-Y, 立面: Z-Y, アイソメ: 等角投影) |
| `src/ui/views/PlanView.tsx` | 平面図 (SVG) |
| `src/ui/views/ElevationView.tsx` | 立面図 (SVG) |
| `src/ui/views/IsometricView.tsx` | アイソメ図 (SVG) |
| `src/ui/views/ViewSyncContext.tsx` | ビュー間ハイライト同期 |

- 描画要素: 配管線、エルボ弧、継手シンボル、ノード番号、寸法線
- テスト: 投影変換のユニットテスト

---

### MS5: 計算書出力とデータ永続化

> 計算結果のエクスポートと作業データの保存/読み込み

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
| `.github/workflows/deploy.yml` | GitHub Pages デプロイ自動化 |

- テスト: 全揚程計算・運転点算出のユニットテスト

---

## 依存関係

```
MS1 (基盤強化)
 ├──→ MS2 (マルチセグメント)
 │     └──→ MS3 (ルート入力)
 │           └──→ MS4 (3ビュー表示)
 │                  │
 └──→ MS5 (出力・永続化) ←─┘
       └──→ MS6 (ポンプ・仕上げ)
```

- **MS1** は全てのマイルストーンの前提
- **MS2** (マルチセグメント) は **MS3** (ルート入力) の前提（ルートは内部でセグメントに変換される）
- **MS3** (ルート入力) は **MS4** (3 ビュー) の前提（描画対象のルートデータが必要）
- **MS5** (出力) は MS4 完了後に 3 ビュー埋め込みが可能になるが、Markdown 出力は MS2 完了時点で着手可能
- **MS6** (ポンプ) は MS2 + MS5 の上に構築

---

## ビジョンとの対応

| ビジョン (vision.md) | マイルストーン |
|---------------------|-------------|
| P0: 圧損計算エンジン | **完了済み** |
| P0: 配管ルート入力 | **MS3** |
| P0: 3 ビュー表示 | **MS4** |
| P1: 流体セレクタ | **MS5** (流体データ追加で対応) |
| P1: 配管スペック選択 | **完了済み** (UI 改善は MS1) |
| P2: 計算書出力 | **MS5** |
| P2: ポンプ選定補助 | **MS6** |
