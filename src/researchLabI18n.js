export const isTraditionalChinese = language => language === 'zh-TW';

export const researchLabCopy = language => {
  const zh = isTraditionalChinese(language);
  const t = (en, tw) => (zh ? tw : en);

  return {
    languageToggle: zh ? 'EN' : '繁中',
    dockLabel: t('RESEARCH LAB', '研究實驗室'),
    scenarioButton: t('Scenario analysis →', '情境分析 →'),
    backtestButton: t('Point-in-time backtest →', '時點回測 →'),
    scenario: {
      lab: t('SCENARIO LAB', '情境分析實驗室'),
      back: t('← Back to regime', '← 返回週期分析'),
      kicker: t('DECISION SUPPORT / SENSITIVITY', '決策輔助 / 敏感度分析'),
      titleLead: t('Stress the', '壓力測試'),
      titleEmphasis: t('physical thesis.', '實體建設假設。'),
      intro: t(
        'Change power, timing, demand and policy assumptions. Gridline recomputes regime pressure and relative company sensitivity; it does not predict security prices.',
        '調整供電、時程、需求與政策假設。Gridline 會重新計算建設週期壓力與各公司的相對敏感度；它不預測證券價格。'
      ),
      reset: t('Reset baseline', '重設基準情境'),
      region: t('Region', '區域'),
      allRegions: t('All regions', '所有區域'),
      northernVirginia: t('Northern Virginia', '北維吉尼亞'),
      powerDelay: t('Power delivery delay', '供電交付延遲'),
      availablePower: t('Available power', '可用電力'),
      demand: t('AI / cloud demand', 'AI / 雲端需求'),
      capex: t('Capacity CAPEX', '容量資本支出'),
      regulation: t('Regulatory pressure', '法規壓力'),
      monthsSuffix: t(' mo', ' 個月'),
      pointsSuffix: t(' pts', ' 點'),
      expansion: t('Expansion', '擴張'),
      pushback: t('Pushback', '阻力'),
      driverContribution: t('Driver contribution', '驅動因素貢獻'),
      relativeSensitivity: t('Relative company sensitivity', '公司相對敏感度'),
      risk: t('risk', '風險'),
      saveRun: t('Save scenario run', '儲存情境分析'),
      saved: t('Saved to persistent API history.', '已儲存至持久化 API 歷史紀錄。'),
      local: t('API unavailable — simulation remains local.', 'API 無法使用 — 模擬結果僅保留於本機。'),
      saving: t('Saving…', '儲存中…'),
      auditable: t('Scenario runs are auditable when the production API is connected.', '連接正式 API 後，情境分析紀錄可供稽核。'),
      boundaryTitle: t('Model boundary', '模型邊界'),
      boundary: t(
        'This is deterministic sensitivity analysis. Company risk deltas express relative exposure to the entered infrastructure assumptions and are not price targets, return forecasts or investment advice.',
        '這是確定性的敏感度分析。公司風險變化表示其對所輸入基礎設施假設的相對曝險，不代表目標價、報酬預測或投資建議。'
      ),
      baseline: t('Baseline', '基準'),
      expansionWord: t('Expansion', '擴張'),
      pushbackWord: t('Pushback', '阻力'),
    },
    backtest: {
      lab: t('POINT-IN-TIME VALIDATION', '時點驗證'),
      back: t('← Back to regime', '← 返回週期分析'),
      kicker: t('MODEL VALIDATION / NO LOOK-AHEAD', '模型驗證 / 禁止前視偏誤'),
      titleLead: t('Backtest what Gridline', '回測 Gridline'),
      titleEmphasis: t('actually knew.', '當時真正知道的資訊。'),
      intro: t(
        'Signals are evaluated only after they were recorded. Gridline does not reconstruct historical proprietary scores using information learned later.',
        '訊號只會在實際被記錄之後接受評估。Gridline 不會使用事後才得知的資訊，回頭重建歷史專有分數。'
      ),
      completedSignals: t('Completed signals', '已完成訊號'),
      pendingOutcomes: t('Pending outcomes', '待完成結果'),
      hitRate: t('Directional hit rate', '方向命中率'),
      avgReturn: t('Avg directional return', '平均方向報酬'),
      buildingTitle: t('Point-in-time history is still building.', '時點歷史資料仍在累積中。'),
      building: days => t(
        `This is intentional. Completed backtest results appear only after a recorded signal has a full future ${days}-day price window. No synthetic score history is inserted to make the chart look complete.`,
        `這是刻意的設計。只有在已記錄訊號取得完整未來 ${days} 天價格區間後，才會產生已完成的回測結果；系統不會插入合成分數歷史來填滿圖表。`
      ),
      signalLedger: t('Signal ledger', '訊號帳本'),
      signalDate: t('Signal date', '訊號日期'),
      gap: t('Gap', '預期落差'),
      status: t('Status', '狀態'),
      forwardReturn: t('Forward return', '後續報酬'),
      noSignals: t('No recorded Positive/Elevated signals yet for this ticker.', '此標的尚無已記錄的正向／偏高預期落差訊號。'),
      guardrails: t('Point-in-time guardrails', '時點資料防護規則'),
      guardrailItems: [
        t('Scores are consumed from daily recorded snapshots or versioned score snapshots.', '分數僅取自每日已記錄快照或版本化分數快照。'),
        t('Server validation rejects a signal when source lineage contains observations dated after the score cutoff.', '若來源血緣包含分數截止時間之後的觀測資料，伺服器驗證會拒絕該訊號。'),
        t('Future prices are used only to evaluate a signal after it existed, never to create that signal.', '未來價格只用於事後評估已存在的訊號，絕不拿來產生該訊號。'),
        t('Small samples and pending outcomes remain visible instead of being filled with synthetic history.', '小樣本與未完成結果會維持可見，而不是用合成歷史資料填補。'),
      ],
      runPersist: t('Run & persist on API', '執行並保存至 API'),
      saved: t('Backtest run saved to SQLite.', '回測結果已儲存至 SQLite。'),
      local: t('API unavailable — showing static point-in-time snapshot.', 'API 無法使用 — 目前顯示靜態時點快照。'),
      running: t('Running…', '執行中…'),
      retained: t('Production API runs are retained for audit.', '正式 API 的執行紀錄會保留以供稽核。'),
      note: t(
        'Backtest statistics are descriptive research diagnostics. They do not establish predictive power and are not investment advice.',
        '回測統計屬於描述性的研究診斷，不代表已證明具有預測能力，也不是投資建議。'
      ),
      statuses: {
        complete: t('complete', '已完成'),
        pending: t('pending', '待完成'),
        rejected: t('rejected', '已拒絕'),
      },
      gaps: {
        Positive: t('Positive', '正向'),
        Elevated: t('Elevated', '偏高'),
        Balanced: t('Balanced', '均衡'),
      },
    },
  };
};
