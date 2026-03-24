import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_portfolio_history';

export interface HistoryEntry {
  date: string;
  totalValue: number;
}

interface PortfolioHistoryContextValue {
  history: HistoryEntry[];
  recordSnapshot: (totalValue: number) => void;
}

const PortfolioHistoryContext = createContext<PortfolioHistoryContextValue | null>(null);

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function PortfolioHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) {
        try { setHistory(JSON.parse(json)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history)).catch(() => {});
    }
  }, [history, loaded]);

  const recordSnapshot = useCallback((totalValue: number) => {
    if (totalValue <= 0) return;
    const date = todayKey();
    setHistory((prev) => {
      const existing = prev.findIndex((e) => e.date === date);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { date, totalValue };
        return updated;
      }
      const newHistory = [...prev, { date, totalValue }];
      if (newHistory.length > 365) return newHistory.slice(-365);
      return newHistory;
    });
  }, []);

  return (
    <PortfolioHistoryContext.Provider value={{ history, recordSnapshot }}>
      {children}
    </PortfolioHistoryContext.Provider>
  );
}

export function usePortfolioHistory() {
  const ctx = useContext(PortfolioHistoryContext);
  if (!ctx) throw new Error('usePortfolioHistory must be inside PortfolioHistoryProvider');
  return ctx;
}
