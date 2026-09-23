import React, { useEffect, useState } from 'react';
import App from './Containers/App';
import ExposurePeriodPortal from './ExposurePeriodMonitor';
import companyList from './data/companyExposure.json';
import { emptySnapshot, loadDashboardSnapshot, summarizeSnapshot } from './snapshotMeta';
import { infrastructureEvents } from './eventModel';
import { formatUsd, marketSignals } from './marketSignals';
import './RegimeExperience.css';

const LANGUAGE_KEY = 'gridline-language';
const routeName = () => (window.location.hash.replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const storedLanguage = () => { try { return window.localStorage.getItem(LANGUAGE_KEY) === 'zh-TW' ? 'zh-TW' : 'en'; } catch { return 'en'; } };

export default function RegimeExperience() {
  const [route, setRoute] = useState(routeName);
  const [language, setLanguage] = useState(storedLanguage);
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const navigate = hash => { window.history.pushState({}, '', `${window.location.pathname}${window.location.search}#${hash}`); setRoute(routeName()); window.scrollTo(0, 0); };
  const setPersistentLanguage = next => { setLanguage(next); try { window.localStorage.setItem(LANGUAGE_KEY, next); } catch {} };
  useEffect(() => {
    const sync = () => setRoute(routeName());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);
  useEffect(() => {
    let active = true;
    loadDashboardSnapshot().then(data => { if (active) setSnapshot(data); }).catch(() => {});
    return () => { active = false; };
  }, []);
  if (route === 'regime') return <SignalDetail language={language} setLanguage={setPersistentLanguage} navigate={navigate} snapshot={snapshot} />;
  return <><App snapshot={snapshot} /><ExposurePeriodPortal /></>;
}

function SignalDetail({ language, setLanguage, navigate, snapshot }) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  const meta = summarizeSnapshot(snapshot, language);
  const events = infrastructureEvents(snapshot).filter(item => !item.archived).slice(0, 4);
  return <main className="regime-detail-shell" lang={language}>
    <header className="regime-detail-header"><button className="regime-brand" onClick={() => navigate('overview')}><span className="regime-brand-mark">◫</span><span><b>GRIDLINE</b><small>{t('MARKET SIGNAL METHOD', '市場訊號方法')}</small></span></button><div className="regime-detail-actions"><button onClick={() => setLanguage(zh ? 'en' : 'zh-TW')}>{zh ? 'EN' : '繁中'}</button><button onClick={() => navigate('overview')}>← {t('Back to overview', '返回總覽')}</button></div></header>
    <section className="regime-detail-hero"><div><p className="regime-kicker">{t('OBSERVED PRICE TREND', '已觀察價格趨勢')}</p><h1>{t('MA5 / MA10', 'MA5 / MA10')}<br/><em>{t('from dated closes.', '來自有日期的收盤價。')}</em></h1><p>{t('Uptrend: latest close > MA5 > MA10. Downtrend: latest close < MA5 < MA10. All other complete cases are mixed. These rules describe observed prices, not future returns.', '上行：最新收盤價 > MA5 > MA10；下行：最新收盤價 < MA5 < MA10；其他資料完整情況為混合。規則描述已觀察價格，不預測未來報酬。')}</p></div><div className="regime-status-card"><span>{t('SNAPSHOT · LOCAL TIME', '快照 · 本地時間')}</span><b>{meta.generatedLabel}</b><small>{t('A source link and date accompany each available close.', '每筆可用收盤價均顯示來源與日期。')}</small></div></section>
    <section className="regime-score-grid">{companyList.map(company => { const signal = marketSignals(snapshot, company.ticker); return <article className="regime-score-card" key={company.ticker}><div><span>{company.ticker}</span><strong>{formatUsd(signal?.close)}</strong></div><p>{t('Observed', '觀察日期')}: {signal?.observedAt?.slice(0, 10) || '—'}</p><div className="regime-score-track"><i style={{ width: signal?.sampleSize >= 10 ? '100%' : '0%' }} /></div><small>MA5 {formatUsd(signal?.ma5)} · MA10 {formatUsd(signal?.ma10)}</small><small>{signal?.trend === 'above' ? t('Close > MA5 > MA10', '收盤價 > MA5 > MA10') : signal?.trend === 'below' ? t('Close < MA5 < MA10', '收盤價 < MA5 < MA10') : signal?.trend === 'mixed' ? t('Mixed order', '排序混合') : t('Insufficient history', '歷史資料不足')}</small>{signal?.sourceUrl && <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Provider record ↗', '來源紀錄 ↗')}</a>}</article>; })}</section>
    <section className="regime-section-head"><div><p className="regime-kicker">{t('EVIDENCE TIMELINE', '證據時間軸')}</p><h2>{t('Verified source records', '已驗證來源紀錄')}</h2></div><button onClick={() => navigate('events')}>{t('Open all events →', '開啟所有事件 →')}</button></section>
    <section className="regime-timeline">{events.length ? events.map(item => <button key={item.id} className="regime-timeline-item" onClick={() => navigate('events')}><span className="regime-impact neutral">•</span><div><small>{item.publishedAt.slice(0, 10)} · {item.category}</small><b>{item.title}</b><em>{item.source}</em></div><span className="regime-arrow">→</span></button>) : <p className="event-empty">{t('No verified current events in this snapshot.', '此快照沒有近期已驗證事件。')}</p>}</section>
    <aside className="regime-detail-note"><div><b>{t('Interpretation limit', '解讀限制')}</b><p>{t('A moving-average ordering is a descriptive signal. It is not a valuation estimate, infrastructure delivery score, or investment recommendation. The backtest page reports only retrospective price-based outcomes.', '均線排序是描述性訊號，並非估值、基礎設施交付分數或投資建議。回測頁只顯示回溯的價格結果。')}</p></div><button onClick={() => navigate('backtest')}>{t('Inspect backtest →', '檢視回測 →')}</button></aside>
  </main>;
}
