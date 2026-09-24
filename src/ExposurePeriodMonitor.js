import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import companies from './data/companyExposure.json';
import { buildCompanyPeriodView, formatPercent, marketSignalLabel, setupCopy } from './exposureHistory';
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
    () => companies.map(company => buildCompanyPeriodView(company, snapshot.observations, period)),
    [period, snapshot]
  );
  const active = views.find(company => company.ticker === ticker) || views[0];
  const copy = setupCopy(active, period, t);
  const priceCoverage = views.filter(company => company.priceHistoryAvailable).length;
  const coverageText = priceCoverage === views.length
    ? t(`${period} price returns use observed market history.`, `${period} 報酬使用已觀察的市場價格歷史。`)
    : t(`${priceCoverage}/${views.length} companies currently have enough ${period} price history.`, `目前 ${views.length} 家公司中有 ${priceCoverage} 家具備足夠的 ${period} 價格歷史。`);

  return (
    <div className="period-aware-monitor">
      <section className="section company-title period-company-title">
        <div>
          <p className="eyebrow">{t('MARKET CONTEXT', '市場脈絡')}</p>
          <h3>{t('Observed price trends', '已觀察的價格趨勢')}</h3>
          <p className="period-coverage">{coverageText} {t('The trend view requires 10 dated closes.', '趨勢檢視需 10 筆有日期的收盤價。')}</p>
        </div>
        <div className="segmented" aria-label={t('Price lookback period', '價格回溯期間')}>
          {['30D', '90D', '1Y'].map(value => <button key={value} onClick={() => setPeriod(value)} className={period === value ? 'selected' : ''}>{value}</button>)}
        </div>
      </section>

      <section className="companies period-companies">
        {views.map(company => {
          const change = formatPercent(company.periodReturn);
          return (
            <button className={`company ${ticker === company.ticker ? 'selected-card' : ''}`} onClick={() => setTicker(company.ticker)} key={company.ticker}>
              <div className="company-top">
                <div><b>{company.ticker}</b><small>{company.name}</small></div>
                <span className={!company.priceHistoryAvailable ? 'period-unavailable' : company.periodReturn < 0 ? 'negative' : 'positive'}>{change}<small>{period}</small></span>
              </div>
              <strong className="price" title={company.priceToDate || undefined}>{company.currentPrice === null ? t('Unavailable', '無資料') : `$${company.currentPrice.toFixed(2)}`}</strong>
              <div className="stat">
                <span>{t('CLOSE DATE', '收盤日期')} <b>{company.priceToDate ? company.priceToDate.slice(0, 10) : '—'}</b></span>
                <span>{t('PRICE TREND', '價格趨勢')} <b>{marketSignalLabel(company.marketSignal, t)}</b></span>
              </div>
            </button>
          );
        })}
      </section>

      <section className="period-selected-setup">
        <article className="thesis period-thesis">
          <div className="panel-title">
            <div><p className="eyebrow">{t('OBSERVED PRICE', '已觀察價格')}</p><h3>{active.ticker} / {period} {t('view', '檢視')}</h3></div>
          </div>
          <div className="thesis-content">
            <div>
              <h4>{copy.title}</h4>
              <p>{copy.body}</p>
              <div className="period-window-meta">
                <span>{t('PERIOD RETURN', '期間報酬')} <b className={active.periodReturn < 0 ? 'negative' : 'positive'}>{formatPercent(active.periodReturn)}</b></span>
                <span>{t('PRICE WINDOW', '價格期間')} <b>{active.priceHistoryAvailable ? `${active.priceCoverageDays}${zh ? ' 天' : ' days'}` : '—'}</b></span>
                <span>{t('LATEST CLOSE', '最近收盤價')} <b>{active.currentPrice === null ? '—' : `$${active.currentPrice.toFixed(2)}`}</b></span>
                <span>{t('PRICE SOURCE', '價格來源')} <b>{active.priceSourceUrl ? <a href={active.priceSourceUrl} target="_blank" rel="noopener noreferrer">{active.priceProvider || t('Open source', '開啟來源')} ↗</a> : t('Unavailable', '無資料')}</b></span>
              </div>
            </div>
          </div>
          <div className="signals">
            <span>{t('PRICE TREND', '價格趨勢')} <b>{copy.marketSignal}</b></span>
          </div>
        </article>
      </section>
    </div>
  );
}
