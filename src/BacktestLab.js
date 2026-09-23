import React, { useEffect, useMemo, useState } from 'react';
import { runPriceBacktest } from './backtestModel';
import { researchLabCopy } from './researchLabI18n';
import './BacktestLab.css';

const pct = value => value === null || value === undefined ? '—' : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(1)}%`;
const dateOnly = value => value ? String(value).slice(0, 10) : '—';

function labels(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    lab: t('PRICE SIGNAL RESEARCH', '價格訊號研究'), back: t('← Back to regime', '← 返回週期分析'),
    kicker: t('RETROSPECTIVE PRICE TEST', '回溯價格測試'),
    title: t('MA5 / MA10 crossover backtest', 'MA5 / MA10 交叉回測'),
    intro: t('Signals use observed daily closing prices and their linked provider dataset. A crossover is recorded only after that day’s close; entry is the next available session. This is a retrospective test, not a live recommendation.', '訊號使用有來源連結的每日收盤價。交叉訊號在當日收盤後才成立，並於下一個有資料的交易日進場。這是回溯測試，並非即時投資建議。'),
    how: t('Calculation', '計算方式'),
    steps: [
      t('MA5 and MA10 are simple means of the latest 5 and 10 recorded closes, including the signal day.', 'MA5 與 MA10 分別為截至訊號當日最近 5 與 10 筆收盤價的簡單平均。'),
      t('A bullish signal requires MA5 to cross above MA10; a bearish signal crosses below.', 'MA5 由下穿越 MA10 為看多訊號；由上穿越為看空訊號。'),
      t('Entry uses the next available close. Exit uses the close 10 recorded sessions after entry.', '進場價為下一個有資料交易日的收盤價；出場價為進場後第 10 筆交易日收盤價。'),
      t('Only signals with both entry and exit prices enter the performance statistics.', '只有具備進場及出場價格的訊號會納入績效統計。'),
    ],
    coverage: t('Price coverage', '價格資料範圍'), range: t('Observed dates', '觀測日期'),
    observations: t('Sourced closes', '有來源的收盤價'), signals: t('Crossovers', '交叉訊號'),
    completed: t('Completed signals', '已完成訊號'), pending: t('Pending outcomes', '待完成結果'),
    hitRate: t('Directional hit rate', '方向命中率'), avgReturn: t('Avg directional return', '平均方向報酬'),
    unavailable: t('Insufficient sourced price history for a completed 10-session outcome.', '有來源的價格歷史不足，尚無完成的 10 交易日結果。'),
    ledger: t('Signal ledger', '訊號帳本'), signalDate: t('Signal date', '訊號日期'),
    direction: t('Direction', '方向'), averages: t('At signal close', '訊號收盤時'),
    outcome: t('Outcome / source', '結果／來源'),
    bullish: t('Bullish', '看多'), bearish: t('Bearish', '看空'),
    source: t('Provider dataset ↗', '供應商資料 ↗'),
    noSignals: t('No MA5/MA10 crossovers in the sourced price history.', '有來源的價格歷史中沒有 MA5/MA10 交叉訊號。'),
    limits: t('Interpretation limits', '解讀限制'),
    limitations: [
      t('Historical prices were retrieved later; this is a retrospective reconstruction, not an archived live trading record.', '歷史價格為事後擷取；這是回溯重建，並非已封存的即時交易紀錄。'),
      t('Uses available closes rather than executable opening prices, commissions, slippage, dividends or corporate-action adjustments.', '使用可取得的收盤價；未納入可成交開盤價、交易成本、滑價、股息或公司行動調整。'),
      t('Overlapping signals may share outcome windows. Hit rate and average return are descriptive, not independent forecasts.', '多個訊號的結果區間可能重疊。命中率及平均報酬是描述統計，並非獨立預測。'),
    ],
    note: t('The linked provider dataset identifies each input price source. Provider availability and historical revisions can change. These figures do not establish predictive skill or constitute personalized financial advice.', '每筆訊號連結至輸入價格的供應商資料集。供應商可用性與歷史修訂可能變動。這些數字不能證明預測能力，也不構成個人化財務建議。'),
  };
}

export default function BacktestLab({ onBack, language = 'en', onLanguageChange = () => {} }) {
  const [observations, setObservations] = useState([]);
  const [ticker, setTicker] = useState('NBIS');
  const b = labels(language);
  useEffect(() => {
    let active = true;
    fetch(`${process.env.PUBLIC_URL}/data/dashboard-snapshot.json`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => { if (active) setObservations(data.observations || []); })
      .catch(() => { if (active) setObservations([]); });
    return () => { active = false; };
  }, []);
  const result = useMemo(() => runPriceBacktest({ ticker }, observations), [ticker, observations]);
  return <main className="backtest-shell" lang={language}>
    <header className="backtest-header"><button onClick={onBack}><b>GRIDLINE</b><small>{b.lab}</small></button><div><span>{result.backtestVersion}</span><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{researchLabCopy(language).languageToggle}</button><button onClick={onBack}>{b.back}</button></div></header>
    <section className="backtest-hero"><div><p>{b.kicker}</p><h1>{b.title}</h1><span>{b.intro}</span></div><div className="backtest-selectors"><select aria-label="Ticker" value={ticker} onChange={event => setTicker(event.target.value)}>{['NBIS', 'CRWV', 'ORCL', 'AVGO'].map(value => <option key={value}>{value}</option>)}</select></div></section>
    <section className="backtest-how"><div><p>{b.how}</p><ol>{b.steps.map(item => <li key={item}>{item}</li>)}</ol></div><div className="backtest-coverage"><p>{b.coverage}</p><dl><div><dt>{b.range}</dt><dd>{dateOnly(result.coverage.start)} → {dateOnly(result.coverage.end)}</dd></div><div><dt>{b.observations}</dt><dd>{result.coverage.priceObservations}</dd></div><div><dt>{b.signals}</dt><dd>{result.coverage.totalSignals}</dd></div></dl></div></section>
    <section className="backtest-metrics"><Metric label={b.completed} value={result.metrics.sampleSize}/><Metric label={b.pending} value={result.metrics.pendingSignals}/><Metric label={b.hitRate} value={result.metrics.directionalHitRate === null ? '—' : `${(result.metrics.directionalHitRate * 100).toFixed(0)}%`}/><Metric label={b.avgReturn} value={pct(result.metrics.averageDirectionalReturn)}/></section>
    {result.status === 'insufficient-data' && <section className="backtest-building"><b>{b.unavailable}</b></section>}
    <section className="backtest-grid"><article><h2>{b.ledger}</h2><div className="backtest-table"><div className="head"><span>{b.signalDate}</span><span>{b.direction}</span><span>{b.averages}</span><span>{b.outcome}</span></div>{result.rows.length ? result.rows.slice(-12).reverse().map(row => <div key={row.signalAt}><span>{dateOnly(row.signalAt)}</span><span>{row.direction === 'bullish' ? b.bullish : b.bearish}</span><span>MA5 {row.ma5.toFixed(2)} / MA10 {row.ma10.toFixed(2)}</span><span>{row.status === 'complete' ? pct(row.forwardReturn) : b.pending}<br/>{row.entryAt && <small>{dateOnly(row.entryAt)} ${row.entryPrice.toFixed(2)} → {row.exitAt ? `${dateOnly(row.exitAt)} $${row.exitPrice.toFixed(2)}` : '—'}</small>}<br/><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{b.source}</a></span></div>) : <p>{b.noSignals}</p>}</div></article><article><h2>{b.limits}</h2><ol>{b.limitations.map(item => <li key={item}>{item}</li>)}</ol></article></section>
    <aside className="backtest-note">{b.note}</aside>
  </main>;
}
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
