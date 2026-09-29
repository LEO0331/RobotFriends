import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResearchBrief from './ResearchBrief';

test('research brief keeps unsupported lanes unavailable and opens a documented Oracle relationship', () => {
  const onTickerChange = jest.fn();
  render(<ResearchBrief snapshot={{ generatedAt: '2026-09-29T01:00:00Z', observations: [] }} ticker="NBIS" region="All regions" regions={['All regions', 'Texas']} language="zh-TW" onTickerChange={onTickerChange} onRegionChange={() => {}} />);
  expect(screen.getByRole('heading', { name: '資料中心建設是否已有可觀察的進展？' })).toBeInTheDocument();
  expect(screen.getAllByText('尚無資料')).toHaveLength(4);
  expect(screen.getByText('所選範圍尚無具來源的公司、設施與電網連結紀錄。')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ORCL →' }));
  expect(onTickerChange).toHaveBeenCalledWith('ORCL');
});
