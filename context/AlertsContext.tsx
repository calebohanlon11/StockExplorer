import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_alerts';

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: number;
  triggered: boolean;
}

interface AlertsContextValue {
  alerts: PriceAlert[];
  addAlert: (ticker: string, targetPrice: number, direction: 'above' | 'below') => void;
  removeAlert: (id: string) => void;
  checkAlerts: (quotes: Record<string, { c: number }>) => PriceAlert[];
  getAlertsForTicker: (ticker: string) => PriceAlert[];
  clearTriggered: () => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) {
        try { setAlerts(JSON.parse(json)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)).catch(() => {});
    }
  }, [alerts, loaded]);

  const addAlert = useCallback((ticker: string, targetPrice: number, direction: 'above' | 'below') => {
    const newAlert: PriceAlert = {
      id: `${ticker}-${direction}-${targetPrice}-${Date.now()}`,
      ticker,
      targetPrice,
      direction,
      createdAt: Date.now(),
      triggered: false,
    };
    setAlerts((prev) => [...prev, newAlert]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const checkAlerts = useCallback((quotes: Record<string, { c: number }>): PriceAlert[] => {
    const triggered: PriceAlert[] = [];
    setAlerts((prev) =>
      prev.map((alert) => {
        if (alert.triggered) return alert;
        const q = quotes[alert.ticker];
        if (!q) return alert;
        const hit =
          (alert.direction === 'above' && q.c >= alert.targetPrice) ||
          (alert.direction === 'below' && q.c <= alert.targetPrice);
        if (hit) {
          triggered.push({ ...alert, triggered: true });
          return { ...alert, triggered: true };
        }
        return alert;
      }),
    );
    return triggered;
  }, []);

  const getAlertsForTicker = useCallback((ticker: string) => {
    return alerts.filter((a) => a.ticker === ticker && !a.triggered);
  }, [alerts]);

  const clearTriggered = useCallback(() => {
    setAlerts((prev) => prev.filter((a) => !a.triggered));
  }, []);

  return (
    <AlertsContext.Provider value={{ alerts, addAlert, removeAlert, checkAlerts, getAlertsForTicker, clearTriggered }}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be inside AlertsProvider');
  return ctx;
}
