import { FINNHUB_API_KEY, SUPABASE_URL, isSupabaseConfigured } from '../constants/config';
import { getSupabase } from './supabase';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

/**
 * Per-endpoint client cache TTL (ms). Short enough to feel live, long enough to
 * absorb bursty refreshes (e.g. several quote loads on the dashboard).
 */
const TTL_MS: Record<string, number> = {
  '/quote': 12_000,
  '/stock/profile2': 6 * 60 * 60 * 1000,
  '/stock/metric': 60 * 60 * 1000,
  '/search': 10 * 60 * 1000,
  '/company-news': 5 * 60 * 1000,
};

interface CacheEntry { expiresAt: number; value: unknown }
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

const MAX_CONCURRENT = 4;
let active = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    queue.push(() => {
      active += 1;
      resolve();
    });
  });
}

function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = queue.shift();
  if (next) next();
}

function cacheKey(path: string, params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${path}?${sorted}`;
}

async function fetchViaEdge<T>(
  path: string,
  params: Record<string, string>,
  accessToken: string,
): Promise<T> {
  const base = SUPABASE_URL.trim().replace(/\/+$/, '');
  const url = new URL(`${base}/functions/v1/market-data`);
  url.searchParams.set('path', path.replace(/^\/+/, ''));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`market-data ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function fetchDirect<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  if (!FINNHUB_API_KEY) {
    throw new Error(
      'No Finnhub credentials available. Sign in with Supabase or set EXPO_PUBLIC_FINNHUB_API_KEY in .env.',
    );
  }
  const query = new URLSearchParams({ ...params, token: FINNHUB_API_KEY }).toString();
  const res = await fetch(`${FINNHUB_BASE}${path}?${query}`);
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function resolveRoute(): Promise<{ kind: 'edge'; accessToken: string } | { kind: 'direct' }> {
  if (!isSupabaseConfigured()) return { kind: 'direct' };
  const supabase = getSupabase();
  if (!supabase) return { kind: 'direct' };
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { kind: 'edge', accessToken: token };
  } catch {
    // fall through to direct
  }
  return { kind: 'direct' };
}

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = cacheKey(path, params);
  const ttl = TTL_MS[path] ?? 30_000;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value as T;

  const inflight = inFlight.get(key) as Promise<T> | undefined;
  if (inflight) return inflight;

  const job = (async () => {
    await acquireSlot();
    try {
      const route = await resolveRoute();
      const value = route.kind === 'edge'
        ? await fetchViaEdge<T>(path, params, route.accessToken)
        : await fetchDirect<T>(path, params);
      cache.set(key, { expiresAt: Date.now() + ttl, value });
      return value;
    } finally {
      releaseSlot();
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, job);
  return job;
}

/** Test/debug helper — clears the in-memory request cache. */
export function clearFinnhubCache(): void {
  cache.clear();
  inFlight.clear();
}

// ── Types ─────────────────────────────────

export interface Quote {
  c: number;   // current price
  d: number;   // change
  dp: number;  // change percent
  h: number;   // high
  l: number;   // low
  o: number;   // open
  pc: number;  // previous close
  t: number;   // timestamp
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface SearchResult {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface NewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface StockMetrics {
  '5DayPriceReturnDaily': number | null;
  '13WeekPriceReturnDaily': number | null;
  '26WeekPriceReturnDaily': number | null;
  '52WeekPriceReturnDaily': number | null;
  'monthToDatePriceReturnDaily': number | null;
  'yearToDatePriceReturnDaily': number | null;
  '52WeekHigh': number | null;
  '52WeekLow': number | null;
  '52WeekHighDate': string | null;
  '52WeekLowDate': string | null;
  beta: number | null;
  peNormalizedAnnual: number | null;
  peTTM: number | null;
  forwardPE: number | null;
  pbQuarterly: number | null;
  pegTTM: number | null;
  evEbitdaTTM: number | null;
  epsGrowthTTMYoy: number | null;
  epsGrowth5Y: number | null;
  revenueGrowthTTMYoy: number | null;
  revenueGrowth5Y: number | null;
  roeTTM: number | null;
  roiTTM: number | null;
  grossMarginTTM: number | null;
  netProfitMarginTTM: number | null;
  operatingMarginTTM: number | null;
  dividendYieldIndicatedAnnual: number | null;
  'totalDebt/totalEquityQuarterly': number | null;
  'priceRelativeToS&P5004Week': number | null;
  'priceRelativeToS&P50013Week': number | null;
  'priceRelativeToS&P50052Week': number | null;
  '3MonthADReturnStd': number | null;
  '10DayAverageTradingVolume': number | null;
  marketCapitalization: number | null;
  enterpriseValue: number | null;
}

// ── API Functions ─────────────────────────

export async function getQuote(symbol: string): Promise<Quote> {
  return request<Quote>('/quote', { symbol });
}

export async function getCompanyProfile(symbol: string): Promise<CompanyProfile> {
  return request<CompanyProfile>('/stock/profile2', { symbol });
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  const data = await request<{ result: SearchResult[] }>('/search', { q: query });
  const all = (data.result || []).filter(
    (r) => r.type === 'Common Stock' || r.type === 'ADR' || r.type === 'ETP',
  );
  const us = all.filter((r) => !r.symbol.includes('.'));
  const intl = all.filter((r) => r.symbol.includes('.'));
  return [...us, ...intl];
}

export async function getCompanyNews(
  symbol: string,
  fromDate: string,
  toDate: string,
): Promise<NewsArticle[]> {
  return request<NewsArticle[]>('/company-news', {
    symbol,
    from: fromDate,
    to: toDate,
  });
}

export async function getStockMetrics(symbol: string): Promise<StockMetrics> {
  const data = await request<{ metric: StockMetrics }>('/stock/metric', {
    symbol,
    metric: 'all',
  });
  return data.metric;
}

// ── Helpers ───────────────────────────────

export async function getMultipleQuotes(
  symbols: string[],
): Promise<Record<string, Quote>> {
  const results: Record<string, Quote> = {};
  const promises = symbols.map(async (sym) => {
    try {
      results[sym] = await getQuote(sym);
    } catch {
      // skip failed quotes
    }
  });
  await Promise.all(promises);
  return results;
}

export async function getRecentNews(symbol: string, days: number = 7): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return getCompanyNews(symbol, fmt(from), fmt(to));
}

export function timeAgo(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
