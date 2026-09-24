import { evidenceFor, latestSourceSegment } from './series';

const PERIOD = 14;
const MINIMUM_OBSERVATIONS = PERIOD + 1;
const LOWER_REFERENCE = 30;
const UPPER_REFERENCE = 70;
const round4 = value => Math.round(value * 10000) / 10000;

function rsiValue(avgGain, avgLoss) {
  if (avgGain === 0 && avgLoss === 0) return 50;
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;
  const relativeStrength = avgGain / avgLoss;
  return 100 - (100 / (1 + relativeStrength));
}

function stateFor(value) {
  if (value > UPPER_REFERENCE) return 'upper-reference-range';
  if (value < LOWER_REFERENCE) return 'lower-reference-range';
  return 'middle-range';
}

function rsiSeries(rows) {
  if (rows.length < MINIMUM_OBSERVATIONS) return [];
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= PERIOD; index += 1) {
    const change = rows[index].value - rows[index - 1].value;
    if (change > 0) gains += change;
    if (change < 0) losses += Math.abs(change);
  }

  let averageGain = gains / PERIOD;
  let averageLoss = losses / PERIOD;
  const points = [{
    observedAt: rows[PERIOD].observedAt,
    value: rsiValue(averageGain, averageLoss),
  }];

  for (let index = PERIOD + 1; index < rows.length; index += 1) {
    const change = rows[index].value - rows[index - 1].value;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = ((averageGain * (PERIOD - 1)) + gain) / PERIOD;
    averageLoss = ((averageLoss * (PERIOD - 1)) + loss) / PERIOD;
    points.push({
      observedAt: rows[index].observedAt,
      value: rsiValue(averageGain, averageLoss),
    });
  }
  return points;
}

function referenceEvents(points) {
  const events = [];
  points.forEach((point, index) => {
    const state = stateFor(point.value);
    const previousState = index > 0 ? stateFor(points[index - 1].value) : 'middle-range';
    if (state === previousState) return;
    events.push({
      observedAt: point.observedAt,
      state,
      value: { rsi: round4(point.value) },
    });
  });
  return events;
}

export const momentumRsiMethod = {
  id: 'momentum-rsi',
  family: 'momentum',
  name: 'Relative Strength Index',
  nameZh: '相對強弱指標',
  minimumObservations: MINIMUM_OBSERVATIONS,
  parameters: {
    period: PERIOD,
    lowerReference: LOWER_REFERENCE,
    upperReference: UPPER_REFERENCE,
    smoothing: 'Wilder',
  },
  copy: {
    en: {
      whatItMeasures: 'Measures the magnitude of recent gains and losses on a bounded 0–100 momentum scale.',
      commonUse: 'Momentum analysis and reference-level monitoring, commonly around 30 and 70.',
      limitations: [
        'RSI can remain near an upper or lower reference range during persistent trends.',
        'Reference levels are conventions, not guaranteed reversal points.',
        'Momentum readings do not establish future returns.',
      ],
    },
    zhTW: {
      whatItMeasures: '將近期上漲與下跌幅度整理成 0–100 的動能尺度。',
      commonUse: '常用於動能分析，以及觀察約 30 與 70 的參考區間。',
      limitations: [
        '在持續趨勢中，RSI 可能長時間停留在較高或較低的參考區間。',
        '參考水準屬於市場慣例，不代表價格一定反轉。',
        '動能讀值不能證明未來報酬。',
      ],
    },
  },
  evaluate(rows = []) {
    const segment = latestSourceSegment(rows);
    const met = segment.length >= MINIMUM_OBSERVATIONS;
    const evidence = evidenceFor(rows);
    const requirements = {
      minimumObservations: MINIMUM_OBSERVATIONS,
      sameSourceWindow: true,
      met,
      reasons: met ? [] : ['requires-consistent-price-history'],
    };
    if (!met) {
      return {
        id: this.id,
        family: this.family,
        observedAt: segment.at(-1)?.observedAt || rows.at(-1)?.observedAt || null,
        state: 'unavailable',
        value: null,
        events: [],
        evidence,
        requirements,
        limitations: this.copy.en.limitations,
      };
    }

    const points = rsiSeries(segment);
    const latest = points[points.length - 1];
    return {
      id: this.id,
      family: this.family,
      observedAt: latest.observedAt,
      state: stateFor(latest.value),
      value: {
        rsi: round4(latest.value),
        period: PERIOD,
        lowerReference: LOWER_REFERENCE,
        upperReference: UPPER_REFERENCE,
        smoothing: 'Wilder',
      },
      events: referenceEvents(points),
      evidence,
      requirements,
      limitations: this.copy.en.limitations,
    };
  },
};
