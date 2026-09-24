import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RegimeExperience from './RegimeExperience';

jest.mock('./Components/Account', () => () => null);
jest.mock('./ExposurePeriodMonitor', () => () => null);

const loadedSnapshot = {
  generatedAt: '2026-09-24T22:00:00Z',
  sourceHealth: { prices: { status: 'ok' } },
  observations: [{
    id: 'p1',
    source: 'prices',
    type: 'close',
    ticker: 'NBIS',
    value: 100,
    observedAt: '2026-09-24T20:00:00Z',
    provenance: { provider: 'Fixture', originUrl: 'https://example.com/prices' },
  }],
};

beforeEach(() => {
  window.history.pushState({}, '', '#overview');
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('main dashboard shows loading state while the snapshot request is pending', () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  render(<RegimeExperience />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard snapshot');
});

test('snapshot failure is retryable and replaces the error state after success', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => loadedSnapshot })
    .mockResolvedValueOnce({ ok: false });

  render(<RegimeExperience />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Dashboard snapshot could not be loaded');
  fireEvent.click(screen.getByRole('button', { name: 'Retry snapshot' }));

  await waitFor(() => {
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Snapshot 2026-09-24')).toBeInTheDocument();
  });
});
