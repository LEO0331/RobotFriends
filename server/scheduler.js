function easternParts(now = new Date()) {
  const values = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Object.fromEntries(values.filter(item => item.type !== 'literal').map(item => [item.type, item.value]));
}
function dueAfterClose(now = new Date()) {
  const part = easternParts(now); const weekday = !['Sat', 'Sun'].includes(part.weekday);
  return { due: weekday && (Number(part.hour) > 16 || (Number(part.hour) === 16 && Number(part.minute) >= 15)), key: `${part.year}-${part.month}-${part.day}`, part };
}
function startScheduler(service, config, logger = console) {
  let lastRun = '';
  const tick = async () => {
    const schedule = dueAfterClose();
    if (!schedule.due || schedule.key === lastRun) return;
    lastRun = schedule.key;
    logger.log(`Starting scheduled post-close refresh for ${schedule.key} ET.`);
    const outcomes = [];
    for (const source of config.scheduleSources) outcomes.push(await service.ingest(source, true));
    logger.log(JSON.stringify({ scheduledRefresh: schedule.key, outcomes }));
  };
  tick();
  return setInterval(tick, 60000);
}
module.exports = { easternParts, dueAfterClose, startScheduler };
