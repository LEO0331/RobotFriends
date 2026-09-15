import React, { useEffect, useMemo, useState } from 'react';
import { runRecordedBacktest } from './backtestModel';
import './BacktestLab.css';

const empty = { observations: [], companyHistory: [], scores: [] };
const pct = value => value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;

export default function BacktestLab({ onBack }) {
  const [snapshot, setSnapshot] = useState(empty);
  const [ticker, setTicker] = useState('NBIS');
  const [horizonDays, setHorizonDays] = useState(30);
  const [saveState, setSaveState] = useState('idle');
  useEffect(() => {
    let active = true;
    fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject()).then(data => { if (active) setSnapshot({ ...empty, ...data }); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const history = useMemo(() => {
    const recorded = (snapshot.companyHistory || []).map(item => ({ ...item, asOf: item.observedAt, methodologyVersion: 'recorded-snapshot' }));
    const current = (snapshot.scores || []).map(item => ({ ...item, asOf: item.asOf || snapshot.generatedAt }));
    const byKey = new Map();
    [...recorded, ...current].forEach(item => { if (item.ticker && (item.asOf || item.observedAt)) byKey.set(`${item.ticker}:${String(item.asOf || item.observedAt).slice(0,10)}`, item); });
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
  return <main className="backtest-shell">
    <header className="backtest-header"><button onClick={onBack}><b>GRIDLINE</b><small>POINT-IN-TIME VALIDATION</small></button><div><span>{result.backtestVersion}</span><button onClick={onBack}>← Back to regime</button></div></header>
    <section className="backtest-hero"><div><p>MODEL VALIDATION / NO LOOK-AHEAD</p><h1>Backtest what Gridline <em>actually knew.</em></h1><span>Signals are evaluated only after they were recorded. Gridline does not reconstruct historical proprietary scores using information learned later.</span></div><div className="backtest-selectors"><select value={ticker} onChange={e => setTicker(e.target.value)}>{['NBIS','CRWV','ORCL','AVGO'].map(value => <option key={value}>{value}</option>)}</select><div>{[30,90].map(value => <button className={horizonDays===value?'selected':''} onClick={() => setHorizonDays(value)} key={value}>{value}D</button>)}</div></div></section>
    <section className="backtest-metrics"><Metric label="Completed signals" value={result.metrics.sampleSize}/><Metric label="Pending outcomes" value={result.metrics.pendingSignals}/><Metric label="Directional hit rate" value={result.metrics.directionalHitRate === null ? '—' : `${(result.metrics.directionalHitRate*100).toFixed(0)}%`}/><Metric label="Avg directional return" value={pct(result.metrics.averageDirectionalReturn)}/></section>
    {result.status === 'insufficient-data' && <section className="backtest-building"><b>Point-in-time history is still building.</b><span>This is intentional. Completed backtest results appear only after a recorded signal has a full future {horizonDays}-day price window. No synthetic score history is inserted to make the chart look complete.</span></section>}
    <section className="backtest-grid"><article><h2>Signal ledger</h2><div className="backtest-table"><div className="head"><span>Signal date</span><span>Gap</span><span>Status</span><span>Forward return</span></div>{result.rows.length ? result.rows.slice(-12).reverse().map((row,index) => <div key={`${row.signalAt}-${index}`}><span>{String(row.signalAt).slice(0,10)}</span><span>{row.gap}</span><span>{row.status}</span><span>{row.status==='complete'?pct(row.forwardReturn):'—'}</span></div>) : <p>No recorded Positive/Elevated signals yet for this ticker.</p>}</div></article><article><h2>Point-in-time guardrails</h2><ol><li>Scores are consumed from daily recorded snapshots or versioned score snapshots.</li><li>Server validation rejects a signal when source lineage contains observations dated after the score cutoff.</li><li>Future prices are used only to evaluate a signal after it existed, never to create that signal.</li><li>Small samples and pending outcomes remain visible instead of being filled with synthetic history.</li></ol><button onClick={persist}>Run & persist on API</button><small>{saveState==='saved'?'Backtest run saved to SQLite.':saveState==='local'?'API unavailable — showing static point-in-time snapshot.':saveState==='saving'?'Running…':'Production API runs are retained for audit.'}</small></article></section>
    <aside className="backtest-note">Backtest statistics are descriptive research diagnostics. They do not establish predictive power and are not investment advice.</aside>
  </main>;
}
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
