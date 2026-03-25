import { DailyBar, getDailyHistory } from './alphaVantage';

// ═════════════════════════════════════════════
//  Historical Analog Engine — V1
//
//  Finds past trading days with a "similar setup"
//  and reports what happened over the next 3/5/10 days.
//
//  Similarity is defined by:
//   1. Same move direction
//   2. Move magnitude within an adaptive tolerance
//   3. Similar volatility environment (20-day σ)
//   4. Similar short-term trend (5-day return bucket)
//
//  Matching widens automatically until a minimum
//  sample of 10 cases is found or limits are reached.
// ═════════════════════════════════════════════

// ── Types ────────────────────────────────────

export type ReliabilityGrade =
  | 'High — strong sample'
  | 'Moderate — decent sample'
  | 'Limited — small sample'
  | 'Very limited — interpret cautiously';

export interface ForwardReturns {
  avg3d: number;
  avg5d: number;
  avg10d: number;
  median3d: number;
  median5d: number;
  median10d: number;
  winRate3d: number;
  winRate5d: number;
  winRate10d: number;
  bestCase: number;
  worstCase: number;
}

export interface AnalogResult {
  matchCount: number;
  forwardReturns: ForwardReturns;
  reliability: ReliabilityGrade;
  similarityExplanation: string;
  matchCriteria: {
    moveTolerance: string;
    volTolerance: string;
    trendTolerance: string;
  };
  dispersionNote: string;
  outcomeSkew: 'positive' | 'negative' | 'mixed';
}

// ── Helpers ──────────────────────────────────

function pctReturn(from: number, to: number): number {
  return ((to - from) / from) * 100;
}

function rollingStdDev(bars: DailyBar[], endIdx: number, window: number): number {
  if (endIdx < window) return NaN;
  const returns: number[] = [];
  for (let i = endIdx - window + 1; i <= endIdx; i++) {
    returns.push(pctReturn(bars[i - 1].close, bars[i].close));
  }
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function trailing5dReturn(bars: DailyBar[], idx: number): number {
  if (idx < 5) return NaN;
  return pctReturn(bars[idx - 5].close, bars[idx].close);
}

function trendBucket(ret5d: number): number {
  if (ret5d < -3) return -2;
  if (ret5d < -1) return -1;
  if (ret5d <= 1) return 0;
  if (ret5d <= 3) return 1;
  return 2;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeReliability(count: number, dispersion: number): ReliabilityGrade {
  if (count >= 20 && dispersion < 4) return 'High — strong sample';
  if (count >= 12) return 'Moderate — decent sample';
  if (count >= 5) return 'Limited — small sample';
  return 'Very limited — interpret cautiously';
}

function buildSimilarityExplanation(
  moveDir: string,
  moveMag: string,
  volEnv: string,
  trendCtx: string,
): string {
  const article = /^[aeiou]/i.test(volEnv) ? 'an' : 'a';
  return `Based on past days with a similar ~${moveMag} ${moveDir}, in ${article} ${volEnv}-volatility, ${trendCtx} environment.`;
}

// ── Core matching ────────────────────────────

interface MatchConfig {
  moveTolerancePp: number;
  volToleranceMultiple: number;
  trendToleranceBuckets: number;
}

const TIERS: MatchConfig[] = [
  { moveTolerancePp: 1.5, volToleranceMultiple: 0.5, trendToleranceBuckets: 0 },
  { moveTolerancePp: 2.0, volToleranceMultiple: 0.7, trendToleranceBuckets: 1 },
  { moveTolerancePp: 3.0, volToleranceMultiple: 1.0, trendToleranceBuckets: 1 },
  { moveTolerancePp: 4.0, volToleranceMultiple: 1.5, trendToleranceBuckets: 2 },
  { moveTolerancePp: 5.0, volToleranceMultiple: 2.0, trendToleranceBuckets: 3 },
];

const MIN_MATCHES = 5;
const VOL_WINDOW = 15;
const MIN_HISTORY = VOL_WINDOW + 3;
const FORWARD_DAYS = 10;

interface MatchedDay {
  idx: number;
  fwd3: number;
  fwd5: number;
  fwd10: number | null;
}

function findMatches(
  bars: DailyBar[],
  todayReturn: number,
  todayVol: number,
  todayTrend: number,
  tier: MatchConfig,
): MatchedDay[] {
  const matches: MatchedDay[] = [];
  const direction = todayReturn >= 0 ? 1 : -1;
  const maxIdx = bars.length - 1 - FORWARD_DAYS;

  for (let i = MIN_HISTORY; i <= maxIdx; i++) {
    const dayReturn = pctReturn(bars[i - 1].close, bars[i].close);

    if ((dayReturn >= 0 ? 1 : -1) !== direction) continue;

    if (Math.abs(dayReturn - todayReturn) > tier.moveTolerancePp) continue;

    const dayVol = rollingStdDev(bars, i, VOL_WINDOW);
    if (isNaN(dayVol) || isNaN(todayVol)) continue;
    if (todayVol > 0 && Math.abs(dayVol - todayVol) / todayVol > tier.volToleranceMultiple) continue;

    const dayTrend = trendBucket(trailing5dReturn(bars, i));
    if (Math.abs(dayTrend - todayTrend) > tier.trendToleranceBuckets) continue;

    if (!bars[i + 3] || !bars[i + 5]) continue;

    const fwd3 = pctReturn(bars[i].close, bars[i + 3].close);
    const fwd5 = pctReturn(bars[i].close, bars[i + 5].close);
    const fwd10 = bars[i + FORWARD_DAYS]
      ? pctReturn(bars[i].close, bars[i + FORWARD_DAYS].close)
      : null;

    matches.push({ idx: i, fwd3, fwd5, fwd10 });
  }

  return matches;
}

// ── Public API ───────────────────────────────

export async function runHistoricalAnalog(
  ticker: string,
  todayReturn: number,
  recentVolatility?: number,
  recent5dReturn?: number,
): Promise<AnalogResult | null> {
  const bars = await getDailyHistory(ticker);
  if (!bars || bars.length < MIN_HISTORY + FORWARD_DAYS + 5) return null;

  const lastIdx = bars.length - 1;
  const todayVol =
    recentVolatility ?? rollingStdDev(bars, lastIdx, VOL_WINDOW);
  const todayTrend = trendBucket(
    recent5dReturn ?? trailing5dReturn(bars, lastIdx),
  );

  let matches: MatchedDay[] = [];
  let usedTier = 0;

  for (let t = 0; t < TIERS.length; t++) {
    matches = findMatches(bars, todayReturn, todayVol, todayTrend, TIERS[t]);
    usedTier = t;
    if (matches.length >= MIN_MATCHES) break;
  }

  if (matches.length < 2) return null;

  const fwd3s = matches.map((m) => m.fwd3);
  const fwd5s = matches.map((m) => m.fwd5);
  const fwd10s = matches.map((m) => m.fwd10).filter((v): v is number => v !== null);

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;
  const winRate = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.filter((v) => v > 0).length / arr.length;

  const bestPool = fwd10s.length > 0 ? fwd10s : fwd5s;

  const forwardReturns: ForwardReturns = {
    avg3d: avg(fwd3s),
    avg5d: avg(fwd5s),
    avg10d: avg(fwd10s),
    median3d: median(fwd3s),
    median5d: median(fwd5s),
    median10d: median(fwd10s),
    winRate3d: winRate(fwd3s),
    winRate5d: winRate(fwd5s),
    winRate10d: winRate(fwd10s),
    bestCase: Math.max(...bestPool),
    worstCase: Math.min(...bestPool),
  };

  const allFwds = [...fwd3s, ...fwd5s, ...fwd10s];
  const stdAll = allFwds.length === 0
    ? 0
    : Math.sqrt(
        allFwds.reduce((s, v) => s + (v - avg(allFwds)) ** 2, 0) / allFwds.length,
      );

  const reliability = computeReliability(matches.length, stdAll);

  const tier = TIERS[usedTier];
  const moveDir = todayReturn >= 0 ? 'gain' : 'decline';
  const moveMag = `${Math.abs(todayReturn).toFixed(1)}%`;
  const volEnv =
    todayVol < 1 ? 'low' : todayVol < 2 ? 'moderate' : 'elevated';
  const trendCtx =
    todayTrend <= -1
      ? 'declining'
      : todayTrend >= 1
        ? 'rising'
        : 'range-bound';

  const similarityExplanation = buildSimilarityExplanation(
    moveDir,
    moveMag,
    volEnv,
    trendCtx,
  );

  let dispersionNote: string;
  if (stdAll < 2) {
    dispersionNote = 'outcomes were fairly consistent';
  } else if (stdAll < 4) {
    dispersionNote = 'outcomes showed moderate spread';
  } else {
    dispersionNote = 'outcomes varied widely';
  }

  const avgAll = avg([forwardReturns.avg3d, forwardReturns.avg5d, forwardReturns.avg10d]);
  const avgWin = avg([forwardReturns.winRate3d, forwardReturns.winRate5d, forwardReturns.winRate10d]);

  let outcomeSkew: 'positive' | 'negative' | 'mixed';
  if (avgAll > 0.3 && avgWin > 0.55) outcomeSkew = 'positive';
  else if (avgAll < -0.3 && avgWin < 0.45) outcomeSkew = 'negative';
  else outcomeSkew = 'mixed';

  return {
    matchCount: matches.length,
    forwardReturns,
    reliability,
    similarityExplanation,
    matchCriteria: {
      moveTolerance: `±${tier.moveTolerancePp.toFixed(1)}pp`,
      volTolerance: `±${(tier.volToleranceMultiple * 100).toFixed(0)}%`,
      trendTolerance:
        tier.trendToleranceBuckets === 0 ? 'Same bucket' : `±${tier.trendToleranceBuckets} bucket(s)`,
    },
    dispersionNote,
    outcomeSkew,
  };
}
