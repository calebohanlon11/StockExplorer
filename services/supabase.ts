import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants/config';

let client: SupabaseClient | null = null;

/** Direct localStorage on web avoids edge cases with AsyncStorage + auth in the browser. */
const webAuthStorage = {
  getItem: (key: string): Promise<string | null> =>
    Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  setItem: (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota / private mode */
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    const url = normalizeSupabaseUrl(SUPABASE_URL);
    const key = SUPABASE_ANON_KEY.trim();
    const isWeb = Platform.OS === 'web';

    client = createClient(url, key, {
      auth: {
        storage: isWeb ? webAuthStorage : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isWeb,
      },
    });
  }
  return client;
}
