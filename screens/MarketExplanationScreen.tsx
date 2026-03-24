import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import {
  getQuote, getCompanyProfile, getRecentNews, timeAgo,
  Quote, CompanyProfile, NewsArticle,
} from '../services/finnhub';
import { runAnalysis, AnalysisResult, Signal, ActionRating } from '../services/analysis';
import { usePortfolio } from '../context/PortfolioContext';
import Colors from '../constants/colors';

interface MarketExplanationScreenProps {
  ticker: string;
  onBack: () => void;
  onNext: () => void;
}

const SIGNAL_CONFIG: Record<Signal, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'Bullish': { color: Colors.gain, icon: 'arrow-up-circle' },
  'Cautiously Bullish': { color: Colors.gain, icon: 'chevron-up-circle' },
  'Neutral': { color: Colors.mutedForeground, icon: 'remove-circle' },
  'Cautiously Bearish': { color: Colors.loss, icon: 'chevron-down-circle' },
  'Bearish': { color: Colors.loss, icon: 'arrow-down-circle' },
};

const ACTION_CONFIG: Record<ActionRating, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'Strong Buy': { color: Colors.gain, bg: Colors.gainBg, icon: 'rocket' },
  'Buy': { color: Colors.gain, bg: Colors.gainBg, icon: 'arrow-up-circle' },
  'Hold': { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', icon: 'pause-circle' },
  'Reduce': { color: Colors.loss, bg: Colors.lossBg, icon: 'arrow-down-circle' },
  'Sell': { color: Colors.loss, bg: Colors.lossBg, icon: 'close-circle' },
};

function generateWhatHappened(companyName: string, ticker: string, change: number): string {
  const direction = change >= 0 ? 'gained' : 'dropped';
  const magnitude = Math.abs(change);
  let intensity = 'slightly';
  if (magnitude > 5) intensity = 'sharply';
  else if (magnitude > 2) intensity = 'notably';
  else if (magnitude > 1) intensity = 'moderately';
  return `${companyName} (${ticker}) ${direction} ${intensity} today, moving ${change >= 0 ? '+' : ''}${change.toFixed(2)}%.`;
}

function generateWhyItHappened(headlines: NewsArticle[]): string {
  if (headlines.length === 0) {
    return 'No major news headlines were found for this stock recently. The price movement may be driven by broader market sentiment, sector rotation, institutional rebalancing, or low-volume price action.';
  }
  const topHeadline = headlines[0].headline;
  if (headlines.length === 1) {
    return `A recent headline — "${topHeadline}" — appears to be the primary catalyst driving investor sentiment around this stock.`;
  }
  return `The most prominent catalyst appears to be: "${topHeadline}" — along with ${headlines.length - 1} other recent headline${headlines.length > 2 ? 's' : ''} that may be shaping how investors view this stock right now.`;
}

function buildPortfolioContext(
  ticker: string,
  action: ActionRating,
  ownsStock: boolean,
  holdingGainPct: number | null,
): string | null {
  if (!ownsStock) {
    if (action === 'Strong Buy' || action === 'Buy') {
      return `You don't currently hold ${ticker}. Based on the data, this could be a good time to start a position.`;
    }
    if (action === 'Sell' || action === 'Reduce') {
      return `You don't hold ${ticker} — and the data suggests this isn't the right time to start a position.`;
    }
    return null;
  }

  if (holdingGainPct !== null) {
    const upDown = holdingGainPct >= 0 ? `up ${holdingGainPct.toFixed(1)}%` : `down ${Math.abs(holdingGainPct).toFixed(1)}%`;

    if (action === 'Strong Buy' || action === 'Buy') {
      return `You're currently ${upDown} on your ${ticker} position. The data supports continuing to hold — or even adding more shares.`;
    }
    if (action === 'Hold') {
      return `You're ${upDown} on your ${ticker} position. The data is mixed right now — hold steady and wait for a clearer signal.`;
    }
    if (action === 'Reduce') {
      if (holdingGainPct > 20) {
        return `You're ${upDown} on ${ticker} — a solid gain. With the data turning cautious, consider locking in some of those profits.`;
      }
      return `You're ${upDown} on ${ticker}. The data suggests trimming your position to reduce risk exposure.`;
    }
    if (action === 'Sell') {
      if (holdingGainPct > 0) {
        return `You're still ${upDown} on ${ticker}, but the data is deteriorating. Consider selling to protect your gains before conditions worsen.`;
      }
      return `You're ${upDown} on ${ticker}. The data strongly suggests cutting your losses here rather than waiting for a recovery.`;
    }
  }

  return null;
}

export default function MarketExplanationScreen({ ticker, onBack, onNext }: MarketExplanationScreenProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const { getHolding, hasHolding } = usePortfolio();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [q, p, articles] = await Promise.all([
          getQuote(ticker),
          getCompanyProfile(ticker).catch(() => null),
          getRecentNews(ticker, 7).catch(() => [] as NewsArticle[]),
        ]);
        if (cancelled) return;
        setQuote(q);
        if (p) setProfile(p);
        setNews(articles.slice(0, 5));
        setLoading(false);

        try {
          const result = await runAnalysis(ticker, q);
          if (!cancelled) setAnalysis(result);
        } catch {}
        if (!cancelled) setAnalysisLoading(false);
      } catch (err) {
        console.warn('MarketExplanation load error:', err);
        if (!cancelled) { setLoading(false); setAnalysisLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [ticker]);

  if (loading || !quote) return <LoadingIndicator message={`Analyzing ${ticker}...`} />;

  const change = quote.dp ?? 0;
  const isNegative = change < 0;
  const companyName = profile?.name || ticker;
  const dollarChange = quote.d ?? 0;

  const whatHappened = generateWhatHappened(companyName, ticker, change);
  const whyItHappened = generateWhyItHappened(news);

  const signalCfg = analysis ? SIGNAL_CONFIG[analysis.signal] : SIGNAL_CONFIG['Neutral'];
  const actionCfg = analysis ? ACTION_CONFIG[analysis.action] : ACTION_CONFIG['Hold'];

  const ownsStock = hasHolding(ticker);
  const holding = getHolding(ticker);
  const holdingGainPct = holding && analysis
    ? ((analysis.quote.c - holding.avgCost) / holding.avgCost) * 100
    : null;

  const portfolioNote = analysis
    ? buildPortfolioContext(ticker, analysis.action, ownsStock, holdingGainPct)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Card glow="blue">
        <View style={styles.tickerRow}>
          <View style={styles.tickerLeft}>
            <View style={[styles.tickerIcon, { backgroundColor: isNegative ? Colors.lossBg : Colors.gainBg }]}>
              <Ionicons name={isNegative ? 'trending-down' : 'trending-up'} size={24} color={isNegative ? Colors.loss : Colors.gain} />
            </View>
            <View>
              <Text style={styles.tickerText}>{ticker}</Text>
              <Text style={styles.tickerSub}>{companyName}</Text>
            </View>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceText}>${quote.c.toFixed(2)}</Text>
            <View style={[styles.changeBadge, { backgroundColor: isNegative ? Colors.lossBg : Colors.gainBg }]}>
              <Text style={[styles.changeBadgeText, { color: isNegative ? Colors.loss : Colors.gain }]}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}% ({dollarChange >= 0 ? '+' : ''}{dollarChange.toFixed(2)})
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Section 1 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionNum, { backgroundColor: Colors.gainBg }]}>
            <Text style={[styles.sectionNumText, { color: Colors.gain }]}>1</Text>
          </View>
          <Text style={styles.sectionTitle}>What happened</Text>
        </View>
        <Card><Text style={styles.bodyText}>{whatHappened}</Text></Card>
      </View>

      {/* Section 2 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionNum, { backgroundColor: 'rgba(24,181,240,0.1)' }]}>
            <Text style={[styles.sectionNumText, { color: Colors.accent }]}>2</Text>
          </View>
          <Text style={styles.sectionTitle}>Why it happened</Text>
        </View>
        <Card><Text style={styles.bodyText}>{whyItHappened}</Text></Card>
      </View>

      {news.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="newspaper-outline" size={14} color={Colors.mutedForeground} />
            <Text style={styles.sectionTitle}>Related Headlines</Text>
          </View>
          {news.map((article) => (
            <Pressable key={article.id} onPress={() => article.url && Linking.openURL(article.url)}>
              <Card style={styles.headlineCard}>
                <Text style={styles.headlineTitle}>{article.headline}</Text>
                <Text style={styles.headlineMeta}>{article.source} · {timeAgo(article.datetime)}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      {/* Section 3: What should you do? */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionNum, { backgroundColor: 'rgba(251,191,36,0.1)' }]}>
            <Text style={[styles.sectionNumText, { color: '#FBBF24' }]}>3</Text>
          </View>
          <Text style={styles.sectionTitle}>What should you do?</Text>
        </View>
        {analysisLoading ? (
          <Card style={styles.outlookCard}>
            <View style={styles.outlookLoadingRow}>
              <LoadingIndicator message="Running analysis..." />
            </View>
          </Card>
        ) : analysis ? (
          <>
            {/* Action rating card */}
            <Card style={{ ...styles.actionCard, borderColor: actionCfg.color + '40' }}>
              <View style={styles.actionHeader}>
                <View style={[styles.actionIconWrap, { backgroundColor: actionCfg.bg }]}>
                  <Ionicons name={actionCfg.icon as any} size={28} color={actionCfg.color} />
                </View>
                <View style={styles.actionLabelCol}>
                  <Text style={styles.actionLabelSmall}>Action Rating</Text>
                  <Text style={[styles.actionLabel, { color: actionCfg.color }]}>{analysis.action}</Text>
                </View>
                <View style={[styles.signalPill, { backgroundColor: signalCfg.color + '15' }]}>
                  <Ionicons name={signalCfg.icon as any} size={14} color={signalCfg.color} />
                  <Text style={[styles.signalPillText, { color: signalCfg.color }]}>{analysis.signal}</Text>
                </View>
              </View>

              <Text style={styles.actionAdvice}>{analysis.actionAdvice}</Text>

              {/* Key factors */}
              {(analysis.topBull || analysis.topBear) && (
                <View style={styles.keyFactors}>
                  {analysis.topBull && (
                    <View style={styles.factorRow}>
                      <View style={[styles.factorDot, { backgroundColor: Colors.gain }]} />
                      <View style={styles.factorContent}>
                        <Text style={styles.factorLabel}>Strongest factor</Text>
                        <Text style={styles.factorText}>{analysis.topBull.label}</Text>
                      </View>
                    </View>
                  )}
                  {analysis.topBear && (
                    <View style={styles.factorRow}>
                      <View style={[styles.factorDot, { backgroundColor: Colors.loss }]} />
                      <View style={styles.factorContent}>
                        <Text style={styles.factorLabel}>Biggest concern</Text>
                        <Text style={styles.factorText}>{analysis.topBear.label}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Card>

            {/* Portfolio-aware note */}
            {portfolioNote && (
              <Card style={styles.portfolioNote}>
                <View style={styles.portfolioNoteHeader}>
                  <Ionicons name="person-circle-outline" size={18} color={Colors.accent} />
                  <Text style={styles.portfolioNoteTitle}>For Your Portfolio</Text>
                </View>
                <Text style={styles.portfolioNoteText}>{portfolioNote}</Text>
                {holdingGainPct !== null && (
                  <View style={[styles.portfolioGainPill, { backgroundColor: holdingGainPct >= 0 ? Colors.gainBg : Colors.lossBg }]}>
                    <Text style={[styles.portfolioGainText, { color: holdingGainPct >= 0 ? Colors.gain : Colors.loss }]}>
                      Your position: {holdingGainPct >= 0 ? '+' : ''}{holdingGainPct.toFixed(1)}%
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {/* Score breakdown */}
            <Card style={styles.scoresCard}>
              <Text style={styles.scoresTitle}>Score Breakdown</Text>
              <View style={styles.scoresGrid}>
                <ScoreItem label="Momentum" score={analysis.momentum.score} />
                <ScoreItem label="Growth" score={analysis.growth.score} />
                <ScoreItem label="Valuation" score={analysis.valuation.score} />
                <ScoreItem label="Profitability" score={analysis.profitability.score} />
                <ScoreItem label="Risk" score={analysis.risk.score} />
              </View>
            </Card>
          </>
        ) : (
          <Card style={styles.outlookCard}>
            <Text style={styles.bodyText}>Analysis data could not be loaded. Try again later.</Text>
          </Card>
        )}
      </View>

      <View style={styles.disclaimerCard}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.mutedForeground} />
        <View style={styles.disclaimerContent}>
          <Text style={styles.disclaimerTitle}>Not Financial Advice</Text>
          <Text style={styles.disclaimerText}>
            This analysis is based on publicly available fundamental metrics and does not account for your full financial situation, goals, or risk tolerance. Always do your own research and consider consulting a financial advisor before making investment decisions.
          </Text>
        </View>
      </View>

      <Pressable style={styles.nextButton} onPress={onNext}>
        <Ionicons name="analytics-outline" size={16} color={Colors.primaryForeground} />
        <Text style={styles.nextButtonText}>See Full Analysis Breakdown</Text>
      </Pressable>
    </ScrollView>
  );
}

function ScoreItem({ label, score }: { label: string; score: number }) {
  const color = score > 0.3 ? Colors.gain : score < -0.3 ? Colors.loss : Colors.mutedForeground;
  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={[styles.scoreValue, { color }]}>
        {score >= 0 ? '+' : ''}{score.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 16, gap: 16 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  backText: { fontSize: 14, color: Colors.mutedForeground },

  tickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  tickerIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tickerText: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  tickerSub: { fontSize: 12, color: Colors.mutedForeground, marginTop: 2 },
  priceCol: { alignItems: 'flex-end', gap: 4 },
  priceText: { fontSize: 18, fontWeight: '700', color: Colors.foreground },
  changeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  changeBadgeText: { fontSize: 12, fontWeight: '700' },

  section: { gap: 0 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { fontSize: 12, fontWeight: '800' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1 },
  bodyText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  headlineCard: { paddingVertical: 12, marginBottom: 8 },
  headlineTitle: { fontSize: 14, fontWeight: '500', color: Colors.foreground, lineHeight: 20 },
  headlineMeta: { fontSize: 12, color: Colors.mutedForeground, marginTop: 4 },

  outlookCard: { gap: 14, marginBottom: 0 },
  outlookLoadingRow: { paddingVertical: 12 },

  actionCard: { gap: 14, marginBottom: 0, borderWidth: 1, borderColor: Colors.border },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabelCol: { flex: 1, gap: 2 },
  actionLabelSmall: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionLabel: { fontSize: 24, fontWeight: '800' },
  signalPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  signalPillText: { fontSize: 11, fontWeight: '600' },
  actionAdvice: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  keyFactors: { gap: 8, backgroundColor: Colors.secondary, borderRadius: 10, padding: 12 },
  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  factorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  factorContent: { flex: 1 },
  factorLabel: { fontSize: 10, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  factorText: { fontSize: 13, color: Colors.foreground, lineHeight: 18, marginTop: 2 },

  portfolioNote: { gap: 8, marginBottom: 0, backgroundColor: 'rgba(24,181,240,0.04)', borderColor: 'rgba(24,181,240,0.15)' },
  portfolioNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  portfolioNoteTitle: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  portfolioNoteText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },
  portfolioGainPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  portfolioGainText: { fontSize: 12, fontWeight: '700' },

  scoresCard: { gap: 10, marginBottom: 0 },
  scoresTitle: { fontSize: 10, fontWeight: '600', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
  scoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  scoreItem: { width: '33%', alignItems: 'center', paddingVertical: 8 },
  scoreLabel: { fontSize: 10, color: Colors.mutedForeground },
  scoreValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    padding: 14,
  },
  disclaimerContent: { flex: 1, gap: 4 },
  disclaimerTitle: { fontSize: 12, fontWeight: '700', color: Colors.mutedForeground },
  disclaimerText: { fontSize: 11, color: Colors.mutedForeground, lineHeight: 16 },

  nextButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primaryForeground },
});
