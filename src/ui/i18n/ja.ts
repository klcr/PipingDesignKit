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
