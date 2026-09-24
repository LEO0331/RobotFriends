import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SnapshotChanges from './SnapshotChanges';

const diff = {
  available: true,
  from: '2026-09-23T22:00:00.000Z',
  to: '2026-09-24T22:00:00.000Z',
  summary: { total: 8, price: 2, signal: 1, event: 3, sourceHealth: 2 },
  changes: [
    {
      id: 'event-1',
      type: 'event-added',
      title: 'New grid record',
      category: 'GRID',
      region: 'Texas',
      publishedAt: '2026-09-24T10:00:00.000Z',
      sourceUrl: 'https://example.com/event',
    },
    {
      id: 'signal-orcl',
      type: 'signal',
      ticker: 'ORCL',
      before: 'mixed',
      after: 'above',
      beforeAvailable: true,
      afterAvailable: true,
      observedAt: '2026-09-24T20:00:00.000Z',
      sourceUrl: 'https://example.com/orcl',
    },
    {
      id: 'price-orcl',
      type: 'price',
      ticker: 'ORCL',
      before: 150,
      after: 155,
      observedAt: '2026-09-24T20:00:00.000Z',
      provider: 'Fixture',
      sourceUrl: 'https://example.com/orcl',
    },
    {
      id: 'price-nbis',
      type: 'price',
      ticker: 'NBIS',
      before: 100,
      after: 103.25,
      observedAt: '2026-09-24T20:00:00.000Z',
      provider: 'Fixture',
      sourceUrl: 'https://example.com/nbis',
    },
    {
      id: 'health-events',
      type: 'source-health',
      source: 'events',
      before: 'partial',
      after: 'ok',
      checkedAt: '2026-09-24T22:00:00.000Z',
    },
    {
      id: 'event-2',
      type: 'event-updated',
      title: 'Permit record revised',
      category: 'PERMIT',
      region: 'Arizona',
      publishedAt: '2026-09-20T10:00:00.000Z',
      sourceUrl: 'https://example.com/permit',
    },
    {
      id: 'event-3',
      type: 'event-archived',
      title: 'Older power record',
      category: 'POWER',
      region: 'Ohio',
      publishedAt: '2026-08-20T10:00:00.000Z',
      sourceUrl: 'https://example.com/power',
    },
    {
      id: 'health-prices',
      type: 'source-health',
      source: 'prices',
      before: 'degraded',
      after: 'ok',
      checkedAt: '2026-09-24T22:00:00.000Z',
    },
  ],
};

test('shows snapshot range, summary counts and selected ticker changes first', () => {
  const { container } = render(<SnapshotChanges
    snapshot={{ snapshotChanges: diff }}
    ticker="NBIS"
  />);

  expect(screen.getByRole('heading', { level: 3, name: 'Changes since previous snapshot' })).toBeInTheDocument();
  expect(screen.getByText('2026-09-23')).toBeInTheDocument();
  expect(screen.getByText('2026-09-24')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();

  const rows = container.querySelectorAll('.snapshot-change-row');
  expect(rows).toHaveLength(6);
  expect(rows[0]).toHaveTextContent('NBIS close');
  expect(rows[0]).toHaveTextContent('$100.00 → $103.25');
  expect(screen.getByRole('button', { name: 'Show all changes (8)' })).toHaveAttribute('aria-expanded', 'false');
});

test('expands and collapses a long change list', () => {
  const { container } = render(<SnapshotChanges
    snapshot={{ snapshotChanges: diff }}
    ticker="NBIS"
  />);

  fireEvent.click(screen.getByRole('button', { name: 'Show all changes (8)' }));
  expect(container.querySelectorAll('.snapshot-change-row')).toHaveLength(8);
  expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute('aria-expanded', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
  expect(container.querySelectorAll('.snapshot-change-row')).toHaveLength(6);
});

test('renders descriptive trend and source-health transitions', () => {
  render(<SnapshotChanges snapshot={{ snapshotChanges: diff }} ticker="ORCL" />);

  expect(screen.getByText('Mixed → Upward')).toBeInTheDocument();
  expect(screen.getByText('Partial → Healthy')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Open source ↗' }).length).toBeGreaterThan(0);
});

test('renders Traditional Chinese snapshot-change copy', () => {
  render(<SnapshotChanges
    snapshot={{ snapshotChanges: diff }}
    ticker="ORCL"
    language="zh-TW"
  />);

  expect(screen.getByRole('heading', { level: 3, name: '自上次快照以來的變化' })).toBeInTheDocument();
  expect(screen.getByText('混合 → 向上')).toBeInTheDocument();
  expect(screen.getByText('部分更新 → 正常')).toBeInTheDocument();
  expect(screen.getByText('電網 · 德州 · 發布日期: 2026-09-24')).toBeInTheDocument();
});

test('shows a transparent unavailable state before a valid comparison baseline exists', () => {
  render(<SnapshotChanges snapshot={{}} ticker="NBIS" />);

  expect(screen.getByRole('heading', { level: 3, name: 'Previous snapshot comparison unavailable' })).toBeInTheDocument();
  expect(screen.getByText(/after a snapshot refresh has a valid immediately preceding snapshot/)).toBeInTheDocument();
});

test('shows an explicit no-material-changes state', () => {
  render(<SnapshotChanges
    snapshot={{
      snapshotChanges: {
        available: true,
        from: '2026-09-23T22:00:00.000Z',
        to: '2026-09-24T22:00:00.000Z',
        summary: { total: 0, price: 0, signal: 0, event: 0, sourceHealth: 0 },
        changes: [],
      },
    }}
    ticker="NBIS"
  />);

  expect(screen.getByText('No material customer-facing changes were detected.')).toBeInTheDocument();
});
