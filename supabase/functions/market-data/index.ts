// Supabase Edge Function: market-data
// ─────────────────────────────────────────────────────────────────────────────
// Proxies a small whitelist of Finnhub endpoints so the upstream API key never
// leaves the server. Requires a valid Supabase user JWT (the platform verifies
// it before invoking this function, see `verify_jwt = true` in config.toml).
//
// Deploy:
//   supabase secrets set FINNHUB_API_KEY=<your key>
//   supabase functions deploy market-data
//
// Local dev:
//   supabase functions serve market-data --env-file ./supabase/.env.local
// ─────────────────────────────────────────────────────────────────────────────

// @ts-nocheck — runs in Deno on Supabase, not in the React Native TS pipeline.

const FINNHUB_BASE = "https://finnhub.io/api/v1";

/** Whitelist of allowed Finnhub paths (without leading slash). */
const ALLOWED_PATHS = new Set<string>([
  "quote",
  "stock/profile2",
  "stock/metric",
  "search",
  "company-news",
]);

/** Per-endpoint server cache TTL in milliseconds. */
const TTL_MS: Record<string, number> = {
  "quote": 15_000,
  "stock/profile2": 12 * 60 * 60 * 1000,
  "stock/metric": 60 * 60 * 1000,
  "search": 10 * 60 * 1000,
  "company-news": 5 * 60 * 1000,
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

interface CacheEntry {
  expiresAt: number;
  status: number;
  contentType: string;
  body: string;
}

const cache = new Map<string, CacheEntry>();

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function cacheKey(path: string, params: URLSearchParams): string {
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${path}?${sorted}`;
}

// deno-lint-ignore no-explicit-any
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "GET") {
    return jsonError(405, "Method not allowed");
  }

  // deno-lint-ignore no-explicit-any
  const apiKey = (globalThis as any).Deno?.env?.get?.("FINNHUB_API_KEY") as
    | string
    | undefined;
  if (!apiKey) {
    return jsonError(500, "Server missing FINNHUB_API_KEY secret");
  }

  const url = new URL(req.url);
  const rawPath = (url.searchParams.get("path") ?? "").replace(/^\/+/, "");
  if (!ALLOWED_PATHS.has(rawPath)) {
    return jsonError(400, `Path not allowed: ${rawPath || "(missing)"}`);
  }

  const upstreamParams = new URLSearchParams();
  for (const [k, v] of url.searchParams.entries()) {
    if (k === "path") continue;
    upstreamParams.set(k, v);
  }

  const key = cacheKey(rawPath, upstreamParams);
  const ttl = TTL_MS[rawPath] ?? 60_000;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return new Response(hit.body, {
      status: hit.status,
      headers: {
        ...CORS_HEADERS,
        "content-type": hit.contentType,
        "x-cache": "HIT",
      },
    });
  }

  upstreamParams.set("token", apiKey);
  const upstreamUrl = `${FINNHUB_BASE}/${rawPath}?${upstreamParams.toString()}`;

  let res: Response;
  try {
    res = await fetch(upstreamUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(502, `Upstream fetch failed: ${msg}`);
  }

  const body = await res.text();
  const contentType = res.headers.get("content-type") ?? "application/json";

  // Only cache successful responses; let errors propagate so the client can retry.
  if (res.ok) {
    cache.set(key, {
      expiresAt: now + ttl,
      status: res.status,
      contentType,
      body,
    });
  }

  return new Response(body, {
    status: res.status,
    headers: {
      ...CORS_HEADERS,
      "content-type": contentType,
      "x-cache": "MISS",
    },
  });
};

// deno-lint-ignore no-explicit-any
(globalThis as any).Deno?.serve?.(handler);
