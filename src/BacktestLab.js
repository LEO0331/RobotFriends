import React, { useEffect, useMemo, useState } from 'react';
import { runRecordedBacktest } from './backtestModel';
import { researchLabCopy } from './researchLabI18n';
import './BacktestLab.css';

const empty = { observations: [], companyHistory: [], scores: [], backtestCoverage: null };
const pct = value => value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const dateOnly = value => value ? String(value).slice(0, 10) : '—';

export default function BacktestLab({ onBack, language = 'en', onLanguageChange = () => {} }) {
  const [snapshot, setSnapshot] = useState(empty);
  const [ticker, setTicker] = useState('NBIS');
  const [horizonDays, setHorizonDays] = useState(30);
  const [saveState, setSaveState] = useState('idle');
  const copy = researchLabCopy(language);
  const b = copy.backtest;
  useEffect(() => {
    let active = true;
    fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject()).then(data => { if (active) setSnapshot({ ...empty, ...data }); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const history = useMemo(() => {
    const historical = (snapshot.companyHistory || []).map(item => ({ ...item, asOf: item.asOf || item.observedAt, methodologyVersion: item.methodologyVersion || 'recorded-snapshot', origin: item.origin || 'recorded' }));
    const current = (snapshot.scores || []).map(item => ({ ...item, asOf: item.asOf || snapshot.generatedAt, origin: 'recorded', pointInTimeQuality: 'recorded' }));
    const byKey = new Map();
    [...historical, ...current].forEach(item => { if (item.ticker && (item.asOf || item.observedAt)) byKey.set(`${item.ticker}:${String(item.asOf || item.observedAt).slice(0,10)}`, item); });
    return [...byKey.values()];
  }, [snapshot]);
  const result = useMemo(() => runRecordedBacktest({ ticker, horizonDays }, history, snapshot.observations || []), [ticker, horizonDays, history, snapshot.observations]);
  const persist = async () => {
    setSaveState('saving');
    try {
      const response = await fetch('/api/backtest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker, horizonDays }) });
      if (!response.ok) throw new Error('API unavailable');
      setSaveState('saved');
    } catch { setSaveState('local'); }
  };
  const localizedStatus = status => b.statuses[status] || status;
  const localizedGap = gap => b.gaps[gap] || gap;
  const localizedOrigin = origin => origin === 'historical-reconstruction' ? b.reconstructed : b.recorded;
  const quality = result.coverage.quality === 'partial' ? b.partialQuality : b.recordedQuality;
  return <main className="backtest-shell" lang={language}>
    <header className="backtest-header"><button onClick={onBack}><b>GRIDLINE</b><small>{b.lab}</small></button><div><span>{result.backtestVersion}</span><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{copy.languageToggle}</button><button onClick={onBack}>{b.back}</button></div></header>
    <section className="backtest-hero"><div><p>{b.kicker}</p><h1>{b.titleLead} <em>{b.titleEmphasis}</em></h1><span>{b.intro}</span></div><div className="backtest-selectors"><select value={ticker} onChange={e => setTicker(e.target.value)}>{['NBIS','CRWV','ORCL','AVGO'].map(value => <option key={value}>{value}</option>)}</select><div>{[30,90].map(value => <button className={horizonDays===value?'selected':''} onClick={() => setHorizonDays(value)} key={value}>{value}D</button>)}</div></div></section>

    <section className="backtest-how"><div><p>{b.howTitle}</p><ol>{b.howItems(horizonDays).map(item => <li key={item}>{item}</li>)}</ol></div><div className="backtest-coverage"><p>{b.coverageTitle}</p><dl><div><dt>{b.coverageRange}</dt><dd>{dateOnly(result.coverage.start)} → {dateOnly(result.coverage.end)}</dd></div><div><dt>{b.pointInTimeSignals}</dt><dd>{result.coverage.totalSignals}</dd></div><div><dt>{b.recordedSignals}</dt><dd>{result.coverage.recordedSignals}</dd></div><div><dt>{b.reconstructedSignals}</dt><dd>{result.coverage.reconstructedSignals}</dd></div><div><dt>{b.dataQuality}</dt><dd className={result.coverage.quality === 'partial' ? 'partial' : ''}>{quality}</dd></div></dl></div></section>

    <section className="backtest-metrics"><Metric label={b.completedSignals} value={result.metrics.sampleSize}/><Metric label={b.pendingOutcomes} value={result.metrics.pendingSignals}/><Metric label={b.hitRate} value={result.metrics.directionalHitRate === null ? '—' : `${(result.metrics.directionalHitRate*100).toFixed(0)}%`}/><Metric label={b.avgReturn} value={pct(result.metrics.averageDirectionalReturn)}/></section>
    {result.status === 'insufficient-data' && <section className="backtest-building"><b>{b.buildingTitle}</b><span>{b.building(horizonDays)}</span></section>}
    <section className="backtest-grid"><article><h2>{b.signalLedger}</h2><div className="backtest-table"><div className="head"><span>{b.signalDate}</span><span>{b.gap}</span><span>{b.origin}</span><span>{b.status}</span><span>{b.forwardReturn}</span></div>{result.rows.length ? result.rows.slice(-12).reverse().map((row,index) => <div key={`${row.signalAt}-${index}`}><span>{dateOnly(row.signalAt)}</span><span>{localizedGap(row.gap)}</span><span className={row.origin === 'historical-reconstruction' ? 'origin-reconstructed' : 'origin-recorded'}>{localizedOrigin(row.origin)}</span><span>{localizedStatus(row.status)}</span><span>{row.status==='complete'?pct(row.forwardReturn):'—'}</span></div>) : <p>{b.noSignals}</p>}</div></article><article><h2>{b.guardrails}</h2><ol>{b.guardrailItems.map(item => <li key={item}>{item}</li>)}</ol><button onClick={persist}>{b.runPersist}</button><small>{saveState==='saved'?b.saved:saveState==='local'?b.local:saveState==='saving'?b.running:b.retained}</small></article></section>
    <aside className="backtest-note">{b.note}</aside>
  </main>;
}
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
