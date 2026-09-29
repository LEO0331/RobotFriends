const test = require('node:test');
const assert = require('node:assert/strict');
const { easternParts, isNyseTradingDay } = require('./us-market-calendar');

test('NYSE calendar uses New York dates across daylight saving time', () => {
  assert.equal(isNyseTradingDay(easternParts(new Date('2026-09-29T02:00:00Z'))), true); // Monday ET
  assert.equal(isNyseTradingDay(easternParts(new Date('2026-09-29T20:00:00Z'))), true); // Tuesday ET
  assert.equal(isNyseTradingDay(easternParts(new Date('2026-11-02T21:00:00Z'))), true); // EST
});

test('NYSE calendar excludes published holidays and weekends, including observed holidays', () => {
  for (const date of ['2026-01-01', '2026-04-03', '2026-07-03', '2026-09-07', '2026-12-25', '2027-06-18', '2028-01-01']) {
    assert.equal(isNyseTradingDay(easternParts(new Date(`${date}T17:00:00Z`))), false, date);
  }
  assert.equal(isNyseTradingDay(easternParts(new Date('2028-07-03T17:00:00Z'))), true); // Early close
  assert.equal(isNyseTradingDay(easternParts(new Date('2027-12-31T17:00:00Z'))), true); // No observed 2028 New Year's closure
  assert.equal(isNyseTradingDay(easternParts(new Date('2026-09-29T17:00:00Z'))), true);
});
