const ja: Record<string, string> = {
  // App
  'app.title': '配管圧損計算ツール',
  'app.subtitle': '根拠が見える圧損計算',

  // Fluid
  'fluid.title': '流体条件',
  'fluid.type': '流体',
  'fluid.water': '水',
  'fluid.temperature': '温度',
  'fluid.density': '密度',
  'fluid.viscosity': '粘度',

  // Pipe
  'pipe.title': '配管仕様',
  'pipe.standard': '配管規格',
  'pipe.standard.ansi': 'ASME B36.10M (ANSI)',
  'pipe.standard.jis_sgp': 'JIS G 3452 (SGP)',
  'pipe.nominal_size': '呼び径',
  'pipe.schedule': 'スケジュール',
  'pipe.material': '管材質',
  'pipe.roughness': '表面粗度',
  'pipe.inner_diameter': '内径',
  'pipe.length': '管長',

  // Flow
  'flow.title': '流量条件',
  'flow.rate': '流量',
  'flow.velocity': '流速',
  'flow.reynolds': 'レイノルズ数',
  'flow.regime': '流動状態',
  'flow.regime.laminar': '層流',
  'flow.regime.transitional': '遷移域',
  'flow.regime.turbulent': '乱流',

  // Fittings
  'fittings.title': '継手・バルブ',
  'fittings.type': '種類',
  'fittings.quantity': '数量',
  'fittings.add': '継手を追加',
  'fittings.k_value': 'K値',

  // Elevation
  'elevation.title': '高低差',
  'elevation.change': '高低差 (正=上向き)',

  // Results
  'results.title': '計算結果',
  'results.friction_factor': '摩擦係数',
  'results.friction_factor_method': '摩擦係数算定法',
  'results.dp_friction': '直管圧損',
  'results.dp_fittings': '継手圧損',
  'results.dp_elevation': '高低差圧損',
  'results.dp_total': '合計圧損',
  'results.head_loss': '損失水頭',
  'results.head_total': '全損失水頭',
  'results.breakdown': '圧損内訳',
  'results.references': '使用出典',

  // Actions
  'action.calculate': '計算実行',
  'action.reset': 'リセット',

  // Tabs
  'tab.single': '単セグメント',
  'tab.multi': 'マルチセグメント',

  // Segment
  'segment.title': 'セグメント',
  'segment.add': 'セグメントを追加',
  'segment.remove': '削除',
  'segment.move_up': '上へ',
  'segment.move_down': '下へ',
  'segment.collapse': '折りたたむ',
  'segment.expand': '展開',

  // System
  'system.flow_conditions': '系統流体条件',
  'system.summary': '系統サマリ',
  'system.dp_friction_total': '直管圧損合計',
  'system.dp_fittings_total': '継手圧損合計',
  'system.dp_elevation_total': '高低差圧損合計',
  'system.dp_total': '系統合計圧損',
  'system.head_total': '系統合計損失水頭',
  'system.per_segment': 'セグメント別結果',

  // Route
  'tab.route': 'ルート入力',
  'route.title': '配管ルート入力',
  'route.pipe_settings': '配管仕様設定',
  'route.elbow_settings': 'エルボ設定',
  'route.elbow_connection': '接続方式',
  'route.elbow_welded': '溶接',
  'route.elbow_threaded': 'ねじ込み',
  'route.elbow_90_type': '90°エルボ種別',
  'route.elbow_lr': 'ロングラジアス (r/d=1.5)',
  'route.elbow_std': 'スタンダード (r/d=1)',
  'route.node_table': 'ノード座標',
  'route.node_id': 'ノード',
  'route.add_node': 'ノードを追加',
  'route.remove_node': '削除',
  'route.move_up': '上へ',
  'route.move_down': '下へ',
  'route.preview': 'ルート解析',
  'route.straight_runs': '直管区間',
  'route.section': '区間',
  'route.length': '長さ',
  'route.elevation': '高低差',
  'route.detected_elbows': '検出エルボ',
  'route.elbow_angle': '角度',
  'route.elbow_fitting': '継手種別',
  'route.summary': 'サマリ',
  'route.total_length': '総延長',
  'route.total_elevation': '総高低差',
  'route.elbow_count_90': '90°エルボ数',
  'route.elbow_count_45': '45°エルボ数',
  'route.elbow_count_180': '180°リターンベンド数',
  'route.warnings': '警告',
  'route.additional_fittings': '追加継手',
  'route.add_fitting': '継手を追加',
  'route.no_elbows': 'エルボなし',
  'route.min_nodes': 'ルートには2ノード以上が必要です',

  // Views
  'view.title': '配管ルートビュー',
  'view.plan': '平面図 (X-Y)',
  'view.elevation': '立面図 (X-Z)',
  'view.isometric': 'アイソメ図',
  'view.node_label': 'N',
  'view.ground_line': '地盤線',

  // Units
  'unit.m3h': 'm³/h',
  'unit.lmin': 'L/min',
  'unit.ms': 'm/s',
  'unit.mm': 'mm',
  'unit.m': 'm',
  'unit.pa': 'Pa',
  'unit.kpa': 'kPa',
  'unit.celsius': '°C',
  'unit.kg_m3': 'kg/m³',
  'unit.pa_s': 'Pa·s',
};

export default ja;
