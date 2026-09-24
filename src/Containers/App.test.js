import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

jest.mock('../Components/Account', () => () => null);

const snapshot = {
  generatedAt: '2026-09-23T00:00:00Z',
  sourceHealth: { prices: { status: 'ok' } },
  observations: Array.from({ length: 10 }, (_, index) => ({
    id: `p${index}`, source: 'prices', type: 'close', ticker: 'NBIS', value: 100 + index,
    observedAt: `2026-09-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/prices' },
  })),
};

test('overview switches research lenses without presenting unsourced earnings values', () => {
  window.history.pushState({}, '', '#overview');
  render(<App snapshot={snapshot} />);
  expect(screen.getByRole('heading', { level: 2, name: 'Short-term price trend positive' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Company financials' }));
  expect(screen.getByText('Company execution evidence unavailable')).toBeInTheDocument();
  expect(screen.queryByText('86%')).not.toBeInTheDocument();
});
