function reconstructionSummary(history = []) {
  const dates = history.map(item => String(item.observedAt || item.asOf || '').slice(0, 10)).filter(Boolean).sort();
  return {
    start: dates[0] || null,
    end: dates[dates.length - 1] || null,
    recorded: history.length,
    reconstructed: 0,
    reconstructionVersion: null,
    reconstructionQuality: 'recorded-only',
  };
}

module.exports = { reconstructionSummary };
