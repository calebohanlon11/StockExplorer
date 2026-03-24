import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_portfolio';

export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
}

interface PortfolioContextValue {
  holdings: Holding[];
  addHolding: (ticker: string, shares: number, costPerShare: number) => void;
  removeHolding: (ticker: string) => void;
  getHolding: (ticker: string) => Holding | undefined;
  hasHolding: (ticker: string) => boolean;
}

const PortfolioContext = createContext<PortfolioContextValue>({
  holdings: [],
  addHolding: () => {},
  removeHolding: () => {},
  getHolding: () => undefined,
  hasHolding: () => false,
});

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setHoldings(JSON.parse(json));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(holdings)).catch(() => {});
    }
  }, [holdings, loaded]);

  const addHolding = useCallback((ticker: string, shares: number, costPerShare: number) => {
    setHoldings((prev) => {
      const existing = prev.find((h) => h.ticker === ticker);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.avgCost * existing.shares + costPerShare * shares;
        const newAvg = totalCost / totalShares;
        return prev.map((h) =>
          h.ticker === ticker ? { ...h, shares: totalShares, avgCost: newAvg } : h,
        );
      }
      return [...prev, { ticker, shares, avgCost: costPerShare }];
    });
  }, []);

  const removeHolding = useCallback((ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
  }, []);

  const getHolding = useCallback(
    (ticker: string) => holdings.find((h) => h.ticker === ticker),
    [holdings],
  );

  const hasHolding = useCallback(
    (ticker: string) => holdings.some((h) => h.ticker === ticker),
    [holdings],
  );

  return (
    <PortfolioContext.Provider value={{ holdings, addHolding, removeHolding, getHolding, hasHolding }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}
