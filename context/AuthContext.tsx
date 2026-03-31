import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../constants/config';
import { getSupabase } from '../services/supabase';
import { signInWithOAuthProvider, type OAuthProviderId } from '../services/oauthSupabase';

function friendlyNetworkError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('failed to fetch')
    || lower.includes('networkerror')
    || lower.includes('network request failed')
    || lower.includes('load failed')
  ) {
    return [
      'Cannot reach Supabase from this browser.',
      'Try: open the app at http://127.0.0.1:8081 (not localhost), turn off ad blockers for this page,',
      'check your VPN/network, and confirm the project is not paused in the Supabase dashboard.',
    ].join(' ');
  }
  return raw;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  ready: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; session: Session | null }>;
  signInWithOAuth: (provider: OAuthProviderId) => Promise<{ error: string | null; user: User | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  ready: false,
  signInWithPassword: async () => ({ error: 'Not configured' }),
  signUpWithPassword: async () => ({ error: 'Not configured', session: null }),
  signInWithOAuth: async () => ({ error: 'Not configured', user: null }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (__DEV__) console.warn('[Auth] getSession failed:', msg);
      })
      .finally(() => setReady(true));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase is not configured.' };
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { error: error ? friendlyNetworkError(error.message) : null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { error: friendlyNetworkError(msg) };
    }
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string) => {
    try {
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase is not configured.', session: null };
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) return { error: friendlyNetworkError(error.message), session: null };
      return { error: null, session: data.session ?? null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { error: friendlyNetworkError(msg), session: null };
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProviderId) => {
    try {
      const { error, user: oauthUser } = await signInWithOAuthProvider(provider);
      return {
        error: error ? friendlyNetworkError(error) : null,
        user: oauthUser,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      return { error: friendlyNetworkError(msg), user: null };
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        ready,
        signInWithPassword,
        signUpWithPassword,
        signInWithOAuth,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
