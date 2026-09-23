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
  provenance: { provider: 'Fixture provider' },
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

test('data health renders demo readiness and source/price coverage in English', async () => {
  render(<DataHealth language="en" onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('READY WITH WARNINGS')).toBeInTheDocument());
  expect(screen.getByText('MARKET PRICE COVERAGE')).toBeInTheDocument();
  expect(screen.getByText('Reviewed event records')).toBeInTheDocument();
  expect(screen.getAllByText('Fixture provider')).toHaveLength(4);
});

test('data health renders Traditional Chinese labels', async () => {
  render(<DataHealth language="zh-TW" onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('可展示，但有警示')).toBeInTheDocument());
  expect(screen.getByText('市場價格涵蓋')).toBeInTheDocument();
  expect(screen.getByText('已審查事件紀錄')).toBeInTheDocument();
  expect(screen.getByText('市場價格')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});
