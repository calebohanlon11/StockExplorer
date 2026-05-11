# Supabase Edge Functions

Server-side proxies and helpers that run on Supabase's Deno runtime.

| Function | Purpose |
|----------|---------|
| `market-data` | Proxies a whitelist of Finnhub endpoints so the upstream API key stays server-side. Required Supabase JWT, per-endpoint in-memory cache. |

## Prerequisites

1. [Install the Supabase CLI](https://supabase.com/docs/guides/cli/getting-started).
2. From the project root:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   ```
   (`<YOUR_PROJECT_REF>` is the path segment in your Supabase dashboard URL.)

## Deploying `market-data`

```bash
# Set the secret used by the function (do this once per environment)
supabase secrets set FINNHUB_API_KEY=<your finnhub key>

# Deploy
supabase functions deploy market-data
```

`supabase/config.toml` pins `verify_jwt = true` for this function, so requests
without a valid Supabase user JWT are rejected at the platform layer before
they reach our code.

## Local development

```bash
# Run the function locally (requires Docker)
supabase functions serve market-data --env-file ./supabase/.env.local
```

Create `supabase/.env.local` (gitignored) with:

```
FINNHUB_API_KEY=<your finnhub key>
```

The client (`services/finnhub.ts`) routes through this function automatically
whenever the user is signed in via Supabase. When Supabase isn't configured
(legacy / offline dev), the client falls back to calling Finnhub directly with
`EXPO_PUBLIC_FINNHUB_API_KEY`.

## Adding new endpoints

Open `market-data/index.ts` and:

1. Add the Finnhub path (without leading slash) to `ALLOWED_PATHS`.
2. Pick a sane TTL in `TTL_MS`.

Then deploy again with `supabase functions deploy market-data`.
