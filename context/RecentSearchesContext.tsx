import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_recent_searches';
const MAX_RECENT = 8;

interface RecentSearchesContextValue {
  recentSearches: string[];
  addRecent: (ticker: string) => void;
  clearRecent: () => void;
}

const RecentSearchesContext = createContext<RecentSearchesContextValue>({
  recentSearches: [],
  addRecent: () => {},
  clearRecent: () => {},
});

export function RecentSearchesProvider({ children }: { children: ReactNode }) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setRecentSearches(JSON.parse(json));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches)).catch(() => {});
    }
  }, [recentSearches, loaded]);

  const addRecent = useCallback((ticker: string) => {
    setRecentSearches((prev) =>
      [ticker, ...prev.filter((t) => t !== ticker)].slice(0, MAX_RECENT),
    );
  }, []);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return (
    <RecentSearchesContext.Provider value={{ recentSearches, addRecent, clearRecent }}>
      {children}
    </RecentSearchesContext.Provider>
  );
}

export function useRecentSearches() {
  return useContext(RecentSearchesContext);
}
