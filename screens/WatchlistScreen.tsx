import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import MiniChart from '../components/MiniChart';
import DetailChartModal from '../components/DetailChartModal';
import LoadingIndicator from '../components/LoadingIndicator';
import { getMultipleQuotes, getCompanyProfile, Quote, CompanyProfile } from '../services/finnhub';
import { useWatchlist } from '../context/WatchlistContext';
import Colors from '../constants/colors';

interface WatchlistScreenProps {
  onSelectStock: (ticker: string) => void;
}

type SortMode = 'added' | 'change' | 'name';

export default function WatchlistScreen({ onSelectStock }: WatchlistScreenProps) {
  const { watchlist, remove } = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [profiles, setProfiles] = useState<Record<string, CompanyProfile>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('added');
  const [chartModal, setChartModal] = useState<{ ticker: string; name: string; quote: Quote } | null>(null);

  const fetchData = useCallback(async () => {
    if (watchlist.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const q = await getMultipleQuotes(watchlist);
      setQuotes(q);

      const newProfiles: Record<string, CompanyProfile> = { ...profiles };
      const missing = watchlist.filter((t) => !newProfiles[t]);
      await Promise.all(
        missing.map(async (sym) => {
          try {
            newProfiles[sym] = await getCompanyProfile(sym);
          } catch {}
        }),
      );
      setProfiles(newProfiles);
    } catch {}
    setLoading(false);
  }, [watchlist]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const sorted = [...watchlist].sort((a, b) => {
    if (sortMode === 'change') {
      return (quotes[b]?.dp ?? 0) - (quotes[a]?.dp ?? 0);
    }
    if (sortMode === 'name') {
      const nameA = profiles[a]?.name || a;
      const nameB = profiles[b]?.name || b;
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  const loaded = sorted.filter((t) => quotes[t]);
  const gainers = loaded.filter((t) => (quotes[t].dp ?? 0) > 0).length;
  const losers = loaded.filter((t) => (quotes[t].dp ?? 0) < 0).length;
  const unchanged = loaded.length - gainers - losers;

  // Empty state
  if (watchlist.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="star-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Your watchlist is empty</Text>
        <Text style={styles.emptyText}>
          Search for a stock and tap the{' '}
          <Ionicons name="star-outline" size={14} color="#FBBF24" />
          {' '}star to start tracking it here.
        </Text>
      </View>
    );
  }

  if (loading && Object.keys(quotes).length === 0) {
    return <LoadingIndicator message="Loading watchlist..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      <View style={styles.titleRow}>
        <Ionicons name="star" size={24} color={Colors.primary} />
        <Text style={styles.heading}>Watchlist</Text>
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: Colors.gain }]} />
          <Text style={styles.summaryCount}>{gainers}</Text>
          <Text style={styles.summaryLabel}>up</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: Colors.loss }]} />
          <Text style={styles.summaryCount}>{losers}</Text>
          <Text style={styles.summaryLabel}>down</Text>
        </View>
        <View style={styles.summaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: Colors.mutedForeground }]} />
          <Text style={styles.summaryCount}>{unchanged}</Text>
          <Text style={styles.summaryLabel}>flat</Text>
        </View>
        <Text style={styles.stockCount}>{watchlist.length} stocks</Text>
      </View>

      {/* Sort controls */}
      <View style={styles.sortRow}>
        {(['added', 'change', 'name'] as SortMode[]).map((mode) => (
          <Pressable
            key={mode}
            style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
            onPress={() => setSortMode(mode)}
          >
            <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
              {mode === 'added' ? 'Recent' : mode === 'change' ? '% Change' : 'A-Z'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Stock list */}
      {sorted.map((sym) => {
        const q = quotes[sym];
        const p = profiles[sym];
        if (!q) return null;
        const change = q.dp ?? 0;
        const positive = change >= 0;

        return (
          <Pressable key={sym} onPress={() => onSelectStock(sym)}>
            <Card style={styles.stockCard}>
              <View style={styles.stockRow}>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockTicker}>{sym}</Text>
                  <Text style={styles.stockName} numberOfLines={1}>
                    {p?.name || sym}
                  </Text>
                </View>

                <MiniChart
                  data={[q.pc, q.o, q.l, q.h, q.c].filter((v) => v > 0)}
                  positive={positive}
                  width={60}
                  height={28}
                  onPress={() => setChartModal({ ticker: sym, name: p?.name || sym, quote: q })}
                />

                <View style={styles.stockPriceCol}>
                  <Text style={styles.stockPrice}>${q.c.toFixed(2)}</Text>
                  <View style={[styles.changePill, { backgroundColor: positive ? Colors.gainBg : change < 0 ? Colors.lossBg : Colors.secondary }]}>
                    <Text style={[styles.changePillText, { color: positive ? Colors.gain : change < 0 ? Colors.loss : Colors.mutedForeground }]}>
                      {positive ? '+' : ''}{change.toFixed(2)}%
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.removeButton}
                  onPress={() => remove(sym)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={16} color={Colors.mutedForeground} />
                </Pressable>
              </View>
            </Card>
          </Pressable>
        );
      })}

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
    gap: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(25, 232, 90, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.foreground,
  },

  // Summary
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.foreground,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  stockCount: {
    marginLeft: 'auto',
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: '500',
  },

  // Sort
  sortRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  sortChipTextActive: {
    color: Colors.primaryForeground,
  },

  // Stock cards
  stockCard: {
    marginBottom: 0,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stockInfo: {
    flex: 1,
    minWidth: 0,
  },
  stockTicker: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  stockName: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  stockPriceCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  stockPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
  },
  changePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  changePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    marginLeft: 4,
  },
});
