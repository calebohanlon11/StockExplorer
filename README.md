# StockExplorer

A cross-platform stock market app built with **Expo** and **React Native**. StockExplorer focuses on **decision support**: what moved, possible drivers, and what similar historical setups tended to do next — with cautious, descriptive language (not investment advice).

**Data sources:** [Finnhub](https://finnhub.io/) (quotes, profiles, metrics, news) and [Alpha Vantage](https://www.alphavantage.co/) (historical daily prices for pattern matching, cached to respect free-tier limits).

---

## Features

### First launch & account
- Welcome screen, email/password sign-up and sign-in via **[Supabase Auth](https://supabase.com/docs/guides/auth)** when `EXPO_PUBLIC_SUPABASE_*` is set; optional **Apple / Google** OAuth when redirect URLs are configured in Supabase; otherwise **legacy mock auth** + local-only subscription flags
- Short onboarding and paywall with **7-day free trial** stored in **Supabase** (`profiles` + RPCs) when Supabase is configured
- **Profile** — person icon on the home header: account email, subscription status, sign out (clears Supabase session)
- **Owner admin access** — set `is_admin = true` on your row in `public.profiles` in the Supabase dashboard (server-side). With Supabase enabled, `EXPO_PUBLIC_ADMIN_EMAIL` is **not** used for entitlements (legacy mode only)

### Dashboard
- Market overview (indices via SPY, QQQ, DIA), market open/closed, pull-to-refresh
- Top movers, sector hints, watchlist-driven sections, optional chart modal
- First-launch nudge to try full analysis on a stock

### Stock search & detail
- Debounced search, recent searches, international badges where relevant
- Quote, profile, metrics, watchlist, portfolio add, alerts, collapsible market data
- **Insight-first** layout: setup preview and historical “when this happened before” preview (when subscribed / admin)
- Gated full **Setup Analysis** screen for non-subscribers

### Setup analysis
- Multi-factor setup summary, “what happened today,” possible drivers (conservative news matching), historical forward-return stats when data allows, factor breakdown, bull/bear framing, risk notes

### Watchlist, portfolio, compare, alerts
- Persistent watchlist and portfolio (AsyncStorage), price alerts, compare two tickers

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Expo](https://expo.dev/) ~55 |
| UI | React Native 0.83 + React 19 |
| Web | react-native-web |
| Language | TypeScript (strict) |
| Storage | AsyncStorage |
| Charts | react-native-svg |
| Icons | @expo/vector-icons (Ionicons) |
| Auth & entitlements | [Supabase](https://supabase.com/) (`@supabase/supabase-js`, optional) |

---

## Configuration

**Secrets are not committed.** Copy `.env.example` to `.env` in the project root and set:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_FINNHUB_API_KEY` | Required for live quotes, search, news, metrics |
| `EXPO_PUBLIC_ALPHA_VANTAGE_API_KEY` | Optional; enables historical similar-setup / forward-return stats |
| `EXPO_PUBLIC_SUPABASE_URL` | Optional; Supabase project URL — if set with anon key, real auth + server-backed trial/preview |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Optional; Supabase anon (public) key — safe in the client with RLS enabled |
| `EXPO_PUBLIC_ADMIN_EMAIL` | Legacy mode only (no Supabase): client-side admin bypass for local testing |

Restart the dev server after changing `.env`.

### Supabase setup (recommended for production-style accounts)

1. Create a project at [supabase.com](https://supabase.com/).
2. In **Project Settings → API**, copy the project URL and **anon** key into `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. In **SQL Editor**, run the script in `supabase/migrations/001_profiles_and_entitlements.sql`. This creates `public.profiles`, RLS, signup trigger, and RPCs `start_app_trial` / `enter_app_preview`.
4. Under **Authentication → Providers**, configure email (disable “Confirm email” for faster local testing, or keep it on and confirm via inbox).
5. Grant yourself admin: in **Table Editor → profiles**, set `is_admin` to `true` for your user row (or run the SQL comment at the bottom of the migration file).
6. **OAuth (Apple / Google):** In Supabase → **Authentication → URL configuration**, add the redirect URL that matches your app scheme (see `services/oauthSupabase.ts` — default pattern uses scheme `stockexplorer` and path `auth/callback`). Enable the providers you need under **Authentication → Providers**.

---

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn
- Free [Finnhub](https://finnhub.io/register) API key (and optionally [Alpha Vantage](https://www.alphavantage.co/support/#api-key))

### Install

```bash
git clone https://github.com/calebohanlon11/StockExplorer.git
cd StockExplorer
npm install
cp .env.example .env
# Edit .env and add your keys
npx expo start
```

Then press `w` (web), `a` (Android), or `i` (iOS simulator), or scan the QR code with Expo Go.

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Expo dev server |
| `npm run start:dev` | Dev server for a **development build** (after installing an EAS dev client) |
| `npm run web` | Web |
| `npm run android` | Android |
| `npm run ios` | iOS simulator |

### EAS Build (optional)

The repo includes `eas.json` with **development** (dev client + internal APK), **preview** (internal APK), and **production** profiles. Cloud builds do **not** read your local `.env`; set the same `EXPO_PUBLIC_*` variables in the [Expo dashboard](https://expo.dev) (Project → Environment variables) or via `eas env:create`.

| Command | Description |
|---------|-------------|
| `npm run eas:login` | Log in to Expo |
| `npm run eas:init` | Link the project to EAS (first time) |
| `npm run eas:build:dev` | Development client build |
| `npm run eas:build:preview` | Internal preview build |
| `npm run eas:build:production` | Production build |
| `npm run eas:submit` | Submit to stores (after production build) |

### Typecheck

```bash
npx tsc --noEmit
```

---

## API notes

- **Finnhub free tier:** ~60 calls/minute; heavy use may show temporary “data unavailable” — wait and pull to refresh.
- **Alpha Vantage free tier:** low daily quota; the app caches historical series aggressively.

---

## Project structure (high level)

```
App.tsx                 # Root navigation, providers, subscription flow
app.json / eas.json     # Expo app config and EAS build profiles
.env.example            # Template for EXPO_PUBLIC_* keys (copy to `.env`)
constants/              # Theme colors, env-driven config (no secrets in repo)
components/             # UI building blocks (Card, charts, LockedGate, …)
screens/                # Dashboard, search, detail, analysis, profile, paywall, auth, …
context/                # AuthContext, SubscriptionContext, watchlist, portfolio, alerts, …
services/               # supabase, oauthSupabase, finnhub, alphaVantage, analysis, historicalAnalog
supabase/migrations/    # SQL for profiles + entitlements RPCs
utils/                  # haptics, alert helpers
```

---

## Security & compliance

- This app is for **education and information**, not personalized investment advice.
- Do **not** commit `.env` or real API keys. Use `.env.example` only as a template.
- With **Supabase**, trial/preview/admin flags live in `profiles` with RLS; only the signed-in user can read their row, and subscription changes go through **RPCs** (not arbitrary client updates). For **store billing**, add RevenueCat (or similar) and sync entitlements server-side.
- **Legacy mode** (no Supabase): `EXPO_PUBLIC_ADMIN_EMAIL` is client-side only — fine for local demos, not for real enforcement.

---

## License

Provided as-is for educational and personal use.
