import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import { SkeletonCard } from '../components/SkeletonLoader';
import MetricTooltip from '../components/MetricTooltip';
import { getQuote, getCompanyProfile, getStockMetrics, Quote, CompanyProfile, StockMetrics } from '../services/finnhub';
import Colors from '../constants/colors';

interface CompareScreenProps {
  initialTicker?: string;
  onSelectStock: (ticker: string) => void;
}

interface StockData {
  quote: Quote;
  profile: CompanyProfile | null;
  metrics: StockMetrics | null;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined, d = 1): string {
  if (n == null || !isFinite(n)) return '—';
  return n.toFixed(d);
}

function CompareRow({ label, valA, valB, colorize, tooltipKey }: {
  label: string; valA: string; valB: string; colorize?: boolean; tooltipKey?: string;
}) {
  const cA = colorize && valA !== '—' ? (valA.startsWith('+') ? Colors.gain : valA.startsWith('-') ? Colors.loss : Colors.foreground) : Colors.foreground;
  const cB = colorize && valB !== '—' ? (valB.startsWith('+') ? Colors.gain : valB.startsWith('-') ? Colors.loss : Colors.foreground) : Colors.foreground;
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.val, { color: cA }]}>{valA}</Text>
      <View style={rowStyles.labelCol}>
        <View style={rowStyles.labelRow}>
          <Text style={rowStyles.label}>{label}</Text>
          {tooltipKey && <MetricTooltip metricKey={tooltipKey} />}
        </View>
      </View>
      <Text style={[rowStyles.val, { textAlign: 'right', color: cB }]}>{valB}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  val: { width: 70, fontSize: 13, fontWeight: '600', color: Colors.foreground },
  labelCol: { flex: 1, alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { fontSize: 11, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default function CompareScreen({ initialTicker, onSelectStock }: CompareScreenProps) {
  const [tickerA, setTickerA] = useState(initialTicker ?? '');
  const [tickerB, setTickerB] = useState('');
  const [dataA, setDataA] = useState<StockData | null>(null);
  const [dataB, setDataB] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [compared, setCompared] = useState(false);

  async function loadStock(ticker: string): Promise<StockData | null> {
    try {
      const [quote, profile, metrics] = await Promise.all([
        getQuote(ticker),
        getCompanyProfile(ticker).catch(() => null),
        getStockMetrics(ticker).catch(() => null),
      ]);
      return { quote, profile, metrics };
    } catch {
      return null;
    }
  }

  async function handleCompare() {
    const a = tickerA.trim().toUpperCase();
    const b = tickerB.trim().toUpperCase();
    if (!a || !b) return;
    setLoading(true);
    setCompared(false);
    const [da, db] = await Promise.all([loadStock(a), loadStock(b)]);
    setDataA(da);
    setDataB(db);
    setLoading(false);
    setCompared(true);
  }

  useEffect(() => {
    if (initialTicker) {
      setTickerA(initialTicker.toUpperCase());
    }
  }, [initialTicker]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Ionicons name="git-compare" size={24} color={Colors.accent} />
        <Text style={styles.heading}>Compare Stocks</Text>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. AAPL"
            placeholderTextColor={Colors.mutedForeground}
            value={tickerA}
            onChangeText={(t) => setTickerA(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>
        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. MSFT"
            placeholderTextColor={Colors.mutedForeground}
            value={tickerB}
            onChangeText={(t) => setTickerB(t.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>
      </View>

      <Pressable
        style={[styles.compareButton, (!tickerA.trim() || !tickerB.trim()) && styles.compareDisabled]}
        onPress={handleCompare}
        disabled={!tickerA.trim() || !tickerB.trim()}
      >
        <Ionicons name="analytics" size={16} color={Colors.primaryForeground} />
        <Text style={styles.compareButtonText}>Compare</Text>
      </Pressable>

      {loading && (
        <View style={{ gap: 12, marginTop: 12 }}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </View>
      )}

      {compared && dataA && dataB && (
        <>
          {/* Header cards */}
          <View style={styles.headerCards}>
            <Pressable style={styles.headerCard} onPress={() => onSelectStock(tickerA.trim().toUpperCase())}>
              <Text style={styles.hTicker}>{tickerA.trim().toUpperCase()}</Text>
              <Text style={styles.hName} numberOfLines={1}>{dataA.profile?.name ?? tickerA}</Text>
              <Text style={styles.hPrice}>${dataA.quote.c.toFixed(2)}</Text>
              <Text style={[styles.hChange, { color: (dataA.quote.dp ?? 0) >= 0 ? Colors.gain : Colors.loss }]}>
                {(dataA.quote.dp ?? 0) >= 0 ? '+' : ''}{(dataA.quote.dp ?? 0).toFixed(2)}%
              </Text>
            </Pressable>
            <Pressable style={styles.headerCard} onPress={() => onSelectStock(tickerB.trim().toUpperCase())}>
              <Text style={styles.hTicker}>{tickerB.trim().toUpperCase()}</Text>
              <Text style={styles.hName} numberOfLines={1}>{dataB.profile?.name ?? tickerB}</Text>
              <Text style={styles.hPrice}>${dataB.quote.c.toFixed(2)}</Text>
              <Text style={[styles.hChange, { color: (dataB.quote.dp ?? 0) >= 0 ? Colors.gain : Colors.loss }]}>
                {(dataB.quote.dp ?? 0) >= 0 ? '+' : ''}{(dataB.quote.dp ?? 0).toFixed(2)}%
              </Text>
            </Pressable>
          </View>

          {/* Comparison tables */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <CompareRow label="Today" valA={fmtPct(dataA.quote.dp)} valB={fmtPct(dataB.quote.dp)} colorize />
            <CompareRow label="5 Day" valA={fmtPct(dataA.metrics?.['5DayPriceReturnDaily'])} valB={fmtPct(dataB.metrics?.['5DayPriceReturnDaily'])} colorize />
            <CompareRow label="3 Month" valA={fmtPct(dataA.metrics?.['13WeekPriceReturnDaily'])} valB={fmtPct(dataB.metrics?.['13WeekPriceReturnDaily'])} colorize />
            <CompareRow label="1 Year" valA={fmtPct(dataA.metrics?.['52WeekPriceReturnDaily'])} valB={fmtPct(dataB.metrics?.['52WeekPriceReturnDaily'])} colorize />
            <CompareRow label="YTD" valA={fmtPct(dataA.metrics?.yearToDatePriceReturnDaily)} valB={fmtPct(dataB.metrics?.yearToDatePriceReturnDaily)} colorize />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Valuation</Text>
            <CompareRow label="P/E" valA={fmtNum(dataA.metrics?.peTTM)} valB={fmtNum(dataB.metrics?.peTTM)} tooltipKey="pe" />
            <CompareRow label="Forward P/E" valA={fmtNum(dataA.metrics?.forwardPE)} valB={fmtNum(dataB.metrics?.forwardPE)} tooltipKey="forwardPe" />
            <CompareRow label="PEG" valA={fmtNum(dataA.metrics?.pegTTM, 2)} valB={fmtNum(dataB.metrics?.pegTTM, 2)} tooltipKey="peg" />
            <CompareRow label="EV/EBITDA" valA={fmtNum(dataA.metrics?.evEbitdaTTM)} valB={fmtNum(dataB.metrics?.evEbitdaTTM)} tooltipKey="evEbitda" />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Fundamentals</Text>
            <CompareRow label="EPS Growth" valA={fmtPct(dataA.metrics?.epsGrowthTTMYoy)} valB={fmtPct(dataB.metrics?.epsGrowthTTMYoy)} colorize tooltipKey="growth" />
            <CompareRow label="Rev Growth" valA={fmtPct(dataA.metrics?.revenueGrowthTTMYoy)} valB={fmtPct(dataB.metrics?.revenueGrowthTTMYoy)} colorize />
            <CompareRow label="ROE" valA={fmtPct(dataA.metrics?.roeTTM)} valB={fmtPct(dataB.metrics?.roeTTM)} tooltipKey="roe" />
            <CompareRow label="Net Margin" valA={fmtPct(dataA.metrics?.netProfitMarginTTM)} valB={fmtPct(dataB.metrics?.netProfitMarginTTM)} tooltipKey="margin" />
            <CompareRow label="Beta" valA={fmtNum(dataA.metrics?.beta, 2)} valB={fmtNum(dataB.metrics?.beta, 2)} tooltipKey="beta" />
            <CompareRow label="Dividend" valA={dataA.metrics?.dividendYieldIndicatedAnnual ? `${dataA.metrics.dividendYieldIndicatedAnnual.toFixed(2)}%` : '—'} valB={dataB.metrics?.dividendYieldIndicatedAnnual ? `${dataB.metrics.dividendYieldIndicatedAnnual.toFixed(2)}%` : '—'} tooltipKey="dividend" />
          </Card>
        </>
      )}

      {compared && (!dataA || !dataB) && (
        <Card style={styles.section}>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.mutedForeground} />
            <Text style={{ fontSize: 14, color: Colors.mutedForeground, textAlign: 'center' }}>
              Could not load data for one or both tickers. Check the symbols and try again.
            </Text>
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: Colors.foreground },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrap: { flex: 1 },
  input: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vsText: { fontSize: 10, fontWeight: '800', color: Colors.mutedForeground },

  compareButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compareDisabled: { opacity: 0.4 },
  compareButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primaryForeground },

  headerCards: { flexDirection: 'row', gap: 12 },
  headerCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 4,
  },
  hTicker: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  hName: { fontSize: 11, color: Colors.mutedForeground },
  hPrice: { fontSize: 16, fontWeight: '700', color: Colors.foreground, marginTop: 4 },
  hChange: { fontSize: 12, fontWeight: '700' },

  section: { gap: 0 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
});
