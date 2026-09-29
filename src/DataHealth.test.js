import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataHealth from './DataHealth';

const DAY_MS = 24 * 60 * 60 * 1000;
const priceRows = ticker => Array.from({ length: 70 }, (_, index) => ({
  source: 'prices',
  type: 'close',
  ticker,
  value: 100 + index,
  observedAt: new Date(Date.now() - (69 - index) * DAY_MS).toISOString(),
  provenance: { provider: 'Fixture provider', originUrl: 'https://example.com/prices' },
}));

const fixture = {
  schemaVersion: 4,
  generatedAt: new Date().toISOString(),
  freshness: 'partial',
  observations: ['NBIS','CRWV','ORCL','AVGO'].flatMap(priceRows),
  companyHistory: [],
  methodologies: { companyScore: 'gridline-price-signal-v2.0.0' },
  backtestCoverage: { start: null, end: null, recorded: 0, reconstructed: 0, reconstructionQuality: 'recorded-only' },
  sourceHealth: {
    prices: { status: 'ok', recordCount: 280, lastSuccessAt: new Date().toISOString() },
    pjm: { status: 'degraded', message: 'PJM_API_KEY is not configured.' },
  },
  outcomes: [],
};

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(fixture) }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('data health shows explicit loading state before snapshot readiness is calculated', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  render(<DataHealth language="en" onBack={() => {}} />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading snapshot…');
  expect(screen.queryByText('PRICE DATA AVAILABLE')).not.toBeInTheDocument();
});

test('data health exposes load errors as alerts while keeping refresh available', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
  render(<DataHealth language="en" onBack={() => {}} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Snapshot could not be loaded.');
  expect(screen.getByRole('button', { name: 'Refresh status' })).toBeEnabled();
});

test('data health renders demo readiness and source/price coverage in English', async () => {
  render(<DataHealth language="en" onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('PRICE DATA AVAILABLE')).toBeInTheDocument());
  expect(screen.getByText('MARKET PRICE COVERAGE')).toBeInTheDocument();
  expect(screen.getByText('Retained event records')).toBeInTheDocument();
  expect(screen.getAllByText('Fixture provider')).toHaveLength(4);
  expect(screen.queryByText('PJM')).not.toBeInTheDocument();
  expect(screen.queryByText('FERC')).not.toBeInTheDocument();
  expect(screen.queryByText('Company IR')).not.toBeInTheDocument();
});

test('data health renders Traditional Chinese labels', async () => {
  render(<DataHealth language="zh-TW" onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('價格資料可用')).toBeInTheDocument());
  expect(screen.getByText('市場價格涵蓋')).toBeInTheDocument();
  expect(screen.getByText('保留的事件紀錄')).toBeInTheDocument();
  expect(screen.getByText('市場價格')).toBeInTheDocument();
  expect(screen.queryByText('公司投資人關係')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});
