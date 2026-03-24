import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import StatRow from '../components/StatRow';
import MetricTooltip from '../components/MetricTooltip';
import LoadingIndicator from '../components/LoadingIndicator';
import { getQuote, getCompanyProfile, getStockMetrics, Quote, CompanyProfile, StockMetrics } from '../services/finnhub';
import { useWatchlist } from '../context/WatchlistContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useAlerts } from '../context/AlertsContext';
import { lightTap, successTap } from '../utils/haptics';
import Colors from '../constants/colors';

interface StockDetailScreenProps {
  ticker: string;
  onBack: () => void;
  onViewExplanation: () => void;
  onCompare?: () => void;
}

export default function StockDetailScreen({ ticker, onBack, onViewExplanation, onCompare }: StockDetailScreenProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { isWatched, toggle } = useWatchlist();
  const { addHolding, hasHolding } = usePortfolio();
  const { addAlert, getAlertsForTicker, removeAlert } = useAlerts();
  const watched = isWatched(ticker);
  const inPortfolio = hasHolding(ticker);

  const [showAddModal, setShowAddModal] = useState(false);
  const [sharesInput, setSharesInput] = useState('');
  const [costInput, setCostInput] = useState('');

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');

  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickerAlerts = getAlertsForTicker(ticker);

  const loadData = async (silent = false) => {
    try {
      const [q, p, m] = await Promise.all([
        getQuote(ticker),
        getCompanyProfile(ticker).catch(() => null),
        getStockMetrics(ticker).catch(() => null),
      ]);
      setQuote(q);
      if (p) setProfile(p);
      if (m) setMetrics(m);
    } catch (err) {
      if (!silent) console.warn('StockDetail load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshTimer.current = setInterval(() => {
      getQuote(ticker).then(setQuote).catch(() => {});
    }, 30000);
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current);
    };
  }, [ticker]);

  const handleAdd = () => {
    const shares = parseFloat(sharesInput);
    const cost = parseFloat(costInput);
    if (!shares || shares <= 0) return;
    const finalCost = cost > 0 ? cost : (quote?.c ?? 0);
    addHolding(ticker, shares, finalCost);
    successTap();
    setShowAddModal(false);
    setSharesInput('');
    setCostInput('');
  };

  const handleAddAlert = () => {
    const price = parseFloat(alertPrice);
    if (!price || price <= 0) return;
    addAlert(ticker, price, alertDirection);
    successTap();
    setShowAlertModal(false);
    setAlertPrice('');
  };

  if (loading || !quote) return <LoadingIndicator message={`Loading ${ticker}...`} />;

  const noData = quote.c === 0 && quote.o === 0 && quote.h === 0;
  if (noData) {
    return (
      <View style={styles.errorContainer}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.errorContent}>
          <Ionicons name="globe-outline" size={48} color={Colors.mutedForeground} />
          <Text style={styles.errorTitle}>{ticker}</Text>
          <Text style={styles.errorText}>
            Price data isn't available for this stock. It may trade on an international exchange not covered by our data provider.
          </Text>
        </View>
      </View>
    );
  }

  const change = quote.dp ?? 0;
  const positive = change >= 0;
  const companyName = profile?.name || ticker;
  const exchange = profile?.exchange || '';

  const marketCap = profile?.marketCapitalization
    ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B`
    : '—';

  const dayRange = quote.h - quote.l;
  const dayPosition = dayRange > 0 ? ((quote.c - quote.l) / dayRange) * 100 : 50;

  const high52 = metrics?.['52WeekHigh'] ?? null;
  const low52 = metrics?.['52WeekLow'] ?? null;
  const range52 = (high52 && low52) ? high52 - low52 : 0;
  const pos52 = range52 > 0 ? ((quote.c - low52!) / range52) * 100 : null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.topActions}>
            <Pressable style={styles.topIconBtn} onPress={() => { toggle(ticker); lightTap(); }}>
              <Ionicons name={watched ? 'star' : 'star-outline'} size={20} color={watched ? '#FBBF24' : Colors.mutedForeground} />
            </Pressable>
            <Pressable style={styles.topIconBtn} onPress={() => setShowAlertModal(true)}>
              <Ionicons name="notifications-outline" size={20} color={tickerAlerts.length > 0 ? Colors.accent : Colors.mutedForeground} />
              {tickerAlerts.length > 0 && <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{tickerAlerts.length}</Text></View>}
            </Pressable>
          </View>
        </View>

        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ticker}>{ticker}</Text>
            <Text style={styles.companyName}>
              {companyName}{exchange ? ` · ${exchange}` : ''}
            </Text>
            {profile?.finnhubIndustry && (
              <View style={styles.industryPill}>
                <Text style={styles.industryText}>{profile.finnhubIndustry}</Text>
              </View>
            )}
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${quote.c.toFixed(2)}</Text>
            <View style={styles.changeRow}>
              <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={16} color={positive ? Colors.gain : Colors.loss} />
              <Text style={[styles.changeText, { color: positive ? Colors.gain : Colors.loss }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Active alerts for this stock */}
        {tickerAlerts.length > 0 && (
          <View style={styles.alertsRow}>
            {tickerAlerts.map((a) => (
              <View key={a.id} style={styles.alertChip}>
                <Ionicons name={a.direction === 'above' ? 'arrow-up' : 'arrow-down'} size={10} color={Colors.accent} />
                <Text style={styles.alertChipText}>${a.targetPrice.toFixed(2)}</Text>
                <Pressable onPress={() => removeAlert(a.id)} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color={Colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <Card glow={positive ? 'green' : 'none'} style={styles.chartCard}>
          <Text style={styles.chartLabel}>Today's Range</Text>
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeValue}>${quote.l.toFixed(2)}</Text>
            <Text style={[styles.rangeCurrent, { color: positive ? Colors.gain : Colors.loss }]}>${quote.c.toFixed(2)}</Text>
            <Text style={styles.rangeValue}>${quote.h.toFixed(2)}</Text>
          </View>
          <View style={styles.rangeBarTrack}>
            <View style={[styles.rangeBarFill, { width: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
            <View style={[styles.rangeBarDot, { left: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
          </View>
          <View style={styles.rangeLabelRow}>
            <Text style={styles.rangeHint}>Low</Text>
            <Text style={styles.rangeHint}>High</Text>
          </View>

          {pos52 !== null && high52 && low52 && (
            <>
              <Text style={[styles.chartLabel, { marginTop: 16 }]}>52-Week Range</Text>
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeValue}>${low52.toFixed(2)}</Text>
                <Text style={styles.rangeCurrent}>{pos52.toFixed(0)}%</Text>
                <Text style={styles.rangeValue}>${high52.toFixed(2)}</Text>
              </View>
              <View style={styles.rangeBarTrack}>
                <View style={[styles.rangeBarFill52, { width: `${Math.min(Math.max(pos52, 2), 98)}%` }]} />
                <View style={[styles.rangeBarDot52, { left: `${Math.min(Math.max(pos52, 2), 98)}%` }]} />
              </View>
              <View style={styles.rangeLabelRow}>
                <Text style={styles.rangeHint}>52W Low</Text>
                <Text style={styles.rangeHint}>52W High</Text>
              </View>
            </>
          )}
        </Card>

        <Card style={styles.statsCard}>
          <View style={styles.statsTitleRow}>
            <Text style={styles.cardTitle}>Key Statistics</Text>
            <MetricTooltip metricKey="marketCap" />
          </View>
          <StatRow label="Market Cap" value={marketCap} />
          <StatRow label="Open" value={`$${quote.o.toFixed(2)}`} />
          <StatRow label="Prev Close" value={`$${quote.pc.toFixed(2)}`} />
          {metrics?.peTTM != null && (
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>P/E Ratio</Text>
                <MetricTooltip metricKey="pe" />
              </View>
              <Text style={styles.metricVal}>{metrics.peTTM.toFixed(1)}</Text>
            </View>
          )}
          {metrics?.beta != null && (
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Beta</Text>
                <MetricTooltip metricKey="beta" />
              </View>
              <Text style={styles.metricVal}>{metrics.beta.toFixed(2)}</Text>
            </View>
          )}
          {metrics?.dividendYieldIndicatedAnnual != null && metrics.dividendYieldIndicatedAnnual > 0 && (
            <View style={styles.metricRow}>
              <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>Dividend Yield</Text>
                <MetricTooltip metricKey="dividend" />
              </View>
              <Text style={styles.metricVal}>{metrics.dividendYieldIndicatedAnnual.toFixed(2)}%</Text>
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={onViewExplanation}>
            <Ionicons name="flash" size={16} color={Colors.primaryForeground} />
            <Text style={styles.primaryButtonText}>AI Analysis</Text>
          </Pressable>
          <Pressable style={styles.watchlistButton} onPress={() => { toggle(ticker); lightTap(); }}>
            <Ionicons name={watched ? 'star' : 'star-outline'} size={16} color={watched ? '#FBBF24' : Colors.secondaryForeground} />
            <Text style={styles.watchlistButtonText}>{watched ? 'Watching' : 'Watch'}</Text>
          </Pressable>
        </View>

        {onCompare && (
          <Pressable style={styles.compareButton} onPress={onCompare}>
            <Ionicons name="git-compare-outline" size={16} color={Colors.accent} />
            <Text style={[styles.portfolioButtonText, { color: Colors.accent }]}>Compare with Another Stock</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.portfolioButton, inPortfolio && styles.portfolioButtonOwned]}
          onPress={() => { setShowAddModal(true); lightTap(); }}
        >
          <Ionicons name={inPortfolio ? 'add-circle' : 'pie-chart-outline'} size={16} color={inPortfolio ? Colors.accent : Colors.secondaryForeground} />
          <Text style={[styles.portfolioButtonText, inPortfolio && { color: Colors.accent }]}>
            {inPortfolio ? 'Add More Shares' : 'Add to Portfolio'}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Add to Portfolio Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add {ticker} to Portfolio</Text>
              <Pressable onPress={() => setShowAddModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Number of shares</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. 10" placeholderTextColor={Colors.mutedForeground} keyboardType="decimal-pad" value={sharesInput} onChangeText={setSharesInput} autoFocus />
            <Text style={styles.modalLabel}>Cost per share (optional)</Text>
            <TextInput style={styles.modalInput} placeholder={`Current: $${quote.c.toFixed(2)}`} placeholderTextColor={Colors.mutedForeground} keyboardType="decimal-pad" value={costInput} onChangeText={setCostInput} />
            <Pressable style={styles.modalConfirm} onPress={handleAdd}>
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Price Alert Modal */}
      <Modal visible={showAlertModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Price Alert</Text>
              <Pressable onPress={() => setShowAlertModal(false)} hitSlop={12}>
                <Ionicons name="close" size={22} color={Colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtext}>Current: ${quote.c.toFixed(2)}</Text>
            <View style={styles.directionRow}>
              <Pressable
                style={[styles.directionBtn, alertDirection === 'above' && styles.directionActive]}
                onPress={() => { setAlertDirection('above'); lightTap(); }}
              >
                <Ionicons name="arrow-up" size={14} color={alertDirection === 'above' ? Colors.primaryForeground : Colors.mutedForeground} />
                <Text style={[styles.directionText, alertDirection === 'above' && styles.directionTextActive]}>Goes Above</Text>
              </Pressable>
              <Pressable
                style={[styles.directionBtn, alertDirection === 'below' && styles.directionActive]}
                onPress={() => { setAlertDirection('below'); lightTap(); }}
              >
                <Ionicons name="arrow-down" size={14} color={alertDirection === 'below' ? Colors.primaryForeground : Colors.mutedForeground} />
                <Text style={[styles.directionText, alertDirection === 'below' && styles.directionTextActive]}>Goes Below</Text>
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>Target price</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. 200.00" placeholderTextColor={Colors.mutedForeground} keyboardType="decimal-pad" value={alertPrice} onChangeText={setAlertPrice} autoFocus />
            <Pressable style={styles.modalConfirm} onPress={handleAddAlert}>
              <Text style={styles.modalConfirmText}>Set Alert</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topActions: { flexDirection: 'row', gap: 8 },
  topIconBtn: { padding: 8, borderRadius: 10, backgroundColor: Colors.secondary, position: 'relative' },
  alertBadge: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  alertBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, color: Colors.mutedForeground },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticker: { fontSize: 30, fontWeight: '700', color: Colors.foreground },
  companyName: { fontSize: 14, color: Colors.mutedForeground, marginTop: 2 },
  industryPill: { backgroundColor: Colors.secondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  industryText: { fontSize: 10, color: Colors.mutedForeground, fontWeight: '600' },
  priceContainer: { alignItems: 'flex-end' },
  price: { fontSize: 24, fontWeight: '700', color: Colors.foreground },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  changeText: { fontSize: 14, fontWeight: '600' },

  alertsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  alertChipText: { fontSize: 11, fontWeight: '600', color: Colors.accent },

  chartCard: { marginBottom: 0, gap: 0 },
  chartLabel: { fontSize: 12, color: Colors.mutedForeground, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rangeValue: { fontSize: 12, color: Colors.mutedForeground },
  rangeCurrent: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  rangeBarTrack: { height: 6, backgroundColor: Colors.secondary, borderRadius: 3, position: 'relative' },
  rangeBarFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3, opacity: 0.4 },
  rangeBarDot: { position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, marginLeft: -7 },
  rangeBarFill52: { height: 6, backgroundColor: Colors.primary, borderRadius: 3, opacity: 0.3 },
  rangeBarDot52: { position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary, marginLeft: -7 },
  rangeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rangeHint: { fontSize: 10, color: Colors.mutedForeground },

  statsCard: { marginBottom: 0 },
  statsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 },

  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricLabel: { fontSize: 14, color: Colors.secondaryForeground },
  metricVal: { fontSize: 14, fontWeight: '600', color: Colors.foreground },

  actions: { flexDirection: 'row', gap: 12 },
  primaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12 },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primaryForeground },
  watchlistButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.secondary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
  watchlistButtonText: { fontSize: 15, fontWeight: '600', color: Colors.secondaryForeground },

  compareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent },
  portfolioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.secondary, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  portfolioButtonOwned: { borderColor: Colors.accent, backgroundColor: 'rgba(24,181,240,0.08)' },
  portfolioButtonText: { fontSize: 15, fontWeight: '600', color: Colors.secondaryForeground },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  modalSubtext: { fontSize: 13, color: Colors.mutedForeground },
  modalLabel: { fontSize: 13, color: Colors.mutedForeground, marginTop: 4 },
  modalInput: { backgroundColor: Colors.secondary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.foreground, borderWidth: 1, borderColor: Colors.border },
  modalConfirm: { backgroundColor: Colors.accent, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  modalConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  directionRow: { flexDirection: 'row', gap: 8 },
  directionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.secondary, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  directionActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  directionText: { fontSize: 13, fontWeight: '600', color: Colors.mutedForeground },
  directionTextActive: { color: Colors.primaryForeground },

  errorContainer: { flex: 1 },
  errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 32, marginTop: -60 },
  errorTitle: { fontSize: 24, fontWeight: '700', color: Colors.foreground },
  errorText: { fontSize: 15, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 22 },
});
