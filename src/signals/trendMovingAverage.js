import { evidenceFor, latestSourceSegment } from './series';

const SHORT_PERIOD = 5;
const LONG_PERIOD = 10;

const round4 = value => Math.round(value * 10000) / 10000;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

function averagesAt(rows, index) {
  if (index < LONG_PERIOD - 1) return null;
  const shortAverage = mean(rows.slice(index - SHORT_PERIOD + 1, index + 1).map(row => row.value));
  const longAverage = mean(rows.slice(index - LONG_PERIOD + 1, index + 1).map(row => row.value));
  return { shortAverage, longAverage };
}

function trendState(close, shortAverage, longAverage) {
  if (close > shortAverage && shortAverage > longAverage) return 'upward';
  if (close < shortAverage && shortAverage < longAverage) return 'downward';
  return 'mixed';
}

function crossoverEvents(rows) {
  const events = [];
  for (let index = LONG_PERIOD; index < rows.length; index += 1) {
    const previous = averagesAt(rows, index - 1);
    const current = averagesAt(rows, index);
    const previousDifference = previous.shortAverage - previous.longAverage;
    const currentDifference = current.shortAverage - current.longAverage;
    const state = previousDifference <= 0 && currentDifference > 0 ? 'upward'
      : previousDifference >= 0 && currentDifference < 0 ? 'downward' : null;
    if (!state) continue;
    events.push({
      observedAt: rows[index].observedAt,
      state,
      value: {
        close: round4(rows[index].value),
        shortAverage: round4(current.shortAverage),
        longAverage: round4(current.longAverage),
      },
    });
  }
  return events;
}

export const trendMovingAverageMethod = {
  id: 'trend-moving-average',
  family: 'trend',
  name: 'Moving-average trend',
  nameZh: '移動平均趨勢',
  minimumObservations: LONG_PERIOD,
  parameters: { shortPeriod: SHORT_PERIOD, longPeriod: LONG_PERIOD },
  copy: {
    en: {
      whatItMeasures: 'Compares a shorter closing-price average with a longer average to describe the current price trend.',
      commonUse: 'Trend identification and crossover analysis.',
      limitations: [
        'Moving averages are lagging measures derived from past prices.',
        'Sideways markets can produce repeated trend reversals.',
        'A trend classification does not establish future returns.',
      ],
    },
    zhTW: {
      whatItMeasures: '比較較短期與較長期的收盤價平均，用來描述目前價格趨勢。',
      commonUse: '常用於趨勢辨識與均線交叉分析。',
      limitations: [
        '移動平均屬於落後指標，完全由過去價格計算。',
        '盤整市場可能出現反覆的趨勢轉折。',
        '趨勢分類不能證明未來報酬。',
      ],
    },
  },
  evaluate(rows = []) {
    const segment = latestSourceSegment(rows);
    const evidence = evidenceFor(rows, LONG_PERIOD);
    const met = segment.length >= LONG_PERIOD;
    const requirements = {
      minimumObservations: LONG_PERIOD,
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

    const latestIndex = segment.length - 1;
    const averages = averagesAt(segment, latestIndex);
    const close = segment[latestIndex].value;
    return {
      id: this.id,
      family: this.family,
      observedAt: segment[latestIndex].observedAt,
      state: trendState(close, averages.shortAverage, averages.longAverage),
      value: {
        close: round4(close),
        shortAverage: round4(averages.shortAverage),
        longAverage: round4(averages.longAverage),
        shortPeriod: SHORT_PERIOD,
        longPeriod: LONG_PERIOD,
      },
      events: crossoverEvents(segment),
      evidence,
      requirements,
      limitations: this.copy.en.limitations,
    };
  },
};
