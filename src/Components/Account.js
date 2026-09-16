import React, { useEffect, useRef, useState } from 'react';
import { supabase, redirectUrl } from '../auth/client';
import './Account.css';

export default function Account({ language, weight, onPreferences }) {
  const zh = language === 'zh-TW';
  const t = (en, tw) => zh ? tw : en;
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const dialog = useRef(null);
  const apply = useRef(onPreferences);
  apply.current = onPreferences;
  const open = next => { setMode(next); setMessage(''); dialog.current.showModal(); };

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'PASSWORD_RECOVERY') { setMode('password'); dialog.current?.showModal(); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false); setWatchlist([]);
    if (!user) return () => { active = false; };
    supabase.from('user_preferences').select('language,weight,watchlist').eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setMessage(t('Could not load saved preferences. Try signing in again.', '無法載入偏好設定，請重新登入。')); return; }
        if (data) { apply.current(data); setWatchlist(data.watchlist || []); }
        setLoaded(true);
      }).catch(() => { if (active) setMessage('Unable to load preferences.'); });
    return () => { active = false; };
    // Reload only when identity changes, not when language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function submit(event) {
    event.preventDefault();
    if (!supabase || busy) return;
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get('email') || '').trim();
    const password = String(fields.get('password') || '');
    setBusy(true); setMessage('');
    try {
      let result;
      if (mode === 'signup') result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
      else if (mode === 'reset') result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
      else if (mode === 'password') result = await supabase.auth.updateUser({ password });
      else result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === 'reset' || (mode === 'signup' && !result.data.session)) setMessage(t('Check your email for the next step. If eligible, a confirmation link will arrive shortly.', '請檢查電子郵件；若符合條件，您將收到確認連結。'));
      else dialog.current.close();
    } catch (error) { setMessage(error.message || t('Request failed. Please retry.', '操作失敗，請重試。')); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.from('user_preferences').upsert({ user_id: user.id, language, weight, watchlist });
      if (error) throw error;
      setMessage(t('Preferences saved to your account.', '偏好設定已儲存至您的帳戶。'));
    } catch { setMessage(t('Unable to save. Your current dashboard settings are still available.', '無法儲存，您目前的儀表板設定仍可使用。')); }
    finally { setBusy(false); }
  }
  async function signOut() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setUser(null); dialog.current.close();
    } catch { setMessage(t('Sign out failed. Please retry.', '登出失敗，請重試。')); }
    finally { setBusy(false); }
  }
  const account = user && mode !== 'password';
  const title = account ? t('Your account', '您的帳戶') : ({ signin: t('Sign in', '登入'), signup: t('Create account', '註冊'), reset: t('Reset password', '重設密碼'), password: t('Set new password', '設定新密碼') })[mode];
  return <div className="account-entry">
    {user ? <button className="avatar" aria-label={t('Account options', '帳戶選項')} onClick={() => open('account')}>{(user.email || 'U').slice(0, 1).toUpperCase()}</button> : <><button onClick={() => open('signin')}>{t('Sign in', '登入')}</button><button onClick={() => open('signup')}>{t('Create account', '註冊')}</button></>}
    <dialog className="account-dialog" ref={dialog} aria-labelledby="account-title" onCancel={e => { if (busy) e.preventDefault(); }}>
      <button className="account-close" disabled={busy} aria-label={t('Close', '關閉')} onClick={() => dialog.current.close()}>×</button>
      <h2 id="account-title">{title}</h2>
      {!supabase ? <p>{t('Accounts are not enabled on this deployment yet. You can continue using the public dashboard.', '此網站尚未啟用帳戶功能，您仍可使用公開儀表板。')}</p> : account ? <>
        <p>{user.email}</p>
        <fieldset disabled={busy || !loaded}><legend>{t('Watchlist', '追蹤清單')}</legend>{['NBIS', 'CRWV', 'ORCL', 'AVGO'].map(symbol => <label key={symbol}><input type="checkbox" checked={watchlist.includes(symbol)} onChange={e => setWatchlist(e.target.checked ? [...watchlist, symbol] : watchlist.filter(item => item !== symbol))}/>{symbol}</label>)}</fieldset>
        <p>{t('Current language / capacity weight', '目前語言 / 容量權重')}: {language} / {weight}%</p>
        <button disabled={busy || !loaded} onClick={save}>{t('Save preferences', '儲存偏好設定')}</button>
        <button disabled={busy} onClick={signOut}>{t('Sign out', '登出')}</button>
      </> : <form onSubmit={submit} key={mode}>
        <p>{t('Public research stays available without an account. Sign in to save your watchlist and settings.', '公開研究無需帳戶。登入即可儲存追蹤清單與設定。')}</p>
        {mode !== 'password' && <label>{t('Email', '電子郵件')}<input required type="email" name="email" autoComplete="email" disabled={busy}/></label>}
        {mode !== 'reset' && <label>{t('Password', '密碼')}<input required minLength={mode === 'signin' ? 1 : 8} type="password" name="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} disabled={busy}/></label>}
        <button type="submit" disabled={busy}>{busy ? t('Please wait…', '請稍候…') : title}</button>
        {mode === 'signin' && <button type="button" disabled={busy} onClick={() => { setMode('reset'); setMessage(''); }}>{t('Forgot password?', '忘記密碼？')}</button>}
        <button type="button" disabled={busy} onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(''); }}>{mode === 'signup' ? t('Already registered? Sign in', '已有帳戶？登入') : t('Create account', '註冊')}</button>
      </form>}
      <p role="status" aria-live="polite">{message}</p>
    </dialog>
  </div>;
}
