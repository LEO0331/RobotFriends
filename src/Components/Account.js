import React, { useCallback, useEffect, useRef, useState } from 'react';
import { redirectUrl, supabase } from '../auth/client';
import './Account.css';

const WATCHLIST_SYMBOLS = ['NBIS', 'CRWV', 'ORCL', 'AVGO'];

function authMessage(error, mode, t) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('rate limit') || message.includes('too many')) return t('Too many attempts. Please wait before trying again.', '嘗試次數過多，請稍候再試。');
  if (mode === 'signin') return t('Unable to sign in with those credentials.', '無法使用這組認證資料登入。');
  if (mode === 'signup') return t('Unable to create the account. Check the information and try again.', '無法建立帳戶，請檢查資料後重試。');
  if (mode === 'reset') return t('Unable to request a reset email right now. Please try later.', '目前無法要求重設郵件，請稍後再試。');
  return t('The authentication request could not be completed. Please retry.', '無法完成帳戶操作，請重試。');
}

export default function Account({ language, weight, onPreferences }) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [preferenceState, setPreferenceState] = useState('idle');
  const [preferenceReload, setPreferenceReload] = useState(0);
  const [watchlist, setWatchlist] = useState([]);
  const userId = user?.id || null;
  const dialog = useRef(null);
  const apply = useRef(onPreferences);
  apply.current = onPreferences;

  const showDialog = useCallback(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  const open = next => {
    setMode(next);
    setMessage('');
    showDialog();
  };

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data?.session?.user || null);
        setSessionReady(true);
      })
      .catch(() => {
        if (active) setSessionReady(true);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user || null);
      setSessionReady(true);
      if (event === 'PASSWORD_RECOVERY') {
        setMode('password');
        setMessage('');
        showDialog();
      }
      if (event === 'SIGNED_OUT') {
        setPreferenceState('idle');
        setWatchlist([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [showDialog]);

  useEffect(() => {
    let active = true;
    setWatchlist([]);
    if (!userId || !supabase) {
      setPreferenceState('idle');
      return () => { active = false; };
    }

    setPreferenceState('loading');
    supabase.from('user_preferences')
      .select('language,weight,watchlist')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setPreferenceState('error');
          return;
        }
        if (data) {
          apply.current(data);
          setWatchlist(Array.isArray(data.watchlist) ? data.watchlist : []);
        }
        setPreferenceState('ready');
      })
      .catch(() => {
        if (active) setPreferenceState('error');
      });

    return () => { active = false; };
  }, [userId, preferenceReload]);

  function validateNewPassword(password, confirmation) {
    if (password.length < 8) {
      return t('Use at least 8 characters for your password.', '密碼至少需要 8 個字元。');
    }
    if (password !== confirmation) {
      return t('The password confirmation does not match.', '兩次輸入的密碼不一致。');
    }
    return '';
  }

  async function submit(event) {
    event.preventDefault();
    if (!supabase || busy) return;

    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') || '').trim();
    const password = String(fields.get('password') || '');
    const confirmation = String(fields.get('confirmPassword') || '');
    const currentPassword = String(fields.get('currentPassword') || '');

    if (['signup', 'password', 'change'].includes(mode)) {
      const validation = validateNewPassword(password, confirmation);
      if (validation) {
        setMessage(validation);
        return;
      }
    }

    setBusy(true);
    setMessage('');

    try {
      let result;
      if (mode === 'signup') {
        result = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl() }
        });
      } else if (mode === 'reset') {
        result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
      } else if (mode === 'password') {
        result = await supabase.auth.updateUser({ password });
      } else if (mode === 'change') {
        result = await supabase.auth.updateUser({ password, current_password: currentPassword });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      if (mode === 'reset') {
        setMessage(t(
          'If an account is eligible, a password-reset email will arrive shortly.',
          '若此帳戶符合條件，系統將很快寄出密碼重設郵件。'
        ));
      } else if (mode === 'signup' && !result.data?.session) {
        setPendingEmail(email);
        setMessage(t(
          'Check your email to confirm the account. You can resend the confirmation below if needed.',
          '請到電子郵件完成帳戶確認；若需要，可在下方重新寄送確認信。'
        ));
      } else if (mode === 'password' || mode === 'change') {
        if (result.data?.user) setUser(result.data.user);
        setMode(result.data?.user || user ? 'account' : 'signin');
        setMessage(t('Password updated successfully.', '密碼已更新。'));
      } else {
        dialog.current?.close();
      }
    } catch (error) {
      setMessage(authMessage(error, mode, t));
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (!supabase || !pendingEmail || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: redirectUrl() }
      });
      if (error) throw error;
      setMessage(t('Confirmation email requested. Check your inbox.', '已重新要求寄送確認信，請檢查收件匣。'));
    } catch (error) {
      setMessage(authMessage(error, 'signup', t));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!supabase || !user || preferenceState !== 'ready' || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.from('user_preferences').upsert(
        { user_id: user.id, language, weight, watchlist },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      setMessage(t('Preferences saved to your account.', '偏好設定已儲存至您的帳戶。'));
    } catch {
      setMessage(t(
        'Unable to save. Your current dashboard settings are still available locally.',
        '無法儲存；目前的儀表板設定仍保留在此瀏覽器。'
      ));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setUser(null);
      setMode('signin');
      dialog.current?.close();
    } catch {
      setMessage(t('Sign out failed. Please retry.', '登出失敗，請重試。'));
    } finally {
      setBusy(false);
    }
  }

  const account = Boolean(user) && mode === 'account';
  const titles = {
    signin: t('Sign in', '登入'),
    signup: t('Create account', '註冊'),
    reset: t('Reset password', '重設密碼'),
    password: t('Set new password', '設定新密碼'),
    change: t('Change password', '變更密碼'),
    account: t('Your account', '您的帳戶')
  };
  const title = titles[mode] || titles.signin;
  const needsEmail = ['signin', 'signup', 'reset'].includes(mode);
  const needsPassword = mode !== 'reset';
  const needsConfirmation = ['signup', 'password', 'change'].includes(mode);

  return <div className="account-entry">
    {!sessionReady && supabase
      ? <button disabled aria-label={t('Loading account', '正在載入帳戶')}>{t('Account…', '帳戶…')}</button>
      : user
        ? <button className="avatar" aria-label={t('Account options', '帳戶選項')} onClick={() => open('account')}>{(user.email || 'U').slice(0, 1).toUpperCase()}</button>
        : <>
          <button onClick={() => open('signin')}>{t('Sign in', '登入')}</button>
          <button onClick={() => open('signup')}>{t('Create account', '註冊')}</button>
        </>}

    <dialog className="account-dialog" ref={dialog} aria-labelledby="account-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <button className="account-close" disabled={busy} aria-label={t('Close', '關閉')} onClick={() => dialog.current?.close()}>×</button>
      <h2 id="account-title">{title}</h2>

      {!supabase ? <div className="account-notice">
        <p>{t(
          'Accounts are not enabled on this deployment yet. The public dashboard remains fully available.',
          '此部署尚未啟用帳戶功能，公開儀表板仍可正常使用。'
        )}</p>
        <small>{t(
          'Add the Supabase project URL and browser-safe publishable key at build time to enable authentication.',
          '建置時加入 Supabase 專案 URL 與可公開的 publishable key，即可啟用帳戶功能。'
        )}</small>
      </div> : account ? <>
        <p className="account-email">{user.email}</p>
        <p className="account-session">{t('Signed in on this browser', '已在此瀏覽器登入')}</p>

        {preferenceState === 'loading' && <p>{t('Loading saved preferences…', '正在載入已儲存的偏好設定…')}</p>}
        {preferenceState === 'error' && <div className="account-notice error">
          <p>{t(
            'Saved preferences could not be loaded. Authentication is active, but the preferences table or policy may not be ready yet.',
            '無法載入已儲存的偏好。登入功能已啟用，但偏好資料表或權限政策可能尚未完成設定。'
          )}</p>
          <button disabled={busy} onClick={() => setPreferenceReload(value => value + 1)}>{t('Retry', '重試')}</button>
        </div>}

        <fieldset disabled={busy || preferenceState !== 'ready'}>
          <legend>{t('Watchlist', '追蹤清單')}</legend>
          {WATCHLIST_SYMBOLS.map(symbol => <label key={symbol}>
            <input
              type="checkbox"
              checked={watchlist.includes(symbol)}
              onChange={event => setWatchlist(event.target.checked
                ? [...watchlist, symbol]
                : watchlist.filter(item => item !== symbol))}
            />
            {symbol}
          </label>)}
        </fieldset>

        <p>{t('Current language / capacity weight', '目前語言 / 容量權重')}: {language} / {weight}%</p>
        <div className="account-actions">
          <button className="primary-action" disabled={busy || preferenceState !== 'ready'} onClick={save}>{t('Save preferences', '儲存偏好設定')}</button>
          <button disabled={busy} onClick={() => { setMode('change'); setMessage(''); }}>{t('Change password', '變更密碼')}</button>
          <button disabled={busy} onClick={signOut}>{t('Sign out', '登出')}</button>
        </div>
      </> : <form onSubmit={submit} key={mode}>
        {mode === 'reset' ? <p>{t(
          'Enter your email. For privacy, the response is the same whether or not an account exists.',
          '輸入電子郵件。為保護隱私，不論帳戶是否存在，畫面都會顯示相同結果。'
        )}</p> : mode === 'password' ? <p>{t(
          'Your recovery link was accepted. Choose a new password to finish recovery.',
          '密碼重設連結已接受，請設定新密碼以完成復原。'
        )}</p> : mode === 'change' ? <p>{t(
          'Confirm your current password, then choose a new password.',
          '先確認目前密碼，再設定新密碼。'
        )}</p> : <p>{t(
          'Public research stays available without an account. Sign in to save your watchlist and settings.',
          '公開研究無需帳戶；登入後可儲存追蹤清單與設定。'
        )}</p>}

        {needsEmail && <label>{t('Email', '電子郵件')}
          <input required type="email" name="email" autoComplete="email" disabled={busy} />
        </label>}

        {mode === 'change' && <label>{t('Current password', '目前密碼')}
          <input required type="password" name="currentPassword" autoComplete="current-password" disabled={busy} />
        </label>}

        {needsPassword && <label>{mode === 'signin' ? t('Password', '密碼') : t('New password', '新密碼')}
          <input
            required
            minLength={mode === 'signin' ? 1 : 8}
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            disabled={busy}
          />
        </label>}

        {needsConfirmation && <label>{t('Confirm new password', '確認新密碼')}
          <input required minLength={8} type="password" name="confirmPassword" autoComplete="new-password" disabled={busy} />
        </label>}

        <button className="primary-action" type="submit" disabled={busy}>
          {busy ? t('Please wait…', '請稍候…') : title}
        </button>

        {mode === 'signin' && <>
          <button type="button" disabled={busy} onClick={() => { setMode('reset'); setMessage(''); }}>{t('Forgot password?', '忘記密碼？')}</button>
          <button type="button" disabled={busy} onClick={() => { setMode('signup'); setMessage(''); }}>{t('Create account', '註冊')}</button>
        </>}
        {mode === 'signup' && <>
          <button type="button" disabled={busy} onClick={() => { setMode('signin'); setMessage(''); }}>{t('Already registered? Sign in', '已有帳戶？登入')}</button>
          {pendingEmail && <button type="button" disabled={busy} onClick={resendConfirmation}>{t('Resend confirmation email', '重新寄送確認信')}</button>}
        </>}
        {mode === 'reset' && <button type="button" disabled={busy} onClick={() => { setMode('signin'); setMessage(''); }}>{t('Back to sign in', '返回登入')}</button>}
        {['password', 'change'].includes(mode) && <button type="button" disabled={busy} onClick={() => { setMode(user ? 'account' : 'signin'); setMessage(''); }}>{t('Cancel', '取消')}</button>}
      </form>}

      <p className="account-status" role="status" aria-live="polite">{message}</p>
    </dialog>
  </div>;
}
