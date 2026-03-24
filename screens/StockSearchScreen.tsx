import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/SearchBar';
import StockRow from '../components/StockRow';
import DetailChartModal from '../components/DetailChartModal';
import LoadingIndicator from '../components/LoadingIndicator';
import { searchStocks, getMultipleQuotes, SearchResult, Quote } from '../services/finnhub';
import { useRecentSearches } from '../context/RecentSearchesContext';
import Colors from '../constants/colors';

const POPULAR_TICKERS = ['TSLA', 'NVDA', 'AMC'];
const POPULAR_NAMES: Record<string, string> = {
  TSLA: 'Tesla, Inc.',
  NVDA: 'NVIDIA Corp.',
  AMC: 'AMC Entertainment',
};

interface StockSearchScreenProps {
  onSearch: (ticker: string) => void;
}

export default function StockSearchScreen({ onSearch }: StockSearchScreenProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [popularQuotes, setPopularQuotes] = useState<Record<string, Quote>>({});
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [chartModal, setChartModal] = useState<{ ticker: string; name: string; quote: Quote } | null>(null);
  const latestResults = useRef<SearchResult[]>([]);
  const { recentSearches, addRecent, clearRecent } = useRecentSearches();

  useEffect(() => {
    latestResults.current = results;
  }, [results]);

  useEffect(() => {
    getMultipleQuotes(POPULAR_TICKERS)
      .then(setPopularQuotes)
      .catch(() => {})
      .finally(() => setLoadingPopular(false));
  }, []);

  const selectStock = useCallback((symbol: string) => {
    addRecent(symbol);
    setQuery('');
    setResults([]);
    setNoResults(false);
    onSearch(symbol);
  }, [onSearch, addRecent]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (latestResults.current.length > 0) {
      selectStock(latestResults.current[0].symbol);
      return;
    }

    try {
      const res = await searchStocks(trimmed);
      if (res.length > 0) {
        selectStock(res[0].symbol);
      } else {
        setNoResults(true);
      }
    } catch {
      setNoResults(true);
    }
  }, [query, selectStock]);

  useEffect(() => {
    setNoResults(false);

    if (query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchStocks(query);
        setResults(res.slice(0, 6));
        if (query.length >= 2 && res.length === 0) {
          setNoResults(true);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const showResults = query.length > 0 && (results.length > 0 || searching);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Search</Text>
      <Text style={styles.subheading}>Find any stock for market insights</Text>

      <View style={styles.searchWrapper}>
        <SearchBar value={query} onChangeText={setQuery} onSubmit={handleSearch} />
      </View>

      {showResults && (
        <View style={styles.section}>
          {searching ? (
            <LoadingIndicator message="Searching..." />
          ) : (
            results.map((r) => {
              const isIntl = r.symbol.includes('.');
              return (
                <Pressable
                  key={r.symbol}
                  style={styles.resultRow}
                  onPress={() => selectStock(r.symbol)}
                >
                  <View style={styles.resultLeft}>
                    <Text style={styles.resultSymbol}>{r.symbol}</Text>
                    {isIntl && <Text style={styles.intlBadge}>INTL</Text>}
                  </View>
                  <Text style={styles.resultName} numberOfLines={1}>{r.description}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      {noResults && !searching && query.length > 0 && results.length === 0 && (
        <View style={styles.noResultsContainer}>
          <Ionicons name="search-outline" size={32} color={Colors.mutedForeground} />
          <Text style={styles.noResultsText}>
            No US stocks found for "{query}"
          </Text>
          <Text style={styles.noResultsHint}>
            Try a ticker symbol (e.g. TSLA) or company name
          </Text>
        </View>
      )}

      {!showResults && !noResults && (
        <>
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.mutedForeground} />
                  <Text style={styles.sectionTitle}>Recent</Text>
                </View>
                <Pressable onPress={clearRecent} hitSlop={8}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>
              <View style={styles.pillContainer}>
                {recentSearches.map((ticker) => (
                  <Pressable key={ticker} style={styles.pill} onPress={() => selectStock(ticker)}>
                    <Text style={styles.pillText}>{ticker}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="flame-outline" size={14} color={Colors.mutedForeground} />
                <Text style={styles.sectionTitle}>Popular right now</Text>
              </View>
            </View>
            {loadingPopular ? (
              <LoadingIndicator message="Loading..." />
            ) : (
              POPULAR_TICKERS.map((sym) => {
                const q = popularQuotes[sym];
                if (!q) return null;
                return (
                  <StockRow
                    key={sym}
                    ticker={sym}
                    name={POPULAR_NAMES[sym] || sym}
                    price={q.c.toFixed(2)}
                    change={q.dp ?? 0}
                    chartData={[q.pc, q.o, q.l, q.h, q.c].filter((v) => v > 0)}
                    onPress={() => selectStock(sym)}
                    onChartPress={() => setChartModal({ ticker: sym, name: POPULAR_NAMES[sym] || sym, quote: q })}
                  />
                );
              })
            )}
          </View>
        </>
      )}

      {chartModal && (
        <DetailChartModal
          visible={true}
          onClose={() => setChartModal(null)}
          ticker={chartModal.ticker}
          label={chartModal.name}
          prevClose={chartModal.quote.pc}
          open={chartModal.quote.o}
          high={chartModal.quote.h}
          low={chartModal.quote.l}
          current={chartModal.quote.c}
          changePct={chartModal.quote.dp ?? 0}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
    marginBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: Colors.mutedForeground,
    marginBottom: 20,
  },
  searchWrapper: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  clearText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.secondaryForeground,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 100,
  },
  resultSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  intlBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: 'rgba(24, 181, 240, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  resultName: {
    flex: 1,
    fontSize: 14,
    color: Colors.mutedForeground,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  noResultsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: 4,
  },
  noResultsHint: {
    fontSize: 13,
    color: Colors.mutedForeground,
  },
});
