import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_subscription';

export type SubState = 'none' | 'trial' | 'active' | 'preview' | 'expired';

interface SubscriptionData {
  state: SubState;
  hasCompletedOnboarding: boolean;
  hasSeenNudge: boolean;
  trialEndDate: string | null;
}

interface SubscriptionContextValue {
  subState: SubState;
  hasCompletedOnboarding: boolean;
  hasSeenNudge: boolean;
  trialEndDate: Date | null;
  isFullAccess: boolean;
  startTrial: (plan: 'monthly' | 'annual') => void;
  enterPreview: () => void;
  completeOnboarding: () => void;
  dismissNudge: () => void;
  restorePurchase: () => void;
  loaded: boolean;
}

const defaults: SubscriptionData = {
  state: 'none',
  hasCompletedOnboarding: false,
  hasSeenNudge: false,
  trialEndDate: null,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subState: 'none',
  hasCompletedOnboarding: false,
  hasSeenNudge: false,
  trialEndDate: null,
  isFullAccess: false,
  startTrial: () => {},
  enterPreview: () => {},
  completeOnboarding: () => {},
  dismissNudge: () => {},
  restorePurchase: () => {},
  loaded: false,
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubscriptionData>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) {
          const parsed: SubscriptionData = JSON.parse(json);
          if (parsed.trialEndDate && new Date(parsed.trialEndDate) < new Date()) {
            parsed.state = parsed.state === 'trial' ? 'expired' : parsed.state;
          }
          setData(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }
  }, [data, loaded]);

  const startTrial = useCallback((plan: 'monthly' | 'annual') => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    setData((prev) => ({
      ...prev,
      state: 'trial',
      trialEndDate: end.toISOString(),
      hasCompletedOnboarding: true,
    }));
  }, []);

  const enterPreview = useCallback(() => {
    setData((prev) => ({
      ...prev,
      state: 'preview',
      hasCompletedOnboarding: true,
    }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setData((prev) => ({ ...prev, hasCompletedOnboarding: true }));
  }, []);

  const dismissNudge = useCallback(() => {
    setData((prev) => ({ ...prev, hasSeenNudge: true }));
  }, []);

  const restorePurchase = useCallback(() => {
    // TODO: integrate with StoreKit / Google Billing to verify receipt
    // For now this is a placeholder
  }, []);

  const isFullAccess = data.state === 'trial' || data.state === 'active';

  return (
    <SubscriptionContext.Provider
      value={{
        subState: data.state,
        hasCompletedOnboarding: data.hasCompletedOnboarding,
        hasSeenNudge: data.hasSeenNudge,
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null,
        isFullAccess,
        startTrial,
        enterPreview,
        completeOnboarding,
        dismissNudge,
        restorePurchase,
        loaded,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
