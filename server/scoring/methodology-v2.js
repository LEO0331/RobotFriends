// Version identifies the public output contract. Values are derived from cited daily closes.
const VERSION = 'gridline-price-signal-v2.0.0';
const METHODOLOGY = {
  shortWindow: 5,
  longWindow: 10,
  formula: 'MA5 = mean(last 5 daily closes); MA10 = mean(last 10 daily closes); spreadPct = (MA5 / MA10 - 1) × 100. Above requires close > MA5 > MA10; below requires close < MA5 < MA10; otherwise mixed.',
};

module.exports = { VERSION, METHODOLOGY };
