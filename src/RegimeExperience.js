import React, { useEffect, useState } from 'react';
import SnapshotLoadState from './Components/SnapshotLoadState';
import App from './Containers/App';
import ExposurePeriodPortal from './ExposurePeriodMonitor';
import companyList from './data/companyExposure.json';
import { emptySnapshot, loadDashboardSnapshot, summarizeSnapshot } from './snapshotMeta';
import { infrastructureEvents } from './eventModel';
import { formatUsd, marketSignals } from './marketSignals';
import './RegimeExperience.css';

const routeName = () => (window.location.hash.replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();

export default function RegimeExperience({ language = 'en', onLanguageChange = () => {} }) {
  const [route, setRoute] = useState(routeName);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [snapshotState, setSnapshotState] = useState('loading');
  const [reloadToken, setReloadToken] = useState(0);
  const navigate = hash => { window.history.pushState({}, '', `${window.location.pathname}${window.location.search}#${hash}`); setRoute(routeName()); window.scrollTo(0, 0); };
  useEffect(() => {
    const sync = () => setRoute(routeName());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  useEffect(() => {
    let active = true;
    setSnapshotState('loading');
    loadDashboardSnapshot()
      .then(data => {
        if (!active) return;
        setSnapshot(data);
        setSnapshotState('ready');
      })
      .catch(() => {
        if (active) setSnapshotState('error');
      });
    return () => { active = false; };
  }, [reloadToken]);
  const retrySnapshot = () => setReloadToken(value => value + 1);
  if (route === 'regime') return <SignalDetail
    language={language}
    setLanguage={onLanguageChange}
    navigate={navigate}
    snapshot={snapshot}
    snapshotState={snapshotState}
    onRetrySnapshot={retrySnapshot}
  />;
  return <><App
    snapshot={snapshot}
    snapshotState={snapshotState}
    onRetrySnapshot={retrySnapshot}
    language={language}
    onLanguageChange={onLanguageChange}
  /><ExposurePeriodPortal /></>;
}

function SignalDetail({ language, setLanguage, navigate, snapshot, snapshotState, onRetrySnapshot }) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  const meta = summarizeSnapshot(snapshot, language);
  const events = infrastructureEvents(snapshot).filter(item => !item.archived).slice(0, 4);
  return <main className="regime-detail-shell" lang={language}>
    <header className="regime-detail-header"><button className="regime-brand" onClick={() => navigate('overview')}><span className="regime-brand-mark">◫</span><span><b>GRIDLINE</b><small>{t('SIGNAL OVERVIEW', '訊號總覽')}</small></span></button><div className="regime-detail-actions"><button onClick={() => setLanguage(zh ? 'en' : 'zh-TW')}>{zh ? 'EN' : '繁中'}</button><button onClick={() => navigate('overview')}>← {t('Back to overview', '返回總覽')}</button></div></header>
    <SnapshotLoadState
      state={snapshotState}
      hasObservations={Boolean(snapshot.observations?.length)}
      language={language}
      onRetry={onRetrySnapshot}
    />
    <section className="regime-detail-hero"><div><p className="regime-kicker">{t('OBSERVED PRICE TREND', '已觀察價格趨勢')}</p><h1>{t('Price trend signals', '價格趨勢訊號')}<br/><em>{t('from observed prices.', '來自已觀察的價格。')}</em></h1><p>{t('Review the direction of recent price trends for each tracked company. Signals summarize dated market observations; they do not predict future returns.', '檢視各追蹤公司的近期價格趨勢方向。訊號整理具日期的市場觀察資料，不預測未來報酬。')}</p></div><div className="regime-status-card"><span>{t('SNAPSHOT · LOCAL TIME', '快照 · 本地時間')}</span><b>{meta.generatedLabel}</b><small>{t('A source link and date accompany each available close.', '每筆可用收盤價均顯示來源與日期。')}</small></div></section>
    <section className="regime-score-grid">{companyList.map(company => { const signal = marketSignals(snapshot, company.ticker); return <article className="regime-score-card" key={company.ticker}><div><span>{company.ticker}</span><strong>{formatUsd(signal?.close)}</strong></div><p>{t('Observed', '觀察日期')}: {signal?.observedAt?.slice(0, 10) || '—'}</p><small>{signal?.trend === 'above' ? t('Short-term price trend: upward', '短期價格趨勢向上') : signal?.trend === 'below' ? t('Short-term price trend: downward', '短期價格趨勢向下') : signal?.trend === 'mixed' ? t('Short-term price trend: mixed', '短期價格趨勢混合') : t('Short-term trend unavailable', '短期趨勢資料不足')}</small>{signal?.sourceUrl && <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Price data source ↗', '價格資料來源 ↗')}</a>}</article>; })}</section>
    <section className="regime-section-head"><div><p className="regime-kicker">{t('EVIDENCE TIMELINE', '證據時間軸')}</p><h2>{t('Verified source records', '已驗證來源紀錄')}</h2></div><button onClick={() => navigate('events')}>{t('Open all events →', '開啟所有事件 →')}</button></section>
    <section className="regime-timeline">{events.length ? events.map(item => <button key={item.id} className="regime-timeline-item" onClick={() => navigate('events')}><span className="regime-impact neutral">•</span><div><small>{item.publishedAt.slice(0, 10)} · {item.category}</small><b>{item.title}</b><em>{item.source}</em></div><span className="regime-arrow">→</span></button>) : <p className="event-empty">{t('No verified current events in this snapshot.', '此快照沒有近期已驗證事件。')}</p>}</section>
    <aside className="regime-detail-note"><div><b>{t('Interpretation limit', '解讀限制')}</b><p>{t('Price-trend signals describe past market behavior. They do not measure company value or project delivery, and the historical review does not establish predictive skill.', '價格趨勢訊號只描述過去市場表現，不衡量公司價值或專案交付；歷史回顧也不能證明預測能力。')}</p></div><button onClick={() => navigate('backtest')}>{t('Review historical signals →', '檢視歷史訊號 →')}</button></aside>
  </main>;
}
