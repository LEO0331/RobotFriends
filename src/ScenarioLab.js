import React, { useMemo, useState } from 'react';
import { runScenarioModel } from './scenarioModel';
import './ScenarioLab.css';

const initial = { region: 'All regions', powerDelayMonths: 0, availablePowerPctChange: 0, demandPctChange: 0, capexPctChange: 0, regulatoryPressureDelta: 0 };
const driverLabels = {
  powerDelay: 'Power delivery delay',
  availablePower: 'Available power',
  demand: 'AI / cloud demand',
  capex: 'Capacity CAPEX',
  regulation: 'Regulatory pressure',
};

function signed(value) { return `${value > 0 ? '+' : ''}${value}`; }

export default function ScenarioLab({ onBack }) {
  const [inputs, setInputs] = useState(initial);
  const [saveState, setSaveState] = useState('idle');
  const result = useMemo(() => runScenarioModel(inputs), [inputs]);
  const update = (key, value) => setInputs(current => ({ ...current, [key]: value }));
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
    <main className="scenario-shell">
      <header className="scenario-header">
        <button className="scenario-brand" onClick={onBack}><b>GRIDLINE</b><small>SCENARIO LAB</small></button>
        <div><span>{result.methodologyVersion}</span><button onClick={onBack}>← Back to regime</button></div>
      </header>
      <section className="scenario-hero">
        <div><p>DECISION SUPPORT / SENSITIVITY</p><h1>Stress the <em>physical thesis.</em></h1><span>Change power, timing, demand and policy assumptions. Gridline recomputes regime pressure and relative company sensitivity; it does not predict security prices.</span></div>
        <button onClick={() => setInputs(initial)}>Reset baseline</button>
      </section>
      <section className="scenario-workspace">
        <article className="scenario-controls">
          <div className="scenario-control"><label>Region</label><select value={inputs.region} onChange={e => update('region', e.target.value)}>{['All regions','Texas','Northern Virginia','Arizona','Ohio'].map(value => <option key={value}>{value}</option>)}</select></div>
          <Slider label="Power delivery delay" value={inputs.powerDelayMonths} min={0} max={24} suffix=" mo" onChange={value => update('powerDelayMonths', value)} />
          <Slider label="Available power" value={inputs.availablePowerPctChange} min={-30} max={30} suffix="%" signed onChange={value => update('availablePowerPctChange', value)} />
          <Slider label="AI / cloud demand" value={inputs.demandPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('demandPctChange', value)} />
          <Slider label="Capacity CAPEX" value={inputs.capexPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('capexPctChange', value)} />
          <Slider label="Regulatory pressure" value={inputs.regulatoryPressureDelta} min={-20} max={40} suffix=" pts" signed onChange={value => update('regulatoryPressureDelta', value)} />
        </article>
        <article className="scenario-results">
          <div className="scenario-score-grid">
            <Score title="Expansion" baseline={result.baseline.expansion} value={result.result.expansion} delta={result.result.expansionDelta} />
            <Score title="Pushback" baseline={result.baseline.pushback} value={result.result.pushback} delta={result.result.pushbackDelta} />
          </div>
          <h2>Driver contribution</h2>
          <div className="scenario-contributions">{Object.keys(driverLabels).map(key => <div key={key}><span>{driverLabels[key]}</span><b>Expansion {signed(result.contributions.expansion[key])}</b><b>Pushback {signed(result.contributions.pushback[key])}</b></div>)}</div>
          <h2>Relative company sensitivity</h2>
          <div className="scenario-companies">{result.companyImpact.map(item => <div key={item.ticker}><b>{item.ticker}</b><span className={item.riskDelta > 0 ? 'risk-up' : item.riskDelta < 0 ? 'risk-down' : ''}>{signed(item.riskDelta)} risk</span></div>)}</div>
          <div className="scenario-save"><button onClick={save}>Save scenario run</button><span>{saveState === 'saved' ? 'Saved to persistent API history.' : saveState === 'local' ? 'API unavailable — simulation remains local.' : saveState === 'saving' ? 'Saving…' : 'Scenario runs are auditable when the production API is connected.'}</span></div>
        </article>
      </section>
      <aside className="scenario-disclaimer"><b>Model boundary</b><span>This is deterministic sensitivity analysis. Company risk deltas express relative exposure to the entered infrastructure assumptions and are not price targets, return forecasts or investment advice.</span></aside>
    </main>
  );
}

function Slider({ label, value, min, max, suffix, signed: useSign, onChange }) {
  const display = `${useSign && value > 0 ? '+' : ''}${value}${suffix}`;
  return <div className="scenario-control"><label><span>{label}</span><b>{display}</b></label><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}/><small>{min}{suffix} <i/> {max > 0 ? '+' : ''}{max}{suffix}</small></div>;
}
function Score({ title, baseline, value, delta }) {
  return <div className="scenario-score"><span>{title}</span><strong>{value}</strong><small>Baseline {baseline} · {signed(delta)} pts</small><div><i style={{ width: `${value}%` }}/></div></div>;
}
