import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SnapshotLoadState from './SnapshotLoadState';

test('renders an accessible loading state', () => {
  render(<SnapshotLoadState state="loading" hasObservations={false} />);

  expect(screen.getByRole('status')).toHaveTextContent('Loading dashboard snapshot');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('renders an error state with retry action', () => {
  const retry = jest.fn();
  render(<SnapshotLoadState state="error" hasObservations={false} onRetry={retry} />);

  expect(screen.getByRole('alert')).toHaveTextContent('Dashboard snapshot could not be loaded');
  fireEvent.click(screen.getByRole('button', { name: 'Retry snapshot' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test('distinguishes a successfully loaded but empty snapshot', () => {
  render(<SnapshotLoadState state="ready" hasObservations={false} language="zh-TW" />);

  expect(screen.getByRole('status')).toHaveTextContent('快照已載入，但沒有觀察資料');
});

test('renders nothing when a ready snapshot contains observations', () => {
  const { container } = render(<SnapshotLoadState state="ready" hasObservations />);
  expect(container).toBeEmptyDOMElement();
});
