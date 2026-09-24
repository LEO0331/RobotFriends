import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SIGNAL_METHOD_ID,
  SIGNAL_METHODS,
  evaluateSnapshotSignalMethod,
} from '../signals/registry';
import {
  signalFamilyLabel,
  signalMethodSettings,
  signalMetricLabel,
  signalStateLabel,
  signalStateSummary,
} from '../signals/presentation';
import { observationRecency, observationRecencyLabel } from '../freshness';
import './SignalExplainer.css';

const dateOnly = value => value ? String(value).slice(0, 10) : '—';

function copyFor(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    eyebrow: t('TECHNICAL SIGNAL', '技術訊號'),
    choose: t('Analysis method', '分析方法'),
    chooseNote: t(
      'Choose a common technical-analysis framework. Each method describes the same sourced price history from a different perspective.',
      '選擇常見的技術分析方法；各方法從不同角度描述同一份具來源的價格歷史。'
    ),
    about: t('About this signal →', '了解此訊號 →'),
    observed: t('Observed', '觀察日期'),
    evidence: t('Evidence', '證據'),
    recency: t('Recency', '資料時效'),
    closes: t('sourced closes', '筆具來源收盤價'),
    method: t('Method', '方法'),
    unavailable: t('Unavailable', '無資料'),
    drawerEyebrow: t('ABOUT THIS SIGNAL', '關於此訊號'),
    close: t('Close signal details', '關閉訊號說明'),
    whatItMeasures: t('What it measures', '衡量內容'),
    commonUse: t('Common use', '常見用途'),
    currentObservation: t('Current observation', '目前觀察'),
    methodSettings: t('Method settings', '方法設定'),
    dataEvidence: t('Data evidence', '資料證據'),
    provider: t('Provider', '資料來源'),
    observations: t('Available sourced closes', '可用具來源收盤價'),
    requirement: t('Minimum data requirement', '最低資料需求'),
    oneProvider: t('from one continuous provider segment', '且須來自同一連續資料來源區段'),
    source: t('Open price source ↗', '開啟價格來源 ↗'),
    limitations: t('Interpretation limits', '解讀限制'),
    boundary: t(
      'Technical indicators summarize historical price behavior. They are not forecasts, valuation measures, or investment recommendations.',
      '技術指標整理歷史價格行為，不代表預測、估值判斷或投資建議。'
    ),
  };
}

export default function SignalExplainer({
  snapshot,
  ticker,
  language = 'en',
  methodId = DEFAULT_SIGNAL_METHOD_ID,
  onMethodChange = () => {},
}) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef(null);
  const closeRef = useRef(null);
  const drawerRef = useRef(null);
  const copy = copyFor(language);
  const method = SIGNAL_METHODS.find(item => item.id === methodId) || SIGNAL_METHODS[0];
  const result = useMemo(
    () => evaluateSnapshotSignalMethod(method.id, snapshot, ticker),
    [method.id, snapshot, ticker]
  );
  const methodCopy = method.copy[language] || method.copy.en;
  const state = signalStateLabel(method.id, result.state, language);
  const summary = signalStateSummary(method.id, result, language);
  const metric = signalMetricLabel(method.id, result, language);
  const recency = observationRecency(result.observedAt, snapshot?.generatedAt);
  const recencyLabel = observationRecencyLabel(result.observedAt, snapshot?.generatedAt, language);
  const closeDrawer = () => {
    setOpen(false);
    openerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const handleDrawerKeys = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        openerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll('button, a[href]')]
        .filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDrawerKeys);
    return () => window.removeEventListener('keydown', handleDrawerKeys);
  }, [open]);

  return <>
    <article className="thesis signal-explainer-card">
      <div className="panel-title signal-explainer-title">
        <div><p className="eyebrow">{copy.eyebrow}</p><h3>{ticker} · {dateOnly(result.observedAt)}</h3></div>
        <button ref={openerRef} className="text signal-about-button" onClick={() => setOpen(true)}>{copy.about}</button>
      </div>

      <div className="signal-method-heading">
        <div><span>{copy.choose}</span><small>{copy.chooseNote}</small></div>
      </div>
      <div className="signal-method-tabs" role="tablist" aria-label={copy.choose}>
        {SIGNAL_METHODS.map(option => <button
          key={option.id}
          type="button"
          id={`signal-method-tab-${option.id}`}
          role="tab"
          aria-controls="signal-method-panel"
          aria-selected={option.id === method.id}
          className={option.id === method.id ? 'selected-method' : ''}
          onClick={() => onMethodChange(option.id)}
        >
          <small>{signalFamilyLabel(option.family, language)}</small>
          <b>{language === 'zh-TW' ? option.nameZh : option.name}</b>
        </button>)}
      </div>

      <div
        id="signal-method-panel"
        className="signal-current"
        role="tabpanel"
        aria-labelledby={`signal-method-tab-${method.id}`}
      >
        <div><h4>{state}</h4><p>{summary}</p></div>
        <strong>{metric}</strong>
      </div>

      <div className="signals signal-explainer-meta">
        <span>{copy.method}<b>{language === 'zh-TW' ? method.nameZh : method.name}</b></span>
        <span>{copy.observed}<b>{dateOnly(result.observedAt)}</b></span>
        <span>{copy.evidence}<b>{result.evidence.observationCount} {copy.closes}</b></span>
        <span className={recency.status === 'stale' ? 'stale-recency' : ''}>{copy.recency}<b>{recencyLabel}</b></span>
      </div>
    </article>

    {open && <div className="signal-drawer-backdrop" onMouseDown={event => {
      if (event.target === event.currentTarget) closeDrawer();
    }}>
      <aside ref={drawerRef} className="signal-drawer" role="dialog" aria-modal="true" aria-labelledby="signal-drawer-title" aria-describedby="signal-drawer-boundary">
        <header>
          <div>
            <p className="eyebrow">{copy.drawerEyebrow}</p>
            <h2 id="signal-drawer-title">{language === 'zh-TW' ? method.nameZh : method.name}</h2>
            <span>{signalFamilyLabel(method.family, language)} · {ticker}</span>
          </div>
          <button ref={closeRef} type="button" aria-label={copy.close} onClick={closeDrawer}>×</button>
        </header>

        <section className="signal-drawer-observation">
          <small>{copy.currentObservation}</small>
          <h3>{state}</h3>
          <strong>{metric}</strong>
          <p>{summary}</p>
        </section>

        <section className="signal-drawer-grid">
          <div><small>{copy.whatItMeasures}</small><p>{methodCopy.whatItMeasures}</p></div>
          <div><small>{copy.commonUse}</small><p>{methodCopy.commonUse}</p></div>
          <div><small>{copy.methodSettings}</small><p>{signalMethodSettings(method.id, language)}</p></div>
          <div className="signal-evidence-block">
            <small>{copy.dataEvidence}</small>
            <dl>
              <div><dt>{copy.provider}</dt><dd>{result.evidence.provider || copy.unavailable}</dd></div>
              <div><dt>{copy.observations}</dt><dd>{result.evidence.observationCount}</dd></div>
              <div><dt>{copy.requirement}</dt><dd>{result.requirements.minimumObservations} {copy.closes} · {copy.oneProvider}</dd></div>
              <div><dt>{copy.recency}</dt><dd className={recency.status === 'stale' ? 'stale-recency' : ''}>{recencyLabel}</dd></div>
            </dl>
            {result.evidence.sourceUrl && <a href={result.evidence.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}</a>}
          </div>
        </section>

        <section className="signal-limitations">
          <small>{copy.limitations}</small>
          <ul>{methodCopy.limitations.map(item => <li key={item}>{item}</li>)}</ul>
        </section>
        <footer id="signal-drawer-boundary">{copy.boundary}</footer>
      </aside>
    </div>}
  </>;
}
