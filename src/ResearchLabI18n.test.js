import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioLab from './ScenarioLab';
import BacktestLab from './BacktestLab';
import { researchLabCopy } from './researchLabI18n';

beforeEach(() => {
  global.fetch = jest.fn(() => new Promise(() => {}));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('research dock copy has English and Traditional Chinese labels', () => {
  const english = researchLabCopy('en');
  const chinese = researchLabCopy('zh-TW');
  expect(english.dockLabel).toBe('RESEARCH TOOLS');
  expect(english.scenarioButton).toBe('Scenario assumptions →');
  expect(english.backtestButton).toBe('Historical signals →');
  expect(chinese.dockLabel).toBe('研究工具');
  expect(chinese.scenarioButton).toBe('情境假設 →');
  expect(chinese.backtestButton).toBe('歷史訊號 →');
});

test('scenario lab renders Traditional Chinese copy and localized regions', () => {
  render(<ScenarioLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('情境假設')).toBeInTheDocument();
  expect(screen.getByText('檢視假設變化')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '德州' })).toHaveValue('Texas');
  expect(screen.getByRole('option', { name: '北維吉尼亞' })).toHaveValue('Northern Virginia');
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});

test('price-only backtest explains its calculation and limits in Traditional Chinese', async () => {
  render(<BacktestLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('歷史訊號')).toBeInTheDocument();
  expect(screen.getByText('歷史訊號回顧')).toBeInTheDocument();
  expect(screen.getByText('涵蓋的訊號')).toBeInTheDocument();
  expect(screen.getByText('計算細節')).toBeInTheDocument();
  expect(screen.getByText('資料涵蓋')).toBeInTheDocument();
  expect(screen.getByText('解讀限制')).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});
