import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import { timeAgo, NewsArticle } from '../services/finnhub';
import {
  runSetupAnalysis, SetupAnalysis, SetupLabel, FactorStatus, ConfidenceLevel, RiskLevel,
  AnalogResult,
} from '../services/analysis';
import { usePortfolio } from '../context/PortfolioContext';
import Colors from '../constants/colors';

interface SetupAnalysisScreenProps {
  ticker: string;
  onBack: () => void;
  onHome: () => void;
}

// ── Visual Config ────────────────────────────────────

const SETUP_CONFIG: Record<SetupLabel, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'Favorable Setup': { color: Colors.gain, bg: Colors.gainBg, icon: 'checkmark-circle' },
  'Cautiously Positive': { color: '#4ADE80', bg: 'rgba(74,222,128,0.1)', icon: 'arrow-up-circle' },
  'Mixed Setup': { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', icon: 'swap-horizontal-outline' },
  'Cautiously Negative': { color: '#F97316', bg: 'rgba(249,115,22,0.1)', icon: 'arrow-down-circle' },
  'Weak Setup': { color: Colors.loss, bg: Colors.lossBg, icon: 'alert-circle' },
};

const STATUS_CONFIG: Record<FactorStatus, { color: string; dot: string }> = {
  'Strong': { color: Colors.gain, dot: Colors.gain },
  'Positive': { color: '#4ADE80', dot: '#4ADE80' },
  'Neutral': { color: Colors.mutedForeground, dot: Colors.mutedForeground },
  'Weak': { color: '#F97316', dot: '#F97316' },
  'Concerning': { color: Colors.loss, dot: Colors.loss },
  'Insufficient data': { color: Colors.mutedForeground, dot: Colors.border },
};

const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = {
  'Moderate-high': Colors.gain,
  'Moderate': '#FBBF24',
  'Low-moderate': '#F97316',
  'Low — elevated uncertainty': Colors.loss,
};

const RISK_COLOR: Record<RiskLevel, string> = {
  'Below-average': Colors.gain,
  'Market-level': Colors.mutedForeground,
  'Above-average': '#F97316',
  'Elevated': Colors.loss,
};

const SKEW_COLOR: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  positive: { color: Colors.gain, icon: 'trending-up-outline' },
  negative: { color: Colors.loss, icon: 'trending-down-outline' },
  mixed: { color: '#FBBF24', icon: 'swap-horizontal-outline' },
};

function getOutcomeLabel(analog: AnalogResult): string {
  const avg5 = analog.forwardReturns.avg5d;
  const win5 = analog.forwardReturns.winRate5d;
  const n = analog.matchCount;

  if (n < 5) return 'Very limited data — interpret with caution';

  const prefix = n < 10 ? 'Tentatively ' : '';

  if (analog.outcomeSkew === 'positive') {
    const core = avg5 >= 1.0 ? 'leaned clearly positive' : 'leaned slightly positive';
    return prefix ? `${prefix}${core}` : core.charAt(0).toUpperCase() + core.slice(1);
  }
  if (analog.outcomeSkew === 'negative') {
    const core = avg5 <= -1.0 ? 'leaned clearly negative' : 'leaned slightly negative';
    return prefix ? `${prefix}${core}` : core.charAt(0).toUpperCase() + core.slice(1);
  }
  const core = win5 >= 0.5 ? 'no strong lean — slightly more gains' : 'no strong lean — slightly more losses';
  return prefix ? `${prefix}${core}` : core.charAt(0).toUpperCase() + core.slice(1);
}

function getContextLine(analog: AnalogResult): string {
  const n = analog.matchCount;
  if (n < 5) {
    return `Very small sample — only ${n} similar days found. Treat these numbers as rough context, not reliable patterns.`;
  }
  const sampleDesc = n >= 20 ? 'Strong sample' : n >= 12 ? 'Decent sample' : n >= 5 ? 'Small sample' : 'Very small sample';
  return `${sampleDesc} · ${n} similar days · ${analog.dispersionNote}`;
}

// ── Main Component ───────────────────────────────────

export default function SetupAnalysisScreen({ ticker, onBack, onHome }: SetupAnalysisScreenProps) {
  const [result, setResult] = useState<SetupAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedFactors, setExpandedFactors] = useState<Record<string, boolean>>({});
  const [showMethodology, setShowMethodology] = useState(false);
  const [showAllHeadlines, setShowAllHeadlines] = useState(false);
  const { getHolding, hasHolding } = usePortfolio();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const ownsStock = hasHolding(ticker);
        const holding = getHolding(ticker);

        const analysis = await runSetupAnalysis(
          ticker,
          undefined,
          ownsStock ? { ownsStock: true, gainPct: holding ? null : null } : undefined,
        );

        if (cancelled) return;

        if (analysis) {
          if (ownsStock && holding) {
            const gainPct = ((analysis.quote.c - holding.avgCost) / holding.avgCost) * 100;
            const withPortfolio = await runSetupAnalysis(
              ticker,
              analysis.quote,
              { ownsStock: true, gainPct },
            );
            if (!cancelled && withPortfolio) {
              setResult(withPortfolio);
            } else if (!cancelled) {
              setResult(analysis);
            }
          } else {
            setResult(analysis);
          }
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

  const toggleFactor = (name: string) => {
    setExpandedFactors((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  if (loading) return <LoadingIndicator message={`Analyzing ${ticker}...`} />;

  if (error || !result) {
    return (
      <View style={styles.errorContainer}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.mutedForeground} />
          <Text style={styles.errorTitle}>Analysis Unavailable</Text>
          <Text style={styles.errorText}>
            Could not retrieve data for {ticker}. This may be a temporary issue — please try again.
          </Text>
          <Pressable style={styles.homeButton} onPress={onHome}>
            <Text style={styles.homeButtonText}>Search Another Stock</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const { move, drivers, historical, factors, bullCase, bearCase } = result;
  const setupCfg = SETUP_CONFIG[result.setupLabel];
  const confColor = CONFIDENCE_COLOR[result.confidence];
  const riskColor = RISK_COLOR[result.riskLevel];
  const companyName = result.profile?.name || ticker;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.mutedForeground} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      {/* ── Ticker Header ─────────────────────────── */}
      <Card glow="blue">
        <View style={styles.tickerRow}>
          <View style={styles.tickerLeft}>
            <View style={[styles.tickerIcon, { backgroundColor: move.isPositive ? Colors.gainBg : Colors.lossBg }]}>
              <Ionicons name={move.isPositive ? 'trending-up' : 'trending-down'} size={24} color={move.isPositive ? Colors.gain : Colors.loss} />
            </View>
            <View>
              <Text style={styles.tickerText}>{ticker}</Text>
              <Text style={styles.tickerSub}>{companyName}</Text>
            </View>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.priceText}>${result.quote.c.toFixed(2)}</Text>
            <View style={[styles.changeBadge, { backgroundColor: move.isPositive ? Colors.gainBg : Colors.lossBg }]}>
              <Text style={[styles.changeBadgeText, { color: move.isPositive ? Colors.gain : Colors.loss }]}>
                {move.movePercent >= 0 ? '+' : ''}{move.movePercent.toFixed(2)}% ({move.moveDollar >= 0 ? '+' : ''}{move.moveDollar.toFixed(2)})
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* ── 1. Overall Setup Summary ─────────────── */}
      <Card style={{ ...styles.setupCard, borderColor: setupCfg.color + '30' }}>
        <View style={styles.setupHeader}>
          <View style={[styles.setupIconWrap, { backgroundColor: setupCfg.bg }]}>
            <Ionicons name={setupCfg.icon} size={28} color={setupCfg.color} />
          </View>
          <View style={styles.setupLabelCol}>
            <Text style={styles.setupLabelSmall}>SETUP ASSESSMENT</Text>
            <Text style={[styles.setupLabelText, { color: setupCfg.color }]}>{result.setupLabel}</Text>
          </View>
        </View>
        <Text style={styles.setupSummaryText}>{result.setupSummary}</Text>
        <View style={styles.metaPills}>
          <View style={[styles.metaPill, { borderColor: confColor + '40' }]}>
            <View style={[styles.metaDot, { backgroundColor: confColor }]} />
            <Text style={[styles.metaPillText, { color: confColor }]}>Confidence: {result.confidence}</Text>
          </View>
          <View style={[styles.metaPill, { borderColor: riskColor + '40' }]}>
            <View style={[styles.metaDot, { backgroundColor: riskColor }]} />
            <Text style={[styles.metaPillText, { color: riskColor }]}>Risk: {result.riskLevel}</Text>
          </View>
        </View>
      </Card>

      {/* ── 2. What Happened Today ────────────────── */}
      <SectionHeader number="1" color={move.isPositive ? Colors.gain : Colors.loss} title="What happened today" />
      <Card style={styles.sectionCard}>
        <View style={styles.moveCompactRow}>
          <MoveItem label="Magnitude" value={move.magnitude.charAt(0).toUpperCase() + move.magnitude.slice(1)} />
          <MoveItem label="vs Volatility" value={move.volatilityMultiple ? `${move.volatilityMultiple.toFixed(1)}x avg` : '—'} color={move.isUnusual ? '#FBBF24' : undefined} />
        </View>
        {move.isUnusual && (
          <View style={styles.unusualBanner}>
            <Ionicons name="flash" size={14} color="#FBBF24" />
            <Text style={styles.unusualText}>This move is larger than typical for this stock's recent volatility</Text>
          </View>
        )}
        {move.vsMarket && (
          <Text style={styles.contextNote}>
            Over the past month, {ticker} has been {move.vsMarket}.
          </Text>
        )}
        <View style={styles.positionRow}>
          <Text style={styles.positionLabel}>Position in today's range</Text>
          <View style={styles.miniBarTrack}>
            <View style={[styles.miniBarFill, { width: `${Math.min(Math.max(move.positionInDayRange, 3), 97)}%` }]} />
            <View style={[styles.miniBarDot, { left: `${Math.min(Math.max(move.positionInDayRange, 3), 97)}%` }]} />
          </View>
          <View style={styles.positionLabels}>
            <Text style={styles.positionHint}>Low</Text>
            <Text style={styles.positionHint}>{move.positionInDayRange.toFixed(0)}%</Text>
            <Text style={styles.positionHint}>High</Text>
          </View>
        </View>
      </Card>

      {/* ── 3. Possible Drivers ───────────────────── */}
      <SectionHeader number="2" color={Colors.accent} title="Possible drivers" />
      <Card style={styles.sectionCard}>
        <View style={styles.driverLabelRow}>
          <DriverTypePill driverType={drivers.driverType} label={drivers.driverLabel} />
        </View>
        <Text style={styles.bodyText}>{drivers.summary}</Text>
      </Card>

      {drivers.headlines.length > 0 && (
        <View style={styles.headlinesSection}>
          <View style={styles.headlinesHeader}>
            <Ionicons name="newspaper-outline" size={13} color={Colors.mutedForeground} />
            <Text style={styles.headlinesTitle}>
              {drivers.headlineRelevance === 'strong' ? 'Likely relevant' :
               drivers.headlineRelevance === 'possible' ? 'Possibly related' :
               'Recent context — may not explain today\'s move'}
            </Text>
          </View>
          {(showAllHeadlines ? drivers.headlines : drivers.headlines.slice(0, 2)).map((article) => (
            <Pressable key={article.id} onPress={() => article.url && Linking.openURL(article.url)}>
              <Card style={styles.headlineCard}>
                <Text style={styles.headlineText}>{article.headline}</Text>
                <Text style={styles.headlineMeta}>{article.source} · {timeAgo(article.datetime)}</Text>
              </Card>
            </Pressable>
          ))}
          {drivers.headlines.length > 2 && !showAllHeadlines && (
            <Pressable onPress={() => setShowAllHeadlines(true)}>
              <Text style={styles.showMoreText}>Show {drivers.headlines.length - 2} more</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── 4. What happened next — historical outcomes ── */}
      <SectionHeader number="3" color="#A78BFA" title="What happened next" />
      {historical.analog ? (
        <HistoricalOutcomesCard analog={historical.analog} move={move} historical={historical} ticker={ticker} />
      ) : (
        <HistoricalFallbackCard historical={historical} />
      )}

      {/* ── 5. Factor Breakdown ───────────────────── */}
      <SectionHeader color={Colors.primary} title="Factor breakdown" />
      <Card style={styles.sectionCard}>
        {factors.map((factor) => {
          const cfg = STATUS_CONFIG[factor.status];
          const isExpanded = expandedFactors[factor.name] ?? false;
          return (
            <View key={factor.name}>
              <Pressable style={styles.factorRow} onPress={() => toggleFactor(factor.name)}>
                <View style={[styles.factorDot, { backgroundColor: cfg.dot }]} />
                <View style={styles.factorInfo}>
                  <View style={styles.factorNameRow}>
                    <Text style={styles.factorName}>{factor.name}</Text>
                    <Text style={[styles.factorStatus, { color: cfg.color }]}>{factor.status}</Text>
                  </View>
                  <Text style={styles.factorSummary} numberOfLines={isExpanded ? undefined : 1}>{factor.summary}</Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.mutedForeground} />
              </Pressable>
              {isExpanded && factor.details.length > 0 && (
                <View style={styles.factorDetails}>
                  {factor.details.map((d, i) => (
                    <View key={i} style={styles.factorDetailRow}>
                      <Text style={styles.factorBullet}>•</Text>
                      <Text style={styles.factorDetailText}>{d}</Text>
                    </View>
                  ))}
                </View>
              )}
              {factors.indexOf(factor) < factors.length - 1 && <View style={styles.factorDivider} />}
            </View>
          );
        })}
      </Card>

      {/* ── 6. Bull vs Bear Case ──────────────────── */}
      {(bullCase.length > 0 || bearCase.length > 0) && (
        <>
          <SectionHeader color="#FBBF24" title="Bull case vs bear case" />
          <View style={styles.bullBearRow}>
            <Card style={styles.bullCard}>
              <View style={styles.caseHeader}>
                <Ionicons name="arrow-up-circle" size={16} color={Colors.gain} />
                <Text style={[styles.caseTitle, { color: Colors.gain }]}>Positives</Text>
              </View>
              {bullCase.length > 0 ? bullCase.map((b, i) => (
                <View key={i} style={styles.caseItem}>
                  <View style={[styles.caseDot, { backgroundColor: Colors.gain }]} />
                  <Text style={styles.caseText}>{b}</Text>
                </View>
              )) : (
                <Text style={styles.caseEmpty}>No strong positives detected</Text>
              )}
            </Card>
            <Card style={styles.bearCard}>
              <View style={styles.caseHeader}>
                <Ionicons name="alert-circle" size={16} color={Colors.loss} />
                <Text style={[styles.caseTitle, { color: Colors.loss }]}>Risks</Text>
              </View>
              {bearCase.length > 0 ? bearCase.map((b, i) => (
                <View key={i} style={styles.caseItem}>
                  <View style={[styles.caseDot, { backgroundColor: Colors.loss }]} />
                  <Text style={styles.caseText}>{b}</Text>
                </View>
              )) : (
                <Text style={styles.caseEmpty}>No major risks detected</Text>
              )}
            </Card>
          </View>
        </>
      )}

      {/* ── 7. Risk & Uncertainty (compact) ────────── */}
      <SectionHeader color={riskColor} title="Risk & uncertainty" />
      <Card style={styles.riskCompactCard}>
        <Text style={styles.riskCompactText}>{result.riskSummary}</Text>
      </Card>

      {/* ── 8. Your Position ──────────────────────── */}
      {result.portfolioContext && (
        <Card style={styles.portfolioCard}>
          <View style={styles.portfolioHeader}>
            <Ionicons name="person-circle-outline" size={18} color={Colors.accent} />
            <Text style={styles.portfolioTitle}>Your Position</Text>
          </View>
          <Text style={styles.portfolioText}>{result.portfolioContext}</Text>
        </Card>
      )}

      {/* ── 9. Bottom Line ────────────────────────── */}
      <Card style={styles.bottomLineCard}>
        <View style={styles.bottomLineHeader}>
          <Ionicons name="bulb" size={20} color={setupCfg.color} />
          <Text style={styles.bottomLineTitle}>Bottom Line</Text>
        </View>
        <Text style={styles.bottomLineText}>{result.bottomLine}</Text>
      </Card>

      {/* ── 10. Methodology ───────────────────────── */}
      <Pressable style={styles.methodologyToggle} onPress={() => setShowMethodology(!showMethodology)}>
        <View style={styles.methodologyToggleInner}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.mutedForeground} />
          <Text style={styles.methodologyToggleText}>How this analysis works</Text>
        </View>
        <Ionicons name={showMethodology ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.mutedForeground} />
      </Pressable>
      {showMethodology && (
        <Card style={styles.methodologyCard}>
          <Text style={styles.methodologyText}>
            This analysis evaluates the stock setup across 8 factors: momentum, relative strength, trend position, valuation, growth, profitability, volatility/risk, and news activity.
          </Text>
          <Text style={styles.methodologyText}>
            Each factor is scored using publicly available data from Finnhub, including recent price returns, fundamental metrics (P/E, growth rates, margins, leverage), relative performance vs the S&P 500, and recent company news.
          </Text>
          <Text style={styles.methodologyText}>
            The setup label reflects the overall balance of positive and negative factors. Results are descriptive — they describe the current data picture — and are not predictive or prescriptive. This is not financial advice.
          </Text>
          <Text style={styles.methodologyText}>
            Historical pattern matching identifies past trading days when this stock had a similar setup (same move direction, comparable magnitude, similar volatility environment and short-term trend). It then reports what happened over the following 3, 5, and 10 trading days. If too few matches are found, criteria are automatically widened until a sufficient sample is reached. Results are descriptive — past patterns do not guarantee future outcomes.
          </Text>
        </Card>
      )}

      {/* ── Disclaimer ────────────────────────────── */}
      <View style={styles.disclaimerRow}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.mutedForeground} />
        <Text style={styles.disclaimerText}>
          This analysis is based on publicly available data and does not constitute financial advice. It does not account for your financial situation, goals, or risk tolerance. Always do your own research.
        </Text>
      </View>

      {/* ── Home Button ───────────────────────────── */}
      <Pressable style={styles.homeButton} onPress={onHome}>
        <Ionicons name="search" size={16} color={Colors.primaryForeground} />
        <Text style={styles.homeButtonText}>Search Another Stock</Text>
      </Pressable>
    </ScrollView>
  );
}

// ── Subcomponents ────────────────────────────────────

function HistoricalOutcomesCard({
  analog, move, historical, ticker,
}: { analog: AnalogResult; move: SetupAnalysis['move']; historical: SetupAnalysis['historical']; ticker: string }) {
  const [showHow, setShowHow] = useState(false);
  const skew = SKEW_COLOR[analog.outcomeSkew];
  const fr = analog.forwardReturns;
  const winPct = fr.winRate5d * 100;
  const winColor = winPct >= 60 ? Colors.gain : winPct >= 45 ? '#FBBF24' : Colors.loss;
  const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

  return (
    <Card style={{ ...styles.outcomesCard, borderColor: '#A78BFA25' }}>
      {/* ── Headline ── */}
      <View style={styles.outcomesHeadline}>
        <View style={[styles.outcomesIconWrap, { backgroundColor: skew.color + '12' }]}>
          <Ionicons name={skew.icon} size={22} color={skew.color} />
        </View>
        <View style={styles.outcomesHeadlineCol}>
          <Text style={styles.outcomesSmallLabel}>WHEN THIS HAPPENED BEFORE</Text>
          <Text style={[styles.outcomesHeadlineText, { color: skew.color }]}>{getOutcomeLabel(analog)}</Text>
        </View>
      </View>

      {/* ── Similarity one-liner ── */}
      <Text style={styles.outcomesSimilarityLine}>{analog.similarityExplanation}</Text>

      {/* ── Hero Stats (Avg 5-day, Win rate, Similar days) ── */}
      <View style={styles.outcomesHeroRow}>
        <View style={styles.outcomesHeroCell}>
          <Text style={styles.outcomesHeroLabel}>AVG 5-DAY RETURN</Text>
          <Text style={[styles.outcomesHeroValue, { color: fr.avg5d >= 0 ? Colors.gain : Colors.loss }]}>
            {fmtPct(fr.avg5d)}
          </Text>
        </View>
        <View style={styles.outcomesHeroDivider} />
        <View style={styles.outcomesHeroCell}>
          <Text style={styles.outcomesHeroLabel}>POSITIVE AFTER 5 DAYS</Text>
          <Text style={[styles.outcomesHeroValue, { color: winColor }]}>{winPct.toFixed(0)}%</Text>
        </View>
        <View style={styles.outcomesHeroDivider} />
        <View style={styles.outcomesHeroCell}>
          <Text style={styles.outcomesHeroLabel}>SIMILAR DAYS</Text>
          <Text style={styles.outcomesHeroValue}>{analog.matchCount}</Text>
        </View>
      </View>

      {/* ── Supporting Metrics (compact inline row) ── */}
      <View style={styles.outcomesSupportRow}>
        <Text style={styles.outcomesSupportItem}>
          3-day avg <Text style={{ color: fr.avg3d >= 0 ? Colors.gain : Colors.loss, fontWeight: '700' }}>{fmtPct(fr.avg3d)}</Text>
        </Text>
        <Text style={styles.outcomesSupportSep}>·</Text>
        <Text style={styles.outcomesSupportItem}>
          10-day avg <Text style={{ color: fr.avg10d >= 0 ? Colors.gain : Colors.loss, fontWeight: '700' }}>{fmtPct(fr.avg10d)}</Text>
        </Text>
        <Text style={styles.outcomesSupportSep}>·</Text>
        <Text style={styles.outcomesSupportItem}>
          Best <Text style={{ color: fr.bestCase >= 0 ? Colors.gain : Colors.loss, fontWeight: '700' }}>{fmtPct(fr.bestCase)}</Text>
        </Text>
        <Text style={styles.outcomesSupportSep}>·</Text>
        <Text style={styles.outcomesSupportItem}>
          Worst <Text style={{ color: fr.worstCase >= 0 ? Colors.gain : Colors.loss, fontWeight: '700' }}>{fmtPct(fr.worstCase)}</Text>
        </Text>
      </View>

      {/* ── Context line (merged reliability + dispersion) ── */}
      <Text style={styles.outcomesContextLine}>{getContextLine(analog)}</Text>

      {/* ── How this works (expandable) ── */}
      <Pressable style={styles.outcomesHowToggle} onPress={() => setShowHow(!showHow)}>
        <Text style={styles.outcomesHowToggleText}>{showHow ? 'Hide details' : 'How we match similar days'}</Text>
        <Ionicons name={showHow ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.mutedForeground} />
      </Pressable>
      {showHow && (
        <View style={styles.outcomesHowBlock}>
          <Text style={styles.outcomesHowText}>We compare four things to find similar past trading days:</Text>
          <View style={styles.outcomesHowBullets}>
            <Text style={styles.outcomesHowBullet}>
              <Text style={styles.outcomesHowBulletLabel}>Move direction</Text> — same as today (up or down)
            </Text>
            <Text style={styles.outcomesHowBullet}>
              <Text style={styles.outcomesHowBulletLabel}>Move size</Text> — within a few percentage points
            </Text>
            <Text style={styles.outcomesHowBullet}>
              <Text style={styles.outcomesHowBulletLabel}>Volatility</Text> — similar recent price swings
            </Text>
            <Text style={styles.outcomesHowBullet}>
              <Text style={styles.outcomesHowBulletLabel}>Trend</Text> — heading in a similar direction over the prior week
            </Text>
          </View>
          <Text style={styles.outcomesHowFootnote}>
            If very few matches are found, criteria are relaxed slightly to ensure a meaningful sample.
          </Text>
          <View style={styles.outcomesDisclaimer}>
            <Ionicons name="information-circle-outline" size={12} color={Colors.mutedForeground} />
            <Text style={styles.outcomesDisclaimerText}>
              Past patterns are descriptive, not predictive — they do not guarantee future results.
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

function HistoricalFallbackCard({ historical }: { historical: SetupAnalysis['historical'] }) {
  return (
    <Card style={styles.outcomesFallbackCard}>
      <View style={styles.outcomesFallbackIcon}>
        <Ionicons name="hourglass-outline" size={24} color={Colors.mutedForeground} />
      </View>
      <Text style={styles.outcomesFallbackTitle}>Not enough data for pattern matching</Text>
      <Text style={styles.outcomesFallbackText}>{historical.note}</Text>
      {historical.moveUnusualness && (
        <View style={styles.outcomesFallbackContext}>
          <Text style={styles.outcomesFallbackContextText}>{historical.moveUnusualness}</Text>
        </View>
      )}
    </Card>
  );
}


function DriverTypePill({ driverType, label }: { driverType: string; label: string }) {
  const config: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    'company-specific': { icon: 'business-outline', color: Colors.accent },
    'sector-market': { icon: 'globe-outline', color: '#A78BFA' },
    'no-clear-catalyst': { icon: 'help-circle-outline', color: Colors.mutedForeground },
  };
  const cfg = config[driverType] ?? config['no-clear-catalyst'];

  return (
    <View style={[styles.driverPill, { borderColor: cfg.color + '40' }]}>
      <Ionicons name={cfg.icon} size={13} color={cfg.color} />
      <Text style={[styles.driverPillText, { color: cfg.color }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ number, color, title }: { number?: string; color: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {number ? (
        <View style={[styles.sectionNum, { backgroundColor: color + '15' }]}>
          <Text style={[styles.sectionNumText, { color }]}>{number}</Text>
        </View>
      ) : (
        <View style={[styles.sectionDot, { backgroundColor: color }]} />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function MoveItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.moveItem}>
      <Text style={styles.moveItemLabel}>{label}</Text>
      <Text style={[styles.moveItemValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24, gap: 12 },

  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 4 },
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

  setupCard: { gap: 12, borderWidth: 1, borderColor: Colors.border },
  setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  setupIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  setupLabelCol: { flex: 1, gap: 2 },
  setupLabelSmall: { fontSize: 9, color: Colors.mutedForeground, letterSpacing: 1.5, fontWeight: '700' },
  setupLabelText: { fontSize: 22, fontWeight: '800' },
  setupSummaryText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },
  metaPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  metaDot: { width: 6, height: 6, borderRadius: 3 },
  metaPillText: { fontSize: 11, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  sectionNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionNumText: { fontSize: 12, fontWeight: '800' },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 1.2 },

  sectionCard: { gap: 12 },
  bodyText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  moveCompactRow: { flexDirection: 'row', gap: 8 },
  moveItem: { width: '50%', paddingVertical: 6 },
  moveItemLabel: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  moveItemValue: { fontSize: 16, fontWeight: '700', color: Colors.foreground, marginTop: 2 },

  unusualBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.08)', borderRadius: 8, padding: 10 },
  unusualText: { fontSize: 12, color: '#FBBF24', flex: 1, fontWeight: '600' },

  contextNote: { fontSize: 13, color: Colors.secondaryForeground, lineHeight: 20, fontStyle: 'italic' },

  positionRow: { gap: 4 },
  positionLabel: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  miniBarTrack: { height: 6, backgroundColor: Colors.secondary, borderRadius: 3, position: 'relative' },
  miniBarFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3, opacity: 0.3 },
  miniBarDot: { position: 'absolute', top: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.accent, marginLeft: -6 },
  positionLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  positionHint: { fontSize: 10, color: Colors.mutedForeground },

  driverLabelRow: { marginBottom: 4 },
  driverPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, alignSelf: 'flex-start' },
  driverPillText: { fontSize: 11, fontWeight: '700' },

  headlinesSection: { gap: 6 },
  headlinesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 4 },
  headlinesTitle: { fontSize: 10, color: Colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  headlineCard: { paddingVertical: 10, marginBottom: 4 },
  headlineText: { fontSize: 13, fontWeight: '500', color: Colors.foreground, lineHeight: 19 },
  headlineMeta: { fontSize: 11, color: Colors.mutedForeground, marginTop: 3 },
  showMoreText: { fontSize: 12, color: Colors.accent, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 4 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 2 },

  returnsContext: { fontSize: 13, color: Colors.secondaryForeground, fontWeight: '600', lineHeight: 20 },

  factorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  factorDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  factorInfo: { flex: 1, gap: 2 },
  factorNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factorName: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  factorStatus: { fontSize: 12, fontWeight: '700' },
  factorSummary: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17 },
  factorDetails: { paddingLeft: 18, gap: 4, paddingBottom: 6 },
  factorDetailRow: { flexDirection: 'row', gap: 6 },
  factorBullet: { color: Colors.mutedForeground, fontSize: 12, lineHeight: 18 },
  factorDetailText: { color: Colors.secondaryForeground, fontSize: 12, lineHeight: 18, flex: 1 },
  factorDivider: { height: 1, backgroundColor: Colors.border },

  bullBearRow: { flexDirection: 'row', gap: 8 },
  bullCard: { flex: 1, gap: 8 },
  bearCard: { flex: 1, gap: 8 },
  caseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caseTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  caseItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  caseDot: { width: 5, height: 5, borderRadius: 3, marginTop: 5 },
  caseText: { fontSize: 11, color: Colors.foreground, lineHeight: 16, flex: 1 },
  caseEmpty: { fontSize: 11, color: Colors.mutedForeground, fontStyle: 'italic' },

  riskCompactCard: { paddingVertical: 12, paddingHorizontal: 14 },
  riskCompactText: { fontSize: 13, color: Colors.secondaryForeground, lineHeight: 19 },

  portfolioCard: { gap: 8, backgroundColor: 'rgba(24,181,240,0.04)', borderColor: 'rgba(24,181,240,0.15)' },
  portfolioHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  portfolioTitle: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  portfolioText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  bottomLineCard: { borderWidth: 1, borderColor: Colors.border, gap: 10 },
  bottomLineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomLineTitle: { fontSize: 14, fontWeight: '700', color: Colors.foreground },
  bottomLineText: { fontSize: 14, color: Colors.foreground, lineHeight: 22 },

  methodologyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.secondary, borderRadius: 10, padding: 12 },
  methodologyToggleInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodologyToggleText: { fontSize: 13, color: Colors.mutedForeground, fontWeight: '600' },
  methodologyCard: { gap: 8 },
  methodologyText: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 18 },

  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginTop: 4 },
  disclaimerText: { flex: 1, fontSize: 11, color: Colors.mutedForeground, lineHeight: 16 },

  // Historical Outcomes
  outcomesCard: { gap: 16, borderWidth: 1 },
  outcomesHeadline: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  outcomesIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  outcomesHeadlineCol: { flex: 1, gap: 2 },
  outcomesSmallLabel: { fontSize: 9, color: Colors.mutedForeground, letterSpacing: 1.4, fontWeight: '700' },
  outcomesHeadlineText: { fontSize: 18, fontWeight: '800' },

  outcomesSimilarityLine: { fontSize: 12.5, color: Colors.secondaryForeground, lineHeight: 18 },

  outcomesHeroRow: { flexDirection: 'row', backgroundColor: Colors.secondary, borderRadius: 14, padding: 4 },
  outcomesHeroDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 10 },
  outcomesHeroCell: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 5 },
  outcomesHeroLabel: { fontSize: 8.5, color: Colors.mutedForeground, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  outcomesHeroValue: { fontSize: 22, fontWeight: '800', color: Colors.foreground },

  outcomesSupportRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  outcomesSupportItem: { fontSize: 12, color: Colors.mutedForeground },
  outcomesSupportSep: { fontSize: 12, color: Colors.border, marginHorizontal: 2 },

  outcomesContextLine: { fontSize: 12, color: Colors.mutedForeground, lineHeight: 17, fontStyle: 'italic', textAlign: 'center' },

  outcomesHowToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 2 },
  outcomesHowToggleText: { fontSize: 12, color: Colors.mutedForeground, fontWeight: '600' },
  outcomesHowBlock: { gap: 10, backgroundColor: Colors.secondary, borderRadius: 10, padding: 14 },
  outcomesHowText: { fontSize: 12, color: Colors.foreground, lineHeight: 18, fontWeight: '600' },
  outcomesHowBullets: { gap: 6, paddingLeft: 4 },
  outcomesHowBullet: { fontSize: 12, color: Colors.secondaryForeground, lineHeight: 17 },
  outcomesHowBulletLabel: { fontWeight: '700', color: Colors.foreground },
  outcomesHowFootnote: { fontSize: 11, color: Colors.mutedForeground, lineHeight: 16 },
  outcomesDisclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  outcomesDisclaimerText: { fontSize: 10.5, color: Colors.mutedForeground, lineHeight: 15, flex: 1 },

  outcomesFallbackCard: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  outcomesFallbackIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.secondary, alignItems: 'center', justifyContent: 'center' },
  outcomesFallbackTitle: { fontSize: 15, fontWeight: '700', color: Colors.foreground },
  outcomesFallbackText: { fontSize: 13, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 19, paddingHorizontal: 8 },
  outcomesFallbackContext: { backgroundColor: Colors.secondary, borderRadius: 10, padding: 12, alignSelf: 'stretch' },
  outcomesFallbackContextText: { fontSize: 12, color: Colors.secondaryForeground, lineHeight: 17 },

  homeButton: { flexDirection: 'row', backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  homeButtonText: { fontSize: 15, fontWeight: '600', color: Colors.primaryForeground },

  errorContainer: { flex: 1 },
  errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 32, marginTop: -60 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: Colors.foreground },
  errorText: { fontSize: 15, color: Colors.mutedForeground, textAlign: 'center', lineHeight: 22 },
});
