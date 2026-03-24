import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import Svg, { Polyline, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import { getMultipleQuotes, Quote } from '../services/finnhub';
import { usePortfolio } from '../context/PortfolioContext';
import { usePortfolioHistory } from '../context/PortfolioHistoryContext';
import { lightTap } from '../utils/haptics';
import Colors from '../constants/colors';

interface PortfolioScreenProps {
  onSelectStock: (ticker: string) => void;
}

export default function PortfolioScreen({ onSelectStock }: PortfolioScreenProps) {
  const { holdings, removeHolding } = usePortfolio();
  const { history, recordSnapshot } = usePortfolioHistory();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (holdings.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const q = await getMultipleQuotes(holdings.map((h) => h.ticker));
      setQuotes(q);

      const total = holdings.reduce((sum, h) => {
        const price = q[h.ticker]?.c ?? h.avgCost;
        return sum + price * h.shares;
      }, 0);
      if (total > 0) recordSnapshot(total);
    } catch {}
    setLoading(false);
  }, [holdings, recordSnapshot]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (holdings.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="pie-chart-outline" size={48} color={Colors.accent} />
        </View>
        <Text style={styles.emptyTitle}>No holdings yet</Text>
        <Text style={styles.emptyText}>
          Search for a stock and tap "Add to Portfolio" to start tracking your investments here.
        </Text>
      </View>
    );
  }

  if (loading && Object.keys(quotes).length === 0) {
    return <LoadingIndicator message="Loading portfolio..." />;
  }

  const enriched = holdings.map((h) => {
    const q = quotes[h.ticker];
    const currentPrice = q?.c ?? h.avgCost;
    const marketValue = currentPrice * h.shares;
    const costBasis = h.avgCost * h.shares;
    const gainDollar = marketValue - costBasis;
    const gainPct = costBasis > 0 ? (gainDollar / costBasis) * 100 : 0;
    const todayChange = q?.dp ?? 0;
    return { ...h, currentPrice, marketValue, costBasis, gainDollar, gainPct, todayChange, quote: q };
  });

  const totalValue = enriched.reduce((sum, h) => sum + h.marketValue, 0);
  const totalCost = enriched.reduce((sum, h) => sum + h.costBasis, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const todayGain = enriched.reduce((sum, h) => {
    const d = h.quote?.d ?? 0;
    return sum + d * h.shares;
  }, 0);

  const sorted = [...enriched].sort((a, b) => b.marketValue - a.marketValue);

  const chartValues = history.length > 1 ? history.map((e) => e.totalValue) : null;
  const chartW = 320;
  const chartH = 60;

  let chartPoints = '';
  let chartArea = '';
  if (chartValues) {
    const min = Math.min(...chartValues);
    const max = Math.max(...chartValues);
    const range = max - min || 1;
    const pts = chartValues.map((v, i) => {
      const x = (i / (chartValues.length - 1)) * chartW;
      const y = chartH - ((v - min) / range) * (chartH - 10) - 5;
      return { x, y };
    });
    chartPoints = pts.map((p) => `${p.x},${p.y}`).join(' ');
    chartArea = `M0,${chartH} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${chartW},${chartH} Z`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
    >
      <View style={styles.titleRow}>
        <Ionicons name="pie-chart" size={24} color={Colors.accent} />
        <Text style={styles.heading}>Portfolio</Text>
      </View>

      {/* Total value card */}
      <Card glow={totalGain >= 0 ? 'green' : 'none'}>
        <Text style={styles.totalLabel}>Total Value</Text>
        <Text style={styles.totalValue}>${totalValue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <View style={styles.totalGainRow}>
          <View style={[styles.gainBadge, { backgroundColor: totalGain >= 0 ? Colors.gainBg : Colors.lossBg }]}>
            <Text style={[styles.gainBadgeText, { color: totalGain >= 0 ? Colors.gain : Colors.loss }]}>
              {totalGain >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%
            </Text>
          </View>
          <Text style={[styles.gainDollar, { color: totalGain >= 0 ? Colors.gain : Colors.loss }]}>
            {totalGain >= 0 ? '+' : ''}${totalGain.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.allTimeLabel}>all time</Text>
        </View>

        {/* History chart */}
        {chartValues && (
          <View style={styles.historyChart}>
            <Svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
              <Defs>
                <LinearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={totalGain >= 0 ? Colors.gain : Colors.loss} stopOpacity={0.2} />
                  <Stop offset="100%" stopColor={totalGain >= 0 ? Colors.gain : Colors.loss} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={chartArea} fill="url(#histGrad)" />
              <Polyline points={chartPoints} fill="none" stroke={totalGain >= 0 ? Colors.gain : Colors.loss} strokeWidth="2" strokeLinecap="round" />
            </Svg>
            <Text style={styles.historyLabel}>{history.length} day{history.length !== 1 ? 's' : ''} tracked</Text>
          </View>
        )}

        <View style={styles.todayRow}>
          <Text style={styles.todayLabel}>Today</Text>
          <Text style={[styles.todayValue, { color: todayGain >= 0 ? Colors.gain : Colors.loss }]}>
            {todayGain >= 0 ? '+' : ''}${todayGain.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </Card>

      {/* Quick stats */}
      <View style={styles.quickRow}>
        <Card style={styles.quickCard}>
          <View style={styles.quickInner}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(24,181,240,0.1)' }]}>
              <Ionicons name="cash-outline" size={18} color={Colors.accent} />
            </View>
            <View>
              <Text style={styles.quickLabel}>Invested</Text>
              <Text style={styles.quickValue}>${totalCost.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
            </View>
          </View>
        </Card>
        <Card style={styles.quickCard}>
          <View style={styles.quickInner}>
            <View style={[styles.quickIcon, { backgroundColor: 'rgba(25,232,90,0.1)' }]}>
              <Ionicons name="bar-chart-outline" size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.quickLabel}>Holdings</Text>
              <Text style={styles.quickValue}>{holdings.length} stock{holdings.length !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Holdings list */}
      <Text style={styles.sectionTitle}>Holdings</Text>

      {sorted.map((h) => {
        const positive = h.gainDollar >= 0;
        const todayPositive = h.todayChange >= 0;
        const alloc = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;

        return (
          <Pressable key={h.ticker} onPress={() => onSelectStock(h.ticker)}>
            <Card style={styles.holdingCard}>
              <View style={styles.holdingTop}>
                <View style={styles.holdingInfo}>
                  <Text style={styles.holdingTicker}>{h.ticker}</Text>
                  <Text style={styles.holdingShares}>{h.shares} share{h.shares !== 1 ? 's' : ''} · avg ${h.avgCost.toFixed(2)}</Text>
                </View>
                <View style={styles.holdingPriceCol}>
                  <Text style={styles.holdingPrice}>${h.currentPrice.toFixed(2)}</Text>
                  <View style={[styles.changePill, { backgroundColor: todayPositive ? Colors.gainBg : Colors.lossBg }]}>
                    <Text style={[styles.changePillText, { color: todayPositive ? Colors.gain : Colors.loss }]}>
                      {todayPositive ? '+' : ''}{h.todayChange.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.allocRow}>
                <View style={styles.allocBarTrack}>
                  <View style={[styles.allocBarFill, { width: `${Math.max(alloc, 2)}%` }]} />
                </View>
                <Text style={styles.allocText}>{alloc.toFixed(1)}%</Text>
              </View>

              <View style={styles.plRow}>
                <View style={styles.plItem}>
                  <Text style={styles.plLabel}>Market Value</Text>
                  <Text style={styles.plValue}>${h.marketValue.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                </View>
                <View style={[styles.plItem, { alignItems: 'flex-end' }]}>
                  <Text style={styles.plLabel}>P&L</Text>
                  <Text style={[styles.plValue, { color: positive ? Colors.gain : Colors.loss }]}>
                    {positive ? '+' : ''}${h.gainDollar.toFixed(2)} ({positive ? '+' : ''}{h.gainPct.toFixed(1)}%)
                  </Text>
                </View>
              </View>

              <Pressable style={styles.removeRow} onPress={() => { removeHolding(h.ticker); lightTap(); }} hitSlop={8}>
                <Ionicons name="trash-outline" size={14} color={Colors.loss} />
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 16 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(24,181,240,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.foreground, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 22 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.foreground },

  totalLabel: { fontSize: 12, color: Colors.mutedForeground, marginBottom: 4 },
  totalValue: { fontSize: 28, fontWeight: '700', color: Colors.foreground },
  totalGainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  gainBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  gainBadgeText: { fontSize: 12, fontWeight: '700' },
  gainDollar: { fontSize: 13, fontWeight: '600' },
  allTimeLabel: { fontSize: 11, color: Colors.mutedForeground },

  historyChart: { marginTop: 12 },
  historyLabel: { fontSize: 10, color: Colors.mutedForeground, marginTop: 4, textAlign: 'center' },

  todayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  todayLabel: { fontSize: 12, color: Colors.mutedForeground },
  todayValue: { fontSize: 13, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, marginBottom: 0 },
  quickInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, color: Colors.mutedForeground },
  quickValue: { fontSize: 14, fontWeight: '700', color: Colors.foreground, marginTop: 2 },

  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  holdingCard: { marginBottom: 0, gap: 10 },
  holdingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdingInfo: { flex: 1 },
  holdingTicker: { fontSize: 16, fontWeight: '700', color: Colors.foreground },
  holdingShares: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },
  holdingPriceCol: { alignItems: 'flex-end', gap: 4 },
  holdingPrice: { fontSize: 15, fontWeight: '600', color: Colors.foreground },
  changePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  changePillText: { fontSize: 11, fontWeight: '700' },

  allocRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  allocBarTrack: { flex: 1, height: 4, backgroundColor: Colors.secondary, borderRadius: 2 },
  allocBarFill: { height: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  allocText: { fontSize: 11, color: Colors.mutedForeground, width: 40, textAlign: 'right' },

  plRow: { flexDirection: 'row', justifyContent: 'space-between' },
  plItem: {},
  plLabel: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  plValue: { fontSize: 13, fontWeight: '600', color: Colors.foreground, marginTop: 2 },

  removeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.lossBg },
  removeText: { fontSize: 11, color: Colors.loss, fontWeight: '600' },
});
