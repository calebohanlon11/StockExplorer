import { getQuote, getStockMetrics, getRecentNews, getCompanyProfile, Quote, StockMetrics, NewsArticle, CompanyProfile } from './finnhub';
import { runHistoricalAnalog, AnalogResult, ReliabilityGrade } from './historicalAnalog';

export type { AnalogResult, ReliabilityGrade };

// ── Setup Labels (no Buy/Sell language) ──────────────

export type SetupLabel =
  | 'Favorable Setup'
  | 'Cautiously Positive'
  | 'Mixed Setup'
  | 'Cautiously Negative'
  | 'Weak Setup';

export type ConfidenceLevel =
  | 'Moderate-high'
  | 'Moderate'
  | 'Low-moderate'
  | 'Low — elevated uncertainty';

export type RiskLevel =
  | 'Below-average'
  | 'Market-level'
  | 'Above-average'
  | 'Elevated';

export type FactorStatus = 'Strong' | 'Positive' | 'Neutral' | 'Weak' | 'Concerning' | 'Insufficient data';

// ── Interfaces ───────────────────────────────────────

export interface Factor {
  name: string;
  status: FactorStatus;
  score: number;
  summary: string;
  details: string[];
}

export interface KeyPoint {
  label: string;
  type: 'bull' | 'bear';
  category: string;
}

export interface MoveContext {
  movePercent: number;
  moveDollar: number;
  isPositive: boolean;
  magnitude: 'minor' | 'moderate' | 'notable' | 'sharp';
  volatilityMultiple: number | null;
  isUnusual: boolean;
  positionInDayRange: number;
  positionIn52wRange: number;
  nearHigh52w: boolean;
  nearLow52w: boolean;
  vsMarket: string | null;
}

export interface DriverAnalysis {
  summary: string;
  headlines: NewsArticle[];
  hasCompanyNews: boolean;
  driverType: 'company-specific' | 'sector-market' | 'no-clear-catalyst';
  driverLabel: string;
  headlineRelevance: 'strong' | 'possible' | 'background' | 'none';
}

export interface HistoricalContext {
  available: boolean;
  moveUnusualness: string;
  trendContext: string;
  returnsContext: string;
  note: string;
  analog: AnalogResult | null;
}

export interface SetupAnalysis {
  setupLabel: SetupLabel;
  setupSummary: string;
  confidence: ConfidenceLevel;
  riskLevel: RiskLevel;
  riskSummary: string;
  totalScore: number;
  move: MoveContext;
  drivers: DriverAnalysis;
  historical: HistoricalContext;
  factors: Factor[];
  bullCase: string[];
  bearCase: string[];
  bottomLine: string;
  quote: Quote;
  metrics: StockMetrics;
  profile: CompanyProfile | null;
  portfolioContext: string | null;
}

// ── Helpers ──────────────────────────────────────────

function n(val: number | null | undefined): number | null {
  return val != null && isFinite(val) ? val : null;
}

function statusFromScore(score: number, max: number): FactorStatus {
  const ratio = score / max;
  if (ratio >= 0.6) return 'Strong';
  if (ratio >= 0.2) return 'Positive';
  if (ratio > -0.2) return 'Neutral';
  if (ratio > -0.6) return 'Weak';
  return 'Concerning';
}

// ── Factor Scoring ───────────────────────────────────

function scoreMomentum(m: StockMetrics, q: Quote): Factor {
  let score = 0;
  const details: string[] = [];
  const todayPct = q.dp ?? 0;

  const ret5d = n(m['5DayPriceReturnDaily']);
  const ret13w = n(m['13WeekPriceReturnDaily']);
  const ret52w = n(m['52WeekPriceReturnDaily']);

  if (ret5d !== null) {
    if (ret5d > 3) { score += 1; details.push(`5-day return of +${ret5d.toFixed(1)}% shows short-term strength`); }
    else if (ret5d > 0) { score += 0.5; details.push(`5-day return is mildly positive (+${ret5d.toFixed(1)}%)`); }
    else if (ret5d < -3) { score -= 1; details.push(`5-day return of ${ret5d.toFixed(1)}% signals short-term weakness`); }
    else if (ret5d < 0) { score -= 0.5; details.push(`5-day return is slightly negative (${ret5d.toFixed(1)}%)`); }
  }

  if (ret13w !== null) {
    if (ret13w > 10) { score += 1; details.push(`3-month trend is strong (+${ret13w.toFixed(1)}%)`); }
    else if (ret13w > 0) { score += 0.4; details.push(`3-month trend is mildly positive (+${ret13w.toFixed(1)}%)`); }
    else if (ret13w < -10) { score -= 1; details.push(`3-month trend is negative (${ret13w.toFixed(1)}%)`); }
    else if (ret13w < 0) { score -= 0.4; details.push(`3-month trend is slightly negative (${ret13w.toFixed(1)}%)`); }
  }

  if (ret52w !== null) {
    if (ret52w > 20) { score += 0.5; details.push(`Up ${ret52w.toFixed(0)}% over the past year`); }
    else if (ret52w < -20) { score -= 0.5; details.push(`Down ${Math.abs(ret52w).toFixed(0)}% over the past year`); }
  }

  if (todayPct > 2) { score += 0.3; }
  else if (todayPct < -2) { score -= 0.3; }

  score = Math.max(-3, Math.min(3, score));
  const summary = buildFactorSummary('Momentum', score, 3, ret13w, ret5d);

  return { name: 'Momentum', status: statusFromScore(score, 3), score, summary, details };
}

function buildFactorSummary(name: string, score: number, max: number, ret13w: number | null, ret5d: number | null): string {
  if (name === 'Momentum') {
    if (score > 1.5) return 'Price momentum is strong across short and medium-term timeframes.';
    if (score > 0.3) return 'Momentum is mildly positive — recent price action has been supportive.';
    if (score > -0.3) return 'Momentum is neutral — no strong directional trend in recent price action.';
    if (score > -1.5) return 'Momentum is weak — recent price action has been negative.';
    return 'Momentum is strongly negative — the stock has been under sustained selling pressure.';
  }
  return '';
}

function scoreRelativeStrength(m: StockMetrics): Factor {
  let score = 0;
  const details: string[] = [];

  const rel4w = n(m['priceRelativeToS&P5004Week']);
  const rel13w = n(m['priceRelativeToS&P50013Week']);
  const rel52w = n(m['priceRelativeToS&P50052Week']);

  let dataPoints = 0;

  if (rel4w !== null) {
    dataPoints++;
    if (rel4w > 3) { score += 0.6; details.push(`Outperforming S&P 500 by ${rel4w.toFixed(1)}% over 4 weeks`); }
    else if (rel4w < -3) { score -= 0.6; details.push(`Underperforming S&P 500 by ${Math.abs(rel4w).toFixed(1)}% over 4 weeks`); }
    else { details.push(`Tracking roughly in line with S&P 500 over 4 weeks (${rel4w >= 0 ? '+' : ''}${rel4w.toFixed(1)}%)`); }
  }

  if (rel13w !== null) {
    dataPoints++;
    if (rel13w > 5) { score += 0.8; details.push(`Outperforming S&P 500 by ${rel13w.toFixed(1)}% over 13 weeks`); }
    else if (rel13w < -5) { score -= 0.8; details.push(`Underperforming S&P 500 by ${Math.abs(rel13w).toFixed(1)}% over 13 weeks`); }
  }

  if (rel52w !== null) {
    dataPoints++;
    if (rel52w > 10) { score += 0.6; details.push(`Outperforming S&P 500 by ${rel52w.toFixed(1)}% over 1 year`); }
    else if (rel52w < -10) { score -= 0.6; details.push(`Underperforming S&P 500 by ${Math.abs(rel52w).toFixed(1)}% over 1 year`); }
  }

  score = Math.max(-2, Math.min(2, score));

  let summary: string;
  if (dataPoints === 0) summary = 'Relative strength data is not available for this stock.';
  else if (score > 0.5) summary = 'The stock is outperforming the broader market across measured timeframes.';
  else if (score > -0.5) summary = 'The stock is performing roughly in line with the broader market.';
  else summary = 'The stock is lagging the broader market across measured timeframes.';

  return { name: 'Relative Strength', status: dataPoints === 0 ? 'Insufficient data' : statusFromScore(score, 2), score, summary, details };
}

function scoreTrendPosition(m: StockMetrics, q: Quote): Factor {
  let score = 0;
  const details: string[] = [];

  const high52 = n(m['52WeekHigh']) ?? q.c;
  const low52 = n(m['52WeekLow']) ?? q.c;
  const range52 = high52 - low52;
  const pos = range52 > 0 ? ((q.c - low52) / range52) * 100 : 50;

  if (pos > 80) {
    score += 0.5;
    details.push(`Trading near 52-week high (${pos.toFixed(0)}th percentile of range)`);
  } else if (pos > 60) {
    score += 0.3;
    details.push(`In the upper portion of its 52-week range (${pos.toFixed(0)}th percentile)`);
  } else if (pos < 20) {
    score -= 0.5;
    details.push(`Trading near 52-week low (${pos.toFixed(0)}th percentile of range)`);
  } else if (pos < 40) {
    score -= 0.2;
    details.push(`In the lower portion of its 52-week range (${pos.toFixed(0)}th percentile)`);
  } else {
    details.push(`Trading near the middle of its 52-week range (${pos.toFixed(0)}th percentile)`);
  }

  const mtd = n(m.monthToDatePriceReturnDaily);
  const ytd = n(m.yearToDatePriceReturnDaily);

  if (mtd !== null) {
    if (mtd > 5) { score += 0.3; details.push(`Up ${mtd.toFixed(1)}% month-to-date`); }
    else if (mtd < -5) { score -= 0.3; details.push(`Down ${Math.abs(mtd).toFixed(1)}% month-to-date`); }
  }

  if (ytd !== null) {
    if (ytd > 15) { score += 0.2; details.push(`Up ${ytd.toFixed(1)}% year-to-date`); }
    else if (ytd < -15) { score -= 0.2; details.push(`Down ${Math.abs(ytd).toFixed(1)}% year-to-date`); }
  }

  score = Math.max(-1, Math.min(1, score));

  let summary: string;
  if (score > 0.3) summary = 'The stock is trading in a strong position within its recent range.';
  else if (score > -0.3) summary = 'The stock sits near the middle of its recent range — no extreme positioning.';
  else summary = 'The stock is trading in a weak position, near the lower end of its recent range.';

  return { name: 'Trend Position', status: statusFromScore(score, 1), score, summary, details };
}

function scoreValuation(m: StockMetrics): Factor {
  let score = 0;
  const details: string[] = [];
  let dataPoints = 0;

  const pe = n(m.peTTM);
  const fpe = n(m.forwardPE);
  const peg = n(m.pegTTM);
  const evEbitda = n(m.evEbitdaTTM);
  const pb = n(m.pbQuarterly);

  if (pe !== null && pe > 0) {
    dataPoints++;
    if (pe < 15) { score += 1; details.push(`Trailing P/E of ${pe.toFixed(1)}x — below market average, suggesting possible undervaluation`); }
    else if (pe < 25) { score += 0.3; details.push(`Trailing P/E of ${pe.toFixed(1)}x — within a reasonable range`); }
    else if (pe > 50) { score -= 1; details.push(`Trailing P/E of ${pe.toFixed(1)}x — well above average, priced for significant growth expectations`); }
    else if (pe > 35) { score -= 0.5; details.push(`Trailing P/E of ${pe.toFixed(1)}x — somewhat elevated`); }
    else { details.push(`Trailing P/E of ${pe.toFixed(1)}x`); }
  }

  if (fpe !== null && pe !== null && fpe > 0 && pe > 0 && fpe < pe) {
    dataPoints++;
    score += 0.3;
    details.push(`Forward P/E (${fpe.toFixed(1)}x) is below trailing — earnings expected to improve`);
  }

  if (peg !== null && peg > 0) {
    dataPoints++;
    if (peg < 1) { score += 0.5; details.push(`PEG ratio of ${peg.toFixed(2)} suggests growth at a reasonable price`); }
    else if (peg > 3) { score -= 0.5; details.push(`PEG ratio of ${peg.toFixed(2)} — price may not be justified by growth rate`); }
  }

  if (evEbitda !== null && evEbitda > 0) {
    dataPoints++;
    if (evEbitda < 10) { score += 0.3; details.push(`EV/EBITDA of ${evEbitda.toFixed(1)}x — reasonable enterprise valuation`); }
    else if (evEbitda > 30) { score -= 0.3; details.push(`EV/EBITDA of ${evEbitda.toFixed(1)}x — elevated enterprise valuation`); }
  }

  score = Math.max(-2, Math.min(2, score));

  let summary: string;
  if (dataPoints === 0) summary = 'Valuation data is not available for this stock.';
  else if (score > 0.5) summary = 'Current valuation appears reasonable relative to fundamentals and growth.';
  else if (score > -0.3) summary = 'Valuation sits near its recent historical range — neither cheap nor expensive.';
  else summary = 'Valuation appears stretched — the stock is priced for high expectations.';

  return { name: 'Valuation', status: dataPoints === 0 ? 'Insufficient data' : statusFromScore(score, 2), score, summary, details };
}

function scoreGrowth(m: StockMetrics): Factor {
  let score = 0;
  const details: string[] = [];
  let dataPoints = 0;

  const epsG = n(m.epsGrowthTTMYoy);
  const revG = n(m.revenueGrowthTTMYoy);
  const epsG5 = n(m.epsGrowth5Y);
  const revG5 = n(m.revenueGrowth5Y);

  if (epsG !== null) {
    dataPoints++;
    if (epsG > 25) { score += 1.5; details.push(`Earnings growing +${epsG.toFixed(0)}% year-over-year — strong`); }
    else if (epsG > 10) { score += 0.8; details.push(`Earnings growing +${epsG.toFixed(0)}% year-over-year — solid`); }
    else if (epsG > 0) { score += 0.3; details.push(`Earnings growing +${epsG.toFixed(0)}% year-over-year — modest`); }
    else if (epsG < -10) { score -= 1; details.push(`Earnings declining ${epsG.toFixed(0)}% year-over-year`); }
    else if (epsG < 0) { score -= 0.4; details.push(`Earnings slightly contracting (${epsG.toFixed(0)}% YoY)`); }
  }

  if (revG !== null) {
    dataPoints++;
    if (revG > 20) { score += 1; details.push(`Revenue growing +${revG.toFixed(0)}% year-over-year — strong top-line momentum`); }
    else if (revG > 5) { score += 0.5; details.push(`Revenue growing +${revG.toFixed(0)}% year-over-year`); }
    else if (revG < -5) { score -= 0.5; details.push(`Revenue declining ${revG.toFixed(0)}% year-over-year`); }
  }

  if (epsG5 !== null && epsG5 > 15) {
    dataPoints++;
    score += 0.3;
    details.push(`Consistent 5-year EPS growth trend (+${epsG5.toFixed(0)}%/year)`);
  }

  score = Math.max(-2, Math.min(3, score));

  let summary: string;
  if (dataPoints === 0) summary = 'Growth data is not available for this stock.';
  else if (score > 1.5) summary = 'The business is growing strongly — both earnings and revenue are expanding at a healthy rate.';
  else if (score > 0.5) summary = 'Growth is solid — the business continues to expand at a reasonable pace.';
  else if (score > -0.3) summary = 'Growth is modest — the business is not declining but is not expanding rapidly.';
  else summary = 'Growth is weakening — earnings or revenue are contracting, which is a concern.';

  return { name: 'Growth', status: dataPoints === 0 ? 'Insufficient data' : statusFromScore(score, 3), score, summary, details };
}

function scoreProfitability(m: StockMetrics): Factor {
  let score = 0;
  const details: string[] = [];
  let dataPoints = 0;

  const roe = n(m.roeTTM);
  const margin = n(m.netProfitMarginTTM);
  const gross = n(m.grossMarginTTM);
  const opMargin = n(m.operatingMarginTTM);

  if (roe !== null) {
    dataPoints++;
    if (roe > 25) { score += 1; details.push(`Return on equity of ${roe.toFixed(0)}% — excellent capital efficiency`); }
    else if (roe > 15) { score += 0.5; details.push(`Return on equity of ${roe.toFixed(0)}% — solid`); }
    else if (roe < 5 && roe >= 0) { score -= 0.3; details.push(`Return on equity of ${roe.toFixed(0)}% — below average`); }
    else if (roe < 0) { score -= 1; details.push(`Negative return on equity (${roe.toFixed(0)}%) — company is not generating returns for shareholders`); }
  }

  if (margin !== null) {
    dataPoints++;
    if (margin > 20) { score += 0.5; details.push(`Net profit margin of ${margin.toFixed(1)}% — high-quality earnings`); }
    else if (margin > 10) { score += 0.3; details.push(`Net profit margin of ${margin.toFixed(1)}%`); }
    else if (margin < 0) { score -= 0.5; details.push(`Negative net profit margin — company is currently unprofitable`); }
  }

  if (gross !== null && gross > 50) {
    dataPoints++;
    score += 0.3;
    details.push(`Gross margin of ${gross.toFixed(0)}% — strong pricing power`);
  }

  if (opMargin !== null) {
    dataPoints++;
    if (opMargin > 25) { score += 0.2; details.push(`Operating margin of ${opMargin.toFixed(1)}% — operationally efficient`); }
    else if (opMargin < 5 && opMargin > 0) { details.push(`Operating margin of ${opMargin.toFixed(1)}% — thin`); }
  }

  score = Math.max(-2, Math.min(2, score));

  let summary: string;
  if (dataPoints === 0) summary = 'Profitability data is not available for this stock.';
  else if (score > 0.8) summary = 'The business is highly profitable with strong margins and returns on capital.';
  else if (score > 0.2) summary = 'Profitability is solid — the business generates reasonable margins.';
  else if (score > -0.3) summary = 'Profitability is modest — margins are not particularly strong or weak.';
  else summary = 'Profitability is a concern — margins are thin or the company is operating at a loss.';

  return { name: 'Profitability', status: dataPoints === 0 ? 'Insufficient data' : statusFromScore(score, 2), score, summary, details };
}

function scoreVolatilityRisk(m: StockMetrics): Factor {
  let score = 0;
  const details: string[] = [];
  let dataPoints = 0;

  const beta = n(m.beta);
  const debtEq = n(m['totalDebt/totalEquityQuarterly']);
  const vol = n(m['3MonthADReturnStd']);

  if (beta !== null) {
    dataPoints++;
    if (beta > 1.5) { score -= 1; details.push(`Beta of ${beta.toFixed(2)} — significantly more volatile than the market`); }
    else if (beta > 1.2) { score -= 0.3; details.push(`Beta of ${beta.toFixed(2)} — somewhat more volatile than the market`); }
    else if (beta < 0.8 && beta > 0) { score += 0.5; details.push(`Beta of ${beta.toFixed(2)} — less volatile than the market`); }
    else if (beta >= 0.8 && beta <= 1.2) { details.push(`Beta of ${beta.toFixed(2)} — moves roughly in line with the market`); }
  }

  if (debtEq !== null) {
    dataPoints++;
    if (debtEq > 200) { score -= 1; details.push(`Debt-to-equity of ${debtEq.toFixed(0)}% — high leverage increases risk`); }
    else if (debtEq > 100) { score -= 0.3; details.push(`Debt-to-equity of ${debtEq.toFixed(0)}% — moderate leverage`); }
    else if (debtEq < 30) { score += 0.5; details.push(`Debt-to-equity of ${debtEq.toFixed(0)}% — conservatively capitalized`); }
    else { details.push(`Debt-to-equity of ${debtEq.toFixed(0)}%`); }
  }

  if (vol !== null) {
    dataPoints++;
    if (vol > 3) { score -= 0.5; details.push('3-month realized volatility is elevated — expect larger daily swings'); }
    else if (vol > 2) { details.push('3-month realized volatility is moderate'); }
    else if (vol < 1.5) { score += 0.3; details.push('3-month realized volatility is low — relatively stable price action'); }
  }

  score = Math.max(-2, Math.min(2, score));

  let summary: string;
  if (dataPoints === 0) summary = 'Risk data is not available for this stock.';
  else if (score > 0.3) summary = 'Risk profile is below-average — low volatility and conservative balance sheet.';
  else if (score > -0.3) summary = 'Risk profile is roughly market-level — neither particularly risky nor defensive.';
  else if (score > -1) summary = 'Risk is above-average — elevated volatility or leverage to be aware of.';
  else summary = 'Risk profile is elevated — high volatility and/or significant leverage warrant caution.';

  return { name: 'Volatility & Risk', status: dataPoints === 0 ? 'Insufficient data' : statusFromScore(score, 2), score, summary, details };
}

function scoreNewsSignal(news: NewsArticle[]): Factor {
  const count = news.length;
  let score = 0;
  const details: string[] = [];

  if (count === 0) {
    return {
      name: 'News & Catalysts',
      status: 'Neutral',
      score: 0,
      summary: 'No recent company-specific news detected in the past week.',
      details: ['No recent headlines found — the move may be driven by broader market or sector dynamics.'],
    };
  }

  details.push(`${count} recent headline${count > 1 ? 's' : ''} found in the past week`);

  if (count >= 5) { score += 0.3; details.push('Elevated news activity — the stock is attracting attention'); }
  else if (count >= 2) { details.push('Moderate news activity'); }
  else { details.push('Light news activity'); }

  return {
    name: 'News & Catalysts',
    status: count >= 3 ? 'Positive' : 'Neutral',
    score,
    summary: count >= 3
      ? 'There is active news flow around this stock — multiple recent headlines detected.'
      : count >= 1
        ? 'Some recent news detected, but activity is moderate.'
        : 'No significant recent news detected.',
    details,
  };
}

// ── Move Context ─────────────────────────────────────

function analyzeMoveContext(q: Quote, m: StockMetrics): MoveContext {
  const movePercent = q.dp ?? 0;
  const moveDollar = q.d ?? 0;
  const isPositive = movePercent >= 0;
  const absMov = Math.abs(movePercent);

  let magnitude: MoveContext['magnitude'] = 'minor';
  if (absMov > 5) magnitude = 'sharp';
  else if (absMov > 2) magnitude = 'notable';
  else if (absMov > 1) magnitude = 'moderate';

  const vol = n(m['3MonthADReturnStd']);
  const volatilityMultiple = vol && vol > 0 ? absMov / vol : null;
  const isUnusual = volatilityMultiple !== null && volatilityMultiple > 1.5;

  const dayRange = q.h - q.l;
  const positionInDayRange = dayRange > 0 ? ((q.c - q.l) / dayRange) * 100 : 50;

  const high52 = n(m['52WeekHigh']) ?? q.c;
  const low52 = n(m['52WeekLow']) ?? q.c;
  const range52 = high52 - low52;
  const positionIn52wRange = range52 > 0 ? ((q.c - low52) / range52) * 100 : 50;

  const rel4w = n(m['priceRelativeToS&P5004Week']);
  let vsMarket: string | null = null;
  if (rel4w !== null) {
    if (rel4w > 3) vsMarket = `outperforming the S&P 500 by ${rel4w.toFixed(1)}% over the past month`;
    else if (rel4w < -3) vsMarket = `underperforming the S&P 500 by ${Math.abs(rel4w).toFixed(1)}% over the past month`;
    else vsMarket = 'tracking roughly in line with the S&P 500 this month';
  }

  return {
    movePercent,
    moveDollar,
    isPositive,
    magnitude,
    volatilityMultiple,
    isUnusual,
    positionInDayRange,
    positionIn52wRange,
    nearHigh52w: positionIn52wRange > 85,
    nearLow52w: positionIn52wRange < 15,
    vsMarket,
  };
}

// ── Driver Analysis (conservative + evidence-gated) ──

const HIGH_SIGNAL_KEYWORDS = [
  'earnings', 'revenue', 'profit', 'guidance', 'forecast', 'outlook',
  'upgrade', 'downgrade', 'rating', 'target', 'analyst',
  'fda', 'approval', 'patent', 'lawsuit', 'settlement', 'regulatory',
  'acquisition', 'merger', 'buyout', 'deal', 'partnership',
  'dividend', 'buyback', 'repurchase', 'split',
  'ceo', 'cfo', 'resign', 'appoint', 'hire', 'fired',
  'recall', 'investigation', 'fraud', 'sec', 'bankruptcy',
  'layoff', 'restructur', 'ipo', 'offering', 'secondary',
  'beat', 'miss', 'surprise', 'guidance', 'warn',
];

function isHeadlineRecent(article: NewsArticle): boolean {
  const ageMs = Date.now() - article.datetime * 1000;
  return ageMs < 36 * 60 * 60 * 1000; // within 36 hours
}

function isHeadlineCompanySpecific(article: NewsArticle, ticker: string, companyName: string): boolean {
  const text = (article.headline + ' ' + article.summary).toLowerCase();
  const tickerLower = ticker.toLowerCase();
  const nameLower = companyName.toLowerCase();
  const nameFirstWord = nameLower.split(' ')[0];

  return (
    text.includes(tickerLower) ||
    (nameLower.length > 3 && text.includes(nameLower)) ||
    (nameFirstWord.length > 4 && text.includes(nameFirstWord))
  );
}

function headlineHasHighSignal(article: NewsArticle): boolean {
  const text = (article.headline + ' ' + article.summary).toLowerCase();
  return HIGH_SIGNAL_KEYWORDS.some((kw) => text.includes(kw));
}

function analyzeDrivers(news: NewsArticle[], companyName: string, move: MoveContext, ticker: string): DriverAnalysis {
  const recentNews = news.filter(isHeadlineRecent);
  const companyNews = recentNews.filter((a) => isHeadlineCompanySpecific(a, ticker, companyName));
  const highSignalNews = companyNews.filter(headlineHasHighSignal);
  const moveIsSmall = !move.isUnusual && move.magnitude === 'minor';
  const moveIsNormal = !move.isUnusual && (move.magnitude === 'minor' || move.magnitude === 'moderate');
  const moveIsLarge = move.magnitude === 'notable' || move.magnitude === 'sharp';

  // ── 1. Trivial move, no news → normal noise ────────
  if (moveIsSmall && companyNews.length === 0) {
    return {
      summary: `Today's move appears within normal trading range for ${companyName}. No company-specific catalyst was detected.`,
      headlines: [],
      hasCompanyNews: false,
      driverType: 'no-clear-catalyst',
      driverLabel: 'Normal trading activity',
      headlineRelevance: 'none',
    };
  }

  // ── 2. No recent news at all ───────────────────────
  if (recentNews.length === 0) {
    return {
      summary: `No recent news was found for ${companyName}. The move may reflect broader market dynamics or factors not captured by public headlines.`,
      headlines: [],
      hasCompanyNews: false,
      driverType: moveIsLarge ? 'sector-market' : 'no-clear-catalyst',
      driverLabel: moveIsLarge ? 'Likely market or sector-driven' : 'No clear catalyst',
      headlineRelevance: 'none',
    };
  }

  // ── 3. News exists but nothing is company-specific ─
  if (companyNews.length === 0) {
    return {
      summary: `No company-specific news was found for ${companyName}. Recent industry headlines are shown below as background context, but they do not appear to be direct drivers of today's move.`,
      headlines: recentNews.slice(0, 2),
      hasCompanyNews: false,
      driverType: moveIsLarge ? 'sector-market' : 'no-clear-catalyst',
      driverLabel: moveIsLarge ? 'Likely market or sector-driven' : 'No clear catalyst',
      headlineRelevance: 'background',
    };
  }

  // ── 4. Normal move + company news → context only ───
  if (moveIsNormal) {
    return {
      summary: `There is recent news mentioning ${companyName}, but the move is within the stock's normal range. The headline${companyNews.length > 1 ? 's' : ''} below may be background context rather than a direct cause.`,
      headlines: companyNews.slice(0, 2),
      hasCompanyNews: true,
      driverType: 'no-clear-catalyst',
      driverLabel: 'Move within normal range',
      headlineRelevance: 'background',
    };
  }

  // ── From here: move is notable or sharp ────────────

  // ── 5. Large move + high-signal company news → company-specific ──
  //    This is the ONLY path to "Likely company-specific".
  //    Requirements: move is notable/sharp AND at least one company-specific
  //    headline contains a high-signal keyword (earnings, FDA, merger, etc.)
  if (highSignalNews.length >= 1) {
    const top = highSignalNews[0];
    return {
      summary: `A possible driver for today's ${move.isPositive ? 'gain' : 'decline'}: "${top.headline}" — this appears to be a company-specific event that investors may be reacting to.`,
      headlines: companyNews.slice(0, 3),
      hasCompanyNews: true,
      driverType: 'company-specific',
      driverLabel: 'Likely company-specific',
      headlineRelevance: 'strong',
    };
  }

  // ── 6. Large move + company news but no high-signal keywords ──
  //    There's news, but it doesn't clearly explain a big move.
  //    Default to cautious: show the news, but don't claim causation.
  return {
    summary: `There are recent headlines mentioning ${companyName}, but none clearly explains a move of this size. The price action may reflect broader market dynamics alongside the news below.`,
    headlines: companyNews.slice(0, 3),
    hasCompanyNews: true,
    driverType: 'no-clear-catalyst',
    driverLabel: 'No clear single catalyst',
    headlineRelevance: 'possible',
  };
}

// ── Historical Context (from available metrics) ──────

function buildHistoricalContext(m: StockMetrics, move: MoveContext, analog: AnalogResult | null): HistoricalContext {
  let moveUnusualness: string;
  if (move.volatilityMultiple !== null) {
    if (move.volatilityMultiple > 2) {
      moveUnusualness = `Today's ${move.isPositive ? 'gain' : 'decline'} is roughly ${move.volatilityMultiple.toFixed(1)}x the stock's average daily volatility — this is a statistically unusual move.`;
    } else if (move.volatilityMultiple > 1.3) {
      moveUnusualness = `Today's move is about ${move.volatilityMultiple.toFixed(1)}x the stock's average daily volatility — somewhat larger than typical.`;
    } else {
      moveUnusualness = `Today's move is within the stock's normal daily volatility range — not statistically unusual.`;
    }
  } else {
    moveUnusualness = 'Volatility data is not available, so it is difficult to assess how unusual this move is.';
  }

  const ret5d = n(m['5DayPriceReturnDaily']);
  const ret13w = n(m['13WeekPriceReturnDaily']);
  const ret26w = n(m['26WeekPriceReturnDaily']);
  const ret52w = n(m['52WeekPriceReturnDaily']);

  let trendContext: string;
  if (ret13w !== null && ret52w !== null) {
    if (ret13w > 0 && ret52w > 0) trendContext = 'The stock is in an uptrend over both 3-month and 1-year timeframes.';
    else if (ret13w < 0 && ret52w < 0) trendContext = 'The stock is in a downtrend over both 3-month and 1-year timeframes.';
    else if (ret13w < 0 && ret52w > 0) trendContext = 'The stock has been pulling back recently within a longer-term uptrend.';
    else trendContext = 'The stock has been recovering recently from a longer-term downtrend.';
  } else {
    trendContext = 'Insufficient return data to fully assess the trend context.';
  }

  let returnsContext = '';
  const retParts: string[] = [];
  if (ret5d !== null) retParts.push(`5 days: ${ret5d >= 0 ? '+' : ''}${ret5d.toFixed(1)}%`);
  if (ret13w !== null) retParts.push(`3 months: ${ret13w >= 0 ? '+' : ''}${ret13w.toFixed(1)}%`);
  if (ret26w !== null) retParts.push(`6 months: ${ret26w >= 0 ? '+' : ''}${ret26w.toFixed(1)}%`);
  if (ret52w !== null) retParts.push(`1 year: ${ret52w >= 0 ? '+' : ''}${ret52w.toFixed(1)}%`);
  if (retParts.length > 0) returnsContext = `Recent returns: ${retParts.join(' · ')}`;

  const available = analog !== null;
  const note = available
    ? 'Based on historical daily price data. Results are descriptive — past patterns do not guarantee future outcomes.'
    : 'Not enough historical price data is available for this stock to run pattern matching. This may be due to the stock being recently listed, data coverage limitations, or a temporary data issue.';

  return { available, moveUnusualness, trendContext, returnsContext, note, analog };
}

// ── Setup Label + Confidence + Risk ──────────────────

function computeSetupLabel(totalScore: number): SetupLabel {
  if (totalScore >= 3.5) return 'Favorable Setup';
  if (totalScore >= 1.2) return 'Cautiously Positive';
  if (totalScore <= -3.5) return 'Weak Setup';
  if (totalScore <= -1.2) return 'Cautiously Negative';
  return 'Mixed Setup';
}

function computeConfidence(factors: Factor[]): ConfidenceLevel {
  const withData = factors.filter((f) => f.status !== 'Insufficient data');
  const dataRatio = withData.length / factors.length;

  if (dataRatio < 0.5) return 'Low — elevated uncertainty';

  const directions = withData.map((f) => Math.sign(f.score));
  const positive = directions.filter((d) => d > 0).length;
  const negative = directions.filter((d) => d < 0).length;
  const total = withData.length;
  const alignmentRatio = Math.max(positive, negative) / total;

  if (alignmentRatio > 0.7 && dataRatio > 0.8) return 'Moderate-high';
  if (alignmentRatio > 0.5) return 'Moderate';
  return 'Low-moderate';
}

function computeRiskLevel(riskFactor: Factor): RiskLevel {
  if (riskFactor.score > 0.3) return 'Below-average';
  if (riskFactor.score > -0.3) return 'Market-level';
  if (riskFactor.score > -1) return 'Above-average';
  return 'Elevated';
}

function buildRiskSummary(riskLevel: RiskLevel, riskFactor: Factor, confidence: ConfidenceLevel): string {
  const parts: string[] = [];
  parts.push(`Risk level is ${riskLevel.toLowerCase()}.`);

  if (riskFactor.details.length > 0) {
    parts.push(riskFactor.details[0] + '.');
  }

  if (confidence === 'Low — elevated uncertainty' || confidence === 'Low-moderate') {
    parts.push('Analysis confidence is limited due to incomplete data — interpret with additional caution.');
  }

  return parts.join(' ');
}

// ── Bull / Bear Cases ────────────────────────────────

function extractBullBear(factors: Factor[]): { bullCase: string[]; bearCase: string[] } {
  const bullCase: string[] = [];
  const bearCase: string[] = [];

  for (const f of factors) {
    if (f.status === 'Insufficient data') continue;

    for (const d of f.details) {
      if (f.score > 0.2) {
        bullCase.push(d);
      } else if (f.score < -0.2) {
        bearCase.push(d);
      }
    }
  }

  return { bullCase: bullCase.slice(0, 5), bearCase: bearCase.slice(0, 5) };
}

// ── Setup Summary ────────────────────────────────────

function buildSetupSummary(
  label: SetupLabel,
  factors: Factor[],
  move: MoveContext,
  confidence: ConfidenceLevel,
): string {
  const parts: string[] = [];

  parts.push(`Setup is ${label.toLowerCase()}.`);

  const strongFactors = factors.filter((f) => f.score > 0.8);
  const weakFactors = factors.filter((f) => f.score < -0.8);

  if (strongFactors.length > 0) {
    const names = strongFactors.map((f) => f.name.toLowerCase()).join(' and ');
    parts.push(`${names.charAt(0).toUpperCase() + names.slice(1)} ${strongFactors.length > 1 ? 'are' : 'is'} supportive.`);
  }

  if (weakFactors.length > 0) {
    const names = weakFactors.map((f) => f.name.toLowerCase()).join(' and ');
    parts.push(`However, ${names} ${weakFactors.length > 1 ? 'are' : 'is'} a concern.`);
  }

  if (move.isUnusual) {
    parts.push(`Today's move is larger than typical for this stock.`);
  }

  if (confidence === 'Low — elevated uncertainty') {
    parts.push('Data availability is limited, so confidence in this assessment is lower than usual.');
  }

  return parts.join(' ');
}

// ── Bottom Line ──────────────────────────────────────

function buildBottomLine(
  label: SetupLabel,
  factors: Factor[],
  move: MoveContext,
  historical: HistoricalContext,
  riskLevel: RiskLevel,
): string {
  const parts: string[] = [];

  switch (label) {
    case 'Favorable Setup':
      parts.push('Historically favorable setup.');
      break;
    case 'Cautiously Positive':
      parts.push('Cautiously positive setup.');
      break;
    case 'Mixed Setup':
      parts.push('Mixed setup with factors pointing in both directions.');
      break;
    case 'Cautiously Negative':
      parts.push('Cautiously negative setup.');
      break;
    case 'Weak Setup':
      parts.push('Weak setup — multiple factors are flagging negatively.');
      break;
  }

  if (historical.analog) {
    const a = historical.analog;
    const dir = a.outcomeSkew === 'positive' ? 'positive' : a.outcomeSkew === 'negative' ? 'negative' : 'mixed';
    parts.push(`Historical pattern (${a.matchCount} similar cases): outcomes skewed ${dir}, with a ${(a.forwardReturns.winRate5d * 100).toFixed(0)}% 5-day win rate.`);
  }

  const best = factors.filter((f) => f.status !== 'Insufficient data').sort((a, b) => b.score - a.score)[0];
  const worst = factors.filter((f) => f.status !== 'Insufficient data').sort((a, b) => a.score - b.score)[0];

  if (best && best.score > 0.3) {
    parts.push(`Strongest positive: ${best.name.toLowerCase()}.`);
  }
  if (worst && worst.score < -0.3) {
    parts.push(`Key risk: ${worst.name.toLowerCase()}.`);
  }

  if (riskLevel === 'Elevated' || riskLevel === 'Above-average') {
    parts.push(`Risk is ${riskLevel.toLowerCase()} — position sizing should reflect this.`);
  }

  return parts.join(' ');
}

// ── Portfolio Context ────────────────────────────────

function buildPortfolioContext(
  ticker: string,
  label: SetupLabel,
  ownsStock: boolean,
  gainPct: number | null,
): string | null {
  if (!ownsStock) return null;

  const upDown = gainPct !== null
    ? (gainPct >= 0 ? `up ${gainPct.toFixed(1)}%` : `down ${Math.abs(gainPct).toFixed(1)}%`)
    : null;

  const positionNote = upDown ? `You are currently ${upDown} on this position. ` : '';

  switch (label) {
    case 'Favorable Setup':
    case 'Cautiously Positive':
      return `${positionNote}The current setup data is positive — the factors support continuing to hold.`;
    case 'Mixed Setup':
      return `${positionNote}The setup is mixed right now — there is no strong reason to change your position in either direction. Monitor for a clearer signal.`;
    case 'Cautiously Negative':
      return `${positionNote}Some factors are turning negative. Consider whether your thesis still holds and whether your position size is appropriate for the risk.`;
    case 'Weak Setup':
      return `${positionNote}Multiple factors are negative. Review whether the reasons you originally entered the position still apply.`;
  }
}

// ── Main Analysis Function ───────────────────────────

export async function runSetupAnalysis(
  ticker: string,
  existingQuote?: Quote,
  holdingInfo?: { ownsStock: boolean; gainPct: number | null },
): Promise<SetupAnalysis | null> {
  try {
    const [quote, metrics, news, profile] = await Promise.all([
      existingQuote ? Promise.resolve(existingQuote) : getQuote(ticker),
      getStockMetrics(ticker),
      getRecentNews(ticker, 7).catch(() => [] as NewsArticle[]),
      getCompanyProfile(ticker).catch(() => null),
    ]);

    if (!metrics) return null;

    const companyName = profile?.name || ticker;

    const momentum = scoreMomentum(metrics, quote);
    const relativeStrength = scoreRelativeStrength(metrics);
    const trendPosition = scoreTrendPosition(metrics, quote);
    const valuation = scoreValuation(metrics);
    const growth = scoreGrowth(metrics);
    const profitability = scoreProfitability(metrics);
    const volatilityRisk = scoreVolatilityRisk(metrics);
    const newsSignal = scoreNewsSignal(news);

    const factors = [momentum, relativeStrength, trendPosition, valuation, growth, profitability, volatilityRisk, newsSignal];
    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

    const setupLabel = computeSetupLabel(totalScore);
    const confidence = computeConfidence(factors);
    const riskLevel = computeRiskLevel(volatilityRisk);
    const riskSummary = buildRiskSummary(riskLevel, volatilityRisk, confidence);

    const move = analyzeMoveContext(quote, metrics);
    const drivers = analyzeDrivers(news, companyName, move, ticker);

    const todayReturn = quote.dp ?? 0;
    const vol3m = n(metrics['3MonthADReturnStd']) ?? undefined;
    const ret5d = n(metrics['5DayPriceReturnDaily']) ?? undefined;
    const analog = await runHistoricalAnalog(ticker, todayReturn, vol3m, ret5d).catch(() => null);

    const historical = buildHistoricalContext(metrics, move, analog);

    const { bullCase, bearCase } = extractBullBear(factors);

    const setupSummary = buildSetupSummary(setupLabel, factors, move, confidence);
    const bottomLine = buildBottomLine(setupLabel, factors, move, historical, riskLevel);

    const portfolioContext = holdingInfo
      ? buildPortfolioContext(ticker, setupLabel, holdingInfo.ownsStock, holdingInfo.gainPct)
      : null;

    return {
      setupLabel,
      setupSummary,
      confidence,
      riskLevel,
      riskSummary,
      totalScore,
      move,
      drivers,
      historical,
      factors,
      bullCase,
      bearCase,
      bottomLine,
      quote,
      metrics,
      profile,
      portfolioContext,
    };
  } catch (err) {
    console.warn('Setup analysis error:', err);
    return null;
  }
}
