import React from 'react';
import './SnapshotLoadState.css';

function copy(language) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  return {
    loadingTitle: t('Loading dashboard snapshot', '正在載入儀表板快照'),
    loadingBody: t('Fetching the latest committed research snapshot and source status.', '正在取得最新已提交的研究快照與來源狀態。'),
    errorTitle: t('Dashboard snapshot could not be loaded', '無法載入儀表板快照'),
    errorBody: t('The interface remains available, but sourced observations cannot be shown until the snapshot loads.', '介面仍可瀏覽，但在快照載入前不顯示具來源的觀察資料。'),
    emptyTitle: t('Snapshot loaded with no observations', '快照已載入，但沒有觀察資料'),
    emptyBody: t('Source status is available, but this snapshot does not contain customer-facing observations.', '來源狀態可用，但此快照目前沒有使用者可見的觀察資料。'),
    retry: t('Retry snapshot', '重新載入快照'),
  };
}

export default function SnapshotLoadState({
  state = 'ready',
  hasObservations = true,
  language = 'en',
  onRetry = () => {},
}) {
  const text = copy(language);
  if (state === 'ready' && hasObservations) return null;

  const kind = state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'empty';
  const title = kind === 'loading' ? text.loadingTitle : kind === 'error' ? text.errorTitle : text.emptyTitle;
  const body = kind === 'loading' ? text.loadingBody : kind === 'error' ? text.errorBody : text.emptyBody;

  return <section
    className={`snapshot-load-state ${kind}`}
    role={kind === 'error' ? 'alert' : 'status'}
    aria-live={kind === 'error' ? 'assertive' : 'polite'}
  >
    <div>
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
    {kind === 'loading' ? <div className="snapshot-loading-bars" aria-hidden="true"><i/><i/><i/></div>
      : kind === 'error' ? <button type="button" onClick={onRetry}>{text.retry}</button>
        : null}
  </section>;
}
