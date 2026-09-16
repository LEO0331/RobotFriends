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

test('research dock copy has English and Traditional Chinese labels', () => {
  const english = researchLabCopy('en');
  const chinese = researchLabCopy('zh-TW');
  expect(english.dockLabel).toBe('RESEARCH LAB');
  expect(english.scenarioButton).toBe('Scenario analysis →');
  expect(english.backtestButton).toBe('Point-in-time backtest →');
  expect(chinese.dockLabel).toBe('研究實驗室');
  expect(chinese.scenarioButton).toBe('情境分析 →');
  expect(chinese.backtestButton).toBe('時點回測 →');
});

test('scenario lab renders Traditional Chinese copy and localized regions', () => {
  render(<ScenarioLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('情境分析實驗室')).toBeInTheDocument();
  expect(screen.getByText('決策輔助 / 敏感度分析')).toBeInTheDocument();
  expect(screen.getByRole('option', { name: '德州' })).toHaveValue('Texas');
  expect(screen.getByRole('option', { name: '北維吉尼亞' })).toHaveValue('Northern Virginia');
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});

test('point-in-time backtest explains reconstructed demo history in Traditional Chinese', () => {
  render(<BacktestLab language="zh-TW" onBack={() => {}} />);
  expect(screen.getByText('時點驗證')).toBeInTheDocument();
  expect(screen.getByText('模型驗證 / 禁止前視偏誤')).toBeInTheDocument();
  expect(screen.getByText('這個驗證如何運作')).toBeInTheDocument();
  expect(screen.getByText('資料涵蓋範圍')).toBeInTheDocument();
  expect(screen.getByText('歷史重建')).toBeInTheDocument();
  expect(screen.getByText('時點資料防護規則')).toBeInTheDocument();
  expect(screen.getByText(/歷史重建資料會與原生實際記錄清楚區分/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
});
