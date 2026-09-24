import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import Account from '../Components/Account';
import companyList from '../data/companyExposure.json';
import { summarizeSnapshot } from '../snapshotMeta';
import { CURRENT_EVENT_DAYS, EVENT_TYPES, infrastructureEvents } from '../eventModel';
import { formatUsd, marketSignals } from '../marketSignals';
import { SIGNAL_LENSES, signalLens } from '../signalLenses';

const REGIONS = [
  { name: 'Northern Virginia', grid: 'PJM', x: 63, y: 31 },
  { name: 'Texas', grid: 'ERCOT', x: 34, y: 64 },
  { name: 'Arizona', grid: 'WECC', x: 19, y: 58 },
  { name: 'Ohio', grid: 'PJM', x: 55, y: 43 },
];
const ALL = 'All regions';
const ALL_EVIDENCE = 'All evidence';
const routes = { overview: 'Overview', infrastructure: 'Infrastructure', events: 'Events', methodology: 'Methodology' };
const readRoute = () => {
  const [view, query = ''] = window.location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  return {
    view: routes[view] || 'Overview',
    region: [ALL, ...REGIONS.map(item => item.name)].includes(params.get('region')) ? params.get('region') : ALL,
    filter: EVENT_TYPES.includes(params.get('filter')) ? params.get('filter') : ALL_EVIDENCE,
  };
};
const dateLabel = value => value ? String(value).slice(0, 10) : '—';
const percent = value => Number.isFinite(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%` : '—';
const trendLabel = (trend, zh) => ({
  above: zh ? '價格與 MA5 高於 MA10' : 'Close > MA5 > MA10',
  below: zh ? '價格與 MA5 低於 MA10' : 'Close < MA5 < MA10',
  mixed: zh ? '均線訊號混合' : 'Mixed MA signal',
  unavailable: zh ? '資料不足' : 'Insufficient history',
})[trend || 'unavailable'];

export default function App({ snapshot = {} }) {
  const [route, setRoute] = useState(readRoute);
  const [ticker, setTicker] = useState(companyList[0]?.ticker || 'NBIS');
  const [lensId, setLensId] = useState('momentum');
  const [language, setLanguage] = useState('en');
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  const events = useMemo(() => infrastructureEvents(snapshot), [snapshot]);
  const currentEvents = events.filter(item => !item.archived);
  const market = useMemo(() => Object.fromEntries(companyList.map(company => [company.ticker, marketSignals(snapshot, company.ticker)])), [snapshot]);
  const selected = market[ticker];
  const lens = signalLens(snapshot, ticker, lensId);
  const snapshotMeta = summarizeSnapshot(snapshot, language);
  const eventHealth = snapshot.sourceHealth?.events;
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  const eventCheckStale = Boolean(eventHealth?.coverageThrough && eventHealth.coverageThrough < yesterday);

  const navigate = (view, options = {}) => {
    const region = options.region || (view === 'Infrastructure' || view === 'Events' ? route.region : ALL);
    const filter = options.filter || (view === 'Events' ? route.filter : ALL_EVIDENCE);
    const params = new URLSearchParams();
    if (region !== ALL) params.set('region', region);
    if (filter !== ALL_EVIDENCE) params.set('filter', filter);
    window.history.pushState({}, '', `${window.location.pathname}${window.location.search}#${view.toLowerCase()}${params.size ? `?${params}` : ''}`);
    setRoute({ view, region, filter });
  };
  useEffect(() => {
    const sync = () => setRoute(readRoute());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
  }, []);

  const eventStatus = !eventHealth ? t('Event feed not checked', '事件來源尚未檢查')
    : eventCheckStale ? t('Event check is stale', '事件檢查已過期')
      : eventHealth.status === 'partial' ? t('Curated records checked', '人工候選紀錄已檢查')
        : eventHealth.status === 'ok' ? t('Event feed checked', '事件來源已檢查')
          : t('Event source check needed', '事件來源需檢查');
  return <main className="shell" lang={language}>
    <header>
      <button className="brand" onClick={() => navigate('Overview')} aria-label={t('Return to overview', '返回總覽')}><i>◫</i><span><b>GRIDLINE</b><small>{t('INFRASTRUCTURE INTELLIGENCE', '基礎設施情報')}</small></span></button>
      <nav>{Object.values(routes).map(view => <button key={view} onClick={() => navigate(view)} className={route.view === view ? 'current' : ''}>{t(view, { Overview: '總覽', Infrastructure: '基礎設施', Events: '事件', Methodology: '方法論' }[view])}</button>)}</nav>
      <div className="head-actions"><button className="language" onClick={() => setLanguage(zh ? 'en' : 'zh-TW')}>{zh ? 'EN' : '繁中'}</button><span className={`live ${route.view === 'Events' ? eventHealth?.status || 'pending' : snapshotMeta.generatedAt ? 'live' : 'pending'}`}>{route.view === 'Events' ? eventStatus : snapshotMeta.generatedAt ? t(`Snapshot ${dateLabel(snapshotMeta.generatedAt)}`, `快照 ${dateLabel(snapshotMeta.generatedAt)}`) : t('Snapshot loading', '快照載入中')}</span><Account language={language} weight={100} onPreferences={prefs => { if (['en', 'zh-TW'].includes(prefs.language)) setLanguage(prefs.language); }} /></div>
    </header>

    {route.view === 'Overview' && <>
      <section className="hero"><div><p className="eyebrow">{t('OBSERVED MARKET DATA / VERIFIED EVENT RECORDS', '市場觀察資料 / 已驗證事件紀錄')}</p><h1>{t('Source-backed signals,', '有來源的訊號，')}<br/><em>{t('with visible limits.', '及清楚的限制。')}</em></h1><p className="copy">{t('Prices and moving averages use dated provider observations. Infrastructure claims appear only when a specific primary record passes validation.', '價格與移動平均線使用有日期的來源觀察值；基礎設施主張只在特定一級來源通過驗證後顯示。')}</p></div><div className="asof"><span>{t('SNAPSHOT GENERATED · LOCAL TIME', '快照產生時間 · 本地時間')}</span><b>{snapshotMeta.generatedLabel}</b><small>{snapshotMeta.totalSources ? t(`${snapshotMeta.healthySources}/${snapshotMeta.totalSources} sources refreshed · ${snapshotMeta.freshness}`, `${snapshotMeta.healthySources}/${snapshotMeta.totalSources} 個來源已更新 · ${snapshotMeta.freshness}`) : t('Provider status unavailable', '來源狀態未提供')}</small></div></section>
      <section className="lens-picker" aria-label={t('Select signal lens', '選擇訊號視角')}>
        {SIGNAL_LENSES.map(option => <button key={option.id} onClick={() => setLensId(option.id)} className={lensId === option.id ? 'active-filter' : ''}>{zh ? option.nameZh : option.name}</button>)}
      </section>
      <section className="regime"><div className="regime-name"><div><p className="eyebrow">{t('SELECTED RESEARCH LENS', '所選研究視角')}</p><h2>{lens.label}</h2><p>{lens.method}</p><small>{t('Scope', '範圍')}: {lens.scope} · {t('Source date', '來源日期')}: {dateLabel(lens.observedAt)}</small></div></div><div className="regime-buttons"><select aria-label={t('Company', '公司')} value={ticker} onChange={event => setTicker(event.target.value)}>{companyList.map(company => <option key={company.ticker} value={company.ticker}>{company.ticker}</option>)}</select>{lens.sourceUrl ? <a className="primary" href={lens.sourceUrl} target="_blank" rel="noopener noreferrer">{lens.sourceLabel ? `${lens.sourceLabel} ↗` : t('Original source ↗', '原始來源 ↗')}</a> : <span>{t('Source unavailable', '來源未提供')}</span>}{lens.additionalSourceUrl && <a className="text" href={lens.additionalSourceUrl} target="_blank" rel="noopener noreferrer">{t('Comparison source ↗', '比較期來源 ↗')}</a>}</div></section>
      <section className="section"><div><p className="eyebrow">{t('VERIFIED EVENT RECORDS', '已驗證事件紀錄')}</p><h3>{t('What sources currently support', '目前有來源支持的事件')}</h3></div><button className="text" onClick={() => navigate('Events')}>{t('View events →', '查看事件 →')}</button></section>
      <section className="drivers">{EVENT_TYPES.map(type => <article key={type}><p className="label">{type}</p><strong>{currentEvents.filter(item => item.category === type).length}</strong><small>{t('current verified records', '筆近期已驗證紀錄')}</small></article>)}</section>
      <section className="section company-title"><div><p className="eyebrow">{t('TRACKED MARKET PRICES', '追蹤市場價格')}</p><h3>{t('Latest dated closes', '最近有日期的收盤價')}</h3></div></section>
      <section className="companies">{companyList.map(company => { const data = market[company.ticker]; return <button key={company.ticker} className={`company ${ticker === company.ticker ? 'selected-card' : ''}`} onClick={() => setTicker(company.ticker)}><div className="company-top"><div><b>{company.ticker}</b><small>{company.name}</small></div><span className={data?.changePercent < 0 ? 'negative' : 'positive'}>{percent(data?.changePercent)}</span></div><strong className="price">{formatUsd(data?.close)}</strong><div className="stat"><span>{t('OBSERVED', '觀察日期')}<b>{dateLabel(data?.observedAt)}</b></span><span>{t('TREND', '趨勢')}<b>{trendLabel(data?.trend, zh)}</b></span></div><div className="gap"><span>{t('SOURCE', '來源')}</span><b>{data?.provider || t('Unavailable', '未提供')}</b></div></button>; })}</section>
      <section className="bottom"><article className="thesis"><div className="panel-title"><div><p className="eyebrow">{t('SELECTED PRICE SIGNAL', '所選價格訊號')}</p><h3>{ticker} · {dateLabel(selected?.observedAt)}</h3></div></div><div className="thesis-content"><div><h4>{trendLabel(selected?.trend, zh)}</h4><p>{t('MA5 and MA10 are simple arithmetic averages of the last 5 and 10 observed trading closes. Uptrend requires close > MA5 > MA10; downtrend reverses that order. All other complete cases are mixed.', 'MA5 和 MA10 是最近 5 筆與 10 筆交易收盤價的算術平均。上行需收盤價 > MA5 > MA10；下行順序相反；其餘資料完整情況為混合訊號。')}</p>{selected?.sourceUrl && <a className="text" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">{t('Open provider record ↗', '開啟來源紀錄 ↗')}</a>}</div></div><div className="signals"><span>MA5 <b>{formatUsd(selected?.ma5)}</b></span><span>MA10 <b>{formatUsd(selected?.ma10)}</b></span><span>{t('OBSERVATIONS', '觀察筆數')} <b>{selected?.sampleSize ?? '—'}</b></span></div></article><article className="ledger"><div className="panel-title"><div><p className="eyebrow">{t('EVENT LEDGER', '事件帳本')}</p><h3>{t('Recent verified records', '近期已驗證紀錄')}</h3></div></div>{currentEvents.length ? currentEvents.slice(0, 4).map(item => <div className="event" key={item.id}><span className="impact neutral">•</span><div><p><b>{item.category}</b> · {dateLabel(item.publishedAt)}</p><h4>{item.title}</h4><small>{item.region} · {item.source}</small></div><a className="quality" href={item.url} target="_blank" rel="noopener noreferrer">{t('RECORD ↗', '紀錄 ↗')}</a></div>) : <p className="event-empty">{t('No verified current events in this snapshot.', '此快照沒有近期已驗證事件。')}</p>}</article></section>
    </>}

    {route.view === 'Infrastructure' && <InfrastructureView region={route.region} events={events} navigate={navigate} zh={zh} />}
    {route.view === 'Events' && <EventsView events={events} health={eventHealth} region={route.region} filter={route.filter} navigate={navigate} zh={zh} />}
    {route.view === 'Methodology' && <MethodologyView zh={zh} />}
    <footer><span>{t('Dated observations and explicit assumptions · No investment recommendation', '有日期的觀察資料與明示假設 · 非投資建議')}</span><span>{t('Inspect each source and calculation before use.', '使用前請檢視每項來源與計算。')}</span></footer>
  </main>;
}

function InfrastructureView({ region, events, navigate, zh }) {
  const t = (en, tw) => zh ? tw : en;
  const selected = REGIONS.find(item => item.name === region);
  const records = events.filter(item => region === ALL || item.region === region);
  return <section className="view-page"><p className="eyebrow">{t('INFRASTRUCTURE / VERIFIED REGIONAL RECORDS', '基礎設施 / 已驗證區域紀錄')}</p><h1>{t('Where a source', '有來源的地點，')}<br/><em>{t('identifies a change.', '才顯示變化。')}</em></h1><p className="copy">{t('Planned MW, secured power, project stage and friction scores are unavailable until each value has a dated primary record. Map markers are geographic navigation only.', '規劃容量、已確保供電、專案階段與阻力分數在有具日期的一級來源前均不顯示；地圖標記僅供地理導覽。')}</p><div className="infrastructure-grid"><article className="map-panel"><div className="panel-title"><div><p className="eyebrow">{t('REGION NAVIGATION', '區域導覽')}</p><h3>{t('Tracked locations', '追蹤地點')}</h3></div><button className="text reset-regions" onClick={() => navigate('Infrastructure', { region: ALL })}>{t('All regions', '所有區域')}</button></div><div className="usa-map">{REGIONS.map(item => <button key={item.name} aria-label={`${t('Select', '選擇')} ${item.name}`} onClick={() => navigate('Infrastructure', { region: item.name })} className={`map-dot ${region === item.name ? 'active-dot' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}><i /><span>{item.name}</span></button>)}</div></article><article className="region-detail"><p className="eyebrow">{t('SELECTED REGION', '所選區域')}</p><h2>{selected ? selected.name : t('All regions', '所有區域')} <em>/ {selected?.grid || 'US'}</em></h2><p>{t('Verified source records in the selected geography.', '所選地區通過驗證的來源紀錄。')}</p><div className="metric-stack"><div><span>{t('CURRENT RECORDS', '近期紀錄')}</span><b>{records.filter(item => !item.archived).length}</b></div><div><span>{t('ARCHIVED RECORDS', '封存紀錄')}</span><b>{records.filter(item => item.archived).length}</b></div></div><button className="primary" onClick={() => navigate('Events', { region })}>{t('Inspect regional records →', '檢視區域紀錄 →')}</button></article></div></section>;
}

function EventsView({ events, health, region, filter, navigate, zh }) {
  const [archive, setArchive] = useState(false);
  const t = (en, tw) => zh ? tw : en;
  const list = events.filter(item => (archive ? item.archived : !item.archived) && (region === ALL || item.region === region) && (filter === ALL_EVIDENCE || item.category === filter));
  return <section className="view-page"><p className="eyebrow">{t('EVENTS / VERIFIED PRIMARY RECORDS', '事件 / 已驗證一級來源')}</p><h1>{t('Infrastructure events', '基礎設施事件')}<br/><em>{t('linked to original records.', '連結原始紀錄。')}</em></h1><p className="copy">{t(`Current means published within ${CURRENT_EVENT_DAYS} days. Archive retains older validated records; neither status means human review.`, `近期表示發布於 ${CURRENT_EVENT_DAYS} 天內；封存保留較舊的驗證紀錄；兩者均非人工審核狀態。`)}</p><p className="copy">{health ? t(`Event check: ${dateLabel(health.checkedAt)} · ${health.status}${health.coverageThrough ? ` · curated coverage through ${health.coverageThrough}` : ''}. ${health.message || ''}`, `事件檢查：${dateLabel(health.checkedAt)} · ${health.status}${health.coverageThrough ? ` · 人工候選涵蓋至 ${health.coverageThrough}` : ''}。${health.message || ''}`) : t('No event-source check is recorded in this snapshot.', '此快照沒有事件來源檢查紀錄。')}</p><div className="event-toolbar"><div><button onClick={() => setArchive(false)} className={!archive ? 'active-filter' : ''}>{t('Current', '近期')}</button><button onClick={() => setArchive(true)} className={archive ? 'active-filter' : ''}>{t('Archive', '封存')}</button><button onClick={() => navigate('Events', { region, filter: ALL_EVIDENCE })} className={filter === ALL_EVIDENCE ? 'active-filter' : ''}>{t('All categories', '所有類別')}</button>{EVENT_TYPES.map(type => <button key={type} onClick={() => navigate('Events', { region, filter: type })} className={filter === type ? 'active-filter' : ''}>{type}</button>)}</div><span>{list.length} {t('records', '筆紀錄')}</span></div>{health?.status === 'degraded' && <p className="event-source-warning">{t('Event refresh degraded; earlier verified records remain.', '事件更新失敗；先前已驗證紀錄仍保留。')}</p>}<div className="event-table">{list.length ? list.map(item => <article key={item.id}><span className="impact neutral">•</span><div><p className="eyebrow">{item.category} · {dateLabel(item.publishedAt)} · {item.region}</p><h3>{item.title}</h3>{item.summary && <p>{item.summary}</p>}</div><div className="event-meta"><b>{t('PRIMARY RECORD', '一級來源')}</b><span>{item.source}</span><a className="text" href={item.url} target="_blank" rel="noopener noreferrer">{t('View original record ↗', '查看原始紀錄 ↗')}</a></div></article>) : <p className="event-empty">{t('No matching verified records in this snapshot.', '此快照沒有符合條件的已驗證紀錄。')}</p>}</div></section>;
}

function MethodologyView({ zh }) {
  const t = (en, tw) => zh ? tw : en;
  return <section className="view-page methodology"><p className="eyebrow">{t('METHOD / NICHE RESEARCH LENSES', '方法 / 專題研究視角')}</p><h1>{t('Follow the buildout', '追蹤建設週期，')}<br/><em>{t('without market noise.', '減少市場雜訊。')}</em></h1><div className="method-grid"><article><span>01</span><h3>{t('Market momentum', '市場動能')}</h3><p>{t('Dated daily closes support an MA5/MA10 ordering. It describes price behavior and is backtested retrospectively; it does not prove why price moved.', '具日期的每日收盤價支持 MA5/MA10 排序。此為價格行為描述，可進行回溯回測，但不能證明價格變動原因。')}</p></article><article><span>02</span><h3>{t('Company execution', '公司執行')}</h3><p>{t('Use period-aware SEC revenue and diluted EPS facts with filing date and exact source link. A disclosure is shown without a growth verdict until comparable periods exist.', '使用保留期間、申報日期及精確來源網址的 SEC 營收與稀釋 EPS 資料。若無可比較期間，只顯示揭露，不判定成長。')}</p></article><article><span>03</span><h3>{t('Grid demand', '電網需求')}</h3><p>{t('EIA actual-demand series must be explicitly typed and compared across appropriate periods. Regional demand cannot establish data-center demand or secured power; this lens stays unavailable until valid history exists.', 'EIA 實際需求資料必須明確標示類型並跨適當期間比較。區域需求不能證明資料中心需求或已確保供電；有效歷史不足時此視角顯示無資料。')}</p></article><article><span>04</span><h3>{t('Project milestones', '專案里程碑')}</h3><p>{t('Specific permit, grid, or company records require an accessible primary page, publication date, matching title and supporting passage. We do not infer a numeric price impact.', '許可、電網或公司紀錄需有可存取的一級來源頁面、發布日期、相符標題及支持段落；不推測對股價的數值影響。')}</p></article></div><div className="method-note">{t('These lenses are separate evidence views, not a combined buy/sell score. Valuation percentiles, regional MW and fundamental ratings stay unavailable until sourced methods exist.', '這些是獨立的證據視角，不是合成的買賣分數。估值百分位、區域 MW 及基本面評級在有來源方法前均不顯示。')}</div></section>;
}
