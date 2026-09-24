import React, { useMemo, useState } from 'react';
import {
  buildPriceChartModel,
  DEFAULT_PRICE_CHART_RANGE,
  PRICE_CHART_RANGES,
} from './priceChartModel';
import './PriceChart.css';

const WIDTH = 780;
const HEIGHT = 270;
const PADDING = { top: 22, right: 18, bottom: 34, left: 58 };
const PLOT_WIDTH = WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

const money = value => Number.isFinite(value) ? `$${Number(value).toFixed(2)}` : '—';
const percent = value => Number.isFinite(value)
  ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  : '—';
const dateOnly = value => value ? String(value).slice(0, 10) : '—';

function labels(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    eyebrow: t('PRICE HISTORY', '價格歷史'),
    title: t('Sourced closing prices', '具來源的收盤價'),
    range: t('Chart range', '圖表區間'),
    sessions: t('sessions', '個交易觀察值'),
    change: t('Range change', '區間變動'),
    latest: t('Latest close', '最新收盤價'),
    observed: t('Observed', '觀察日期'),
    source: t('Price source ↗', '價格來源 ↗'),
    provider: t('Provider', '資料來源'),
    continuity: t(
      'Chart uses one continuous provider segment; observations are not stitched across providers.',
      '圖表只使用同一連續資料來源區段，不跨不同 provider 拼接觀察值。'
    ),
    insufficient: t('Insufficient sourced history for this range.', '此區間的具來源價格歷史不足。'),
    needs: t('requires', '需要'),
    available: t('available', '目前可用'),
    closes: t('dated closes', '筆有日期收盤價'),
    unavailable: t('Price history unavailable', '價格歷史無資料'),
  };
}

function geometry(model) {
  if (!model.available || model.points.length < 2) return null;
  const rawSpan = model.high - model.low;
  const padding = rawSpan > 0
    ? rawSpan * 0.08
    : Math.max(Math.abs(model.high) * 0.01, 1);
  const min = model.low - padding;
  const max = model.high + padding;
  const span = Math.max(max - min, 0.000001);
  const x = index => PADDING.left + (index / (model.points.length - 1)) * PLOT_WIDTH;
  const y = value => PADDING.top + ((max - value) / span) * PLOT_HEIGHT;
  const plotted = model.points.map((point, index) => ({
    ...point,
    x: x(index),
    y: y(point.value),
  }));
  const path = plotted.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  ).join(' ');
  const ticks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const value = max - ratio * span;
    return { value, y: PADDING.top + ratio * PLOT_HEIGHT };
  });
  return { min, max, plotted, path, ticks };
}

export default function PriceChart({ snapshot, ticker, language = 'en' }) {
  const [sessions, setSessions] = useState(DEFAULT_PRICE_CHART_RANGE);
  const [hoverIndex, setHoverIndex] = useState(null);
  const copy = labels(language);
  const model = useMemo(
    () => buildPriceChartModel(snapshot, ticker, sessions),
    [snapshot, ticker, sessions]
  );
  const chart = useMemo(() => geometry(model), [model]);
  const hovered = chart && hoverIndex !== null ? chart.plotted[hoverIndex] : null;
  const midpoint = model.available ? model.points[Math.floor((model.points.length - 1) / 2)] : null;
  const ariaLabel = model.available
    ? language === 'zh-TW'
      ? `${ticker} 收盤價圖表，${model.sessions} 個交易觀察值，從 ${dateOnly(model.startDate)} 至 ${dateOnly(model.endDate)}，最新 ${money(model.latestClose)}，區間變動 ${percent(model.changePercent)}。`
      : `${ticker} closing-price chart, ${model.sessions} sessions from ${dateOnly(model.startDate)} to ${dateOnly(model.endDate)}, latest ${money(model.latestClose)}, range change ${percent(model.changePercent)}.`
    : language === 'zh-TW'
      ? `${ticker} 價格圖表無法顯示：資料不足。`
      : `${ticker} price chart unavailable because sourced history is insufficient.`;

  const move = event => {
    if (!chart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const ratio = Math.max(0, Math.min(1, (viewX - PADDING.left) / PLOT_WIDTH));
    setHoverIndex(Math.round(ratio * (chart.plotted.length - 1)));
  };

  return <article className="price-chart-panel">
    <div className="price-chart-header">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3>{ticker} · {copy.title}</h3>
        <small>{copy.continuity}</small>
      </div>
      <div className="price-chart-range" aria-label={copy.range}>
        {PRICE_CHART_RANGES.map(range => {
          const enabled = Boolean(model.rangeAvailability?.[range]);
          return <button
            key={range}
            type="button"
            className={sessions === range ? 'active-range' : ''}
            aria-pressed={sessions === range}
            disabled={!enabled}
            title={!enabled ? `${range} ${copy.sessions}: ${copy.insufficient}` : undefined}
            onClick={() => {
              setSessions(range);
              setHoverIndex(null);
            }}
          >{range}</button>;
        })}
        <span>{copy.sessions}</span>
      </div>
    </div>

    {model.available && chart ? <>
      <div className="price-chart-metrics">
        <div><span>{copy.latest}</span><strong>{money(model.latestClose)}</strong></div>
        <div><span>{copy.change}</span><strong className={model.changePercent < 0 ? 'negative' : 'positive'}>{percent(model.changePercent)}</strong></div>
        <div><span>{copy.observed}</span><strong>{dateOnly(model.endDate)}</strong></div>
        <div><span>{copy.provider}</span><strong>{model.provider || '—'}</strong></div>
      </div>

      <div className="price-chart-canvas">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          onMouseMove={move}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {chart.ticks.map(tick => <g key={tick.y}>
            <line className="price-grid-line" x1={PADDING.left} y1={tick.y} x2={WIDTH - PADDING.right} y2={tick.y} />
            <text className="price-axis-label" x={PADDING.left - 9} y={tick.y + 3} textAnchor="end">{money(tick.value)}</text>
          </g>)}
          <path className="price-line" d={chart.path} fill="none" vectorEffect="non-scaling-stroke" />
          <circle className="price-latest-dot" cx={chart.plotted.at(-1).x} cy={chart.plotted.at(-1).y} r="3.5" />
          <text className="price-date-label" x={PADDING.left} y={HEIGHT - 8} textAnchor="start">{dateOnly(model.startDate)}</text>
          <text className="price-date-label" x={WIDTH / 2} y={HEIGHT - 8} textAnchor="middle">{midpoint?.date || '—'}</text>
          <text className="price-date-label" x={WIDTH - PADDING.right} y={HEIGHT - 8} textAnchor="end">{dateOnly(model.endDate)}</text>

          {hovered && <g className="price-hover">
            <line x1={hovered.x} y1={PADDING.top} x2={hovered.x} y2={HEIGHT - PADDING.bottom} />
            <circle cx={hovered.x} cy={hovered.y} r="4" />
            <g transform={`translate(${Math.min(Math.max(hovered.x - 58, PADDING.left), WIDTH - PADDING.right - 116)} ${Math.max(PADDING.top + 4, hovered.y - 54)})`}>
              <rect width="116" height="40" rx="2" />
              <text x="8" y="15">{hovered.date}</text>
              <text x="8" y="31">{money(hovered.value)}</text>
            </g>
          </g>}
        </svg>
      </div>

      <div className="price-chart-footer">
        <span>{model.sessions} {copy.sessions} · {dateOnly(model.startDate)} → {dateOnly(model.endDate)}</span>
        {model.sourceUrl && <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}</a>}
      </div>
    </> : <div className="price-chart-empty" role="status">
      <strong>{model.reason === 'price-history-missing' ? copy.unavailable : copy.insufficient}</strong>
      <span>{copy.needs} {model.sessions} {copy.closes} · {copy.available}: {model.availableSessions}</span>
      {model.sourceUrl && <a href={model.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}</a>}
    </div>}
  </article>;
}
