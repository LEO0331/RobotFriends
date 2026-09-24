import React, { lazy, Suspense, useEffect, useState } from 'react';
import RegimeExperience from './RegimeExperience';

const ScenarioLab = lazy(() => import('./ScenarioLab'));
const BacktestLab = lazy(() => import('./BacktestLab'));
const DataHealth = lazy(() => import('./DataHealth'));
import { researchLabCopy } from './researchLabI18n';
import { persistLanguage, readPreferredLanguage } from './i18n';
import './ResearchExperience.css';

const currentHash = () => window.location.hash || '#overview';
const routeFromHash = hash => (String(hash).replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const go = route => { window.location.hash = route; window.scrollTo(0, 0); };

function RouteFallback({ language }) {
  return <main className="research-route-loading" lang={language} role="status">
    {language === 'zh-TW' ? '正在載入研究工具…' : 'Loading research tool…'}
  </main>;
}

export default function ResearchExperience() {
  const [locationHash, setLocationHash] = useState(currentHash);
  const [language, setLanguage] = useState(readPreferredLanguage);
  const route = routeFromHash(locationHash);
  const copy = researchLabCopy(language);
  const healthButton = language === 'zh-TW' ? '資料狀態 →' : 'Data status →';

  const setResearchLanguage = next => {
    const normalized = persistLanguage(next);
    setLanguage(normalized);
  };

  useEffect(() => {
    const sync = () => setLocationHash(currentHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    const originalPushState = window.history.pushState;
    window.history.pushState = function patchedPushState(...args) { originalPushState.apply(this, args); sync(); };
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      window.history.pushState = originalPushState;
    };
  }, []);

  if (route === 'scenario') return <Suspense fallback={<RouteFallback language={language} />}><ScenarioLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} /></Suspense>;
  if (route === 'backtest') return <Suspense fallback={<RouteFallback language={language} />}><BacktestLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} /></Suspense>;
  if (route === 'health') return <Suspense fallback={<RouteFallback language={language} />}><DataHealth language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} /></Suspense>;

  return <>
    <RegimeExperience language={language} onLanguageChange={setResearchLanguage} />
    <div className="research-dock"><span>{copy.dockLabel}</span><button onClick={() => go('scenario')}>{copy.scenarioButton}</button><button onClick={() => go('backtest')}>{copy.backtestButton}</button><button className="ops" onClick={() => go('health')}>{healthButton}</button></div>
  </>;
}
