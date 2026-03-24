import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import { runAnalysis, AnalysisResult, Signal } from '../services/analysis';
import Colors from '../constants/colors';

interface SimulationResultsScreenProps {
  ticker: string;
  onBack: () => void;
  onHome: () => void;
}

const SIGNAL_CONFIG: Record<Signal, { color: string; icon: string }> = {
  'Bullish': { color: Colors.gain, icon: 'arrow-up-circle' },
  'Cautiously Bullish': { color: Colors.gain, icon: 'chevron-up-circle' },
  'Neutral': { color: Colors.mutedForeground, icon: 'remove-circle' },
  'Cautiously Bearish': { color: Colors.loss, icon: 'chevron-down-circle' },
  'Bearish': { color: Colors.loss, icon: 'arrow-down-circle' },
};

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined, decimals: number = 1): string {
  if (n == null || !isFinite(n)) return '—';
  return n.toFixed(decimals);
}

function scoreColor(s: number): string {
  if (s > 0.5) return Colors.gain;
  if (s < -0.5) return Colors.loss;
  return Colors.mutedForeground;
}

function ScoreBar({ score, maxScore, label }: { score: number; maxScore: number; label: string }) {
  const normalized = ((score + maxScore) / (maxScore * 2)) * 100;
  const clamped = Math.max(5, Math.min(95, normalized));
  const color = scoreColor(score);

  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={barStyles.label}>{label}</Text>
        <Text style={[barStyles.scoreText, { color }]}>
          {score >= 0 ? '+' : ''}{score.toFixed(1)}
        </Text>
      </View>
      <View style={barStyles.track}>
        <View style={barStyles.centerLine} />
        <View style={[
          barStyles.fill,
          {
            left: score >= 0 ? '50%' : `${clamped}%`,
            width: `${Math.abs(clamped - 50)}%`,
            backgroundColor: color,
          },
        ]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: Colors.foreground },
  scoreText: { fontSize: 13, fontWeight: '700' },
  track: { height: 8, backgroundColor: Colors.secondary, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  centerLine: { position: 'absolute', left: '50%', width: 1, height: 8, backgroundColor: Colors.mutedForeground, opacity: 0.3 },
  fill: { position: 'absolute', height: 8, borderRadius: 4, opacity: 0.8 },
});

function DetailBullets({ details }: { details: string[] }) {
  if (details.length === 0) return null;
  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      {details.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 6, paddingRight: 8 }}>
          <Text style={{ color: Colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>•</Text>
          <Text style={{ color: Colors.secondaryForeground, fontSize: 12, lineHeight: 18, flex: 1 }}>{d}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SimulationResultsScreen({ ticker, onBack, onHome }: SimulationResultsScreenProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const analysis = await runAnalysis(ticker);
        if (cancelled) return;
        if (analysis) {
          setResult(analysis);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) return <LoadingIndicator message={`Analyzing ${ticker}...`} />;

  if (error || !result) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.mutedForeground} />
        <Text style={styles.errorTitle}>Analysis Unavailable</Text>
        <Text style={styles.errorText}>
          Could not retrieve fundamental data for {ticker}. This may be a temporary issue — please try again.
        </Text>
        <Pressable style={styles.homeButton} onPress={onHome}>
          <Text style={styles.homeButtonText}>Search Another Stock</Text>
        </Pressable>
      </View>
    );
  }

  const m = result.metrics;
  const cfg = SIGNAL_CONFIG[result.signal];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <View style={styles.headingRow}>
        <Ionicons name="analytics" size={24} color={Colors.primary} />
        <View>
          <Text style={styles.heading}>Full Analysis</Text>
          <Text style={styles.subheading}>{ticker} · Fundamental & momentum breakdown</Text>
        </View>
      </View>

      {/* Overall signal */}
      <Card glow={result.score > 0 ? 'green' : 'none'} style={styles.signalCard}>
        <View style={styles.signalRow}>
          <Ionicons name={cfg.icon as any} size={36} color={cfg.color} />
          <View style={styles.signalCol}>
            <Text style={styles.signalSmall}>Overall Signal</Text>
            <Text style={[styles.signalLabel, { color: cfg.color }]}>{result.signal}</Text>
          </View>
          <View style={styles.signalScoreBox}>
            <Text style={[styles.signalScore, { color: cfg.color }]}>
              {result.score >= 0 ? '+' : ''}{result.score.toFixed(1)}
            </Text>
            <Text style={styles.signalScoreLabel}>Score</Text>
          </View>
        </View>
      </Card>

      {/* Score breakdown */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Score Breakdown</Text>
        <View style={{ gap: 16 }}>
          <ScoreBar score={result.momentum.score} maxScore={3} label="Momentum" />
          <ScoreBar score={result.growth.score} maxScore={3} label="Growth" />
          <ScoreBar score={result.valuation.score} maxScore={2} label="Valuation" />
          <ScoreBar score={result.profitability.score} maxScore={2} label="Profitability" />
          <ScoreBar score={result.risk.score} maxScore={2} label="Risk" />
        </View>
      </Card>

      {/* 52-week position */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>52-Week Position</Text>
        <View style={styles.rangeRow}>
          <Text style={styles.rangeValue}>${fmtNum(m['52WeekLow'], 2)}</Text>
          <Text style={styles.rangeCenter}>
            ${result.quote.c.toFixed(2)} ({result.positionIn52wRange.toFixed(0)}%)
          </Text>
          <Text style={styles.rangeValue}>${fmtNum(m['52WeekHigh'], 2)}</Text>
        </View>
        <View style={styles.rangeBarTrack}>
          <View style={[styles.rangeBarFill, { width: `${Math.min(Math.max(result.positionIn52wRange, 2), 98)}%` }]} />
          <View style={[styles.rangeBarDot, { left: `${Math.min(Math.max(result.positionIn52wRange, 2), 98)}%` }]} />
        </View>
        <View style={styles.rangeLabelRow}>
          <Text style={styles.rangeLabel}>52W Low</Text>
          <Text style={styles.rangeLabel}>52W High</Text>
        </View>
      </Card>

      {/* Key metrics */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <MetricItem label="P/E (TTM)" value={fmtNum(m.peTTM)} />
          <MetricItem label="Forward P/E" value={fmtNum(m.forwardPE)} />
          <MetricItem label="PEG Ratio" value={fmtNum(m.pegTTM, 2)} />
          <MetricItem label="EV/EBITDA" value={fmtNum(m.evEbitdaTTM)} />
          <MetricItem label="Beta" value={fmtNum(m.beta, 2)} />
          <MetricItem label="ROE" value={fmtPct(m.roeTTM)} />
          <MetricItem label="Net Margin" value={fmtPct(m.netProfitMarginTTM)} />
          <MetricItem label="Dividend Yield" value={m.dividendYieldIndicatedAnnual ? `${m.dividendYieldIndicatedAnnual.toFixed(2)}%` : '—'} />
        </View>
      </Card>

      {/* Returns */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Price Returns</Text>
        <View style={styles.metricsGrid}>
          <MetricItem label="5 Days" value={fmtPct(m['5DayPriceReturnDaily'])} positive={m['5DayPriceReturnDaily'] != null && m['5DayPriceReturnDaily'] > 0} negative={m['5DayPriceReturnDaily'] != null && m['5DayPriceReturnDaily'] < 0} />
          <MetricItem label="Month to Date" value={fmtPct(m.monthToDatePriceReturnDaily)} positive={m.monthToDatePriceReturnDaily != null && m.monthToDatePriceReturnDaily > 0} negative={m.monthToDatePriceReturnDaily != null && m.monthToDatePriceReturnDaily < 0} />
          <MetricItem label="3 Months" value={fmtPct(m['13WeekPriceReturnDaily'])} positive={m['13WeekPriceReturnDaily'] != null && m['13WeekPriceReturnDaily'] > 0} negative={m['13WeekPriceReturnDaily'] != null && m['13WeekPriceReturnDaily'] < 0} />
          <MetricItem label="6 Months" value={fmtPct(m['26WeekPriceReturnDaily'])} positive={m['26WeekPriceReturnDaily'] != null && m['26WeekPriceReturnDaily'] > 0} negative={m['26WeekPriceReturnDaily'] != null && m['26WeekPriceReturnDaily'] < 0} />
          <MetricItem label="1 Year" value={fmtPct(m['52WeekPriceReturnDaily'])} positive={m['52WeekPriceReturnDaily'] != null && m['52WeekPriceReturnDaily'] > 0} negative={m['52WeekPriceReturnDaily'] != null && m['52WeekPriceReturnDaily'] < 0} />
          <MetricItem label="Year to Date" value={fmtPct(m.yearToDatePriceReturnDaily)} positive={m.yearToDatePriceReturnDaily != null && m.yearToDatePriceReturnDaily > 0} negative={m.yearToDatePriceReturnDaily != null && m.yearToDatePriceReturnDaily < 0} />
        </View>
      </Card>

      {/* Detailed insights per category */}
      {result.momentum.details.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Momentum Insights</Text>
          <DetailBullets details={result.momentum.details} />
        </Card>
      )}

      {result.growth.details.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Growth Insights</Text>
          <DetailBullets details={result.growth.details} />
        </Card>
      )}

      {/* Conclusion */}
      <Card style={styles.conclusionCard}>
        <View style={styles.conclusionHeader}>
          <Ionicons name="bulb" size={20} color={Colors.primary} />
          <Text style={styles.conclusionTitle}>Bottom Line</Text>
        </View>
        <Text style={styles.conclusionText}>{result.conclusion}</Text>
      </Card>

      <View style={styles.disclaimerRow}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.mutedForeground} />
        <Text style={styles.disclaimerText}>
          Analysis based on real-time fundamental metrics. This is not financial advice. Always do your own research before making investment decisions.
        </Text>
      </View>

      <Pressable style={styles.homeButton} onPress={onHome}>
        <Ionicons name="search" size={16} color={Colors.primaryForeground} />
        <Text style={styles.homeButtonText}>Search Another Stock</Text>
      </Pressable>
    </ScrollView>
  );
}

function MetricItem({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  const color = positive ? Colors.gain : negative ? Colors.loss : Colors.foreground;
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: Colors.mutedForeground },

  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.foreground },
  subheading: { fontSize: 13, color: Colors.mutedForeground, marginTop: 2 },

  signalCard: { marginBottom: 0 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  signalCol: { flex: 1, gap: 2 },
  signalSmall: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  signalLabel: { fontSize: 22, fontWeight: '800' },
  signalScoreBox: { alignItems: 'center', backgroundColor: Colors.secondary, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  signalScore: { fontSize: 20, fontWeight: '800' },
  signalScoreLabel: { fontSize: 9, color: Colors.mutedForeground, textTransform: 'uppercase', marginTop: 2 },

  card: { marginBottom: 0, gap: 12 },
  cardTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 },

  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rangeValue: { fontSize: 12, color: Colors.mutedForeground },
  rangeCenter: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  rangeBarTrack: { height: 6, backgroundColor: Colors.secondary, borderRadius: 3, position: 'relative', marginTop: 8 },
  rangeBarFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3, opacity: 0.4 },
  rangeBarDot: { position: 'absolute', top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, marginLeft: -7 },
  rangeLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rangeLabel: { fontSize: 10, color: Colors.mutedForeground },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  metricItem: { width: '50%', paddingVertical: 8, paddingRight: 8 },
  metricLabel: { fontSize: 11, color: Colors.mutedForeground },
  metricValue: { fontSize: 15, fontWeight: '700', color: Colors.foreground, marginTop: 2 },

  conclusionCard: { borderWidth: 1, borderColor: 'rgba(25,232,90,0.2)', marginBottom: 0, gap: 10 },
  conclusionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conclusionTitle: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  conclusionText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.mutedForeground, lineHeight: 16 },

  homeButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  homeButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primaryForeground },

  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  errorText: { fontSize: 15, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 22 },
});
