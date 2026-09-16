import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ScenarioLab from './ScenarioLab';
import BacktestLab from './BacktestLab';
import { researchLabCopy } from './researchLabI18n';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('research dock copy has Traditional Chinese labels', () => {
  const copy = researchLabCopy('zh-TW');
  expect(copy.dockLabel).toBe('研究實驗室');
  expect(copy.scenarioButton).toBe('情境分析 →');
  expect(copy.backtestButton).toBe('時點回測 →');
});

test('scenario lab renders Traditional Chinese copy and localized regions', () => {
  render(<ScenarioLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('情境分析實驗室')).toBeInTheDocument();
  expect(screen.getByText('決策輔助 / 敏感度分析')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '德州' })).toHaveValue('Texas');
  expect(screen.getByRole('option', { name: '北維吉尼亞' })).toHaveValue('Northern Virginia');
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});

test('point-in-time backtest renders Traditional Chinese research language', async () => {
  render(<BacktestLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('時點驗證')).toBeInTheDocument();
  expect(screen.getByText('模型驗證 / 禁止前視偏誤')).toBeInTheDocument();
  expect(screen.getByText('時點資料防護規則')).toBeInTheDocument();
  expect(screen.getByText('回測統計屬於描述性的研究診斷，不代表已證明具有預測能力，也不是投資建議。')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});
