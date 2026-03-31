import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured } from '../constants/config';
import { getSupabase } from '../services/supabase';
import { useAuth } from './AuthContext';

const LEGACY_STORAGE_KEY = '@stockexplorer_subscription';
const LOCAL_PREFS_KEY = '@stockexplorer_local_prefs';

export type SubState = 'none' | 'trial' | 'active' | 'preview' | 'expired' | 'admin';

interface LocalPrefs {
  hasCompletedOnboarding: boolean;
  hasSeenNudge: boolean;
}

interface LegacySubscriptionData {
  state: SubState;
  hasCompletedOnboarding: boolean;
  hasSeenNudge: boolean;
  trialEndDate: string | null;
  userEmail: string | null;
}

interface DbProfileRow {
  id: string;
  email: string | null;
  is_admin: boolean;
  subscription_state: string;
  trial_ends_at: string | null;
}

interface SubscriptionContextValue {
  subState: SubState;
  hasCompletedOnboarding: boolean;
  hasSeenNudge: boolean;
  trialEndDate: Date | null;
  userEmail: string | null;
  isFullAccess: boolean;
  isAdmin: boolean;
  startTrial: (plan: 'monthly' | 'annual') => Promise<void>;
  enterPreview: () => Promise<void>;
  setAdmin: (email: string) => void;
  setUserEmail: (email: string) => void;
  completeOnboarding: () => void;
  dismissNudge: () => void;
  restorePurchase: () => void;
  signOut: () => Promise<void>;
  refreshEntitlements: () => Promise<void>;
  loaded: boolean;
}

const defaultPrefs: LocalPrefs = {
  hasCompletedOnboarding: false,
  hasSeenNudge: false,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subState: 'none',
  hasCompletedOnboarding: false,
  hasSeenNudge: false,
  trialEndDate: null,
  userEmail: null,
  isFullAccess: false,
  isAdmin: false,
  startTrial: async () => {},
  enterPreview: async () => {},
  setAdmin: () => {},
  setUserEmail: () => {},
  completeOnboarding: () => {},
  dismissNudge: () => {},
  restorePurchase: () => {},
  signOut: async () => {},
  refreshEntitlements: async () => {},
  loaded: false,
});

function effectiveStateFromProfile(p: DbProfileRow): SubState {
  if (p.is_admin) return 'admin';
  const raw = p.subscription_state as SubState;
  if (raw === 'trial' && p.trial_ends_at) {
    if (new Date(p.trial_ends_at) <= new Date()) return 'expired';
    return 'trial';
  }
  if (raw === 'active' || raw === 'preview' || raw === 'expired' || raw === 'none') return raw;
  return 'none';
}

function SubscriptionProviderInner({ children }: { children: ReactNode }) {
  const { user, session, ready: authReady, signOut: authSignOut } = useAuth();
  const supabaseMode = isSupabaseConfigured();

  const [localPrefs, setLocalPrefs] = useState<LocalPrefs>(defaultPrefs);
  const [legacy, setLegacy] = useState<LegacySubscriptionData | null>(null);
  const [profile, setProfile] = useState<DbProfileRow | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadLocalPrefs = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem(LOCAL_PREFS_KEY);
      if (json) {
        const p = JSON.parse(json) as LocalPrefs;
        setLocalPrefs({
          hasCompletedOnboarding: !!p.hasCompletedOnboarding,
          hasSeenNudge: !!p.hasSeenNudge,
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistLocalPrefs = useCallback(async (patch: Partial<LocalPrefs>) => {
    setLocalPrefs((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!supabaseMode || !user) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setProfileLoaded(true);
      return;
    }
    setProfileLoaded(false);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, is_admin, subscription_state, trial_ends_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data as DbProfileRow);
    }
    setProfileLoaded(true);
  }, [supabaseMode, user]);

  useEffect(() => {
    if (!supabaseMode) {
      AsyncStorage.getItem(LEGACY_STORAGE_KEY)
        .then((json) => {
          if (json) {
            const parsed = JSON.parse(json) as LegacySubscriptionData;
            if (parsed.trialEndDate && new Date(parsed.trialEndDate) < new Date()) {
              parsed.state = parsed.state === 'trial' ? 'expired' : parsed.state;
            }
            setLegacy(parsed);
          } else {
            setLegacy({
              state: 'none',
              hasCompletedOnboarding: false,
              hasSeenNudge: false,
              trialEndDate: null,
              userEmail: null,
            });
          }
        })
        .catch(() =>
          setLegacy({
            state: 'none',
            hasCompletedOnboarding: false,
            hasSeenNudge: false,
            trialEndDate: null,
            userEmail: null,
          }),
        );
      return;
    }
    loadLocalPrefs();
  }, [supabaseMode, loadLocalPrefs]);

  useEffect(() => {
    if (!supabaseMode || !authReady) return;
    if (!session?.user) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    fetchProfile();
  }, [supabaseMode, authReady, session?.user?.id, fetchProfile]);

  useEffect(() => {
    if (!supabaseMode || !legacy) return;
    AsyncStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy)).catch(() => {});
  }, [legacy, supabaseMode]);

  const refreshEntitlements = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const startTrial = useCallback(
    async (_plan: 'monthly' | 'annual') => {
      if (supabaseMode && user) {
        const supabase = getSupabase();
        if (supabase) {
          const { error } = await supabase.rpc('start_app_trial');
          if (!error) await fetchProfile();
        }
        await persistLocalPrefs({ hasCompletedOnboarding: true });
        return;
      }
      const end = new Date();
      end.setDate(end.getDate() + 7);
      setLegacy((prev) => ({
        ...(prev ?? {
          state: 'none',
          hasCompletedOnboarding: false,
          hasSeenNudge: false,
          trialEndDate: null,
          userEmail: null,
        }),
        state: 'trial',
        trialEndDate: end.toISOString(),
        hasCompletedOnboarding: true,
      }));
    },
    [supabaseMode, user, fetchProfile, persistLocalPrefs],
  );

  const enterPreview = useCallback(async () => {
    if (supabaseMode && user) {
      const supabase = getSupabase();
      if (supabase) {
        const { error } = await supabase.rpc('enter_app_preview');
        if (!error) await fetchProfile();
      }
      await persistLocalPrefs({ hasCompletedOnboarding: true });
      return;
    }
    setLegacy((prev) => ({
      ...(prev ?? {
        state: 'none',
        hasCompletedOnboarding: false,
        hasSeenNudge: false,
        trialEndDate: null,
        userEmail: null,
      }),
      state: 'preview',
      hasCompletedOnboarding: true,
    }));
  }, [supabaseMode, user, fetchProfile, persistLocalPrefs]);

  const setAdmin = useCallback((email: string) => {
    if (supabaseMode) return;
    setLegacy((prev) => ({
      ...(prev ?? {
        state: 'none',
        hasCompletedOnboarding: false,
        hasSeenNudge: false,
        trialEndDate: null,
        userEmail: null,
      }),
      state: 'admin',
      userEmail: email,
      hasCompletedOnboarding: true,
    }));
  }, [supabaseMode]);

  const setUserEmail = useCallback((email: string) => {
    if (supabaseMode) return;
    setLegacy((prev) => ({
      ...(prev ?? {
        state: 'none',
        hasCompletedOnboarding: false,
        hasSeenNudge: false,
        trialEndDate: null,
        userEmail: null,
      }),
      userEmail: email,
    }));
  }, [supabaseMode]);

  const completeOnboarding = useCallback(async () => {
    if (supabaseMode) {
      await persistLocalPrefs({ hasCompletedOnboarding: true });
      return;
    }
    setLegacy((prev) => ({
      ...(prev ?? {
        state: 'none',
        hasCompletedOnboarding: false,
        hasSeenNudge: false,
        trialEndDate: null,
        userEmail: null,
      }),
      hasCompletedOnboarding: true,
    }));
  }, [supabaseMode, persistLocalPrefs]);

  const dismissNudge = useCallback(async () => {
    if (supabaseMode) {
      await persistLocalPrefs({ hasSeenNudge: true });
      return;
    }
    setLegacy((prev) => ({
      ...(prev ?? {
        state: 'none',
        hasCompletedOnboarding: false,
        hasSeenNudge: false,
        trialEndDate: null,
        userEmail: null,
      }),
      hasSeenNudge: true,
    }));
  }, [supabaseMode, persistLocalPrefs]);

  const restorePurchase = useCallback(() => {
    // RevenueCat / store restore — placeholder
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    if (supabaseMode) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    setLegacy({
      state: 'none',
      hasCompletedOnboarding: false,
      hasSeenNudge: false,
      trialEndDate: null,
      userEmail: null,
    });
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
  }, [authSignOut, supabaseMode]);

  let subState: SubState = 'none';
  let trialEndDate: Date | null = null;
  let userEmail: string | null = null;
  let isAdmin = false;

  if (supabaseMode) {
    if (user) {
      const email = user.email ?? profile?.email ?? null;
      userEmail = email;
      if (profile) {
        subState = effectiveStateFromProfile(profile);
        isAdmin = profile.is_admin;
        trialEndDate = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
      } else {
        subState = 'none';
      }
    }
  } else if (legacy) {
    subState = legacy.state;
    trialEndDate = legacy.trialEndDate ? new Date(legacy.trialEndDate) : null;
    userEmail = legacy.userEmail;
    isAdmin = legacy.state === 'admin';
  }

  const isFullAccess = isAdmin || subState === 'trial' || subState === 'active';

  const loaded = supabaseMode
    ? authReady && (user ? profileLoaded : true)
    : legacy !== null;

  const hasCompletedOnboarding = supabaseMode
    ? localPrefs.hasCompletedOnboarding
    : legacy?.hasCompletedOnboarding ?? false;

  const hasSeenNudge = supabaseMode
    ? localPrefs.hasSeenNudge
    : legacy?.hasSeenNudge ?? false;

  return (
    <SubscriptionContext.Provider
      value={{
        subState,
        hasCompletedOnboarding,
        hasSeenNudge,
        trialEndDate,
        userEmail,
        isFullAccess,
        isAdmin,
        startTrial,
        enterPreview,
        setAdmin,
        setUserEmail,
        completeOnboarding,
        dismissNudge,
        restorePurchase,
        signOut,
        refreshEntitlements,
        loaded,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProviderInner>{children}</SubscriptionProviderInner>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
