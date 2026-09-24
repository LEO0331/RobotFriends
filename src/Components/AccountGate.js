import React, { lazy, Suspense, useState } from 'react';

const Account = lazy(() => import('./Account'));

export default function AccountGate({ language = 'en', ...props }) {
  const [enabled, setEnabled] = useState(false);
  const zh = language === 'zh-TW';

  if (!enabled) {
    return <div className="account-entry">
      <button type="button" onClick={() => setEnabled(true)}>
        {zh ? '登入' : 'Sign in'}
      </button>
    </div>;
  }

  return <Suspense fallback={<div className="account-entry"><button type="button" disabled>{zh ? '帳戶…' : 'Account…'}</button></div>}>
    <Account language={language} {...props} />
  </Suspense>;
}
