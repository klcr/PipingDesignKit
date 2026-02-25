/**
 * 単位変換ユーティリティ
 */

import { PressureUnit, FlowRateUnit, LengthUnit, TemperatureUnit } from '../types';

// ── 圧力変換 (基準: Pa) ──

const PRESSURE_TO_PA: Record<PressureUnit, number> = {
  'Pa': 1,
  'kPa': 1000,
  'MPa': 1e6,
  'bar': 1e5,
  'psi': 6894.757,
  'kgf/cm2': 98066.5,
  'mmH2O': 9.80665,
};

export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  const pa = value * PRESSURE_TO_PA[from];
  return pa / PRESSURE_TO_PA[to];
}

// ── 流量変換 (基準: m³/s) ──

const FLOWRATE_TO_M3S: Record<FlowRateUnit, number> = {
  'm3/h': 1 / 3600,
  'L/min': 1 / 60000,
  'USgpm': 6.30902e-5,
};

export function convertFlowRate(value: number, from: FlowRateUnit, to: FlowRateUnit): number {
  const m3s = value * FLOWRATE_TO_M3S[from];
  return m3s / FLOWRATE_TO_M3S[to];
}

/** 流量を m³/s に変換する */
export function flowRateToM3s(value: number, unit: FlowRateUnit): number {
  return value * FLOWRATE_TO_M3S[unit];
}

// ── 長さ変換 (基準: m) ──

const LENGTH_TO_M: Record<LengthUnit, number> = {
  'mm': 0.001,
  'm': 1,
  'in': 0.0254,
  'ft': 0.3048,
};

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  const m = value * LENGTH_TO_M[from];
  return m / LENGTH_TO_M[to];
}

// ── 温度変換 ──

export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  // まず °C に変換
  let celsius: number;
  switch (from) {
    case 'C': celsius = value; break;
    case 'K': celsius = value - 273.15; break;
    case 'F': celsius = (value - 32) * 5 / 9; break;
  }

  // °C から目的単位へ
  switch (to) {
    case 'C': return celsius;
    case 'K': return celsius + 273.15;
    case 'F': return celsius * 9 / 5 + 32;
  }
}
