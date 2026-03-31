import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase';

export type OAuthProviderId = 'google' | 'apple';

/** Must match entries in Supabase → Authentication → URL Configuration → Redirect URLs. */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'stockexplorer',
    path: 'auth/callback',
  });
}

function parseOAuthCallbackParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const consume = (segment: string) => {
    const s = segment.replace(/^\?|^#/, '');
    if (!s) return;
    new URLSearchParams(s).forEach((v, k) => {
      out[k] = v;
    });
  };
  const hashIdx = url.indexOf('#');
  const qIdx = url.indexOf('?');
  if (qIdx !== -1) {
    const end = hashIdx > qIdx ? hashIdx : url.length;
    consume(url.slice(qIdx, end));
  }
  if (hashIdx !== -1) consume(url.slice(hashIdx));
  return out;
}

async function getSessionUser(): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signInWithOAuthProvider(
  provider: OAuthProviderId,
): Promise<{ error: string | null; user: User | null }> {
  const supabase = getSupabase();
  if (!supabase) return { error: 'Supabase is not configured.', user: null };

  const redirectTo = getOAuthRedirectUri();
  if (__DEV__) console.log('[OAuth] redirectTo:', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message, user: null };
  if (!data?.url) return { error: 'Could not start sign-in.', user: null };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { error: null, user: null };
  }

  if (result.type !== 'success' || !result.url) {
    return { error: 'Sign-in was not completed.', user: null };
  }

  const params = parseOAuthCallbackParams(result.url);

  if (params.error) {
    return { error: params.error_description || params.error, user: null };
  }

  if (params.code) {
    const { error: ex } = await supabase.auth.exchangeCodeForSession(params.code);
    if (ex) return { error: ex.message, user: null };
    const user = await getSessionUser();
    return { error: null, user };
  }

  const access = params.access_token;
  const refresh = params.refresh_token;
  if (access && refresh) {
    const { error: se } = await supabase.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    });
    if (se) return { error: se.message, user: null };
    const user = await getSessionUser();
    return { error: null, user };
  }

  return {
    error:
      'No session returned from provider. In Supabase → Authentication → URL Configuration, add this redirect URL: '
      + redirectTo,
    user: null,
  };
}
