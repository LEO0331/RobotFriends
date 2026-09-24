import { momentumRsiMethod } from './momentumRsi';
import { normalizePriceObservations } from './series';
import { trendMovingAverageMethod } from './trendMovingAverage';
import { volatilityBollingerMethod } from './volatilityBollinger';

export const SIGNAL_METHOD_IDS = {
  TREND_MOVING_AVERAGE: 'trend-moving-average',
  MOMENTUM_RSI: 'momentum-rsi',
  VOLATILITY_BOLLINGER: 'volatility-bollinger',
};

export const DEFAULT_SIGNAL_METHOD_ID = SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE;

const methods = [
  trendMovingAverageMethod,
  momentumRsiMethod,
  volatilityBollingerMethod,
];

const methodById = new Map(methods.map(method => [method.id, method]));

export const SIGNAL_METHODS = methods.map(method => ({
  id: method.id,
  family: method.family,
  name: method.name,
  nameZh: method.nameZh,
  minimumObservations: method.minimumObservations,
  parameters: { ...method.parameters },
  copy: method.copy,
}));

export function getSignalMethod(methodId) {
  return methodById.get(methodId) || null;
}

export function evaluateSignalMethod(methodId, rows = []) {
  const method = getSignalMethod(methodId);
  if (!method) throw new Error(`Unknown signal method: ${methodId}`);
  return method.evaluate(rows);
}

export function evaluateSignalMethods(rows = []) {
  return Object.fromEntries(methods.map(method => [method.id, method.evaluate(rows)]));
}

export function evaluateSnapshotSignalMethod(methodId, snapshot = {}, ticker) {
  const rows = normalizePriceObservations(snapshot.observations || [], ticker, snapshot.generatedAt);
  return evaluateSignalMethod(methodId, rows);
}

export function evaluateSnapshotSignalMethods(snapshot = {}, ticker) {
  const rows = normalizePriceObservations(snapshot.observations || [], ticker, snapshot.generatedAt);
  return evaluateSignalMethods(rows);
}

export { normalizePriceObservations } from './series';
