export const isTraditionalChinese = language => language === 'zh-TW';

export const researchLabCopy = language => {
  const zh = isTraditionalChinese(language);
  const t = (en, tw) => (zh ? tw : en);

  return {
    languageToggle: zh ? 'EN' : '繁中',
    dockLabel: t('RESEARCH LAB', '研究實驗室'),
    scenarioButton: t('Scenario analysis →', '情境分析 →'),
    backtestButton: t('Price backtest →', '價格回測 →'),
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
      regionLabels: {
        'All regions': t('All regions', '所有區域'),
        Texas: t('Texas', '德州'),
        'Northern Virginia': t('Northern Virginia', '北維吉尼亞'),
        Arizona: t('Arizona', '亞利桑那州'),
        Ohio: t('Ohio', '俄亥俄州'),
      },
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
        'Native signals use recorded snapshots. Demo history may also include clearly labeled point-in-time reconstructions that enforce historical observation cutoffs; reconstructed rows remain partial-quality until all methodology inputs have historical vintages.',
        '原生訊號使用當日實際記錄的快照。示範歷史也可包含清楚標示的時點重建資料，並強制套用歷史資料截止時間；在所有方法論輸入都具備歷史版本前，重建資料會標示為「部分品質」。'
      ),
      howTitle: t('HOW THIS VALIDATION WORKS', '這個驗證如何運作'),
      howItems: days => [
        t('Gridline uses a signal that existed on historical day T.', 'Gridline 使用歷史日期 T 當時已存在的訊號。'),
        t('Only observations available by day T may contribute to a reconstructed signal.', '重建訊號只能使用日期 T 當下已可取得的觀測資料。'),
        t('The market price near day T becomes the entry price.', '接近日期 T 的市場價格作為進場價格。'),
        t(`The signal is evaluated against the price about ${days} days later.`, `訊號會以約 ${days} 天後的價格進行評估。`),
        t('Positive tests subsequent upside; Elevated tests subsequent downside.', '「正向」測試後續上漲；「偏高」測試後續下跌。'),
      ],
      coverageTitle: t('DATA COVERAGE', '資料涵蓋範圍'),
      coverageRange: t('Signal range', '訊號期間'),
      pointInTimeSignals: t('Point-in-time signals', '時點訊號'),
      recordedSignals: t('Recorded', '實際記錄'),
      reconstructedSignals: t('Reconstructed', '歷史重建'),
      dataQuality: t('Reconstruction quality', '重建資料品質'),
      recordedQuality: t('Recorded only', '僅實際記錄'),
      partialQuality: t('Partial — see guardrails', '部分 — 請查看防護規則'),
      completedSignals: t('Completed signals', '已完成訊號'),
      pendingOutcomes: t('Pending outcomes', '待完成結果'),
      hitRate: t('Directional hit rate', '方向命中率'),
      avgReturn: t('Avg directional return', '平均方向報酬'),
      buildingTitle: t('Point-in-time history is still building.', '時點歷史資料仍在累積中。'),
      building: days => t(
        `Completed results appear only after a signal has a full future ${days}-day price window. Recent signals remain pending; Gridline does not fabricate future outcomes.`,
        `只有在訊號取得完整未來 ${days} 天價格區間後，才會產生已完成結果。近期訊號會維持待完成；Gridline 不會虛構未來結果。`
      ),
      signalLedger: t('Signal ledger', '訊號帳本'),
      signalDate: t('Signal date', '訊號日期'),
      gap: t('Gap', '預期落差'),
      origin: t('Origin', '來源'),
      recorded: t('Recorded', '實際記錄'),
      reconstructed: t('Reconstructed', '歷史重建'),
      status: t('Status', '狀態'),
      forwardReturn: t('Forward return', '後續報酬'),
      noSignals: t('No Positive/Elevated point-in-time signals yet for this ticker.', '此標的尚無正向／偏高的時點訊號。'),
      guardrails: t('Point-in-time guardrails', '時點資料防護規則'),
      guardrailItems: [
        t('Recorded rows come from native score snapshots captured on their original date.', '實際記錄資料來自原日期當天產生的原生分數快照。'),
        t('Reconstructed rows enforce an as-of cutoff: future observations cannot enter the signal.', '歷史重建資料強制套用時點截止限制：未來觀測資料不得進入該訊號。'),
        t('Reconstructed rows are explicitly marked Partial while fundamental and structural-exposure inputs do not yet have historical-vintage metadata.', '在基本面與結構性曝險輸入尚未具備歷史版本中繼資料前，歷史重建資料會明確標示為「部分品質」。'),
        t('Future prices are used only to evaluate an existing signal, never to create that signal.', '未來價格只用於評估已存在的訊號，絕不拿來產生該訊號。'),
        t('Small samples and pending outcomes remain visible instead of being filled with synthetic history.', '小樣本與未完成結果會維持可見，而不是用合成歷史資料填補。'),
      ],
      runPersist: t('Run & persist on API', '執行並保存至 API'),
      saved: t('Backtest run saved to SQLite.', '回測結果已儲存至 SQLite。'),
      local: t('API unavailable — showing static point-in-time snapshot.', 'API 無法使用 — 目前顯示靜態時點快照。'),
      running: t('Running…', '執行中…'),
      retained: t('Production API runs are retained for audit.', '正式 API 的執行紀錄會保留以供稽核。'),
      note: t(
        'Backtest statistics are descriptive research diagnostics. Reconstructed rows are clearly separated from native recorded history; neither establishes predictive power or investment advice.',
        '回測統計屬於描述性的研究診斷。歷史重建資料會與原生實際記錄清楚區分；兩者都不代表已證明具有預測能力，也不是投資建議。'
      ),
      statuses: {
        complete: t('complete', '已完成'),
        pending: t('pending', '待完成'),
        rejected: t('rejected', '已拒絕'),
        invalid: t('invalid', '無效'),
        'no-entry-price': t('no entry price', '無進場價格'),
      },
      gaps: {
        Positive: t('Positive', '正向'),
        Elevated: t('Elevated', '偏高'),
        Balanced: t('Balanced', '均衡'),
      },
    },
  };
};
