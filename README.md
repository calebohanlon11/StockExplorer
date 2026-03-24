# StockExplorer

A cross-platform stock market exploration app built with **Expo** and **React Native**. StockExplorer provides real-time market data, in-depth stock analysis, portfolio tracking, and an educational simulation mode — all powered by the [Finnhub](https://finnhub.io/) API.

---

## Features

### Dashboard
- Live market overview showing S&P 500, NASDAQ, and DOW index performance via ETF proxies (SPY, QQQ, DIA)
- Market status indicator (open/closed) based on Eastern Time
- Trending stocks section with real-time quotes for major tickers (TSLA, NVDA, AAPL, META, MSFT, GOOG, AMZN, AMD)
- Inline mini-charts for quick price visualization
- Pull-to-refresh for up-to-date data
- Watchlist alerts with triggered notification badges

### Stock Search
- Real-time symbol search powered by Finnhub's search endpoint
- Filters results to Common Stock, ADR, and ETP types
- Prioritizes US-listed stocks over international listings
- Recent search history persisted locally via AsyncStorage

### Stock Detail
- Real-time quote with price, change, and percent change
- Company profile (name, exchange, industry, market cap)
- Comprehensive financial metrics including:
  - Price returns (5-day, 13-week, 26-week, 52-week, MTD, YTD)
  - 52-week high/low with range position
  - Valuation ratios (P/E, Forward P/E, P/B, PEG, EV/EBITDA)
  - Growth metrics (EPS growth YoY, 5Y; Revenue growth YoY, 5Y)
  - Profitability (ROE, ROI, gross/net/operating margins)
  - Risk indicators (Beta, Debt/Equity, volatility)
- Educational metric tooltips explaining what each financial term means
- Add to watchlist / portfolio with custom shares and cost basis
- Set price alerts (above/below thresholds)
- Auto-refresh on a timer for live price updates

### Market Explanation
- AI-style rules-based analysis engine that evaluates stocks across five dimensions:
  - **Momentum** — short-term and long-term price trends, S&P 500 relative performance
  - **Valuation** — P/E, Forward P/E, PEG, EV/EBITDA scoring
  - **Growth** — EPS and revenue growth (YoY and 5-year)
  - **Profitability** — ROE, net margin, gross margin evaluation
  - **Risk** — Beta, debt/equity, volatility assessment
- Generates a composite signal: Bullish, Cautiously Bullish, Neutral, Cautiously Bearish, or Bearish
- Produces an action rating: Strong Buy, Buy, Hold, Reduce, or Sell
- Highlights key bull/bear factors driving the rating
- Provides a natural-language conclusion and actionable advice

### Simulation Results
- Shows projected outcomes based on the analysis engine's signal
- Helps users understand potential scenarios before investing

### Stock Comparison
- Side-by-side comparison of two stocks
- Compare key metrics: price, change, P/E, PEG, EPS growth, revenue growth, ROE, margin, beta, and more
- Visual winner highlighting per metric

### Watchlist
- Add/remove stocks to a persistent watchlist (AsyncStorage)
- Quick access to watchlisted stocks with live quotes

### Portfolio
- Track holdings with shares count and cost basis
- Calculate unrealized P&L per position and total portfolio value
- Portfolio history tracking over time

### Price Alerts
- Set custom price alerts (above/below a target price)
- Alerts checked on dashboard load with visual notification

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Expo](https://expo.dev/) ~55 |
| UI | [React Native](https://reactnative.dev/) 0.83 + [React](https://react.dev/) 19 |
| Web Support | [React Native Web](https://necolas.github.io/react-native-web/) |
| Language | TypeScript 5.9 (strict) |
| Icons | [@expo/vector-icons](https://docs.expo.dev/guides/icons/) (Ionicons) |
| Charts | Custom SVG mini-charts via [react-native-svg](https://github.com/software-mansion/react-native-svg) |
| Storage | [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) |
| Haptics | [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) |
| API | [Finnhub Stock API](https://finnhub.io/) (REST) |

---

## Project Structure

```
StockExplorer/
├── App.tsx                          # Root component with screen routing
├── index.ts                         # Expo entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
│
├── constants/
│   ├── colors.ts                    # Dark theme color palette
│   └── config.ts                    # API key configuration
│
├── components/
│   ├── BottomNav.tsx                # Tab bar navigation
│   ├── Card.tsx                     # Reusable card container
│   ├── DetailChartModal.tsx         # Expanded chart modal
│   ├── ErrorBoundary.tsx            # Error boundary wrapper
│   ├── LoadingIndicator.tsx         # Loading spinner
│   ├── MetricTooltip.tsx            # Educational metric explanations
│   ├── MiniChart.tsx                # Inline SVG sparkline chart
│   ├── SearchBar.tsx                # Search input component
│   ├── SkeletonLoader.tsx           # Skeleton loading placeholders
│   ├── StatRow.tsx                  # Key-value stat display
│   └── StockRow.tsx                 # Stock list item
│
├── screens/
│   ├── DashboardScreen.tsx          # Market overview and trending
│   ├── StockSearchScreen.tsx        # Stock symbol search
│   ├── StockDetailScreen.tsx        # Individual stock deep-dive
│   ├── MarketExplanationScreen.tsx  # Analysis and signals
│   ├── SimulationResultsScreen.tsx  # Scenario projections
│   ├── CompareScreen.tsx            # Side-by-side stock comparison
│   ├── WatchlistScreen.tsx          # Saved watchlist
│   └── PortfolioScreen.tsx          # Portfolio tracker
│
├── context/
│   ├── AlertsContext.tsx            # Price alert state management
│   ├── PortfolioContext.tsx          # Portfolio holdings state
│   ├── PortfolioHistoryContext.tsx   # Portfolio value history
│   ├── RecentSearchesContext.tsx     # Search history state
│   └── WatchlistContext.tsx          # Watchlist state management
│
├── services/
│   ├── finnhub.ts                   # Finnhub API client
│   └── analysis.ts                  # Rules-based stock analysis engine
│
└── utils/
    └── haptics.ts                   # Haptic feedback helpers
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo` works without global install)
- A free [Finnhub API key](https://finnhub.io/register)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/<your-username>/StockExplorer.git
   cd StockExplorer
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Add your Finnhub API key:**

   Open `constants/config.ts` and replace the placeholder with your key:

   ```typescript
   export const FINNHUB_API_KEY = 'YOUR_FINNHUB_API_KEY_HERE';
   ```

   > You can get a free API key at [finnhub.io/register](https://finnhub.io/register).

4. **Start the development server:**

   ```bash
   npx expo start
   ```

5. **Run the app:**
   - Press `w` to open in a web browser
   - Press `a` to open on an Android emulator/device
   - Press `i` to open on an iOS simulator (macOS only)
   - Scan the QR code with the Expo Go app on your phone

---

## Available Scripts

| Command | Description |
|---|---|
| `npm start` | Start the Expo development server |
| `npm run web` | Start directly in web mode |
| `npm run android` | Start on Android emulator/device |
| `npm run ios` | Start on iOS simulator |

---

## API Usage

This app uses the [Finnhub Stock API](https://finnhub.io/docs/api) (free tier). The following endpoints are consumed:

| Endpoint | Purpose |
|---|---|
| `/quote` | Real-time stock quotes |
| `/stock/profile2` | Company profile information |
| `/search` | Symbol/company name search |
| `/company-news` | Recent company news articles |
| `/stock/metric` | Financial metrics and ratios |

> **Rate Limits:** The free Finnhub tier allows 60 API calls per minute. The app batches requests where possible, but heavy usage across multiple screens may occasionally hit limits.

---

## Analysis Engine

The built-in analysis engine (`services/analysis.ts`) scores stocks across five categories and produces actionable signals without requiring any external AI service:

| Category | Max Score | What It Evaluates |
|---|---|---|
| Momentum | +/-3 | 5-day, 13-week, 52-week returns; S&P 500 relative performance |
| Valuation | +/-2 | P/E, Forward P/E, PEG, EV/EBITDA |
| Growth | +/-3 | EPS growth (YoY, 5Y), Revenue growth (YoY, 5Y) |
| Profitability | +/-2 | ROE, net profit margin, gross margin |
| Risk | +/-2 | Beta, debt/equity ratio, 3-month volatility |

The composite score maps to signals (Bullish to Bearish) and action ratings (Strong Buy to Sell), with 52-week range position used as a tiebreaker.

---

## Design

StockExplorer uses a dark theme optimized for financial data readability:

- **Background:** `#12141C` (deep navy)
- **Cards:** `#1A1E2E` (elevated dark surface)
- **Primary accent:** `#19E85A` (vibrant green for gains)
- **Loss color:** `#DF3B3B` (red for negative changes)
- **Info accent:** `#18B5F0` (blue for neutral highlights)

---

## License

This project is provided as-is for educational and personal use.
