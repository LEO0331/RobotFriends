import React, { useMemo, useState } from 'react';
import { runScenarioModel, scenarioRegions } from './scenarioModel';
import { researchLabCopy } from './researchLabI18n';
import './ScenarioLab.css';

const initial = { region: 'All regions', powerDelayMonths: 0, availablePowerPctChange: 0, demandPctChange: 0, capexPctChange: 0, regulatoryPressureDelta: 0 };
function signed(value) { return `${value > 0 ? '+' : ''}${value}`; }

export default function ScenarioLab({ onBack, language = 'en', onLanguageChange = () => {} }) {
  const [inputs, setInputs] = useState(initial);
  const [saveState, setSaveState] = useState('idle');
  const result = useMemo(() => runScenarioModel(inputs), [inputs]);
  const copy = researchLabCopy(language);
  const s = copy.scenario;
  const w = language === 'zh-TW' ? {
    intro: '輸入供電、時程、需求及政策的假設。本頁只記錄假設；目前沒有已校準且有來源支持的分數或公司敏感度模型。',
    reset: '重設假設',
    title: '目前輸入的假設',
    note: '以下數值由你輸入，並非實際觀測資料。沒有可驗證的係數或基準值，因此不計算擴張、阻力或個股風險分數。',
    boundary: '情境假設不代表預測、投資建議或個股排名。請查閱具日期及原始來源的資料，再作投資判斷。',
    save: '儲存假設',
    saved: '假設已儲存至 API 歷史紀錄。',
    auditable: '連接正式 API 後，可保存假設供日後查閱。',
    local: 'API 無法使用 — 假設未儲存至伺服器。',
  } : {
    intro: 'Enter assumptions about power, timing, demand and policy. This worksheet records your inputs; no sourced, calibrated score or company sensitivity model is available.',
    reset: 'Reset assumptions',
    title: 'Entered assumptions',
    note: 'These are your hypothetical inputs, not observed data. Expansion, pushback and company risk scores are unavailable because no validated baseline or coefficients support them.',
    boundary: 'Scenario assumptions are not forecasts, investment advice or company rankings. Check dated primary-source records before making investment decisions.',
    save: 'Save assumptions',
    saved: 'Assumptions saved to API history.',
    auditable: 'Connect the production API to retain assumptions for later review.',
    local: 'API unavailable — assumptions were not saved to the server.',
  };
  const update = (key, value) => setInputs(current => ({ ...current, [key]: value }));
  const regionLabel = value => s.regionLabels[value] || value;
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
        <div><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{copy.languageToggle}</button><button onClick={onBack}>{s.back}</button></div>
      </header>
      <section className="scenario-hero">
        <div><p>{s.kicker}</p><h1>{s.titleLead} <em>{s.titleEmphasis}</em></h1><span>{w.intro}</span></div>
        <button onClick={() => setInputs(initial)}>{w.reset}</button>
      </section>
      <section className="scenario-workspace">
        <article className="scenario-controls">
          <div className="scenario-control"><label>{s.region}</label><select value={inputs.region} onChange={e => update('region', e.target.value)}>{scenarioRegions.map(value => <option key={value} value={value}>{regionLabel(value)}</option>)}</select></div>
          <Slider label={s.powerDelay} value={inputs.powerDelayMonths} min={0} max={24} suffix={s.monthsSuffix} onChange={value => update('powerDelayMonths', value)} />
          <Slider label={s.availablePower} value={inputs.availablePowerPctChange} min={-30} max={30} suffix="%" signed onChange={value => update('availablePowerPctChange', value)} />
          <Slider label={s.demand} value={inputs.demandPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('demandPctChange', value)} />
          <Slider label={s.capex} value={inputs.capexPctChange} min={-20} max={30} suffix="%" signed onChange={value => update('capexPctChange', value)} />
          <Slider label={s.regulation} value={inputs.regulatoryPressureDelta} min={-20} max={40} suffix={s.pointsSuffix} signed onChange={value => update('regulatoryPressureDelta', value)} />
        </article>
        <article className="scenario-results">
          <h2>{w.title}</h2>
          <p>{w.note}</p>
          <div className="scenario-contributions">
            {[
              [s.region, regionLabel(result.input.region)],
              [s.powerDelay, `${result.input.powerDelayMonths}${s.monthsSuffix}`],
              [s.availablePower, `${signed(result.input.availablePowerPctChange)}%`],
              [s.demand, `${signed(result.input.demandPctChange)}%`],
              [s.capex, `${signed(result.input.capexPctChange)}%`],
              [s.regulation, `${signed(result.input.regulatoryPressureDelta)}${s.pointsSuffix}`],
            ].map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}
          </div>
          <div className="scenario-save"><button onClick={save}>{w.save}</button><span>{saveState === 'saved' ? w.saved : saveState === 'local' ? w.local : saveState === 'saving' ? s.saving : w.auditable}</span></div>
        </article>
      </section>
      <aside className="scenario-disclaimer"><b>{s.boundaryTitle}</b><span>{w.boundary}</span></aside>
    </main>
  );
}

function Slider({ label, value, min, max, suffix, signed: useSign, onChange }) {
  const display = `${useSign && value > 0 ? '+' : ''}${value}${suffix}`;
  return <div className="scenario-control"><label><span>{label}</span><b>{display}</b></label><input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}/><small>{min}{suffix} <i/> {max > 0 ? '+' : ''}{max}{suffix}</small></div>;
}
