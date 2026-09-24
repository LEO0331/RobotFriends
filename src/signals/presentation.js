import { SIGNAL_METHOD_IDS } from './registry';

const stateCopy = {
  [SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE]: {
    upward: ['Short-term price trend: upward', '短期價格趨勢向上'],
    downward: ['Short-term price trend: downward', '短期價格趨勢向下'],
    mixed: ['Short-term price trend: mixed', '短期價格趨勢混合'],
    unavailable: ['Trend signal unavailable', '趨勢訊號無資料'],
  },
  [SIGNAL_METHOD_IDS.MOMENTUM_RSI]: {
    'upper-reference-range': ['RSI above upper reference range', 'RSI 高於上方參考區間'],
    'middle-range': ['RSI within reference range', 'RSI 位於參考區間'],
    'lower-reference-range': ['RSI below lower reference range', 'RSI 低於下方參考區間'],
    unavailable: ['RSI signal unavailable', 'RSI 訊號無資料'],
  },
  [SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER]: {
    'above-upper-band': ['Price above upper volatility band', '價格高於上方波動通道'],
    'within-bands': ['Price within volatility bands', '價格位於波動通道內'],
    'below-lower-band': ['Price below lower volatility band', '價格低於下方波動通道'],
    unavailable: ['Volatility signal unavailable', '波動度訊號無資料'],
  },
};

const eventCopy = {
  [SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE]: {
    upward: ['Trend changed upward', '趨勢轉為向上'],
    downward: ['Trend changed downward', '趨勢轉為向下'],
  },
  [SIGNAL_METHOD_IDS.MOMENTUM_RSI]: {
    'upper-reference-range': ['RSI entered upper reference range', 'RSI 進入上方參考區間'],
    'middle-range': ['RSI returned to middle reference range', 'RSI 回到中間參考區間'],
    'lower-reference-range': ['RSI entered lower reference range', 'RSI 進入下方參考區間'],
  },
  [SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER]: {
    'above-upper-band': ['Price moved above upper volatility band', '價格移至上方波動通道之外'],
    'within-bands': ['Price returned within volatility bands', '價格回到波動通道內'],
    'below-lower-band': ['Price moved below lower volatility band', '價格移至下方波動通道之外'],
  },
};

const summaryCopy = {
  [SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE]: {
    upward: ['Recent sourced closes are classified as an upward short-term trend under this method.', '依此方法，近期具來源的收盤價目前分類為短期向上趨勢。'],
    downward: ['Recent sourced closes are classified as a downward short-term trend under this method.', '依此方法，近期具來源的收盤價目前分類為短期向下趨勢。'],
    mixed: ['Recent sourced closes do not form a clear upward or downward ordering under this method.', '依此方法，近期具來源的收盤價目前未形成明確的向上或向下排列。'],
  },
  [SIGNAL_METHOD_IDS.MOMENTUM_RSI]: {
    'upper-reference-range': ['Momentum is above the method\'s upper reference level. This does not by itself imply a reversal.', '動能高於此方法的上方參考水準；這本身不代表價格一定反轉。'],
    'middle-range': ['Momentum is between the method\'s lower and upper reference levels.', '動能位於此方法的上下參考水準之間。'],
    'lower-reference-range': ['Momentum is below the method\'s lower reference level. This does not by itself imply a reversal.', '動能低於此方法的下方參考水準；這本身不代表價格一定反轉。'],
  },
  [SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER]: {
    'above-upper-band': ['The latest close is above the current upper volatility band. Band position alone does not predict the next move.', '最新收盤價高於目前的上方波動通道；僅憑通道位置不能預測下一步走勢。'],
    'within-bands': ['The latest close remains within the current volatility bands.', '最新收盤價目前仍位於波動通道內。'],
    'below-lower-band': ['The latest close is below the current lower volatility band. Band position alone does not predict the next move.', '最新收盤價低於目前的下方波動通道；僅憑通道位置不能預測下一步走勢。'],
  },
};

const methodSettings = {
  [SIGNAL_METHOD_IDS.TREND_MOVING_AVERAGE]: [
    'Shorter- versus longer-horizon closing-price averages; evaluated after the daily close.',
    '比較較短期與較長期的收盤價平均，並於每日收盤後判定。',
  ],
  [SIGNAL_METHOD_IDS.MOMENTUM_RSI]: [
    '14-period Wilder RSI with conventional reference levels at 30 and 70.',
    '14 期 Wilder RSI，採常見的 30 與 70 參考水準。',
  ],
  [SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER]: [
    '20-period mean with bands at two population standard deviations above and below the mean.',
    '20 期平均，並以平均值上下兩個母體標準差建立通道。',
  ],
};

const familyCopy = {
  trend: ['Trend', '趨勢'],
  momentum: ['Momentum', '動能'],
  volatility: ['Volatility', '波動度'],
};

const pick = (language, pair) => language === 'zh-TW' ? pair?.[1] : pair?.[0];

export function signalFamilyLabel(family, language = 'en') {
  return pick(language, familyCopy[family]) || family;
}

export function signalStateLabel(methodId, state, language = 'en') {
  return pick(language, stateCopy[methodId]?.[state] || stateCopy[methodId]?.unavailable) ||
    (language === 'zh-TW' ? '訊號無資料' : 'Signal unavailable');
}

export function signalEventLabel(methodId, state, language = 'en') {
  return pick(language, eventCopy[methodId]?.[state]) ||
    signalStateLabel(methodId, state, language);
}

export function signalStateSummary(methodId, result, language = 'en') {
  if (!result || result.state === 'unavailable') {
    return language === 'zh-TW'
      ? '目前沒有足夠且來源一致的收盤價資料可計算此方法。'
      : 'There is not enough consistent sourced closing-price history to calculate this method.';
  }
  return pick(language, summaryCopy[methodId]?.[result.state]) ||
    (language === 'zh-TW' ? '此結果描述目前已觀察到的價格資料。' : 'This result describes the currently observed price data.');
}

export function signalMethodSettings(methodId, language = 'en') {
  return pick(language, methodSettings[methodId]) || '—';
}

export function signalMetricLabel(methodId, result, language = 'en') {
  if (!result || result.state === 'unavailable' || !result.value) return '—';
  if (methodId === SIGNAL_METHOD_IDS.MOMENTUM_RSI) {
    return `RSI ${Number(result.value.rsi).toFixed(1)}`;
  }
  if (methodId === SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER) {
    return language === 'zh-TW'
      ? `收盤 $${Number(result.value.close).toFixed(2)}`
      : `Close $${Number(result.value.close).toFixed(2)}`;
  }
  return language === 'zh-TW'
    ? `收盤 $${Number(result.value.close).toFixed(2)}`
    : `Close $${Number(result.value.close).toFixed(2)}`;
}
