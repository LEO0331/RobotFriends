export const CURRENT_EVENT_DAYS = 30;

function filingUrl(filing) {
  const cik = String(filing.cik || '');
  const accession = String(filing.accession || '');
  const document = String(filing.primaryDocument || '');
  if (!/^\d{1,10}$/.test(cik) || !/^\d{10}-\d{2}-\d{6}$/.test(accession) || !/^[a-zA-Z0-9._-]+\.(?:htm|html|pdf)$/.test(document)) return null;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}/${document}`;
}

export function filingEvents(snapshot, now = new Date()) {
  const seen = new Set();
  const events = [];
  for (const row of snapshot?.observations || []) {
    if (row.source !== 'sec' || row.type !== 'filings' || !Array.isArray(row.value)) continue;
    for (const filing of row.value) {
      const url = filingUrl(filing);
      const filedAt = Date.parse(`${filing.filed}T00:00:00Z`);
      const key = `${row.ticker}:${filing.accession}`;
      if (!url || !Number.isFinite(filedAt) || filedAt > now.getTime() || seen.has(key)) continue;
      seen.add(key);
      events.push({ id: key, type: 'FILING', title: `${row.ticker} filed ${filing.form}`, detail: `${filing.form} · ${filing.accession}`, source: 'SEC EDGAR', region: 'All regions', filed: filing.filed, url, archived: now.getTime() - filedAt >= CURRENT_EVENT_DAYS * 86400000 });
    }
  }
  return events.sort((a, b) => b.filed.localeCompare(a.filed) || a.id.localeCompare(b.id));
}
