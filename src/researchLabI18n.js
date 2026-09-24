import { isTraditionalChinese, translate } from './i18n';

export const researchLabCopy = language => {
  const t = (en, tw) => translate(language, en, tw);
  return {
    languageToggle: isTraditionalChinese(language) ? 'EN' : '繁中',
    dockLabel: t('RESEARCH TOOLS', '研究工具'),
    scenarioButton: t('Scenario assumptions →', '情境假設 →'),
    backtestButton: t('Historical signals →', '歷史訊號 →'),
    scenario: {
      lab: t('SCENARIO ASSUMPTIONS', '情境假設'),
      back: t('← Back to overview', '← 返回總覽'),
      kicker: t('EXPLORE ASSUMPTIONS', '檢視假設變化'),
      titleLead: t('Explore infrastructure', '檢視基礎設施'),
      titleEmphasis: t('assumptions.', '相關假設。'),
      region: t('Region', '區域'),
      regionLabels: {
        'All regions': t('All regions', '所有區域'),
        Texas: t('Texas', '德州'),
        'Northern Virginia': t('Northern Virginia', '北維吉尼亞'),
        Arizona: t('Arizona', '亞利桑那州'),
        Ohio: t('Ohio', '俄亥俄州'),
      },
      powerDelay: t('Power delivery delay', '供電交付延遲'),
      availablePower: t('Available power', '可用電力'),
      demand: t('AI / cloud demand', 'AI／雲端需求'),
      capex: t('Capacity investment', '容量投資'),
      regulation: t('Regulatory pressure', '法規壓力'),
      monthsSuffix: t(' mo', ' 個月'),
      pointsSuffix: t(' pts', ' 點'),
      saving: t('Saving…', '儲存中…'),
      boundaryTitle: t('Interpretation limit', '解讀限制'),
    },
    historical: {
      lab: t('HISTORICAL SIGNALS', '歷史訊號'),
      back: t('← Back to overview', '← 返回總覽'),
      kicker: t('HISTORICAL SIGNAL REVIEW', '歷史訊號回顧'),
      title: t('Historical price signals', '歷史價格訊號'),
      intro: t(
        'Review how prices moved after a detected short-term trend change. Each record shows the signal date, the closing price available that day, and a fixed follow-up window. Results are retrospective and descriptive, not a trading recommendation.',
        '檢視短期價格趨勢出現變化後的後續走勢。每筆紀錄列出訊號日期、當日可得的收盤價與固定後續觀察期間。結果為回溯描述，不構成交易建議。'
      ),
      signalFamilies: t('Signal families', '訊號類型'),
      families: [
        t('Trend / moving averages — used in this historical review.', '趨勢／移動平均 — 本次歷史回顧採用的訊號類型。'),
        t('Momentum / oscillators — common technical category; not included in the current results.', '動能／震盪指標 — 常見技術訊號類型；目前結果未納入。'),
        t('Volume / volatility — common supporting categories; not included in the current results.', '成交量／波動度 — 常見輔助訊號類型；目前結果未納入。'),
      ],
      timingTitle: t('Timing and measurement', '判定時間與衡量方式'),
      timing: t(
        'The current review detects a crossover between shorter- and longer-horizon price trends only after the daily close. Follow-up starts from the next available close and is measured over a fixed 10-session observation window.',
        '目前的回顧只在每日收盤後判定短期與較長期價格趨勢是否交叉。後續觀察自下一筆可得收盤價開始，並以固定 10 個交易觀察值為期間。'
      ),
      coverage: t('Data coverage', '資料涵蓋'),
      range: t('Observed dates', '觀察日期'),
      observations: t('Sourced closes', '有來源的收盤價'),
      signals: t('Trend signals', '趨勢訊號'),
      completed: t('Completed observations', '已完成觀察'),
      pending: t('Awaiting follow-up', '等待後續資料'),
      hitRate: t('Follow-up matched signal direction', '後續走勢與訊號同向'),
      avgReturn: t('Avg direction-adjusted return', '平均方向調整報酬'),
      metricNote: t(
        'For a downward signal, a subsequent price decline is positive in the direction-adjusted return metric.',
        '方向調整報酬中，若訊號為向下，後續價格下跌會以正值計入。'
      ),
      unavailable: t('Insufficient sourced price history for a completed follow-up window.', '有來源的價格歷史不足，尚無完成的後續觀察結果。'),
      ledger: t('Signal history', '訊號紀錄'),
      signalDate: t('Signal date', '訊號日期'),
      direction: t('Signal', '訊號'),
      signalClose: t('Signal-day close', '訊號日收盤價'),
      outcome: t('10-session follow-up / source', '10 交易觀察值後續／來源'),
      bullish: t('Upward trend change', '趨勢向上轉折'),
      bearish: t('Downward trend change', '趨勢向下轉折'),
      source: t('Price data source ↗', '價格資料來源 ↗'),
      noSignals: t('No qualifying trend signals in the sourced price history.', '有來源的價格歷史中沒有符合條件的趨勢訊號。'),
      limits: t('Interpretation limits', '解讀限制'),
      limitations: [
        t('Historical prices were retrieved later; this is a retrospective study, not an archived live strategy.', '歷史價格為事後擷取；這是回溯研究，並非已封存的即時策略紀錄。'),
        t('Uses closing prices; transaction costs, slippage, dividends and data revisions are not modeled.', '使用收盤價；未納入交易成本、滑價、股息及資料修訂。'),
        t('Observation windows can overlap. Summary rates describe this sample and do not establish predictive ability.', '各筆觀察期間可能重疊。彙總比率只描述此樣本，不能證明預測能力。'),
      ],
      note: t(
        'Each row links to the price-provider dataset. Provider access and historical revisions may change. Results are descriptive and are not an investment recommendation.',
        '每筆紀錄均連結至價格資料來源。來源存取與歷史資料可能修訂。結果僅供描述，不構成投資建議。'
      ),
    },
  };
};
