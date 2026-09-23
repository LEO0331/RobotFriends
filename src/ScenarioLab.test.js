import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioLab from './ScenarioLab';

test('scenario worksheet shows hypothetical inputs without invented scores', () => {
  render(<ScenarioLab onBack={() => {}} />);
  expect(screen.getByText('Entered assumptions')).toBeInTheDocument();
  expect(screen.getByText(/Expansion, pushback and company risk scores are unavailable/)).toBeInTheDocument();
  expect(screen.queryByText('76')).not.toBeInTheDocument();
  expect(screen.queryByText('58')).not.toBeInTheDocument();
  expect(screen.queryByText('Relative company sensitivity')).not.toBeInTheDocument();
});
