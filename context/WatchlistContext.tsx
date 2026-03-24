import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@stockexplorer_watchlist';

interface WatchlistContextValue {
  watchlist: string[];
  isWatched: (ticker: string) => boolean;
  toggle: (ticker: string) => void;
  remove: (ticker: string) => void;
}

const WatchlistContext = createContext<WatchlistContextValue>({
  watchlist: [],
  isWatched: () => false,
  toggle: () => {},
  remove: () => {},
});

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) setWatchlist(JSON.parse(json));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist)).catch(() => {});
    }
  }, [watchlist, loaded]);

  const isWatched = useCallback(
    (ticker: string) => watchlist.includes(ticker),
    [watchlist],
  );

  const toggle = useCallback((ticker: string) => {
    setWatchlist((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker],
    );
  }, []);

  const remove = useCallback((ticker: string) => {
    setWatchlist((prev) => prev.filter((t) => t !== ticker));
  }, []);

  return (
    <WatchlistContext.Provider value={{ watchlist, isWatched, toggle, remove }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
