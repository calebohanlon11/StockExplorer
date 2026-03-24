import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import MiniChart from '../components/MiniChart';
import DetailChartModal from '../components/DetailChartModal';
import StockRow from '../components/StockRow';
import { SkeletonCard, SkeletonStockRow } from '../components/SkeletonLoader';
import { getMultipleQuotes, getCompanyProfile, Quote, CompanyProfile } from '../services/finnhub';
import { useWatchlist } from '../context/WatchlistContext';
import { useAlerts, PriceAlert } from '../context/AlertsContext';
import Colors from '../constants/colors';

const INDEX_SYMBOLS = [
  { symbol: 'SPY', label: 'S&P 500' },
  { symbol: 'QQQ', label: 'NASDAQ' },
  { symbol: 'DIA', label: 'DOW' },
];

const TRENDING_TICKERS = ['TSLA', 'NVDA', 'AAPL', 'META', 'MSFT', 'GOOG', 'AMZN', 'AMD'];

const STOCK_NAMES: Record<string, string> = {
  TSLA: 'Tesla, Inc.',
  NVDA: 'NVIDIA Corp.',
  AAPL: 'Apple Inc.',
  META: 'Meta Platforms',
  MSFT: 'Microsoft Corp.',
  GOOG: 'Alphabet Inc.',
  AMZN: 'Amazon.com Inc.',
  AMD: 'AMD Inc.',
};

interface DashboardScreenProps {
  onSelectStock: (ticker: string) => void;
}

function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const h = et.getHours();
  const m = et.getMinutes();
  const mins = h * 60 + m;
  return day >= 1 && day <= 5 && mins >= 570 && mins < 960;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function DashboardScreen({ onSelectStock }: DashboardScreenProps) {
  const [indexQuotes, setIndexQuotes] = useState<Record<string, Quote>>({});
  const [trendingQuotes, setTrendingQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { watchlist } = useWatchlist();
  const { checkAlerts, alerts } = useAlerts();
  const [triggeredAlerts, setTriggeredAlerts] = useState<PriceAlert[]>([]);

  const [sectorMap, setSectorMap] = useState<Record<string, string>>({});
  const [chartModal, setChartModal] = useState<{ symbol: string; label: string; quote: Quote } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const allSymbols = [...INDEX_SYMBOLS.map((i) => i.symbol), ...TRENDING_TICKERS];
      const uniqueSymbols = [...new Set(allSymbols)];
      const allQuotes = await getMultipleQuotes(uniqueSymbols);

      const idxQ: Record<string, Quote> = {};
      INDEX_SYMBOLS.forEach(({ symbol }) => { if (allQuotes[symbol]) idxQ[symbol] = allQuotes[symbol]; });
      const trendQ: Record<string, Quote> = {};
      TRENDING_TICKERS.forEach((sym) => { if (allQuotes[sym]) trendQ[sym] = allQuotes[sym]; });

      setIndexQuotes(idxQ);
      setTrendingQuotes(trendQ);
      setLastUpdated(new Date());

      const triggered = checkAlerts(allQuotes);
      if (triggered.length > 0) setTriggeredAlerts(triggered);

      if (watchlist.length > 0) {
        const missing = watchlist.filter((t) => !sectorMap[t]);
        if (missing.length > 0) {
          const newMap = { ...sectorMap };
          await Promise.all(
            missing.slice(0, 6).map(async (sym) => {
              try {
                const p = await getCompanyProfile(sym);
                if (p?.finnhubIndustry) newMap[sym] = p.finnhubIndustry;
              } catch {}
            }),
          );
          setSectorMap(newMap);
        }
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
    setLoading(false);
  }, [watchlist, sectorMap, checkAlerts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const marketOpen = isMarketOpen();

  const topMovers = [...TRENDING_TICKERS]
    .filter((sym) => trendingQuotes[sym])
    .sort((a, b) => Math.abs(trendingQuotes[b].dp ?? 0) - Math.abs(trendingQuotes[a].dp ?? 0));

  const sectorCounts: Record<string, number> = {};
  Object.values(sectorMap).forEach((s) => { sectorCounts[s] = (sectorCounts[s] || 0) + 1; });
  const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const activeAlerts = alerts.filter((a) => !a.triggered);

  if (loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.heading}>Markets Overview</Text>
          </View>
        </View>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonStockRow />
        <SkeletonStockRow />
        <SkeletonStockRow />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.heading}>Markets Overview</Text>
        </View>
        <View style={styles.statusCol}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: marketOpen ? Colors.gain : Colors.loss }]} />
            <Text style={[styles.statusText, { color: marketOpen ? Colors.gain : Colors.loss }]}>
              {marketOpen ? 'Market Open' : 'Market Closed'}
            </Text>
          </View>
          {lastUpdated && (
            <Text style={styles.updatedText}>Updated {formatTime(lastUpdated)}</Text>
          )}
        </View>
      </View>

      {/* Triggered alerts banner */}
      {triggeredAlerts.length > 0 && (
        <Card style={styles.alertBanner}>
          <View style={styles.alertHeader}>
            <Ionicons name="notifications" size={18} color="#FBBF24" />
            <Text style={styles.alertTitle}>Price Alerts Triggered</Text>
          </View>
          {triggeredAlerts.map((a) => (
            <Pressable key={a.id} onPress={() => onSelectStock(a.ticker)} style={styles.alertItem}>
              <Text style={styles.alertText}>
                {a.ticker} crossed {a.direction === 'above' ? 'above' : 'below'} ${a.targetPrice.toFixed(2)}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.mutedForeground} />
            </Pressable>
          ))}
        </Card>
      )}

      {/* Index Cards */}
      {INDEX_SYMBOLS.map(({ symbol, label }) => {
        const q = indexQuotes[symbol];
        if (!q) return null;
        const changePct = q.dp ?? 0;
        const changeDollar = q.d ?? 0;
        const positive = changePct >= 0;
        const chartData = [q.pc, q.o, q.l, q.h, q.c].filter((v) => v > 0);
        const dayRange = q.l > 0 && q.h > 0 ? q.h - q.l : 0;
        const dayPosition = dayRange > 0 ? ((q.c - q.l) / dayRange) * 100 : 50;

        return (
          <Card key={symbol} style={styles.indexCard}>
            <View style={styles.indexTop}>
              <View style={styles.indexLeft}>
                <View style={styles.indexLabelRow}>
                  <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={16} color={positive ? Colors.gain : Colors.loss} />
                  <Text style={styles.indexLabel}>{label}</Text>
                  <Text style={styles.indexSymbol}>{symbol}</Text>
                </View>
                <Text style={styles.indexPrice}>{q.c.toLocaleString('en', { minimumFractionDigits: 2 })}</Text>
                <View style={styles.changeRow}>
                  <View style={[styles.changeBadge, { backgroundColor: positive ? Colors.gainBg : Colors.lossBg }]}>
                    <Text style={[styles.changePctText, { color: positive ? Colors.gain : Colors.loss }]}>
                      {positive ? '+' : ''}{changePct.toFixed(2)}%
                    </Text>
                  </View>
                  <Text style={[styles.changeDollar, { color: positive ? Colors.gain : Colors.loss }]}>
                    {positive ? '+' : ''}{changeDollar.toFixed(2)}
                  </Text>
                  <Text style={styles.todayLabel}>today</Text>
                </View>
              </View>
              <View style={styles.indexRight}>
                <MiniChart data={chartData} positive={positive} width={90} height={36} onPress={() => setChartModal({ symbol, label, quote: q })} />
                <Text style={styles.chartTimeframe}>tap for detail</Text>
              </View>
            </View>
            {q.l > 0 && q.h > 0 && (
              <View style={styles.rangeSection}>
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeValue}>{q.l.toFixed(2)}</Text>
                  <Text style={styles.rangeTitle}>Day Range</Text>
                  <Text style={styles.rangeValue}>{q.h.toFixed(2)}</Text>
                </View>
                <View style={styles.rangeBarTrack}>
                  <View style={[styles.rangeBarFill, { width: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
                  <View style={[styles.rangeBarDot, { left: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
                </View>
              </View>
            )}
          </Card>
        );
      })}

      {/* Active alerts count */}
      {activeAlerts.length > 0 && (
        <View style={styles.alertCountRow}>
          <Ionicons name="notifications-outline" size={14} color={Colors.accent} />
          <Text style={styles.alertCountText}>{activeAlerts.length} active price alert{activeAlerts.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Sector breakdown */}
      {topSectors.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="grid-outline" size={14} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Your Sectors</Text>
            </View>
            <Text style={styles.sectionSubtitle}>From watchlist</Text>
          </View>
          <View style={styles.sectorRow}>
            {topSectors.map(([sector, count]) => (
              <View key={sector} style={styles.sectorPill}>
                <Text style={styles.sectorText}>{sector}</Text>
                <View style={styles.sectorCount}>
                  <Text style={styles.sectorCountText}>{count}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Top Movers */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flash" size={14} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Top Movers Today</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Sorted by largest move</Text>
      </View>

      {topMovers.map((sym) => {
        const q = trendingQuotes[sym];
        if (!q) return null;
        return (
          <StockRow
            key={sym}
            ticker={sym}
            name={STOCK_NAMES[sym] || sym}
            price={q.c.toFixed(2)}
            change={q.dp ?? 0}
            chartData={[q.pc, q.o, q.l, q.h, q.c].filter((v) => v > 0)}
            onPress={() => onSelectStock(sym)}
            onChartPress={() => setChartModal({ symbol: sym, label: STOCK_NAMES[sym] || sym, quote: q })}
          />
        );
      })}

      {/* Detail chart modal */}
      {chartModal && (
        <DetailChartModal
          visible={true}
          onClose={() => setChartModal(null)}
          ticker={chartModal.symbol}
          label={chartModal.label}
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
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 12 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { fontSize: 14, color: Colors.mutedForeground },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.foreground, marginTop: 2 },
  statusCol: { alignItems: 'flex-end', gap: 4, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  updatedText: { fontSize: 11, color: Colors.mutedForeground },

  alertBanner: { backgroundColor: 'rgba(251,191,36,0.06)', borderColor: 'rgba(251,191,36,0.2)', gap: 8 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#FBBF24' },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  alertText: { fontSize: 13, color: Colors.foreground },

  alertCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  alertCountText: { fontSize: 12, color: Colors.accent },

  indexCard: { gap: 12, marginBottom: 0 },
  indexTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  indexLeft: { flex: 1, gap: 4 },
  indexLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  indexLabel: { fontSize: 14, fontWeight: '600', color: Colors.foreground },
  indexSymbol: { fontSize: 11, color: Colors.mutedForeground, backgroundColor: Colors.secondary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  indexPrice: { fontSize: 22, fontWeight: '700', color: Colors.foreground, marginTop: 2 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  changePctText: { fontSize: 12, fontWeight: '700' },
  changeDollar: { fontSize: 12, fontWeight: '500' },
  todayLabel: { fontSize: 11, color: Colors.mutedForeground },
  indexRight: { alignItems: 'flex-end', gap: 4 },
  chartTimeframe: { fontSize: 10, color: Colors.mutedForeground },

  rangeSection: { gap: 6, marginTop: 4 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rangeTitle: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeValue: { fontSize: 11, color: Colors.secondaryForeground, fontWeight: '500' },
  rangeBarTrack: { height: 4, backgroundColor: Colors.secondary, borderRadius: 2, position: 'relative' },
  rangeBarFill: { height: 4, backgroundColor: Colors.accent, borderRadius: 2, opacity: 0.4 },
  rangeBarDot: { position: 'absolute', top: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent, marginLeft: -5 },

  sectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  sectorText: { fontSize: 12, color: Colors.secondaryForeground },
  sectorCount: { backgroundColor: Colors.accent, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectorCountText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 11, color: Colors.mutedForeground },
});
