import React, { useEffect, useState } from 'react';
import RegimeExperience from './RegimeExperience';
import ScenarioLab from './ScenarioLab';
import BacktestLab from './BacktestLab';
import InfrastructureRegionFocusPortal from './InfrastructureRegionFocusPortal';
import './ResearchExperience.css';

const currentHash = () => window.location.hash || '#overview';
const routeFromHash = hash => (String(hash).replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const go = route => { window.location.hash = route; window.scrollTo(0, 0); };

export default function ResearchExperience() {
  const [locationHash, setLocationHash] = useState(currentHash);
  const route = routeFromHash(locationHash);

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

  if (route === 'scenario') return <ScenarioLab onBack={() => go('regime')} />;
  if (route === 'backtest') return <BacktestLab onBack={() => go('regime')} />;

  return <>
    <RegimeExperience />
    <InfrastructureRegionFocusPortal locationHash={locationHash} />
    <div className="research-dock"><span>RESEARCH LAB</span><button onClick={() => go('scenario')}>Scenario analysis →</button><button onClick={() => go('backtest')}>Point-in-time backtest →</button></div>
  </>;
}
