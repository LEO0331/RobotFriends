import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PriceChart from './PriceChart';
import { SIGNAL_METHOD_IDS } from '../signals/registry';

const day = index => new Date(Date.UTC(2026, 0, index + 1)).toISOString();

const snapshotWith = count => ({
  generatedAt: day(count + 1),
  observations: Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value: 100 + index,
    observedAt: day(index),
    provenance: { provider: 'Fixture provider', originUrl: 'https://example.com/nbis-history' },
  })),
});

test('renders a lightweight 60-session sourced closing-price chart', () => {
  const { container } = render(<PriceChart snapshot={snapshotWith(90)} ticker="NBIS" />);

  expect(screen.getByRole('heading', { level: 3, name: 'NBIS · Sourced closing prices' })).toBeInTheDocument();
  expect(screen.getByText('$189.00')).toBeInTheDocument();
  expect(screen.getByText('Fixture provider')).toBeInTheDocument();
  expect(screen.getByText('Recency')).toBeInTheDocument();
  expect(screen.getByText('2 days before snapshot')).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('NBIS closing-price chart, 60 sessions'));
  expect(container.querySelector('path.price-line')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Price source ↗' })).toHaveAttribute('href', 'https://example.com/nbis-history');
});

test('chart can be inspected with keyboard arrows as well as pointer hover', () => {
  render(<PriceChart snapshot={snapshotWith(90)} ticker="NBIS" />);

  const chart = screen.getByRole('img');
  fireEvent.focus(chart);
  expect(screen.getByText(/2026-03-31, \$189\.00/)).toBeInTheDocument();

  fireEvent.keyDown(chart, { key: 'ArrowLeft' });
  expect(screen.getByText(/2026-03-30, \$188\.00/)).toBeInTheDocument();

  fireEvent.keyDown(chart, { key: 'Home' });
  expect(screen.getByText(/2026-01-31, \$130\.00/)).toBeInTheDocument();
});

test('range controls update the chart without fetching another data source', () => {
  render(<PriceChart snapshot={snapshotWith(90)} ticker="NBIS" />);

  expect(screen.getByRole('button', { name: '60' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: '30' }));

  expect(screen.getByRole('button', { name: '30' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('30 sessions'));
  expect(screen.getByText(/30 sessions · 2026-03-02/)).toBeInTheDocument();
});

test('range control is disabled when the current provider segment lacks enough closes', () => {
  render(<PriceChart snapshot={snapshotWith(60)} ticker="NBIS" />);

  expect(screen.getByRole('button', { name: '30' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '60' })).toBeEnabled();
  expect(screen.getByRole('button', { name: '90' })).toBeDisabled();
});

test('shows an explicit insufficient-history state rather than drawing a partial default range', () => {
  render(<PriceChart snapshot={snapshotWith(40)} ticker="NBIS" />);

  expect(screen.getByRole('status')).toHaveTextContent('Insufficient sourced history for this range.');
  expect(screen.getByRole('status')).toHaveTextContent('requires 60 dated closes');
  expect(screen.getByRole('status')).toHaveTextContent('available: 40');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test('renders dated signal markers for the selected technical method', () => {
  const snapshot = {
    generatedAt: day(61),
    observations: [
      ...Array(15).fill(100),
      ...Array(45).fill(110),
    ].map((value, index) => ({
      id: `m${index}`,
      source: 'prices',
      type: 'close',
      ticker: 'NBIS',
      value,
      observedAt: day(index),
      provenance: { provider: 'Fixture provider', originUrl: 'https://example.com/nbis-history' },
    })),
  };
  const { container } = render(<PriceChart snapshot={snapshot} ticker="NBIS" />);

  expect(screen.getByText('Signal markers')).toBeInTheDocument();
  expect(screen.getByText('Trend · Moving-average trend')).toBeInTheDocument();
  expect(screen.getByText('1 state changes in this range')).toBeInTheDocument();
  expect(container.querySelectorAll('.price-signal-marker')).toHaveLength(1);
  expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('1 signal state changes shown'));
});

test('selected RSI method controls chart markers and hover explanation', () => {
  const snapshot = snapshotWith(60);
  const { container } = render(<PriceChart
    snapshot={snapshot}
    ticker="NBIS"
    methodId={SIGNAL_METHOD_IDS.MOMENTUM_RSI}
  />);

  expect(screen.getByText('Momentum · Relative Strength Index')).toBeInTheDocument();
  expect(screen.getByText('1 state changes in this range')).toBeInTheDocument();
  expect(container.querySelectorAll('.price-signal-marker')).toHaveLength(1);

  const svg = screen.getByRole('img');
  svg.getBoundingClientRect = () => ({ left: 0, width: 780, top: 0, right: 780, bottom: 270, height: 270 });
  fireEvent.mouseMove(svg, { clientX: 225 });

  expect(screen.getByText('RSI entered upper reference range')).toBeInTheDocument();
});

test('renders Traditional Chinese labels and provenance note', () => {
  render(<PriceChart snapshot={snapshotWith(90)} ticker="NBIS" language="zh-TW" />);

  expect(screen.getByRole('heading', { level: 3, name: 'NBIS · 具來源的收盤價' })).toBeInTheDocument();
  expect(screen.getByText('圖表只使用同一連續資料來源區段，不跨不同 provider 拼接觀察值。')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '價格來源 ↗' })).toBeInTheDocument();
  expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('NBIS 收盤價圖表'));
});
