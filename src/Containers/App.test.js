import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('../Components/Account', () => ({ onPreferences }) => (
  <button type="button" onClick={() => onPreferences({ language: 'en' })}>Apply account language</button>
));

const snapshot = {
  generatedAt: '2026-09-23T00:00:00Z',
  sourceHealth: { prices: { status: 'ok' } },
  observations: Array.from({ length: 10 }, (_, index) => ({
    id: `p${index}`, source: 'prices', type: 'close', ticker: 'NBIS', value: 100 + index,
    observedAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/prices' },
  })),
};

const dateAt = index => new Date(Date.UTC(2026, 7, 25 + index)).toISOString();
const richSnapshot = {
  generatedAt: '2026-09-24T00:00:00Z',
  sourceHealth: { prices: { status: 'ok' } },
  observations: Array.from({ length: 30 }, (_, index) => ({
    id: `r${index}`, source: 'prices', type: 'close', ticker: 'NBIS', value: 100 + index,
    observedAt: dateAt(index),
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/prices' },
  })),
};

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '#overview');
});

test('overview switches research lenses without presenting unsourced earnings values', () => {
  render(<App snapshot={snapshot} />);
  expect(screen.getByRole('heading', { level: 2, name: 'Short-term price trend: upward' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Company financials' }));
  expect(screen.getByText('Company execution evidence unavailable')).toBeInTheDocument();
  expect(screen.queryByText('86%')).not.toBeInTheDocument();
});

test('technical method selection updates the selected market-signal lens', () => {
  render(<App snapshot={richSnapshot} />);
  expect(screen.getByRole('button', { name: 'Market signals' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Short-term price trend: upward' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Relative Strength Index/ }));

  expect(screen.getByRole('heading', { level: 2, name: 'RSI above upper reference range' })).toBeInTheDocument();
  expect(screen.getByText('RSI 100.0')).toBeInTheDocument();
});

test('saved local language is not overwritten when account preferences reload after navigation', () => {
  window.localStorage.setItem('gridline-language', 'zh-TW');
  const onLanguageChange = jest.fn();
  render(<App snapshot={snapshot} language="zh-TW" onLanguageChange={onLanguageChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Apply account language' }));

  expect(onLanguageChange).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '總覽' })).toBeInTheDocument();
});

test('account language can initialize a browser with no local language preference', () => {
  const onLanguageChange = jest.fn();
  render(<App snapshot={snapshot} language="zh-TW" onLanguageChange={onLanguageChange} />);

  fireEvent.click(screen.getByRole('button', { name: 'Apply account language' }));

  expect(onLanguageChange).toHaveBeenCalledWith('en');
});
