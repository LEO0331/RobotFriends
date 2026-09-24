import { evidenceFor, latestSourceSegment } from './series';

const PERIOD = 20;
const STANDARD_DEVIATIONS = 2;
const round4 = value => Math.round(value * 10000) / 10000;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

function bandsFor(values) {
  const middleBand = mean(values);
  const variance = values.reduce((sum, value) => sum + ((value - middleBand) ** 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  return {
    middleBand,
    upperBand: middleBand + (STANDARD_DEVIATIONS * standardDeviation),
    lowerBand: middleBand - (STANDARD_DEVIATIONS * standardDeviation),
    standardDeviation,
  };
}

function stateFor(close, bands) {
  if (close > bands.upperBand) return 'above-upper-band';
  if (close < bands.lowerBand) return 'below-lower-band';
  return 'within-bands';
}

function bandSeries(rows) {
  const points = [];
  for (let index = PERIOD - 1; index < rows.length; index += 1) {
    const values = rows.slice(index - PERIOD + 1, index + 1).map(row => row.value);
    const bands = bandsFor(values);
    points.push({
      observedAt: rows[index].observedAt,
      close: rows[index].value,
      ...bands,
    });
  }
  return points;
}

function bandEvents(points) {
  const events = [];
  points.forEach((point, index) => {
    const state = stateFor(point.close, point);
    const previousState = index > 0 ? stateFor(points[index - 1].close, points[index - 1]) : 'within-bands';
    if (state === previousState) return;
    events.push({
      observedAt: point.observedAt,
      state,
      value: {
        close: round4(point.close),
        upperBand: round4(point.upperBand),
        middleBand: round4(point.middleBand),
        lowerBand: round4(point.lowerBand),
      },
    });
  });
  return events;
}

export const volatilityBollingerMethod = {
  id: 'volatility-bollinger',
  family: 'volatility',
  name: 'Bollinger Bands',
  nameZh: '布林通道',
  minimumObservations: PERIOD,
  parameters: {
    period: PERIOD,
    standardDeviations: STANDARD_DEVIATIONS,
  },
  copy: {
    en: {
      whatItMeasures: 'Places recent closing prices around a moving average using bands based on recent price dispersion.',
      commonUse: 'Volatility context and identifying when price is outside its recent statistical band.',
      limitations: [
        'Band width expands and contracts with recent volatility and is not a fixed risk boundary.',
        'A move outside a band does not by itself imply a reversal or continuation.',
        'Band position does not establish future returns.',
      ],
    },
    zhTW: {
      whatItMeasures: '以近期收盤價平均為中心，依價格離散程度建立上下通道。',
      commonUse: '常用於觀察波動度，以及價格是否落在近期統計通道之外。',
      limitations: [
        '通道寬度會隨近期波動度擴張或收縮，並非固定的風險界線。',
        '價格超出通道本身不代表之後一定反轉或延續。',
        '價格位於通道中的位置不能證明未來報酬。',
      ],
    },
  },
  evaluate(rows = []) {
    const segment = latestSourceSegment(rows);
    const met = segment.length >= PERIOD;
    const evidence = evidenceFor(rows, PERIOD);
    const requirements = {
      minimumObservations: PERIOD,
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

    const points = bandSeries(segment);
    const latest = points[points.length - 1];
    return {
      id: this.id,
      family: this.family,
      observedAt: latest.observedAt,
      state: stateFor(latest.close, latest),
      value: {
        close: round4(latest.close),
        upperBand: round4(latest.upperBand),
        middleBand: round4(latest.middleBand),
        lowerBand: round4(latest.lowerBand),
        standardDeviation: round4(latest.standardDeviation),
        period: PERIOD,
        standardDeviations: STANDARD_DEVIATIONS,
      },
      events: bandEvents(points),
      evidence,
      requirements,
      limitations: this.copy.en.limitations,
    };
  },
};
