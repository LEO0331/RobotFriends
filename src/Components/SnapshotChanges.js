import React, { useMemo, useState } from 'react';
import './SnapshotChanges.css';

const DEFAULT_VISIBLE = 6;
const dateOnly = value => value ? String(value).slice(0, 10) : '—';
const money = value => value !== null && value !== undefined && Number.isFinite(Number(value)) ? String.fromCharCode(36) + Number(value).toFixed(2) : '—';

const signalStates = {
  above: ['Upward', '向上'],
  below: ['Downward', '向下'],
  mixed: ['Mixed', '混合'],
};

const healthStates = {
  ok: ['Healthy', '正常'],
  partial: ['Partial', '部分更新'],
  degraded: ['Degraded', '降級'],
  stale: ['Stale', '過期'],
};

const eventTypes = {
  'event-added': ['New verified event', '新增已驗證事件'],
  'event-updated': ['Verified event updated', '已驗證事件更新'],
  'event-archived': ['Moved to archive', '移至封存'],
};

const categoryZh = { POWER: '供電', GRID: '電網', PERMIT: '許可', CAPEX: '資本支出' };
const regionZh = { Texas: '德州', Arizona: '亞利桑那州', Ohio: '俄亥俄州', 'Northern Virginia': '北維吉尼亞' };

function labels(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    eyebrow: t('SNAPSHOT DIFF', '快照差異'),
    title: t('Changes since previous snapshot', '自上次快照以來的變化'),
    scope: t(
      'Compares material customer-facing fields only: closing prices, recorded trend signals, verified events and source health.',
      '僅比較重要的使用者可見欄位：收盤價、已記錄趨勢訊號、已驗證事件與來源健康狀態。'
    ),
    changes: t('changes', '項變化'),
    noChanges: t('No material customer-facing changes were detected.', '未偵測到重要的使用者可見變化。'),
    unavailable: t('Previous snapshot comparison unavailable', '無法比較前一次快照'),
    unavailableDetail: t(
      'A comparison baseline will appear after a snapshot refresh has a valid immediately preceding snapshot.',
      '當下一次快照更新能取得有效的前一份快照後，這裡會顯示比較基準。'
    ),
    from: t('Previous', '前次'),
    to: t('Current', '目前'),
    price: t('Price', '價格'),
    signal: t('Trend signal', '趨勢訊號'),
    event: t('Verified events', '已驗證事件'),
    health: t('Source health', '來源健康'),
    close: t('close', '收盤價'),
    source: t('Open source ↗', '開啟來源 ↗'),
    observed: t('Observed', '觀察日期'),
    published: t('Published', '發布日期'),
    showAll: t('Show all changes', '顯示全部變化'),
    showLess: t('Show fewer', '收合'),
    selectedFirst: t('Selected company changes are shown first.', '所選公司的變化會優先顯示。'),
    unavailableState: t('Unavailable', '無資料'),
  };
}

function localizePair(pair, language) {
  return language === 'zh-TW' ? pair?.[1] : pair?.[0];
}

function signalState(value, language, unavailable) {
  return localizePair(signalStates[value], language) || unavailable;
}

function healthState(value, language, unavailable) {
  return localizePair(healthStates[value], language) || (value || unavailable);
}

function typeLabel(change, copy, language) {
  if (change.type === 'price') return copy.price;
  if (change.type === 'signal') return copy.signal;
  if (change.type === 'source-health') return copy.health;
  return localizePair(eventTypes[change.type], language) || copy.event;
}

function priority(change, ticker) {
  if (change.ticker === ticker) return 0;
  if (change.type === 'event-added' || change.type === 'event-updated') return 1;
  if (change.type === 'signal') return 2;
  if (change.type === 'price') return 3;
  if (change.type === 'source-health') return 4;
  return 5;
}

function ChangeRow({ change, language, copy }) {
  const zh = language === 'zh-TW';
  let title = '';
  let value = '';
  let meta = null;

  if (change.type === 'price') {
    title = `${change.ticker} ${copy.close}`;
    value = `${money(change.before)} → ${money(change.after)}`;
    meta = `${copy.observed}: ${dateOnly(change.observedAt)}${change.provider ? ` · ${change.provider}` : ''}`;
  } else if (change.type === 'signal') {
    title = `${change.ticker} · ${copy.signal}`;
    value = `${change.beforeAvailable ? signalState(change.before, language, copy.unavailableState) : copy.unavailableState} → ${change.afterAvailable ? signalState(change.after, language, copy.unavailableState) : copy.unavailableState}`;
    meta = change.observedAt ? `${copy.observed}: ${dateOnly(change.observedAt)}` : null;
  } else if (change.type === 'source-health') {
    title = zh ? `${change.source} 來源` : `${change.source} source`;
    value = `${healthState(change.before, language, copy.unavailableState)} → ${healthState(change.after, language, copy.unavailableState)}`;
    meta = change.checkedAt ? `${copy.observed}: ${dateOnly(change.checkedAt)}` : null;
  } else {
    title = change.title || typeLabel(change, copy, language);
    value = typeLabel(change, copy, language);
    const category = zh ? categoryZh[change.category] || change.category : change.category;
    const region = zh ? regionZh[change.region] || change.region : change.region;
    meta = [category, region, change.publishedAt ? `${copy.published}: ${dateOnly(change.publishedAt)}` : null]
      .filter(Boolean)
      .join(' · ');
  }

  return <article className="snapshot-change-row">
    <div className={`snapshot-change-kind ${change.type}`}>{typeLabel(change, copy, language)}</div>
    <div className="snapshot-change-main">
      <h4>{title}</h4>
      <strong>{value}</strong>
      {meta && <small>{meta}</small>}
    </div>
    {change.sourceUrl && <a href={change.sourceUrl} target="_blank" rel="noopener noreferrer">{copy.source}</a>}
  </article>;
}

export default function SnapshotChanges({ snapshot = {}, ticker, language = 'en' }) {
  const [expanded, setExpanded] = useState(false);
  const copy = labels(language);
  const diff = snapshot.snapshotChanges;

  const ordered = useMemo(() => {
    const items = Array.isArray(diff?.changes) ? [...diff.changes] : [];
    return items.sort((a, b) => priority(a, ticker) - priority(b, ticker));
  }, [diff, ticker]);

  if (!diff?.available) {
    return <article className="snapshot-changes-panel snapshot-changes-unavailable">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3>{copy.unavailable}</h3>
        <p>{copy.unavailableDetail}</p>
      </div>
    </article>;
  }

  const visible = expanded ? ordered : ordered.slice(0, DEFAULT_VISIBLE);
  const summary = diff.summary || {};
  const chips = [
    [copy.price, summary.price],
    [copy.signal, summary.signal],
    [copy.event, summary.event],
    [copy.health, summary.sourceHealth],
  ].filter(([, count]) => Number(count) > 0);

  return <article className="snapshot-changes-panel">
    <div className="snapshot-changes-header">
      <div>
        <p className="eyebrow">{copy.eyebrow}</p>
        <h3>{copy.title}</h3>
        <p>{copy.scope}</p>
        <small>{copy.selectedFirst}</small>
      </div>
      <div className="snapshot-change-count">
        <strong>{summary.total ?? ordered.length}</strong>
        <span>{copy.changes}</span>
      </div>
    </div>

    <div className="snapshot-change-range">
      <span>{copy.from}<b>{dateOnly(diff.from)}</b></span>
      <i>→</i>
      <span>{copy.to}<b>{dateOnly(diff.to)}</b></span>
    </div>

    {chips.length > 0 && <div className="snapshot-change-chips">
      {chips.map(([label, count]) => <span key={label}>{label}<b>{count}</b></span>)}
    </div>}

    {ordered.length === 0 ? <p className="snapshot-no-changes">{copy.noChanges}</p> : <>
      <div className="snapshot-change-list">
        {visible.map(change => <ChangeRow key={change.id} change={change} language={language} copy={copy} />)}
      </div>
      {ordered.length > DEFAULT_VISIBLE && <button
        type="button"
        className="text snapshot-change-toggle"
        onClick={() => setExpanded(value => !value)}
        aria-expanded={expanded}
      >{expanded ? copy.showLess : `${copy.showAll} (${ordered.length})`}</button>}
    </>}
  </article>;
}
