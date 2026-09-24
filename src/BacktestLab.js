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
    lab: t('HISTORICAL SIGNALS', '歷史訊號'), back: t('← Back to overview', '← 返回總覽'),
    kicker: t('HISTORICAL SIGNAL REVIEW', '歷史訊號回顧'),
    title: t('Price momentum history', '價格動能歷史'),
    intro: t('Review how prices moved after an observed change in short-term trend. Results use dated closing prices and a fixed follow-up window. They describe past outcomes, not a trading recommendation.', '檢視短期價格趨勢出現變化後的後續走勢。結果使用具日期的收盤價與固定觀察期間，只描述過去表現，不構成交易建議。'),
    how: t('Signals included', '涵蓋的訊號'),
    steps: [
      t('A price-trend change is classified as upward or downward using historical closes.', '依歷史收盤價將價格趨勢變化分為向上或向下。'),
      t('The outcome window starts at the next observed close and ends 10 trading observations later.', '後續觀察期間自下一筆收盤價開始，至其後第 10 筆交易收盤價結束。'),
      t('Only outcomes with both prices available enter the summary statistics.', '彙總統計只納入起點與終點價格均可取得的結果。'),
    ],
    details: t('Calculation details', '計算細節'),
    formula: t('The current trend method compares five- and ten-session simple moving averages. An upward change occurs when the shorter average crosses above the longer one; a downward change is the reverse. The rule is evaluated only after the signal-day close.', '目前以最近 5 筆與 10 筆收盤價的簡單移動平均判定趨勢。短期均線由下穿越長期均線為向上變化，反向穿越為向下變化；訊號只在當日收盤後判定。'),
    coverage: t('Data coverage', '資料涵蓋'), range: t('Observed dates', '觀察日期'),
    observations: t('Sourced closes', '有來源的收盤價'), signals: t('Trend changes', '趨勢變化'),
    completed: t('Completed observations', '已完成觀察'), pending: t('Awaiting follow-up', '後續資料不足'),
    hitRate: t('Direction aligned', '後續方向一致率'), avgReturn: t('Avg directional return', '平均方向報酬'),
    unavailable: t('Insufficient sourced price history for a completed follow-up window.', '有來源的價格歷史不足，尚無完成的後續觀察結果。'),
    ledger: t('Signal history', '訊號紀錄'), signalDate: t('Signal date', '訊號日期'),
    direction: t('Signal', '訊號'), averages: t('Close on signal date', '訊號當日收盤價'),
    outcome: t('Later outcome / source', '後續結果／來源'),
    bullish: t('Upward trend change', '趨勢轉強'), bearish: t('Downward trend change', '趨勢轉弱'),
    source: t('Price dataset ↗', '價格資料來源 ↗'),
    noSignals: t('No qualifying trend changes in the sourced history.', '有來源的價格歷史中沒有符合條件的趨勢變化。'),
    limits: t('Interpretation limits', '解讀限制'),
    limitations: [
      t('Historical prices were retrieved later; this is a retrospective study, not an archived live strategy.', '歷史價格為事後擷取；這是回溯研究，並非已封存的即時策略紀錄。'),
      t('Uses closing prices; transaction costs, slippage, dividends and data revisions are not modeled.', '使用收盤價；未納入交易成本、滑價、股息及資料修訂。'),
      t('Outcome windows can overlap. Summary rates describe this sample and do not establish predictive ability.', '各筆觀察期間可能重疊。彙總比率只描述此樣本，不能證明預測能力。'),
    ],
    note: t('Each row links to the price-provider dataset. Provider access and historical revisions may change. Results are descriptive and are not personal financial advice.', '每筆紀錄連結至價格供應商的資料集。來源存取及歷史修訂可能變動。結果只供描述，不構成個人化財務建議。'),
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
    <header className="backtest-header"><button onClick={onBack}><b>GRIDLINE</b><small>{b.lab}</small></button><div><button onClick={() => onLanguageChange(language === 'zh-TW' ? 'en' : 'zh-TW')}>{researchLabCopy(language).languageToggle}</button><button onClick={onBack}>{b.back}</button></div></header>
    <section className="backtest-hero"><div><p>{b.kicker}</p><h1>{b.title}</h1><span>{b.intro}</span></div><div className="backtest-selectors"><select aria-label={language === 'zh-TW' ? '公司代號' : 'Ticker'} value={ticker} onChange={event => setTicker(event.target.value)}>{['NBIS', 'CRWV', 'ORCL', 'AVGO'].map(value => <option key={value}>{value}</option>)}</select></div></section>
    <section className="backtest-how"><div><p>{b.how}</p><ul>{b.steps.map(item => <li key={item}>{item}</li>)}</ul><details><summary>{b.details}</summary><p>{b.formula}</p></details></div><div className="backtest-coverage"><p>{b.coverage}</p><dl><div><dt>{b.range}</dt><dd>{dateOnly(result.coverage.start)} → {dateOnly(result.coverage.end)}</dd></div><div><dt>{b.observations}</dt><dd>{result.coverage.priceObservations}</dd></div><div><dt>{b.signals}</dt><dd>{result.coverage.totalSignals}</dd></div></dl></div></section>
    <section className="backtest-metrics"><Metric label={b.completed} value={result.metrics.sampleSize}/><Metric label={b.pending} value={result.metrics.pendingSignals}/><Metric label={b.hitRate} value={result.metrics.directionalHitRate === null ? '—' : `${(result.metrics.directionalHitRate * 100).toFixed(0)}%`}/><Metric label={b.avgReturn} value={pct(result.metrics.averageDirectionalReturn)}/></section>
    {result.status === 'insufficient-data' && <section className="backtest-building"><b>{b.unavailable}</b></section>}
    <section className="backtest-grid"><article><h2>{b.ledger}</h2><div className="backtest-table"><div className="head"><span>{b.signalDate}</span><span>{b.direction}</span><span>{b.averages}</span><span>{b.outcome}</span></div>{result.rows.length ? result.rows.slice(-12).reverse().map(row => <div key={row.signalAt}><span>{dateOnly(row.signalAt)}</span><span>{row.direction === 'bullish' ? b.bullish : b.bearish}</span><span>${row.signalClose.toFixed(2)}</span><span>{row.status === 'complete' ? pct(row.forwardReturn) : b.pending}<br/>{row.entryAt && <small>{dateOnly(row.entryAt)} ${row.entryPrice.toFixed(2)} → {row.exitAt ? `${dateOnly(row.exitAt)} $${row.exitPrice.toFixed(2)}` : '—'}</small>}<br/><a href={row.sourceUrl} target="_blank" rel="noopener noreferrer">{b.source}</a></span></div>) : <p>{b.noSignals}</p>}</div></article><article><h2>{b.limits}</h2><ol>{b.limitations.map(item => <li key={item}>{item}</li>)}</ol></article></section>
    <aside className="backtest-note">{b.note}</aside>
  </main>;
}
function Metric({ label, value }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
