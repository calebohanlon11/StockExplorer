import { getQuote, getStockMetrics, Quote, StockMetrics } from './finnhub';

export type Signal = 'Bullish' | 'Cautiously Bullish' | 'Neutral' | 'Cautiously Bearish' | 'Bearish';
export type ActionRating = 'Strong Buy' | 'Buy' | 'Hold' | 'Reduce' | 'Sell';

export interface KeyFactor {
  label: string;
  type: 'bull' | 'bear';
  category: string;
}

export interface AnalysisResult {
  signal: Signal;
  action: ActionRating;
  score: number;
  momentum: { score: number; details: string[] };
  valuation: { score: number; details: string[] };
  growth: { score: number; details: string[] };
  profitability: { score: number; details: string[] };
  risk: { score: number; details: string[] };
  metrics: StockMetrics;
  quote: Quote;
  positionIn52wRange: number;
  topBull: KeyFactor | null;
  topBear: KeyFactor | null;
  conclusion: string;
  actionAdvice: string;
}

function n(val: number | null | undefined): number | null {
  return val != null && isFinite(val) ? val : null;
}

function scoreMomentum(m: StockMetrics, q: Quote): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];
  const todayPct = q.dp ?? 0;

  const ret5d = n(m['5DayPriceReturnDaily']);
  const ret13w = n(m['13WeekPriceReturnDaily']);
  const ret52w = n(m['52WeekPriceReturnDaily']);
  const relSP13w = n(m['priceRelativeToS&P50013Week']);

  if (ret5d !== null) {
    if (ret5d > 3) { score += 1; details.push(`Strong 5-day momentum (+${ret5d.toFixed(1)}%)`); }
    else if (ret5d > 0) { score += 0.5; details.push(`Positive 5-day return (+${ret5d.toFixed(1)}%)`); }
    else if (ret5d < -3) { score -= 1; details.push(`Weak 5-day momentum (${ret5d.toFixed(1)}%)`); }
    else if (ret5d < 0) { score -= 0.5; details.push(`Negative 5-day return (${ret5d.toFixed(1)}%)`); }
  }

  if (ret13w !== null) {
    if (ret13w > 10) { score += 1; details.push(`Strong 3-month trend (+${ret13w.toFixed(1)}%)`); }
    else if (ret13w > 0) { score += 0.5; }
    else if (ret13w < -10) { score -= 1; details.push(`Weak 3-month trend (${ret13w.toFixed(1)}%)`); }
    else if (ret13w < 0) { score -= 0.5; }
  }

  if (ret52w !== null) {
    if (ret52w > 20) { score += 0.5; details.push(`Up ${ret52w.toFixed(0)}% over 1 year`); }
    else if (ret52w < -20) { score -= 0.5; details.push(`Down ${Math.abs(ret52w).toFixed(0)}% over 1 year`); }
  }

  if (relSP13w !== null) {
    if (relSP13w > 5) { score += 0.5; details.push(`Outperforming S&P 500 by ${relSP13w.toFixed(1)}% over 13 weeks`); }
    else if (relSP13w < -5) { score -= 0.5; details.push(`Underperforming S&P 500 by ${Math.abs(relSP13w).toFixed(1)}% over 13 weeks`); }
  }

  if (todayPct > 2) { score += 0.3; }
  else if (todayPct < -2) { score -= 0.3; }

  return { score: Math.max(-3, Math.min(3, score)), details };
}

function scoreValuation(m: StockMetrics): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  const pe = n(m.peTTM);
  const fpe = n(m.forwardPE);
  const peg = n(m.pegTTM);
  const evEbitda = n(m.evEbitdaTTM);

  if (pe !== null && pe > 0) {
    if (pe < 15) { score += 1; details.push(`Low P/E ratio (${pe.toFixed(1)}x) suggests undervaluation`); }
    else if (pe < 25) { score += 0.3; details.push(`Reasonable P/E (${pe.toFixed(1)}x)`); }
    else if (pe > 50) { score -= 1; details.push(`High P/E (${pe.toFixed(1)}x) — priced for perfection`); }
    else if (pe > 35) { score -= 0.5; details.push(`Elevated P/E (${pe.toFixed(1)}x)`); }
  }

  if (fpe !== null && pe !== null && fpe > 0 && pe > 0 && fpe < pe) {
    score += 0.3;
    details.push(`Forward P/E (${fpe.toFixed(1)}x) is lower than current — earnings expected to grow`);
  }

  if (peg !== null && peg > 0) {
    if (peg < 1) { score += 0.5; details.push(`PEG ratio ${peg.toFixed(2)} suggests growth at a reasonable price`); }
    else if (peg > 3) { score -= 0.5; }
  }

  if (evEbitda !== null && evEbitda > 0) {
    if (evEbitda < 10) { score += 0.3; }
    else if (evEbitda > 30) { score -= 0.3; }
  }

  return { score: Math.max(-2, Math.min(2, score)), details };
}

function scoreGrowth(m: StockMetrics): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  const epsG = n(m.epsGrowthTTMYoy);
  const revG = n(m.revenueGrowthTTMYoy);
  const epsG5 = n(m.epsGrowth5Y);

  if (epsG !== null) {
    if (epsG > 25) { score += 1.5; details.push(`Strong earnings growth: +${epsG.toFixed(0)}% YoY`); }
    else if (epsG > 10) { score += 0.8; details.push(`Solid earnings growth: +${epsG.toFixed(0)}% YoY`); }
    else if (epsG > 0) { score += 0.3; details.push(`Modest earnings growth: +${epsG.toFixed(0)}% YoY`); }
    else if (epsG < -10) { score -= 1; details.push(`Earnings declining: ${epsG.toFixed(0)}% YoY`); }
    else if (epsG < 0) { score -= 0.5; details.push(`Slight earnings contraction: ${epsG.toFixed(0)}% YoY`); }
  }

  if (revG !== null) {
    if (revG > 20) { score += 1; details.push(`Revenue growing +${revG.toFixed(0)}% YoY`); }
    else if (revG > 5) { score += 0.5; details.push(`Revenue growing +${revG.toFixed(0)}% YoY`); }
    else if (revG < -5) { score -= 0.5; details.push(`Revenue declining ${revG.toFixed(0)}% YoY`); }
  }

  if (epsG5 !== null && epsG5 > 15) {
    score += 0.3;
    details.push(`Consistent 5-year EPS growth: +${epsG5.toFixed(0)}%/yr`);
  }

  return { score: Math.max(-2, Math.min(3, score)), details };
}

function scoreProfitability(m: StockMetrics): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  const roe = n(m.roeTTM);
  const margin = n(m.netProfitMarginTTM);
  const gross = n(m.grossMarginTTM);

  if (roe !== null) {
    if (roe > 25) { score += 1; details.push(`Excellent ROE: ${roe.toFixed(0)}%`); }
    else if (roe > 15) { score += 0.5; details.push(`Strong ROE: ${roe.toFixed(0)}%`); }
    else if (roe < 5 && roe >= 0) { score -= 0.3; details.push(`Low ROE: ${roe.toFixed(0)}%`); }
    else if (roe < 0) { score -= 1; details.push(`Negative ROE: ${roe.toFixed(0)}%`); }
  }

  if (margin !== null) {
    if (margin > 20) { score += 0.5; details.push(`High net margin: ${margin.toFixed(1)}%`); }
    else if (margin > 10) { score += 0.3; }
    else if (margin < 0) { score -= 0.5; details.push('Company is unprofitable'); }
  }

  if (gross !== null && gross > 50) {
    score += 0.3;
    details.push(`Strong gross margin: ${gross.toFixed(0)}%`);
  }

  return { score: Math.max(-2, Math.min(2, score)), details };
}

function scoreRisk(m: StockMetrics): { score: number; details: string[] } {
  let score = 0;
  const details: string[] = [];

  const beta = n(m.beta);
  const debtEq = n(m['totalDebt/totalEquityQuarterly']);
  const vol = n(m['3MonthADReturnStd']);

  if (beta !== null) {
    if (beta > 1.5) { score -= 1; details.push(`High beta (${beta.toFixed(2)}) — more volatile than the market`); }
    else if (beta > 1.2) { score -= 0.3; details.push(`Above-average beta (${beta.toFixed(2)})`); }
    else if (beta < 0.8 && beta > 0) { score += 0.5; details.push(`Low beta (${beta.toFixed(2)}) — less volatile than the market`); }
    else if (beta >= 0.8 && beta <= 1.2) { details.push(`Beta of ${beta.toFixed(2)} — moves roughly with the market`); }
  }

  if (debtEq !== null) {
    if (debtEq > 200) { score -= 1; details.push(`High debt/equity ratio (${debtEq.toFixed(0)}%)`); }
    else if (debtEq > 100) { score -= 0.3; details.push(`Moderate leverage (D/E: ${debtEq.toFixed(0)}%)`); }
    else if (debtEq < 30) { score += 0.5; details.push(`Low leverage (D/E: ${debtEq.toFixed(0)}%)`); }
  }

  if (vol !== null) {
    if (vol > 3) { score -= 0.5; details.push('High recent volatility'); }
    else if (vol < 1.5) { score += 0.3; details.push('Low recent volatility'); }
  }

  return { score: Math.max(-2, Math.min(2, score)), details };
}

function computeSignal(totalScore: number): Signal {
  if (totalScore >= 3) return 'Bullish';
  if (totalScore >= 1) return 'Cautiously Bullish';
  if (totalScore <= -3) return 'Bearish';
  if (totalScore <= -1) return 'Cautiously Bearish';
  return 'Neutral';
}

function computeAction(totalScore: number, positionIn52wRange: number): ActionRating {
  if (totalScore >= 4) return 'Strong Buy';
  if (totalScore >= 1.5) return 'Buy';
  if (totalScore <= -4) return 'Sell';
  if (totalScore <= -1.5) return 'Reduce';

  if (totalScore > 0 && positionIn52wRange < 30) return 'Buy';
  if (totalScore < 0 && positionIn52wRange > 85) return 'Reduce';

  return 'Hold';
}

function extractKeyFactors(
  categories: { name: string; score: number; details: string[] }[],
): { topBull: KeyFactor | null; topBear: KeyFactor | null } {
  let topBull: KeyFactor | null = null;
  let topBear: KeyFactor | null = null;
  let bestBullScore = 0;
  let worstBearScore = 0;

  for (const cat of categories) {
    if (cat.score > bestBullScore && cat.details.length > 0) {
      bestBullScore = cat.score;
      topBull = { label: cat.details[0], type: 'bull', category: cat.name };
    }
    if (cat.score < worstBearScore && cat.details.length > 0) {
      worstBearScore = cat.score;
      topBear = { label: cat.details[0], type: 'bear', category: cat.name };
    }
  }

  return { topBull, topBear };
}

function buildActionAdvice(
  ticker: string,
  action: ActionRating,
  result: {
    momentum: { score: number; details: string[] };
    valuation: { score: number; details: string[] };
    growth: { score: number; details: string[] };
    profitability: { score: number; details: string[] };
    risk: { score: number; details: string[] };
    positionIn52wRange: number;
    quote: Quote;
    topBull: KeyFactor | null;
    topBear: KeyFactor | null;
  },
): string {
  const { momentum, growth, valuation, risk, profitability, positionIn52wRange, quote, topBull, topBear } = result;
  const parts: string[] = [];

  switch (action) {
    case 'Strong Buy':
      parts.push(`${ticker} shows strength across multiple dimensions — fundamentals, momentum, and valuation all align positively.`);
      parts.push('The data supports initiating or adding to a position at current levels.');
      break;
    case 'Buy':
      parts.push(`${ticker} has more positives than negatives in the current data.`);
      if (positionIn52wRange < 40) {
        parts.push('The stock is trading in the lower portion of its 52-week range, which could present a favorable entry point.');
      } else {
        parts.push('The fundamental picture supports accumulating shares, though waiting for a pullback could offer a better entry.');
      }
      break;
    case 'Hold':
      parts.push(`${ticker} presents a mixed picture — there are both positives and negatives in the data right now.`);
      if (momentum.score >= 0 && growth.score >= 0) {
        parts.push('Momentum and growth remain intact, so existing holders have reason to stay the course.');
      } else if (valuation.score > 0) {
        parts.push('Valuation is not stretched, but other factors are neutral or weakening. No urgency to act either way.');
      } else {
        parts.push('Neither the bullish nor bearish case is dominant. Existing holders should monitor for a clearer directional signal.');
      }
      break;
    case 'Reduce':
      parts.push(`${ticker} is showing some warning signs that warrant caution.`);
      if (positionIn52wRange > 80) {
        parts.push('The stock is trading near its 52-week high with deteriorating fundamentals — consider locking in some profits.');
      } else {
        parts.push('If you hold a large position, consider trimming to reduce exposure. The risk-reward is not favorable right now.');
      }
      break;
    case 'Sell':
      parts.push(`${ticker} is flagging negatively across multiple areas — momentum, fundamentals, and risk factors are all concerning.`);
      parts.push('The data suggests this is not a good time to hold. Consider exiting or significantly reducing your position.');
      break;
  }

  if (topBull && (action === 'Hold' || action === 'Buy' || action === 'Strong Buy')) {
    parts.push(`The strongest factor in its favor: ${topBull.label.toLowerCase()}.`);
  }
  if (topBear && (action === 'Hold' || action === 'Reduce' || action === 'Sell')) {
    parts.push(`The biggest concern: ${topBear.label.toLowerCase()}.`);
  }

  if (risk.score < -0.5) {
    parts.push('Be aware that risk factors are elevated — size your position accordingly.');
  }

  return parts.join(' ');
}

function buildConclusion(ticker: string, result: Omit<AnalysisResult, 'conclusion' | 'actionAdvice'>): string {
  const { action, signal, momentum, growth, valuation, risk, positionIn52wRange, quote } = result;
  const parts: string[] = [];

  const posDesc = positionIn52wRange > 80 ? 'near its 52-week high'
    : positionIn52wRange > 60 ? 'in the upper half of its 52-week range'
    : positionIn52wRange > 40 ? 'near the middle of its 52-week range'
    : positionIn52wRange > 20 ? 'in the lower half of its 52-week range'
    : 'near its 52-week low';

  parts.push(`${ticker} is trading at $${quote.c.toFixed(2)}, ${posDesc}.`);

  if (momentum.score > 1) parts.push('Price momentum is strongly positive across multiple timeframes.');
  else if (momentum.score > 0) parts.push('Short-term momentum is mildly positive.');
  else if (momentum.score < -1) parts.push('Price momentum is negative — the stock has been under pressure.');
  else if (momentum.score < 0) parts.push('Recent price action has been slightly negative.');

  if (growth.score > 1) parts.push('Earnings and revenue growth are robust, supporting the fundamental case.');
  else if (growth.score < -0.5) parts.push('Growth metrics are weakening, which is a concern.');

  if (valuation.score > 0.5) parts.push('Valuation looks reasonable relative to fundamentals.');
  else if (valuation.score < -0.5) parts.push('Valuation appears stretched — the stock is priced for high expectations.');

  if (risk.score < -1) parts.push('Risk factors are elevated: high volatility and/or leverage warrant caution.');

  switch (action) {
    case 'Strong Buy':
      parts.push('Bottom line: the data strongly supports buying. Fundamentals and momentum are aligned in its favor.');
      break;
    case 'Buy':
      parts.push('Bottom line: the data supports buying or adding shares. The positives outweigh the negatives.');
      break;
    case 'Hold':
      parts.push('Bottom line: hold your current position. The picture is mixed — wait for a clearer signal before adding or selling.');
      break;
    case 'Reduce':
      parts.push('Bottom line: consider reducing your position. Headwinds are starting to outweigh tailwinds.');
      break;
    case 'Sell':
      parts.push('Bottom line: the data suggests selling. Multiple factors point to continued downside risk.');
      break;
  }

  return parts.join(' ');
}

export async function runAnalysis(ticker: string, existingQuote?: Quote): Promise<AnalysisResult | null> {
  try {
    const [quote, metrics] = await Promise.all([
      existingQuote ? Promise.resolve(existingQuote) : getQuote(ticker),
      getStockMetrics(ticker),
    ]);

    if (!metrics) return null;

    const momentum = scoreMomentum(metrics, quote);
    const valuation = scoreValuation(metrics);
    const growth = scoreGrowth(metrics);
    const profitability = scoreProfitability(metrics);
    const risk = scoreRisk(metrics);

    const totalScore = momentum.score + valuation.score + growth.score + profitability.score + risk.score;
    const signal = computeSignal(totalScore);

    const high52 = n(metrics['52WeekHigh']) ?? quote.c;
    const low52 = n(metrics['52WeekLow']) ?? quote.c;
    const range52 = high52 - low52;
    const positionIn52wRange = range52 > 0 ? ((quote.c - low52) / range52) * 100 : 50;

    const action = computeAction(totalScore, positionIn52wRange);

    const { topBull, topBear } = extractKeyFactors([
      { name: 'Momentum', score: momentum.score, details: momentum.details },
      { name: 'Valuation', score: valuation.score, details: valuation.details },
      { name: 'Growth', score: growth.score, details: growth.details },
      { name: 'Profitability', score: profitability.score, details: profitability.details },
      { name: 'Risk', score: risk.score, details: risk.details },
    ]);

    const partial = {
      signal,
      action,
      score: totalScore,
      momentum,
      valuation,
      growth,
      profitability,
      risk,
      metrics,
      quote,
      positionIn52wRange,
      topBull,
      topBear,
    };

    const actionAdvice = buildActionAdvice(ticker, action, partial);
    const conclusion = buildConclusion(ticker, partial);

    return { ...partial, conclusion, actionAdvice };
  } catch (err) {
    console.warn('Analysis error:', err);
    return null;
  }
}
