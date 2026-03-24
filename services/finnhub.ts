import { FINNHUB_API_KEY } from '../constants/config';

const BASE = 'https://finnhub.io/api/v1';

async function request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ ...params, token: FINNHUB_API_KEY }).toString();
  const res = await fetch(`${BASE}${path}?${query}`);
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${res.statusText}`);
  return res.json();
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
