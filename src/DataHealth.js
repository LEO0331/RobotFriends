import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { buildDataHealth } from './dataHealthModel';
import './DataHealth.css';

const emptySnapshot = { observations: [], sourceHealth: {}, outcomes: [] };
const dateOnly = value => value ? String(value).slice(0, 10) : '—';
const sourceLabel = source => ({ prices: 'Market prices', sec: 'SEC', eia: 'EIA', pjm: 'PJM', ferc: 'FERC', 'company-ir': 'Company IR' }[source] || source);

function copyFor(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    toggle: zh ? 'EN' : '繁中',
    lab: t('DATA HEALTH', '資料健康狀態'),
    back: t('← Back to regime', '← 返回週期分析'),
    kicker: t('OPERATIONS / DEMO READINESS', '營運狀態 / 示範準備度'),
    title: t('Know when the dashboard is', '確認儀表板是否'),
    titleEm: t('safe to demo.', '可安心展示。'),
    intro: t(
      'This page reads the same committed snapshot used by the public dashboard and makes freshness, provider degradation, market-price coverage and point-in-time reconstruction coverage visible.',
      '此頁直接讀取公開儀表板使用的同一份已提交快照，顯示資料新鮮度、來源降級、市場價格涵蓋範圍與時點重建涵蓋狀態。'
    ),
    refresh: t('Refresh status', '重新整理狀態'),
    loading: t('Loading snapshot…', '正在載入快照…'),
    loadError: t('Snapshot could not be loaded.', '無法載入快照。'),
    states: {
      ready: t('DEMO READY', '示範就緒'),
      'ready-with-warnings': t('READY WITH WARNINGS', '可展示，但有警示'),
      attention: t('ATTENTION REQUIRED', '需要處理'),
    },
    stateNotes: {
      ready: t('Critical demo data is complete and providers report healthy states.', '示範所需的關鍵資料完整，且來源狀態正常。'),
      'ready-with-warnings': t('Critical demo data is complete. Optional/degraded providers remain disclosed below.', '示範所需關鍵資料完整；選用或降級中的來源會在下方明確顯示。'),
      attention: t('One or more demo-critical requirements are missing. Check the highlighted coverage below before presenting.', '一項或多項示範關鍵條件尚未滿足；展示前請檢查下方標示的涵蓋狀態。'),
    },
    generated: t('Snapshot generated', '快照產生時間'),
    age: t('Snapshot age', '快照年齡'),
    schema: t('Schema', '資料結構版本'),
    priceCoverage: t('Price coverage', '價格涵蓋'),
    reconstructions: t('Reconstructions', '歷史重建'),
    hours: t('hours', '小時'),
    sourceHealth: t('SOURCE HEALTH', '來源健康狀態'),
    source: t('Source', '來源'),
    status: t('Status', '狀態'),
    records: t('Records', '資料筆數'),
    lastSuccess: t('Last success', '最近成功'),
    detail: t('Detail', '說明'),
    priceHistory: t('MARKET PRICE COVERAGE', '市場價格涵蓋'),
    ticker: t('Ticker', '標的'),
    rows: t('Daily rows', '日資料筆數'),
    range: t('Range', '期間'),
    provider: t('Provider', '供應來源'),
    readiness: t('Readiness', '準備狀態'),
    complete: t('Ready', '就緒'),
    incomplete: t('Needs data', '需要資料'),
    backtest: t('POINT-IN-TIME COVERAGE', '時點驗證涵蓋'),
    recorded: t('Recorded snapshots', '實際記錄快照'),
    reconstructed: t('Historical reconstructions', '歷史重建'),
    signalRange: t('Coverage range', '涵蓋期間'),
    methodology: t('Score methodology', '分數方法論'),
    quality: t('Reconstruction quality', '重建品質'),
    qualityPartial: t('Partial — historical-vintage limits disclosed', '部分 — 已揭露歷史版本限制'),
    qualityRecorded: t('Recorded only', '僅實際記錄'),
    noteTitle: t('Demo boundary', '示範邊界'),
    note: t(
      'Green demo readiness means the public snapshot has valid schema-v4 history, usable recent prices for every tracked ticker and labeled reconstructed backtest history. It does not mean every optional provider is live, nor does it make Gridline an investment recommendation system.',
      '綠色示範就緒代表公開快照具有有效的 schema-v4 歷史資料、所有追蹤標的都有近期可用價格，且回測歷史重建已清楚標示。這不代表所有選用來源都必須即時在線，也不代表 Gridline 是投資建議系統。'
    ),
  };
}

export default function DataHealth({ onBack, language = 'en', onLanguageChange = () => {} }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loadState, setLoadState] = useState('loading');
  const copy = copyFor(language);

  const load = useCallback(() => {
    setLoadState('loading');
    fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('snapshot unavailable')))
      .then(data => { setSnapshot({ ...emptySnapshot, ...data }); setLoadState('ready'); })
      .catch(() => setLoadState('error'));
  }, []);

  useEffect(() => { load(); }, [load]);
  const health = useMemo(() => buildDataHealth(snapshot, new Date()), [snapshot]);
  const readyPrices = health.priceCoverage.filter(item => item.ready).length;

  return <main className="data-health-shell" lang={language}>
    <header className="data-health-header">
      <button onClick={onBack}><b>GRIDLINE</b><small>{copy.lab}</small></button>
      <div><span>schema-v{health.schemaVersion || '—'}</span><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{copy.toggle}</button><button onClick={onBack}>{copy.back}</button></div>
    </header>

    <section className="data-health-hero">
      <div><p>{copy.kicker}</p><h1>{copy.title} <em>{copy.titleEm}</em></h1><span>{copy.intro}</span></div>
      <button onClick={load} disabled={loadState === 'loading'}>{loadState === 'loading' ? copy.loading : copy.refresh}</button>
    </section>

    {loadState === 'error' ? <section className="health-alert error">{copy.loadError}</section> : <>
      <section className={`health-status ${health.state}`}>
        <strong>{copy.states[health.state]}</strong><span>{copy.stateNotes[health.state]}</span>
      </section>

      <section className="health-metrics">
        <Metric label={copy.generated} value={health.generatedAt ? health.generatedAt.replace('T', ' ').slice(0, 16) + ' UTC' : '—'} />
        <Metric label={copy.age} value={health.ageHours === null ? '—' : `${health.ageHours} ${copy.hours}`} />
        <Metric label={copy.priceCoverage} value={`${readyPrices}/${health.priceCoverage.length}`} />
        <Metric label={copy.reconstructions} value={health.backtest.reconstructed} />
      </section>

      <section className="health-grid">
        <article className="health-panel source-panel"><h2>{copy.sourceHealth}</h2><div className="health-table source-table"><div className="head"><span>{copy.source}</span><span>{copy.status}</span><span>{copy.records}</span><span>{copy.lastSuccess}</span><span>{copy.detail}</span></div>{health.sources.map(item => <div key={item.source}><b>{sourceLabel(item.source)}</b><span className={`status-pill ${item.status}`}>{item.status}</span><span>{item.recordCount}</span><span>{dateOnly(item.lastSuccessAt || item.checkedAt)}</span><span title={item.message || ''}>{item.message || '—'}</span></div>)}</div></article>

        <article className="health-panel"><h2>{copy.priceHistory}</h2><div className="health-table price-table"><div className="head"><span>{copy.ticker}</span><span>{copy.rows}</span><span>{copy.range}</span><span>{copy.provider}</span><span>{copy.readiness}</span></div>{health.priceCoverage.map(item => <div key={item.ticker}><b>{item.ticker}</b><span>{item.count}</span><span>{dateOnly(item.firstAt)} → {dateOnly(item.lastAt)}</span><span>{item.provider || '—'}</span><span className={`coverage-state ${item.ready ? 'ready' : 'missing'}`}>{item.ready ? copy.complete : copy.incomplete}</span></div>)}</div></article>
      </section>

      <section className="health-grid lower">
        <article className="health-panel backtest-health"><h2>{copy.backtest}</h2><dl><div><dt>{copy.recorded}</dt><dd>{health.backtest.recorded}</dd></div><div><dt>{copy.reconstructed}</dt><dd>{health.backtest.reconstructed}</dd></div><div><dt>{copy.signalRange}</dt><dd>{dateOnly(health.backtest.start)} → {dateOnly(health.backtest.end)}</dd></div><div><dt>{copy.methodology}</dt><dd>{health.methodologyVersion || '—'}</dd></div><div><dt>{copy.quality}</dt><dd>{health.backtest.quality === 'partial' ? copy.qualityPartial : copy.qualityRecorded}</dd></div></dl></article>
        <article className="health-panel health-boundary"><h2>{copy.noteTitle}</h2><p>{copy.note}</p>{health.blockers.length > 0 && <code>{health.blockers.join(' · ')}</code>}</article>
      </section>
    </>}
  </main>;
}

function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
