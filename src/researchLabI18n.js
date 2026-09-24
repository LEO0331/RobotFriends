export const isTraditionalChinese = language => language === 'zh-TW';

export const researchLabCopy = language => {
  const t = (en, tw) => isTraditionalChinese(language) ? tw : en;
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
  };
};
