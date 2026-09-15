import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import companies from './data/companyExposure.json';
import { buildCompanyPeriodView, formatDelta, formatPercent, setupCopy } from './exposureHistory';
import './ExposurePeriodMonitor.css';

const emptySnapshot = { observations: [], companyHistory: [], generatedAt: null };

async function loadSnapshot() {
  const staticRequest = fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Static snapshot unavailable')))
    .catch(() => emptySnapshot);
  const apiRequest = fetch('/api/observations?type=close', { cache: 'no-store' })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('API unavailable')))
    .catch(() => []);
  const [snapshot, apiPrices] = await Promise.all([staticRequest, apiRequest]);
  return {
    ...emptySnapshot,
    ...snapshot,
    observations: Array.isArray(apiPrices) && apiPrices.length ? apiPrices : (snapshot.observations || []),
    companyHistory: snapshot.companyHistory || [],
  };
}

function findOverviewAnchor() {
  const shell = document.querySelector('main.shell');
  if (!shell) return { shell: null, anchor: null };
  const anchor = Array.from(shell.children).find(child => child.classList && child.classList.contains('company-title')) || null;
  return { shell, anchor };
}

export default function ExposurePeriodPortal() {
  const [host, setHost] = useState(null);
  const [language, setLanguage] = useState('en');
  const [snapshot, setSnapshot] = useState(emptySnapshot);

  useEffect(() => {
    let mounted = true;
    loadSnapshot().then(data => { if (mounted) setSnapshot(data); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let currentHost = null;
    let currentShell = null;
    const sync = () => {
      const { shell, anchor } = findOverviewAnchor();
      if (shell) setLanguage(shell.getAttribute('lang') || 'en');
      if (anchor && shell) {
        if (!currentHost || !currentHost.isConnected || currentShell !== shell) {
          if (currentHost?.isConnected) currentHost.remove();
          if (currentShell) currentShell.classList.remove('period-aware-exposure');
          currentHost = document.createElement('div');
          currentHost.className = 'exposure-period-host';
          shell.insertBefore(currentHost, anchor);
          shell.classList.add('period-aware-exposure');
          currentShell = shell;
          setHost(currentHost);
        }
      } else if (currentHost) {
        if (currentHost.isConnected) currentHost.remove();
        if (currentShell) currentShell.classList.remove('period-aware-exposure');
        currentHost = null;
        currentShell = null;
        setHost(null);
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    const root = document.getElementById('root');
    if (root) observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['lang'] });
    return () => {
      observer.disconnect();
      if (currentHost?.isConnected) currentHost.remove();
      if (currentShell) currentShell.classList.remove('period-aware-exposure');
    };
  }, []);

  if (!host) return null;
  return ReactDOM.createPortal(<ExposureMonitor snapshot={snapshot} language={language} />, host);
}

function ExposureMonitor({ snapshot, language }) {
  const [period, setPeriod] = useState('30D');
  const [ticker, setTicker] = useState('NBIS');
  const zh = language === 'zh-TW';
  const t = (english, chinese) => zh ? chinese : english;
  const views = useMemo(
    () => companies.map(company => buildCompanyPeriodView(company, snapshot.observations, snapshot.companyHistory, period, snapshot.generatedAt)),
    [period, snapshot]
  );
  const active = views.find(company => company.ticker === ticker) || views[0];
  const copy = setupCopy(active, period, t);
  const priceCoverage = views.filter(company => company.priceHistoryAvailable).length;
  const scoreCoverage = views.filter(company => company.scoreHistoryAvailable).length;
  const coverageText = priceCoverage === views.length
    ? t(`${period} price returns use observed market history.`, `${period} 報酬使用已觀察的市場價格歷史。`)
    : t(`${priceCoverage}/${views.length} companies currently have enough ${period} price history.`, `目前 ${views.length} 家公司中有 ${priceCoverage} 家具備足夠的 ${period} 價格歷史。`);

  return (
    <div className="period-aware-monitor">
      <section className="section company-title period-company-title">
        <div>
          <p className="eyebrow">{t('EXPOSURE MONITOR', '曝險監測')}</p>
          <h3>{t('Where the regime matters', '週期影響所在')}</h3>
          <p className="period-coverage">{coverageText} {scoreCoverage < views.length ? t('Score deltas will appear as daily snapshots accumulate.', '分數變化會隨每日快照累積後自動顯示。') : t('Score history is available for this window.', '此期間已有分數歷史。')}</p>
        </div>
        <div className="segmented" aria-label={t('Exposure lookback period', '曝險回溯期間')}>
          {['30D', '90D', '1Y'].map(value => <button key={value} onClick={() => setPeriod(value)} className={period === value ? 'selected' : ''}>{value}</button>)}
        </div>
      </section>

      <section className="companies period-companies">
        {views.map(company => {
          const change = formatPercent(company.periodReturn);
          const emotionDelta = formatDelta(company.emotionDelta);
          const fundamentalDelta = formatDelta(company.fundamentalsDelta);
          return (
            <button className={`company ${ticker === company.ticker ? 'selected-card' : ''}`} onClick={() => setTicker(company.ticker)} key={company.ticker}>
              <div className="company-top">
                <div><b>{company.ticker}</b><small>{company.name}</small></div>
                <span className={!company.priceHistoryAvailable ? 'period-unavailable' : company.periodReturn < 0 ? 'negative' : 'positive'}>{change}<small>{period}</small></span>
              </div>
              <strong className="price">${company.currentPrice.toFixed(2)}</strong>
              <div className="stat">
                <span>{t('MARKET EMOTION', '市場情緒')} <b>{company.emotion}</b>{emotionDelta && <small className="period-delta">{emotionDelta} vs {period}</small>}</span>
                <span>{t('FUNDAMENTALS', '基本面')} <b>{company.fundamentals}</b>{fundamentalDelta && <small className="period-delta">{fundamentalDelta} vs {period}</small>}</span>
              </div>
              <div className="exposure"><span>{t('DC EXPOSURE', '資料中心曝險')}</span><div><i style={{ width: `${company.exposure}%`, background: company.color }} /></div><b>{company.exposure}</b></div>
              <div className="gap"><span>{t('EXPECTATIONS GAP', '預期落差')}</span><b>{t(company.gap, { Positive: '正向', Elevated: '偏高', Balanced: '均衡' }[company.gap])} ↗</b></div>
            </button>
          );
        })}
      </section>

      <section className="period-selected-setup">
        <article className="thesis period-thesis">
          <div className="panel-title">
            <div><p className="eyebrow">{t('SELECTED SETUP', '所選標的')}</p><h3>{active.ticker} / {period} {t('view', '檢視')}</h3></div>
            <span className="confidence">● {active.confidence}% {t('DATA CONFIDENCE', '資料可信度')}</span>
          </div>
          <div className="thesis-content">
            <div className="ring" style={{ '--score': `${active.fundamentals * 3.6}deg` }}><div><strong>{active.fundamentals}</strong><span>/100</span><small>{t('FUNDAMENTALS', '基本面')}</small></div></div>
            <div>
              <h4>{copy.title}</h4>
              <p>{copy.body}</p>
              <div className="period-window-meta">
                <span>{t('PERIOD RETURN', '期間報酬')} <b className={active.periodReturn < 0 ? 'negative' : 'positive'}>{formatPercent(active.periodReturn)}</b></span>
                <span>{t('PRICE WINDOW', '價格期間')} <b>{active.priceHistoryAvailable ? `${active.priceCoverageDays}d` : '—'}</b></span>
                <span>{t('SCORE HISTORY', '分數歷史')} <b>{active.scoreHistoryAvailable ? t('Available', '可用') : t('Building', '累積中')}</b></span>
              </div>
            </div>
          </div>
          <div className="signals">
            <span>{t('PHYSICAL SIGNAL', '實體訊號')} <b>{t('Current snapshot', '目前快照')}</b></span>
            <span>{t('MARKET SIGNAL', '市場訊號')} <b className={active.periodReturn < 0 ? 'negative' : ''}>{copy.marketSignal}</b></span>
            <span>{t('VALUATION', '估值')} <b>{t('55th percentile · current', '第 55 百分位 · 目前')}</b></span>
          </div>
        </article>
      </section>
    </div>
  );
}
