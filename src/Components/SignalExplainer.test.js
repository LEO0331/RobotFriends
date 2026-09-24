import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SignalExplainer from './SignalExplainer';
import { DEFAULT_SIGNAL_METHOD_ID, SIGNAL_METHOD_IDS } from '../signals/registry';

const dateAt = index => new Date(Date.UTC(2026, 7, 25 + index)).toISOString();
const snapshot = {
  generatedAt: '2026-09-24T00:00:00Z',
  observations: Array.from({ length: 30 }, (_, index) => ({
    id: `p${index}`,
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value: 100 + index,
    observedAt: dateAt(index),
    provenance: { provider: 'Fixture provider', originUrl: 'https://example.com/nbis-history' },
  })),
};

function Harness({ language = 'en' }) {
  const [methodId, setMethodId] = React.useState(DEFAULT_SIGNAL_METHOD_ID);
  return <SignalExplainer
    snapshot={snapshot}
    ticker="NBIS"
    language={language}
    methodId={methodId}
    onMethodChange={setMethodId}
  />;
}

test('signal explorer switches between established technical methods without buy/sell wording', () => {
  render(<Harness />);

  expect(screen.getByRole('tab', { name: /Moving-average trend/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Short-term price trend: upward')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Relative Strength Index/ }));
  expect(screen.getByRole('tab', { name: /Relative Strength Index/ })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('RSI above upper reference range')).toBeInTheDocument();
  expect(screen.getByText(/RSI 100\.0/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: /Bollinger Bands/ }));
  expect(screen.getByText('Price within volatility bands')).toBeInTheDocument();
  expect(screen.queryByText(/\bbuy\b|\bsell\b/i)).not.toBeInTheDocument();
});

test('about drawer explains method, evidence, settings and limitations', () => {
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'About this signal →' });
  fireEvent.click(opener);

  const dialog = screen.getByRole('dialog');
  expect(screen.getByRole('button', { name: 'Close signal details' })).toHaveFocus();
  expect(dialog).toHaveTextContent('Moving-average trend');
  expect(dialog).toHaveTextContent('What it measures');
  expect(dialog).toHaveTextContent('Trend identification and crossover analysis.');
  expect(dialog).toHaveTextContent('Shorter- versus longer-horizon closing-price averages');
  expect(dialog).toHaveTextContent('Fixture provider');
  expect(dialog).toHaveTextContent('30');
  expect(dialog).toHaveTextContent('10 sourced closes');
  expect(dialog).toHaveTextContent('1 day before snapshot');
  const sourceLink = screen.getByRole('link', { name: 'Open price source ↗' });
  expect(sourceLink).toHaveAttribute('href', 'https://example.com/nbis-history');

  fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
  expect(sourceLink).toHaveFocus();
  fireEvent.keyDown(window, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Close signal details' })).toHaveFocus();

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});

test('signal card exposes observation recency beside evidence', () => {
  render(<Harness />);

  expect(screen.getByText('Recency')).toBeInTheDocument();
  expect(screen.getByText('1 day before snapshot')).toBeInTheDocument();
});

test('signal explorer and drawer render Traditional Chinese copy', () => {
  render(<Harness language="zh-TW" />);

  fireEvent.click(screen.getByRole('tab', { name: /相對強弱指標/ }));
  expect(screen.getByText('RSI 高於上方參考區間')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '了解此訊號 →' }));

  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('關於此訊號');
  expect(dialog).toHaveTextContent('衡量內容');
  expect(dialog).toHaveTextContent('常見用途');
  expect(dialog).toHaveTextContent('14 期 Wilder RSI');
  expect(dialog).toHaveTextContent('解讀限制');
  expect(dialog).toHaveTextContent('技術指標整理歷史價格行為');
});

test('insufficient data is explicit for methods with longer requirements', () => {
  const shortSnapshot = {
    ...snapshot,
    observations: snapshot.observations.slice(0, 10),
    generatedAt: dateAt(9),
  };
  render(<SignalExplainer
    snapshot={shortSnapshot}
    ticker="NBIS"
    language="en"
    methodId={SIGNAL_METHOD_IDS.VOLATILITY_BOLLINGER}
  />);

  expect(screen.getByText('Volatility signal unavailable')).toBeInTheDocument();
  expect(screen.getByText(/not enough consistent sourced closing-price history/i)).toBeInTheDocument();
});
