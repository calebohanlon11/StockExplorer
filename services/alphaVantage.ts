import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALPHA_VANTAGE_API_KEY } from '../constants/config';

const BASE = 'https://www.alphavantage.co/query';
const CACHE_PREFIX = '@history_';
const CACHE_TTL_MS = 20 * 60 * 60 * 1000; // 20 hours — refresh once per trading day
const MAX_BARS = 100; // compact endpoint returns ~100 trading days

export interface DailyBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CacheEntry {
  fetchedAt: number;
  data: DailyBar[];
}

function isKeyConfigured(): boolean {
  const key: string = ALPHA_VANTAGE_API_KEY;
  return key !== 'YOUR_ALPHA_VANTAGE_KEY_HERE' && key.length > 0;
}

async function fetchFromApi(symbol: string): Promise<DailyBar[]> {
  const params = new URLSearchParams({
    function: 'TIME_SERIES_DAILY',
    symbol,
    outputsize: 'compact',
    apikey: ALPHA_VANTAGE_API_KEY,
  });

  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);

  const json = await res.json();

  if (json['Error Message']) {
    throw new Error(json['Error Message']);
  }

  if (json['Note']) {
    throw new Error('Alpha Vantage rate limit reached (per-minute)');
  }

  if (json['Information']) {
    throw new Error('Alpha Vantage daily limit reached');
  }

  const timeSeries = json['Time Series (Daily)'];
  if (!timeSeries) {
    const keys = Object.keys(json).join(', ');
    throw new Error(`No time series data returned. Response keys: ${keys}`);
  }

  const bars: DailyBar[] = Object.entries(timeSeries)
    .map(([date, values]: [string, any]) => ({
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10),
    }))
    .filter((b) => b.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date)); // oldest first

  return bars.slice(-MAX_BARS);
}

async function getFromCache(symbol: string): Promise<DailyBar[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + symbol);
    if (!raw) return null;

    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    if (!entry.data || entry.data.length < 30) return null;

    return entry.data;
  } catch {
    return null;
  }
}

async function saveToCache(symbol: string, data: DailyBar[]): Promise<void> {
  try {
    const entry: CacheEntry = { fetchedAt: Date.now(), data };
    await AsyncStorage.setItem(CACHE_PREFIX + symbol, JSON.stringify(entry));
  } catch {}
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getDailyHistory(symbol: string): Promise<DailyBar[] | null> {
  if (!isKeyConfigured()) return null;

  const cached = await getFromCache(symbol);
  if (cached && cached.length > 0) return cached;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fetchFromApi(symbol);
      if (data.length > 0) {
        await saveToCache(symbol, data);
        return data;
      }
      return null;
    } catch (err: any) {
      const msg = err?.message ?? '';
      console.warn(`Alpha Vantage [${symbol}] attempt ${attempt + 1}:`, msg);

      if (msg.includes('per-minute') && attempt === 0) {
        await wait(15000);
        continue;
      }

      return null;
    }
  }

  return null;
}
