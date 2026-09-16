import React, { useEffect, useState } from 'react';
import App from './Containers/App';
import ExposurePeriodPortal from './ExposurePeriodMonitor';
import './RegimeExperience.css';

const LANGUAGE_KEY = 'gridline-language';
const getRoute = () => (window.location.hash.replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const readStoredLanguage = () => {
  try { return window.localStorage.getItem(LANGUAGE_KEY) === 'zh-TW' ? 'zh-TW' : 'en'; }
  catch { return 'en'; }
};

const drivers = [
  { tone: 'amber', label: 'CAPACITY MOMENTUM', value: '+1.2 GW', detail: 'New power capacity secured', weight: '35% expansion weight' },
  { tone: 'blue', label: 'PROJECT VELOCITY', value: '+310 MW', detail: 'Approved this week', weight: '20% expansion weight' },
  { tone: 'coral', label: 'GRID FRICTION', value: '−800 MW', detail: 'Delivery delayed', weight: '25% pushback weight' },
  { tone: 'purple', label: 'REGULATORY PRESSURE', value: '2', detail: 'New restrictions proposed', weight: '20% pushback weight' },
];

const evidenceTimeline = [
  { age: '2d ago', type: 'CAPEX', title: 'OCI capacity investment guidance increased', region: 'All regions', filter: 'CAPEX', impact: '+' },
  { age: '1d ago', type: 'CONSTRAINT', title: '800 MW delivery schedule moves beyond 2028', region: 'Texas', filter: 'CONSTRAINT', impact: '−' },
  { age: '6h ago', type: 'PERMIT', title: '310 MW campus receives zoning approval in Virginia', region: 'Northern Virginia', filter: 'PERMIT', impact: '+' },
  { age: '2h ago', type: 'POWER', title: 'PJM load forecast revised higher through 2030', region: 'Northern Virginia', filter: 'POWER', impact: '+' },
];

const regionalPressure = [
  { name: 'Texas', grid: 'ERCOT', friction: 71, planned: '3.2 GW', note: 'Delivery timing revised' },
  { name: 'Northern Virginia', grid: 'PJM', friction: 62, planned: '2.4 GW', note: 'Transmission queue pressure' },
  { name: 'Arizona', grid: 'WECC', friction: 44, planned: '1.1 GW', note: 'Water review monitored' },
  { name: 'Ohio', grid: 'PJM', friction: 38, planned: '0.9 GW', note: 'Approvals progressing' },
];

function pushHash(hash, setRoute) {
  window.history.pushState({}, '', `${window.location.pathname}${window.location.search}#${hash}`);
  setRoute(getRoute());
  window.scrollTo(0, 0);
}

function RegimeExperience() {
  const [route, setRoute] = useState(getRoute);
  const [language, setLanguage] = useState(readStoredLanguage);
  const setPersistentLanguage = next => {
    const normalized = next === 'zh-TW' ? 'zh-TW' : 'en';
    setLanguage(normalized);
    try { window.localStorage.setItem(LANGUAGE_KEY, normalized); } catch {}
  };

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRoute());
      window.scrollTo(0, 0);
    };
    const onDocumentClick = event => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target ? target.closest('.regime-buttons .primary') : null;
      if (!button) return;
      const currentLanguage = document.querySelector('main.shell')?.getAttribute('lang');
      if (currentLanguage) setPersistentLanguage(currentLanguage);
      event.preventDefault();
      pushHash('regime', setRoute);
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick);
    };
  }, []);

  if (route === 'regime') {
    return (
      <RegimeDetail
        language={language}
        setLanguage={setPersistentLanguage}
        navigate={hash => pushHash(hash, setRoute)}
      />
    );
  }

  return <><App /><ExposurePeriodPortal /></>;
}

function RegimeDetail({ language, setLanguage, navigate }) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => (zh ? tw : en);

  return (
    <main className="regime-detail-shell" lang={language}>
      <header className="regime-detail-header">
        <button className="regime-brand" onClick={() => navigate('overview')} aria-label={t('Return to overview', '返回總覽')}>
          <span className="regime-brand-mark">◫</span>
          <span><b>GRIDLINE</b><small>{t('REGIME DETAIL', '週期詳情')}</small></span>
        </button>
        <div className="regime-detail-actions">
          <button onClick={() => setLanguage(zh ? 'en' : 'zh-TW')}>{zh ? 'EN' : '繁中'}</button>
          <button className="regime-back" onClick={() => navigate('overview')}>← {t('Back to overview', '返回總覽')}</button>
        </div>
      </header>

      <section className="regime-detail-hero">
        <div>
          <p className="regime-kicker">{t('REGIME / CURRENT STATE', '週期 / 目前狀態')}</p>
          <h1>{t('Expanding', '擴張中')}<br/><em>{t('— but constrained.', '— 但受限制。')}</em></h1>
          <p>{t('Demand remains durable while power delivery, interconnection timing and local constraints are becoming the limiting variables.', '需求仍具韌性，但供電交付、併網時程與地方限制正逐漸成為主要瓶頸。')}</p>
        </div>
        <div className="regime-status-card">
          <span>{t('SNAPSHOT', '快照')}</span>
          <b>SEP 15, 2026</b>
          <small>{t('Curated MVP / decision support', '精選 MVP / 決策輔助')}</small>
        </div>
      </section>

      <section className="regime-score-grid">
        <article className="regime-score-card expansion">
          <div><span>{t('EXPANSION INDEX', '擴張指數')}</span><strong>76</strong></div>
          <p><b>+5</b> {t('vs 30D', '較 30 日')}</p>
          <div className="regime-score-track"><i style={{ width: '76%' }} /></div>
          <small>{t('Capacity and project momentum remain constructive.', '容量與專案動能仍偏正向。')}</small>
        </article>
        <article className="regime-score-card pushback">
          <div><span>{t('PUSHBACK INDEX', '阻力指數')}</span><strong>58</strong></div>
          <p><b>+14</b> {t('vs 30D', '較 30 日')}</p>
          <div className="regime-score-track"><i style={{ width: '58%' }} /></div>
          <small>{t('Grid and delivery friction are rising faster than before.', '電網與交付摩擦上升速度較先前更快。')}</small>
        </article>
        <article className="regime-score-card confidence-card">
          <div><span>{t('DATA CONFIDENCE', '資料可信度')}</span><strong>86%</strong></div>
          <p>{t('Primary-source weighted', '一級來源加權')}</p>
          <div className="regime-score-track"><i style={{ width: '86%' }} /></div>
          <small>{t('Use Events to inspect the underlying records.', '可至事件頁檢視原始紀錄。')}</small>
        </article>
      </section>

      <section className="regime-section-head">
        <div><p className="regime-kicker">{t('SCORE DRIVERS', '分數驅動因素')}</p><h2>{t('Why the regime looks this way', '為什麼目前是這個週期狀態')}</h2></div>
        <button onClick={() => navigate('methodology')}>{t('View methodology →', '查看方法論 →')}</button>
      </section>
      <section className="regime-driver-grid">
        {drivers.map(driver => (
          <article key={driver.label} className={`regime-driver ${driver.tone}`}>
            <span>{driver.label}</span>
            <strong>{driver.value}</strong>
            <p>{driver.detail}</p>
            <small>{driver.weight}</small>
          </article>
        ))}
      </section>

      <section className="regime-section-head">
        <div><p className="regime-kicker">{t('EVIDENCE TIMELINE', '證據時間軸')}</p><h2>{t('What changed the picture', '哪些事件改變了情勢')}</h2></div>
        <button onClick={() => navigate('events?region=All%20regions&filter=All%20evidence')}>{t('Open all evidence →', '開啟所有證據 →')}</button>
      </section>
      <section className="regime-timeline">
        {evidenceTimeline.map(item => (
          <button
            key={`${item.age}-${item.type}`}
            className="regime-timeline-item"
            onClick={() => navigate(`events?region=${encodeURIComponent(item.region)}&filter=${encodeURIComponent(item.filter)}`)}
          >
            <span className={`regime-impact ${item.impact === '+' ? 'positive' : 'negative'}`}>{item.impact}</span>
            <div><small>{item.age} · {item.type}</small><b>{item.title}</b><em>{item.region}</em></div>
            <span className="regime-arrow">→</span>
          </button>
        ))}
      </section>

      <section className="regime-section-head">
        <div><p className="regime-kicker">{t('GEOGRAPHIC PRESSURE', '地理壓力')}</p><h2>{t('Where constraints are concentrated', '限制集中在哪些區域')}</h2></div>
        <button onClick={() => navigate('infrastructure')}>{t('Open infrastructure →', '開啟基礎設施 →')}</button>
      </section>
      <section className="regime-region-grid">
        {regionalPressure.map(item => (
          <button key={item.name} onClick={() => navigate(`infrastructure?region=${encodeURIComponent(item.name)}`)}>
            <div><span>{item.name}</span><small>{item.grid}</small></div>
            <strong className={item.friction > 60 ? 'high' : ''}>{item.friction}<em>/100</em></strong>
            <div className="regime-region-track"><i style={{ width: `${item.friction}%` }} /></div>
            <p>{item.planned} {t('planned', '規劃')} · {item.note}</p>
          </button>
        ))}
      </section>

      <aside className="regime-detail-note">
        <div><b>{t('How to read this page', '如何閱讀此頁')}</b><p>{t('Overview tells you what is happening. This view explains why. Infrastructure shows where it is happening, Events shows the supporting evidence, and Methodology explains how the scores are constructed.', '總覽告訴你發生了什麼；此頁解釋原因。基礎設施顯示發生在哪裡，事件頁提供佐證，而方法論則說明分數如何建立。')}</p></div>
        <button onClick={() => navigate('overview')}>{t('Return to overview', '返回總覽')} →</button>
      </aside>
    </main>
  );
}

export default RegimeExperience;
