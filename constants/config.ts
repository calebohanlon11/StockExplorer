/**
 * Public env vars only. Set these in a root `.env` file (see `.env.example`).
 * Never commit real API keys or personal admin emails — `.env` is gitignored.
 *
 * Expo inlines `EXPO_PUBLIC_*` at bundle time from `.env`.
 */

function readPublicEnv(name: string): string {
  try {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const v = env?.[name];
    return typeof v === 'string' ? v.trim() : '';
  } catch {
    return '';
  }
}

/** Owner email that receives free full access (must match sign-in email, case-insensitive). */
export const ADMIN_EMAIL = readPublicEnv('EXPO_PUBLIC_ADMIN_EMAIL') || '';

export const FINNHUB_API_KEY = readPublicEnv('EXPO_PUBLIC_FINNHUB_API_KEY');

export const ALPHA_VANTAGE_API_KEY = readPublicEnv('EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY');

/** Supabase project URL (Settings → API). */
export const SUPABASE_URL = readPublicEnv('EXPO_PUBLIC_SUPABASE_URL');

/** Supabase anon (public) key — safe in the client with RLS enabled. */
export const SUPABASE_ANON_KEY = readPublicEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
