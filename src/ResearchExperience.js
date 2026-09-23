import React, { useEffect, useState } from 'react';
import RegimeExperience from './RegimeExperience';
import ScenarioLab from './ScenarioLab';
import BacktestLab from './BacktestLab';
import DataHealth from './DataHealth';
import { researchLabCopy } from './researchLabI18n';
import './ResearchExperience.css';

const LANGUAGE_KEY = 'gridline-language';
const currentHash = () => window.location.hash || '#overview';
const routeFromHash = hash => (String(hash).replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const go = route => { window.location.hash = route; window.scrollTo(0, 0); };
const readLanguage = () => {
  try { return window.localStorage.getItem(LANGUAGE_KEY) === 'zh-TW' ? 'zh-TW' : 'en'; }
  catch { return 'en'; }
};

export default function ResearchExperience() {
  const [locationHash, setLocationHash] = useState(currentHash);
  const [language, setLanguage] = useState(readLanguage);
  const route = routeFromHash(locationHash);
  const copy = researchLabCopy(language);
  const healthButton = language === 'zh-TW' ? '資料健康 →' : 'Data health →';

  const setResearchLanguage = next => {
    const normalized = next === 'zh-TW' ? 'zh-TW' : 'en';
    setLanguage(normalized);
    try { window.localStorage.setItem(LANGUAGE_KEY, normalized); } catch {}
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

  useEffect(() => {
    const syncLanguageFromDashboard = () => {
      const visibleApp = document.querySelector('main.shell[lang], main.regime-detail-shell[lang]');
      const next = visibleApp?.getAttribute('lang');
      if (next === 'en' || next === 'zh-TW') setResearchLanguage(next);
    };
    syncLanguageFromDashboard();
    const observer = new MutationObserver(syncLanguageFromDashboard);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, []);

  if (route === 'scenario') return <ScenarioLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('regime')} />;
  if (route === 'backtest') return <BacktestLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('regime')} />;
  if (route === 'health') return <DataHealth language={language} onLanguageChange={setResearchLanguage} onBack={() => go('regime')} />;

  return <>
    <RegimeExperience />
    <div className="research-dock"><span>{copy.dockLabel}</span><button onClick={() => go('scenario')}>{copy.scenarioButton}</button><button onClick={() => go('backtest')}>{copy.backtestButton}</button><button className="ops" onClick={() => go('health')}>{healthButton}</button></div>
  </>;
}
