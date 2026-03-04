/**
 * ポンプ目標値アドバイスパネル
 *
 * ポンプ選定画面で設定された値を「目標値」として、
 * 現在の計算結果との差分をアドバイスとして表示する。
 */

import { useTranslation } from '../i18n/context';
import { formatNum } from './formatters';
import type { PumpResultSummary } from '../features/PumpChart';

interface PumpAdvicePanelProps {
  pumpResult: PumpResultSummary;
  currentFlow_m3h: number;
  currentStaticHead_m: number;
  currentFrictionHead_m: number;
}

const TOLERANCE = 0.1;

export function PumpAdvicePanel({
  pumpResult,
  currentFlow_m3h,
  currentStaticHead_m,
  currentFrictionHead_m,
}: PumpAdvicePanelProps) {
  const { t } = useTranslation();

  const targetFlow = pumpResult.designFlow_m3h;
  const targetStatic = pumpResult.staticHead_m;
  const targetFriction = pumpResult.frictionHead_m;

  const advices: string[] = [];

  // Flow mismatch
  if (Math.abs(currentFlow_m3h - targetFlow) >= TOLERANCE) {
    advices.push(
      t('advice.flow_mismatch')
        .replace(/{target}/g, formatNum(targetFlow, 1))
        .replace(/{current}/g, formatNum(currentFlow_m3h, 1))
    );
  }

  // Static head mismatch
  if (Math.abs(currentStaticHead_m - targetStatic) >= TOLERANCE) {
    advices.push(
      t('advice.static_head_mismatch')
        .replace(/{target}/g, formatNum(targetStatic, 1))
        .replace(/{current}/g, formatNum(currentStaticHead_m, 1))
    );
  }

  // Friction head comparison
  if (currentFrictionHead_m - targetFriction >= TOLERANCE) {
    advices.push(
      t('advice.friction_over')
        .replace(/{target}/g, formatNum(targetFriction, 1))
        .replace(/{current}/g, formatNum(currentFrictionHead_m, 1))
    );
  } else if (targetFriction - currentFrictionHead_m >= TOLERANCE) {
    advices.push(
      t('advice.friction_under')
        .replace(/{target}/g, formatNum(targetFriction, 1))
        .replace(/{current}/g, formatNum(currentFrictionHead_m, 1))
    );
  }

  if (advices.length === 0) {
    advices.push(t('advice.all_match'));
  }

  const allMatch = advices.length === 1 && advices[0] === t('advice.all_match');

  return (
    <div style={{
      marginTop: '12px',
      padding: '10px 12px',
      background: allMatch ? '#e8f5e9' : '#fff8e1',
      border: `1px solid ${allMatch ? '#a5d6a7' : '#ffe082'}`,
      borderRadius: '8px',
    }}>
      <div style={{
        fontWeight: 'bold',
        fontSize: '0.9em',
        color: allMatch ? '#2e7d32' : '#f57f17',
        marginBottom: '6px',
      }}>
        {t('advice.title')}
      </div>
      {advices.map((advice, i) => (
        <div key={i} style={{
          fontSize: '0.85em',
          color: '#333',
          padding: '2px 0',
          lineHeight: 1.5,
        }}>
          {advice}
        </div>
      ))}
    </div>
  );
}
