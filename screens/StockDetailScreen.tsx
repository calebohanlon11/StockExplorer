import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import StatRow from '../components/StatRow';
import MetricTooltip from '../components/MetricTooltip';
import LoadingIndicator from '../components/LoadingIndicator';
import SkeletonLoader from '../components/SkeletonLoader';
import { getQuote, getCompanyProfile, getStockMetrics, Quote, CompanyProfile, StockMetrics } from '../services/finnhub';
import {
  runSetupAnalysis, SetupAnalysis, SetupLabel, ConfidenceLevel,
} from '../services/analysis';
import { useWatchlist } from '../context/WatchlistContext';
import { usePortfolio } from '../context/PortfolioContext';
import { useAlerts } from '../context/AlertsContext';
import { useSubscription } from '../context/SubscriptionContext';
import LockedGate from '../components/LockedGate';
import { lightTap, successTap } from '../utils/haptics';
import Colors from '../constants/colors';

interface StockDetailScreenProps {
  ticker: string;
  onBack: () => void;
  onViewAnalysis: () => void;
  onCompare?: () => void;
}

const SETUP_COLOR: Record<SetupLabel, string> = {
  'Favorable Setup': Colors.gain,
  'Cautiously Positive': '#4ADE80',
  'Mixed Setup': '#FBBF24',
  'Cautiously Negative': '#F97316',
  'Weak Setup': Colors.loss,
};

const SETUP_ICON: Record<SetupLabel, keyof typeof Ionicons.glyphMap> = {
  'Favorable Setup': 'checkmark-circle',
  'Cautiously Positive': 'arrow-up-circle',
  'Mixed Setup': 'swap-horizontal-outline',
  'Cautiously Negative': 'arrow-down-circle',
  'Weak Setup': 'alert-circle',
};

const CONF_COLOR: Record<ConfidenceLevel, string> = {
  'Moderate-high': Colors.gain,
  'Moderate': '#FBBF24',
  'Low-moderate': '#F97316',
  'Low — elevated uncertainty': Colors.loss,
};

export default function StockDetailScreen({ ticker, onBack, onViewAnalysis, onCompare }: StockDetailScreenProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupAnalysis | null>(null);
  const [setupLoading, setSetupLoading] = useState(true);
  const [showMarketData, setShowMarketData] = useState(false);
  const { isWatched, toggle } = useWatchlist();
  const { addHolding, hasHolding, getHolding } = usePortfolio();
  const { addAlert, getAlertsForTicker, removeAlert } = useAlerts();
  const { isFullAccess } = useSubscription();
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

  const loadData = async () => {
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
      console.warn('StockDetail load error:', err);
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

  useEffect(() => {
    if (!quote || quote.c === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const ownsStock = hasHolding(ticker);
        const holding = getHolding(ticker);
        let holdingInfo: { ownsStock: boolean; gainPct: number | null } | undefined;
        if (ownsStock && holding) {
          holdingInfo = { ownsStock: true, gainPct: ((quote.c - holding.avgCost) / holding.avgCost) * 100 };
        }
        const result = await runSetupAnalysis(ticker, quote, holdingInfo);
        if (!cancelled && result) setSetupData(result);
      } catch {}
      if (!cancelled) setSetupLoading(false);
    })();

    return () => { cancelled = true; };
  }, [quote?.c, ticker]);

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
    ? (profile.marketCapitalization >= 1000
      ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B`
      : `$${profile.marketCapitalization.toFixed(0)}M`)
    : '—';

  const dayRange = quote.h - quote.l;
  const dayPosition = dayRange > 0 ? ((quote.c - quote.l) / dayRange) * 100 : 50;

  const high52 = metrics?.['52WeekHigh'] ?? null;
  const low52 = metrics?.['52WeekLow'] ?? null;
  const range52 = (high52 && low52) ? high52 - low52 : 0;
  const pos52 = range52 > 0 ? ((quote.c - low52!) / range52) * 100 : null;

  const topPositive = setupData?.factors.filter(f => f.score > 0.2).sort((a, b) => b.score - a.score)[0] ?? null;
  const topRisk = setupData?.factors.filter(f => f.score < -0.2).sort((a, b) => a.score - b.score)[0] ?? null;
  const analog = setupData?.historical?.analog ?? null;

  const setupSummaryFirstSentence = setupData?.setupSummary?.split('. ')[0]
    ? setupData.setupSummary.split('. ')[0] + '.'
    : null;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ── Top Bar ─────────────────────────────── */}
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

        {/* ── Header ──────────────────────────────── */}
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
            <View style={[styles.changePill, { backgroundColor: positive ? Colors.gainBg : Colors.lossBg }]}>
              <Ionicons name={positive ? 'trending-up' : 'trending-down'} size={13} color={positive ? Colors.gain : Colors.loss} />
              <Text style={[styles.changeText, { color: positive ? Colors.gain : Colors.loss }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        {/* ── Active alerts ───────────────────────── */}
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

        {/* ── Insight Blocks (gated for preview users) ── */}
        {!isFullAccess ? (
          <LockedGate onUpgrade={onViewAnalysis} />
        ) : (
        <>
        {/* ── 1. Setup Preview (hero insight block) ── */}
        {setupLoading ? (
          <Card style={styles.setupPreviewCard}>
            <SkeletonLoader width="35%" height={10} />
            <SkeletonLoader width="55%" height={22} style={{ marginTop: 8 }} />
            <SkeletonLoader width="90%" height={13} style={{ marginTop: 8 }} />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <SkeletonLoader width="45%" height={36} borderRadius={10} />
              <SkeletonLoader width="45%" height={36} borderRadius={10} />
            </View>
          </Card>
        ) : setupData ? (
          <Pressable onPress={onViewAnalysis}>
            <Card style={{ ...styles.setupPreviewCard, borderLeftWidth: 3, borderLeftColor: SETUP_COLOR[setupData.setupLabel] }}>
              <View style={styles.setupPreviewHeader}>
                <View style={styles.setupPreviewTitleRow}>
                  <Ionicons name={SETUP_ICON[setupData.setupLabel]} size={18} color={SETUP_COLOR[setupData.setupLabel]} />
                  <Text style={styles.setupPreviewLabel}>SETUP ASSESSMENT</Text>
                </View>
                <View style={[styles.confPill, { borderColor: CONF_COLOR[setupData.confidence] + '40' }]}>
                  <View style={[styles.confDot, { backgroundColor: CONF_COLOR[setupData.confidence] }]} />
                  <Text style={[styles.confText, { color: CONF_COLOR[setupData.confidence] }]}>{setupData.confidence}</Text>
                </View>
              </View>

              <Text style={[styles.setupLabelText, { color: SETUP_COLOR[setupData.setupLabel] }]}>
                {setupData.setupLabel}
              </Text>

              {setupSummaryFirstSentence && (
                <Text style={styles.setupSummaryText} numberOfLines={2}>{setupSummaryFirstSentence}</Text>
              )}

              <View style={styles.factorPreviewRow}>
                {topPositive ? (
                  <View style={styles.factorPreviewItem}>
                    <View style={[styles.factorPreviewDot, { backgroundColor: Colors.gain }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.factorPreviewName, { color: Colors.gain }]}>{topPositive.name}</Text>
                      <Text style={styles.factorPreviewSummary} numberOfLines={1}>{topPositive.summary}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.factorPreviewItem}>
                    <View style={[styles.factorPreviewDot, { backgroundColor: Colors.mutedForeground }]} />
                    <Text style={styles.factorPreviewEmpty}>No strong positives detected</Text>
                  </View>
                )}
                {topRisk ? (
                  <View style={styles.factorPreviewItem}>
                    <View style={[styles.factorPreviewDot, { backgroundColor: Colors.loss }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.factorPreviewName, { color: Colors.loss }]}>{topRisk.name}</Text>
                      <Text style={styles.factorPreviewSummary} numberOfLines={1}>{topRisk.summary}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.factorPreviewItem}>
                    <View style={[styles.factorPreviewDot, { backgroundColor: Colors.mutedForeground }]} />
                    <Text style={styles.factorPreviewEmpty}>No major risks detected</Text>
                  </View>
                )}
              </View>

              <View style={styles.tapHintRow}>
                <Text style={styles.tapHint}>Tap for full analysis</Text>
                <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
              </View>
            </Card>
          </Pressable>
        ) : null}

        {/* ── 2. Historical Similar Setups Preview ── */}
        {setupLoading ? (
          <Card style={styles.analogPreviewCard}>
            <SkeletonLoader width="50%" height={10} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <SkeletonLoader width="30%" height={48} borderRadius={10} />
              <SkeletonLoader width="30%" height={48} borderRadius={10} />
              <SkeletonLoader width="30%" height={48} borderRadius={10} />
            </View>
          </Card>
        ) : analog ? (
          <Pressable onPress={onViewAnalysis}>
            <Card style={{ ...styles.analogPreviewCard, borderLeftWidth: 3, borderLeftColor: '#A78BFA' }}>
              <View style={styles.analogPreviewHeader}>
                <View style={styles.analogPreviewTitleRow}>
                  <Ionicons name="time-outline" size={14} color="#A78BFA" />
                  <Text style={styles.analogPreviewLabel}>WHEN THIS HAPPENED BEFORE</Text>
                </View>
                <Text style={styles.analogCaseCount}>{analog.matchCount} similar days</Text>
              </View>

              <View style={styles.analogStatsRow}>
                <AnalogStatCell label="Avg 5-Day" value={analog.forwardReturns.avg5d} />
                <View style={styles.analogStatDivider} />
                <WinRateCell winRate={analog.forwardReturns.winRate5d} />
                <View style={styles.analogStatDivider} />
                <AnalogStatCell label="Avg 3-Day" value={analog.forwardReturns.avg3d} />
              </View>

              <Text style={styles.analogDispersion} numberOfLines={1}>
                {analog.dispersionNote.charAt(0).toUpperCase() + analog.dispersionNote.slice(1)}
              </Text>

              <View style={styles.tapHintRow}>
                <Text style={styles.tapHint}>See full historical analysis</Text>
                <Ionicons name="chevron-forward" size={12} color={Colors.accent} />
              </View>
            </Card>
          </Pressable>
        ) : !setupLoading && !analog ? (
          <Card style={{ ...styles.analogPreviewCard, borderLeftWidth: 3, borderLeftColor: '#A78BFA30' }}>
            <View style={styles.analogPreviewTitleRow}>
              <Ionicons name="hourglass-outline" size={14} color={Colors.mutedForeground} />
              <Text style={[styles.analogPreviewLabel, { color: Colors.mutedForeground }]}>HISTORICAL PATTERNS</Text>
            </View>
            <Text style={styles.analogUnavailableText}>
              Not enough history available for this stock to identify patterns yet.
            </Text>
          </Card>
        ) : null}

        {/* ── 3. Full Analysis CTA ────────────────── */}
        <Pressable style={styles.fullAnalysisCta} onPress={onViewAnalysis}>
          <View style={styles.ctaLeft}>
            <Ionicons name="analytics" size={20} color={Colors.primaryForeground} />
            <View>
              <Text style={styles.ctaTitle}>View Full Analysis</Text>
              <Text style={styles.ctaSub}>8 factors · historical patterns · risks</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.primaryForeground} />
        </Pressable>
        </>
        )}

        {/* ── 4. Market Data (compact, collapsible) ── */}
        <Pressable style={styles.marketDataToggle} onPress={() => setShowMarketData(!showMarketData)}>
          <View style={styles.marketDataToggleInner}>
            <Ionicons name="bar-chart-outline" size={14} color={Colors.mutedForeground} />
            <Text style={styles.marketDataToggleText}>Market Data & Fundamentals</Text>
          </View>
          <View style={styles.marketDataRight}>
            <Text style={styles.marketDataPreview}>{marketCap}</Text>
            <Ionicons name={showMarketData ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.mutedForeground} />
          </View>
        </Pressable>

        {showMarketData && (
          <Card style={styles.marketDataCard}>
            {/* Price range bars */}
            <Text style={styles.rangeLabel}>TODAY'S RANGE</Text>
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeValue}>${quote.l.toFixed(2)}</Text>
              <Text style={[styles.rangeCurrent, { color: positive ? Colors.gain : Colors.loss }]}>${quote.c.toFixed(2)}</Text>
              <Text style={styles.rangeValue}>${quote.h.toFixed(2)}</Text>
            </View>
            <View style={styles.rangeBarTrack}>
              <View style={[styles.rangeBarFill, { width: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
              <View style={[styles.rangeBarDot, { left: `${Math.min(Math.max(dayPosition, 2), 98)}%` }]} />
            </View>

            {pos52 !== null && high52 && low52 && (
              <>
                <Text style={[styles.rangeLabel, { marginTop: 16 }]}>52-WEEK RANGE</Text>
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeValue}>${low52.toFixed(2)}</Text>
                  <Text style={styles.rangeCurrent}>{pos52.toFixed(0)}%</Text>
                  <Text style={styles.rangeValue}>${high52.toFixed(2)}</Text>
                </View>
                <View style={styles.rangeBarTrack}>
                  <View style={[styles.rangeBarFill52, { width: `${Math.min(Math.max(pos52, 2), 98)}%` }]} />
                  <View style={[styles.rangeBarDot52, { left: `${Math.min(Math.max(pos52, 2), 98)}%` }]} />
                </View>
              </>
            )}

            <View style={styles.statsDivider} />

            <View style={styles.statsGrid}>
              <FundamentalCell label="Market Cap" value={marketCap} />
              <FundamentalCell label="Open" value={`$${quote.o.toFixed(2)}`} />
              <FundamentalCell label="Prev Close" value={`$${quote.pc.toFixed(2)}`} />
              {metrics?.peTTM != null && <FundamentalCell label="P/E" value={metrics.peTTM.toFixed(1)} tooltip="pe" />}
              {metrics?.beta != null && <FundamentalCell label="Beta" value={metrics.beta.toFixed(2)} tooltip="beta" />}
              {metrics?.dividendYieldIndicatedAnnual != null && metrics.dividendYieldIndicatedAnnual > 0 && (
                <FundamentalCell label="Div Yield" value={`${metrics.dividendYieldIndicatedAnnual.toFixed(2)}%`} tooltip="dividend" />
              )}
            </View>
          </Card>
        )}

        {/* ── 5. Action Buttons ───────────────────── */}
        <View style={styles.actionsRow}>
          {onCompare && (
            <Pressable style={styles.actionBtn} onPress={onCompare}>
              <Ionicons name="git-compare-outline" size={16} color={Colors.accent} />
              <Text style={[styles.actionBtnText, { color: Colors.accent }]}>Compare</Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionBtn, inPortfolio && styles.actionBtnActive]}
            onPress={() => { setShowAddModal(true); lightTap(); }}
          >
            <Ionicons name={inPortfolio ? 'add-circle' : 'pie-chart-outline'} size={16} color={inPortfolio ? Colors.accent : Colors.secondaryForeground} />
            <Text style={[styles.actionBtnText, inPortfolio && { color: Colors.accent }]}>
              {inPortfolio ? 'Add Shares' : 'Portfolio'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Add to Portfolio Modal ────────────────── */}
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

      {/* ── Price Alert Modal ────────────────────── */}
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

// ── Subcomponents ────────────────────────────────────

function AnalogStatCell({ label, value }: { label: string; value: number }) {
  const color = value >= 0 ? Colors.gain : Colors.loss;
  return (
    <View style={styles.analogStatCell}>
      <Text style={styles.analogStatLabel}>{label}</Text>
      <Text style={[styles.analogStatValue, { color }]}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}%
      </Text>
    </View>
  );
}

function WinRateCell({ winRate }: { winRate: number }) {
  const pct = winRate * 100;
  const color = pct >= 60 ? Colors.gain : pct >= 45 ? '#FBBF24' : Colors.loss;
  return (
    <View style={styles.analogStatCell}>
      <Text style={styles.analogStatLabel}>Positive 5d</Text>
      <Text style={[styles.analogStatValue, { color }]}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

function FundamentalCell({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <View style={styles.fundamentalCell}>
      <View style={styles.fundamentalLabelRow}>
        <Text style={styles.fundamentalLabel}>{label}</Text>
        {tooltip && <MetricTooltip metricKey={tooltip} />}
      </View>
      <Text style={styles.fundamentalValue}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 20, gap: 12 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topActions: { flexDirection: 'row', gap: 8 },
  topIconBtn: { padding: 8, borderRadius: 10, backgroundColor: Colors.secondary, position: 'relative' },
  alertBadge: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  alertBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 14, color: Colors.mutedForeground },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ticker: { fontSize: 28, fontWeight: '700', color: Colors.foreground },
  companyName: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },
  industryPill: { backgroundColor: Colors.secondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6 },
  industryText: { fontSize: 10, color: Colors.mutedForeground, fontWeight: '600' },
  priceContainer: { alignItems: 'flex-end', gap: 4 },
  price: { fontSize: 24, fontWeight: '700', color: Colors.foreground },
  changePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  changeText: { fontSize: 13, fontWeight: '700' },

  alertsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  alertChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  alertChipText: { fontSize: 11, fontWeight: '600', color: Colors.accent },

  // Setup Preview
  setupPreviewCard: { gap: 10, borderWidth: 1, borderColor: Colors.border },
  setupPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  setupPreviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setupPreviewLabel: { fontSize: 9, color: Colors.mutedForeground, letterSpacing: 1.5, fontWeight: '700' },
  setupLabelText: { fontSize: 20, fontWeight: '800' },
  setupSummaryText: { fontSize: 13, color: Colors.foreground, lineHeight: 19 },
  confPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  confText: { fontSize: 10, fontWeight: '600' },
  factorPreviewRow: { gap: 8 },
  factorPreviewItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  factorPreviewDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  factorPreviewName: { fontSize: 12, fontWeight: '700' },
  factorPreviewSummary: { fontSize: 11, color: Colors.mutedForeground, lineHeight: 15 },
  factorPreviewEmpty: { fontSize: 11, color: Colors.mutedForeground, fontStyle: 'italic' },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  tapHint: { fontSize: 11, color: Colors.accent, fontWeight: '600' },

  // Historical Analog Preview
  analogPreviewCard: { gap: 8, borderWidth: 1, borderColor: Colors.border },
  analogPreviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analogPreviewTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  analogPreviewLabel: { fontSize: 9, color: '#A78BFA', letterSpacing: 1.5, fontWeight: '700' },
  analogCaseCount: { fontSize: 11, color: Colors.mutedForeground, fontWeight: '600' },
  analogStatsRow: { flexDirection: 'row', backgroundColor: Colors.secondary, borderRadius: 10, padding: 2 },
  analogStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },
  analogStatCell: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  analogStatLabel: { fontSize: 9, color: Colors.mutedForeground, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  analogStatValue: { fontSize: 16, fontWeight: '800' },
  analogDispersion: { fontSize: 11, color: Colors.mutedForeground, lineHeight: 15 },
  analogUnavailableText: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17 },

  // Full Analysis CTA
  fullAnalysisCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14 },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaTitle: { fontSize: 15, fontWeight: '700', color: Colors.primaryForeground },
  ctaSub: { fontSize: 11, color: Colors.primaryForeground, opacity: 0.7, marginTop: 1 },

  // Market Data (collapsible)
  marketDataToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.secondary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  marketDataToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marketDataToggleText: { fontSize: 13, color: Colors.mutedForeground, fontWeight: '600' },
  marketDataRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marketDataPreview: { fontSize: 12, color: Colors.foreground, fontWeight: '600' },
  marketDataCard: { gap: 0 },

  rangeLabel: { fontSize: 10, color: Colors.mutedForeground, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rangeValue: { fontSize: 11, color: Colors.mutedForeground },
  rangeCurrent: { fontSize: 13, fontWeight: '700', color: Colors.foreground },
  rangeBarTrack: { height: 5, backgroundColor: Colors.secondary, borderRadius: 3, position: 'relative' },
  rangeBarFill: { height: 5, backgroundColor: Colors.accent, borderRadius: 3, opacity: 0.4 },
  rangeBarDot: { position: 'absolute', top: -3.5, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent, marginLeft: -6 },
  rangeBarFill52: { height: 5, backgroundColor: Colors.primary, borderRadius: 3, opacity: 0.3 },
  rangeBarDot52: { position: 'absolute', top: -3.5, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, marginLeft: -6 },

  statsDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fundamentalCell: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  fundamentalLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fundamentalLabel: { fontSize: 11, color: Colors.mutedForeground },
  fundamentalValue: { fontSize: 14, fontWeight: '600', color: Colors.foreground, marginTop: 1 },

  // Action buttons
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.secondary, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  actionBtnActive: { borderColor: Colors.accent, backgroundColor: 'rgba(24,181,240,0.08)' },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: Colors.secondaryForeground },

  // Modals
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
