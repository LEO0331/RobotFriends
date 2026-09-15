import React, { useEffect, useState } from 'react';
import RegimeExperience from './RegimeExperience';
import ScenarioLab from './ScenarioLab';
import './ResearchExperience.css';

const routeFromHash = () => (window.location.hash.replace(/^#/, '').split('?')[0] || 'overview').toLowerCase();
const go = route => { window.location.hash = route; window.scrollTo(0, 0); };

export default function ResearchExperience() {
  const [route, setRoute] = useState(routeFromHash);
  useEffect(() => {
    const sync = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    const originalPushState = window.history.pushState;
    window.history.pushState = function patchedPushState(...args) { originalPushState.apply(this, args); sync(); };
    return () => { window.removeEventListener('hashchange', sync); window.removeEventListener('popstate', sync); window.history.pushState = originalPushState; };
  }, []);
  if (route === 'scenario') return <ScenarioLab onBack={() => go('regime')} />;
  return <><RegimeExperience /><div className="research-dock"><span>RESEARCH LAB</span><button onClick={() => go('scenario')}>Scenario analysis →</button></div></>;
}
