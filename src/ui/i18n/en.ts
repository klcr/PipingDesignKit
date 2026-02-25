const en: Record<string, string> = {
  // App
  'app.title': 'Pipe Pressure Drop Calculator',
  'app.subtitle': 'Traceable pressure drop calculation',

  // Fluid
  'fluid.title': 'Fluid Conditions',
  'fluid.type': 'Fluid',
  'fluid.water': 'Water',
  'fluid.temperature': 'Temperature',
  'fluid.density': 'Density',
  'fluid.viscosity': 'Viscosity',

  // Pipe
  'pipe.title': 'Pipe Specification',
  'pipe.standard': 'Pipe Standard',
  'pipe.standard.ansi': 'ASME B36.10M (ANSI)',
  'pipe.standard.jis_sgp': 'JIS G 3452 (SGP)',
  'pipe.nominal_size': 'Nominal Size',
  'pipe.schedule': 'Schedule',
  'pipe.material': 'Material',
  'pipe.roughness': 'Surface Roughness',
  'pipe.inner_diameter': 'Inner Diameter',
  'pipe.length': 'Pipe Length',

  // Flow
  'flow.title': 'Flow Conditions',
  'flow.rate': 'Flow Rate',
  'flow.velocity': 'Velocity',
  'flow.reynolds': 'Reynolds Number',
  'flow.regime': 'Flow Regime',
  'flow.regime.laminar': 'Laminar',
  'flow.regime.transitional': 'Transitional',
  'flow.regime.turbulent': 'Turbulent',

  // Fittings
  'fittings.title': 'Fittings & Valves',
  'fittings.type': 'Type',
  'fittings.quantity': 'Quantity',
  'fittings.add': 'Add Fitting',
  'fittings.k_value': 'K Value',

  // Elevation
  'elevation.title': 'Elevation',
  'elevation.change': 'Elevation Change (+ = upward)',

  // Results
  'results.title': 'Results',
  'results.friction_factor': 'Friction Factor',
  'results.friction_factor_method': 'Friction Factor Method',
  'results.dp_friction': 'Straight Pipe Loss',
  'results.dp_fittings': 'Fitting Loss',
  'results.dp_elevation': 'Elevation Loss',
  'results.dp_total': 'Total Pressure Drop',
  'results.head_loss': 'Head Loss',
  'results.head_total': 'Total Head Loss',
  'results.breakdown': 'Loss Breakdown',
  'results.references': 'References Used',

  // Actions
  'action.calculate': 'Calculate',
  'action.reset': 'Reset',

  // Tabs
  'tab.single': 'Single Segment',
  'tab.multi': 'Multi-Segment',

  // Segment
  'segment.title': 'Segment',
  'segment.add': 'Add Segment',
  'segment.remove': 'Remove',
  'segment.move_up': 'Move Up',
  'segment.move_down': 'Move Down',
  'segment.collapse': 'Collapse',
  'segment.expand': 'Expand',

  // System
  'system.flow_conditions': 'System Fluid Conditions',
  'system.summary': 'System Summary',
  'system.dp_friction_total': 'Total Straight Pipe Loss',
  'system.dp_fittings_total': 'Total Fitting Loss',
  'system.dp_elevation_total': 'Total Elevation Loss',
  'system.dp_total': 'System Total Pressure Drop',
  'system.head_total': 'System Total Head Loss',
  'system.per_segment': 'Per-Segment Results',

  // Route
  'tab.route': 'Route Input',
  'route.title': 'Pipe Route Input',
  'route.pipe_settings': 'Pipe Specification',
  'route.elbow_settings': 'Elbow Settings',
  'route.elbow_connection': 'Connection Type',
  'route.elbow_welded': 'Welded',
  'route.elbow_threaded': 'Threaded',
  'route.elbow_90_type': '90° Elbow Type',
  'route.elbow_lr': 'Long Radius (r/d=1.5)',
  'route.elbow_std': 'Standard (r/d=1)',
  'route.node_table': 'Node Coordinates',
  'route.node_id': 'Node',
  'route.add_node': 'Add Node',
  'route.remove_node': 'Remove',
  'route.move_up': 'Move Up',
  'route.move_down': 'Move Down',
  'route.preview': 'Route Analysis',
  'route.straight_runs': 'Straight Runs',
  'route.section': 'Section',
  'route.length': 'Length',
  'route.elevation': 'Elevation',
  'route.detected_elbows': 'Detected Elbows',
  'route.elbow_angle': 'Angle',
  'route.elbow_fitting': 'Fitting Type',
  'route.summary': 'Summary',
  'route.total_length': 'Total Length',
  'route.total_elevation': 'Total Elevation',
  'route.elbow_count_90': '90° Elbows',
  'route.elbow_count_45': '45° Elbows',
  'route.elbow_count_180': '180° Return Bends',
  'route.warnings': 'Warnings',
  'route.additional_fittings': 'Additional Fittings',
  'route.add_fitting': 'Add Fitting',
  'route.no_elbows': 'No elbows',
  'route.min_nodes': 'At least 2 nodes are required',

  // Views
  'view.title': 'Pipe Route Views',
  'view.plan': 'Plan View (X-Y)',
  'view.elevation': 'Elevation View (X-Z)',
  'view.isometric': 'Isometric View',
  'view.node_label': 'N',
  'view.ground_line': 'Ground Line',

  // Project (import/export)
  'project.export': 'Export JSON',
  'project.import': 'Import JSON',
  'project.name_placeholder': 'Project name',
  'project.default_name': 'Untitled Project',
  'project.import_error': 'Import error',

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

export default en;
