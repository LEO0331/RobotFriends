import { createClient } from '@supabase/supabase-js';

const url = String(process.env.REACT_APP_SUPABASE_URL || '').trim();
const key = String(process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '').trim();

export const supabaseConfigured = url.startsWith('https://') && key.startsWith('sb_publishable_');

// Browser auth must use a publishable key. Never accept sb_secret_ / service-role
// credentials here because the compiled React bundle is public.
export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const redirectUrl = () => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
};
