import { signalEventLabel } from './presentation';
import { SIGNAL_METHOD_IDS } from './registry';

test('chart event labels are descriptive in English and Traditional Chinese', () => {
  expect(signalEventLabel(
    SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE,
    'upward',
    'en'
  )).toBe('Trend changed upward');
  expect(signalEventLabel(
    SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE,
    'upward',
    'zh-TW'
  )).toBe('趨勢轉為向上');

  expect(signalEventLabel(
    SIGNAL_METHOD_IDS.MOMENTUM_RSI,
    'upper-reference-range',
    'en'
  )).toBe('RSI entered upper reference range');
  expect(signalEventLabel(
    SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER,
    'within-bands',
    'zh-TW'
  )).toBe('價格回到波動通道內');
});

test('event labels do not turn technical-state changes into buy/sell instructions', () => {
  const labels = [
    signalEventLabel(SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE, 'downward', 'en'),
    signalEventLabel(SIGNAL_METHOD_IDS.MOMENTUM_RSI, 'lower-reference-range', 'en'),
    signalEventLabel(SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER, 'above-upper-band', 'en'),
  ].join(' ');

  expect(labels).not.toMatch(/\bbuy\b|\bsell\b/i);
});
