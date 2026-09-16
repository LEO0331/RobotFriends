import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { PIPELINE_STAGES, REGION_FOCUS, REGION_NAMES, infrastructureLocation, regionHash, securedPercent } from './regionFocusModel';
import './InfrastructureRegionFocus.css';

function navigateRegion(region) {
  const nextHash = regionHash(region);
  window.history.pushState({}, '', `${window.location.pathname}${window.location.search}#${nextHash}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function RegionSwitcher({ selectedRegion, zh }) {
  const choices = ['All regions', ...REGION_NAMES];
  return (
    <div className="region-focus-switcher" aria-label={zh ? '選擇基礎設施區域' : 'Select infrastructure region'}>
      <span>{zh ? '區域焦點' : 'REGION FOCUS'}</span>
      <div>
        {choices.map(name => {
          const region = REGION_FOCUS[name];
          const label = name === 'All regions' ? (zh ? '全部' : 'All') : (zh ? region.nameZh : name);
          return (
            <button
              key={name}
              type="button"
              className={selectedRegion === name ? 'active' : ''}
              aria-pressed={selectedRegion === name}
              onClick={() => navigateRegion(name)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RegionalMap({ focus, selectedRegion, zh }) {
  return (
    <div className="regional-focus-map" aria-label={zh ? `${focus.nameZh} 區域焦點圖` : `${focus.name} regional focus map`}>
      <div className="regional-map-grid" />
      <div className="regional-us-shape" />
      <div className="regional-route route-one" />
      <div className="regional-route route-two" />
      {REGION_NAMES.map(name => {
        const item = REGION_FOCUS[name];
        const active = name === selectedRegion;
        return (
          <button
            type="button"
            key={name}
            className={`regional-map-marker ${active ? `active ${item.tone}` : 'muted'}`}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            aria-label={`${zh ? '切換至' : 'Switch to'} ${zh ? item.nameZh : name}`}
            aria-pressed={active}
            onClick={() => navigateRegion(name)}
          >
            <i />
            <span>{zh ? item.nameZh : name}</span>
          </button>
        );
      })}
      <div className="regional-map-caption">
        <span>{zh ? '國家脈絡' : 'NATIONAL CONTEXT'}</span>
        <b>{zh ? '其他樞紐保留淡化顯示' : 'Other tracked hubs remain dimmed'}</b>
      </div>
    </div>
  );
}

function RegionalTimeline({ focus, zh }) {
  return (
    <div className="regional-stage-timeline">
      <div className="regional-stage-line" />
      {PIPELINE_STAGES.map((stage, index) => {
        const status = index < focus.stageIndex ? 'complete' : index === focus.stageIndex ? 'current' : 'future';
        return (
          <div key={stage.key} className={`regional-stage ${status}`}>
            <i />
            <span>{zh ? stage.labelZh : stage.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RegionalFocusOverlay({ focus, selectedRegion, zh }) {
  const secured = securedPercent(focus);
  const stage = PIPELINE_STAGES[focus.stageIndex];
  return (
    <div className="regional-focus-overlay">
      <div className="regional-focus-main">
        <div className="regional-focus-heading">
          <div>
            <span>{zh ? '區域焦點 / 精選示範脈絡' : 'REGIONAL FOCUS / CURATED DEMO CONTEXT'}</span>
            <h4>{zh ? focus.nameZh : focus.name} <em>/ {focus.grid}</em></h4>
          </div>
          <div className={`regional-friction ${focus.friction > 60 ? 'high' : 'normal'}`}>
            <small>{zh ? '阻力' : 'PUSHBACK'}</small>
            <b>{focus.friction}</b><span>/100</span>
          </div>
        </div>
        <RegionalMap focus={focus} selectedRegion={selectedRegion} zh={zh} />
      </div>

      <aside className="regional-focus-insight">
        <div className="regional-focus-stage">
          <span>{zh ? '目前階段' : 'CURRENT STAGE'}</span>
          <b>{zh ? stage.labelZh : stage.label}</b>
        </div>
        <div className="regional-secured-row">
          <div><span>{zh ? '已確保供電 / 規劃容量' : 'POWER SECURED / PLANNED'}</span><b>{focus.secured.toFixed(1)} / {focus.planned.toFixed(1)} GW</b></div>
          <strong>{secured}%</strong>
        </div>
        <div className="regional-secured-track"><i style={{ width: `${secured}%` }} /></div>
        <dl>
          <div><dt>{zh ? '主要限制' : 'TOP CONSTRAINT'}</dt><dd>{zh ? focus.constraintZh : focus.constraint}</dd></div>
          <div><dt>{zh ? '下一個觀察點' : 'NEXT MILESTONE'}</dt><dd>{zh ? focus.milestoneZh : focus.milestone}</dd></div>
        </dl>
        <div className="regional-read">
          <span>{zh ? '區域判讀' : 'REGIONAL READ'}</span>
          <p>{zh ? focus.insightZh : focus.insight}</p>
        </div>
      </aside>

      <div className="regional-focus-timeline-wrap">
        <span>{zh ? '從場址到上線' : 'FROM SITE TO SCALE'}</span>
        <RegionalTimeline focus={focus} zh={zh} />
      </div>
    </div>
  );
}

export default function InfrastructureRegionFocusPortal({ locationHash = window.location.hash }) {
  const location = useMemo(() => infrastructureLocation(locationHash), [locationHash]);
  const [mapTarget, setMapTarget] = useState(null);
  const [panelTarget, setPanelTarget] = useState(null);

  useEffect(() => {
    if (!location.isInfrastructure) {
      setMapTarget(null);
      setPanelTarget(null);
      return undefined;
    }

    const root = document.getElementById('root');
    const resolveTargets = () => {
      const map = document.querySelector('.map-panel .usa-map');
      const panel = document.querySelector('.map-panel');
      if (map) setMapTarget(map);
      if (panel) setPanelTarget(panel);
    };
    resolveTargets();
    if (!root) return undefined;
    const observer = new MutationObserver(resolveTargets);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.isInfrastructure, locationHash]);

  useEffect(() => {
    if (!mapTarget) return undefined;
    const active = location.region !== 'All regions' && Boolean(REGION_FOCUS[location.region]);
    mapTarget.classList.toggle('regional-focus-active', active);
    return () => mapTarget.classList.remove('regional-focus-active');
  }, [mapTarget, location.region]);

  if (!location.isInfrastructure) return null;

  const shellLanguage = document.querySelector('main.shell')?.getAttribute('lang') || 'en';
  const zh = shellLanguage === 'zh-TW';
  const focus = REGION_FOCUS[location.region];

  return (
    <>
      {mapTarget && focus && ReactDOM.createPortal(
        <RegionalFocusOverlay focus={focus} selectedRegion={location.region} zh={zh} />,
        mapTarget,
      )}
      {panelTarget && ReactDOM.createPortal(
        <RegionSwitcher selectedRegion={location.region} zh={zh} />,
        panelTarget,
      )}
    </>
  );
}
