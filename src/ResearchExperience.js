import React, { useEffect, useState } from 'react';
import RegimeExperience from './RegimeExperience';
import ScenarioLab from './ScenarioLab';
import BacktestLab from './BacktestLab';
import DataHealth from './DataHealth';
import { researchLabCopy } from './researchLabI18n';
import { persistLanguage, readPreferredLanguage } from './i18n';
import './ResearchExperience.css';

const currentHash = () => window.location.hash || '#overview';
const routeFromHash = hash => (String(hash).replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const go = route => { window.location.hash = route; window.scrollTo(0, 0); };

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

  if (route === 'scenario') return <ScenarioLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} />;
  if (route === 'backtest') return <BacktestLab language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} />;
  if (route === 'health') return <DataHealth language={language} onLanguageChange={setResearchLanguage} onBack={() => go('overview')} />;

  return <>
    <RegimeExperience language={language} onLanguageChange={setResearchLanguage} />
    <div className="research-dock"><span>{copy.dockLabel}</span><button onClick={() => go('scenario')}>{copy.scenarioButton}</button><button onClick={() => go('backtest')}>{copy.backtestButton}</button><button className="ops" onClick={() => go('health')}>{healthButton}</button></div>
  </>;
}
