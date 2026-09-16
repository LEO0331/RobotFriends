import React, { useMemo, useState } from 'react';
import { runScenarioModel } from './scenarioModel';
import { researchLabCopy } from './researchLabI18n';
import './ScenarioLab.css';

const initial = { region: 'All regions', powerDelayMonths: 0, availablePowerPctChange: 0, demandPctChange: 0, capexPctChange: 0, regulatoryPressureDelta: 0 };
const driverKeys = ['powerDelay', 'availablePower', 'demand', 'capex', 'regulation'];

function signed(value) { return `${value > 0 ? '+' : ''}${value}`; }

export default function ScenarioLab({ onBack, language = 'en', onLanguageChange = () => {} }) {
  const [inputs, setInputs] = useState(initial);
  const [saveState, setSaveState] = useState('idle');
  const result = useMemo(() => runScenarioModel(inputs), [inputs]);
  const copy = researchLabCopy(language);
  const s = copy.scenario;
  const update = (key, value) => setInputs(current => ({ ...current, [key]: value }));
  const regionLabel = value => value === 'All regions' ? s.allRegions : value === 'Northern Virginia' ? s.northernVirginia : value;
  const driverLabel = key => ({ powerDelay: s.powerDelay, availablePower: s.availablePower, demand: s.demand, capex: s.capex, regulation: s.regulation })[key];
  const save = async () => {
    setSaveState('saving');
    try {
      const response = await fetch('/api/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputs) });
      if (!response.ok) throw new Error('API unavailable');
      setSaveState('saved');
    } catch {
      setSaveState('local');
    }
  };
  return (
    <main className="scenario-shell" lang={language}>
      <header className="scenario-header">
        <button className="scenario-brand" onClick={onBack}><b>GRIDLINE</b><small>{s.lab}</small></button>
        <div><span>{result.methodologyVersion}</span><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{copy.languageToggle}</button><button onClick={onBack}>{s.back}</button></div>
      </header>
      <section className="scenario-hero">
        <div><p>{s.kicker}</p><h1>{s.titleLead} <em>{s.titleEmphasis}</em></h1><span>{s.intro}</span></div>
        <button onClick={() => setInputs(initial)}>{s.reset}</button>
      </section>
      <section className="scenario-workspace">
        <article className="scenario-controls">
          <div className="scenario-control"><label>{s.region}</label><select value={inputs.region} onChange={e => update('region', e.target.value)}>{['All regions','Texas','Northern Virginia','Arizona','Ohio'].map(value => <option key={value} value={value}>{regionLabel(value)}</option>)}</select></div>
          <Slider label={s.powerDelay} value={inputs.powerDelayMonths} min={0} max={24} suffix={s.monthsSuffix} onChange={value => update('powerDelayMonths', value)} />
          <Slider label={s.availablePower} value={inputs.availablePowerPctChange} min={-30} max={30} suffix="%" signed onChange={value => update('availablePowerPctChange', value)} />
          <Slider label={s.demand} value={inputs.demandPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('demandPctChange', value)} />
          <Slider label={s.capex} value={inputs.capexPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('capexPctChange', value)} />
          <Slider label={s.regulation} value={inputs.regulatoryPressureDelta} min={-20} max={40} suffix={s.pointsSuffix} signed onChange={value => update('regulatoryPressureDelta', value)} />
        </article>
        <article className="scenario-results">
          <div className="scenario-score-grid">
            <Score title={s.expansion} baseline={result.baseline.expansion} value={result.result.expansion} delta={result.result.expansionDelta} baselineLabel={s.baseline} />
            <Score title={s.pushback} baseline={result.baseline.pushback} value={result.result.pushback} delta={result.result.pushbackDelta} baselineLabel={s.baseline} />
          </div>
          <h2>{s.driverContribution}</h2>
          <div className="scenario-contributions">{driverKeys.map(key => <div key={key}><span>{driverLabel(key)}</span><b>{s.expansionWord} {signed(result.contributions.expansion[key])}</b><b>{s.pushbackWord} {signed(result.contributions.pushback[key])}</b></div>)}</div>
          <h2>{s.relativeSensitivity}</h2>
          <div className="scenario-companies">{result.companyImpact.map(item => <div key={item.ticker}><b>{item.ticker}</b><span className={item.riskDelta > 0 ? 'risk-up' : item.riskDelta < 0 ? 'risk-down' : ''}>{signed(item.riskDelta)} {s.risk}</span></div>)}</div>
          <div className="scenario-save"><button onClick={save}>{s.saveRun}</button><span>{saveState === 'saved' ? s.saved : saveState === 'local' ? s.local : saveState === 'saving' ? s.saving : s.auditable}</span></div>
        </article>
      </section>
      <aside className="scenario-disclaimer"><b>{s.boundaryTitle}</b><span>{s.boundary}</span></aside>
    </main>
  );
}

function Slider({ label, value, min, max, suffix, signed: useSign, onChange }) {
  const display = `${useSign && value > 0 ? '+' : ''}${value}${suffix}`;
  return <div className="scenario-control"><label><span>{label}</span><b>{display}</b></label><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}/><small>{min}{suffix} <i/> {max > 0 ? '+' : ''}{max}{suffix}</small></div>;
}
function Score({ title, baseline, value, delta, baselineLabel }) {
  return <div className="scenario-score"><span>{title}</span><strong>{value}</strong><small>{baselineLabel} {baseline} · {signed(delta)} pts</small><div><i style={{ width: `${value}%` }}/></div></div>;
}
