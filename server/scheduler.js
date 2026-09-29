const { easternParts, isNyseTradingDay } = require('./us-market-calendar');
function dueAfterClose(now = new Date()) {
  const part = easternParts(now);
  return {
    due: Number(part.hour) > 16 || (Number(part.hour) === 16 && Number(part.minute) >= 15),
    marketSession: isNyseTradingDay(part),
    key: `${part.year}-${part.month}-${part.day}`,
    part,
  };
}
function startScheduler(service, config, logger = console) {
  let lastRun = '';
  const tick = async () => {
    const schedule = dueAfterClose();
    if (!schedule.due || schedule.key === lastRun) return;
    lastRun = schedule.key;
    logger.log(`Starting scheduled source refresh for ${schedule.key} ET (NYSE session: ${schedule.marketSession}).`);
    const outcomes = [];
    for (const source of config.scheduleSources) {
      if (source === 'prices' && !schedule.marketSession) continue;
      outcomes.push(await service.ingest(source, true));
    }
    logger.log(JSON.stringify({ scheduledRefresh: schedule.key, outcomes }));
  };
  tick();
  return setInterval(tick, 60000);
}
module.exports = { easternParts, dueAfterClose, startScheduler };
