import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';
import { WatchlistProvider } from './context/WatchlistContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { RecentSearchesProvider } from './context/RecentSearchesContext';
import { AlertsProvider } from './context/AlertsContext';
import { PortfolioHistoryProvider } from './context/PortfolioHistoryContext';
import BottomNav, { Tab } from './components/BottomNav';
import DashboardScreen from './screens/DashboardScreen';
import StockSearchScreen from './screens/StockSearchScreen';
import StockDetailScreen from './screens/StockDetailScreen';
import MarketExplanationScreen from './screens/MarketExplanationScreen';
import SimulationResultsScreen from './screens/SimulationResultsScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import CompareScreen from './screens/CompareScreen';
import Colors from './constants/colors';

type Screen =
  | { type: 'tab'; tab: Tab }
  | { type: 'detail'; ticker: string; from?: Tab }
  | { type: 'explanation'; ticker: string }
  | { type: 'simulation'; ticker: string }
  | { type: 'compare-with'; ticker: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'tab', tab: 'dashboard' });

  const activeTab = screen.type === 'tab' ? screen.tab : undefined;

  const goToStock = (ticker: string, from?: Tab) =>
    setScreen({ type: 'detail', ticker, from });
  const goToTab = (tab: Tab) => setScreen({ type: 'tab', tab });

  const renderScreen = () => {
    switch (screen.type) {
      case 'tab':
        switch (screen.tab) {
          case 'dashboard':
            return <DashboardScreen onSelectStock={(t) => goToStock(t, 'dashboard')} />;
          case 'search':
            return <StockSearchScreen onSearch={(t) => goToStock(t, 'search')} />;
          case 'compare':
            return <CompareScreen onSelectStock={(t) => goToStock(t, 'compare')} />;
          case 'watchlist':
            return <WatchlistScreen onSelectStock={(t) => goToStock(t, 'watchlist')} />;
          case 'portfolio':
            return <PortfolioScreen onSelectStock={(t) => goToStock(t, 'portfolio')} />;
        }
        break;
      case 'detail':
        return (
          <StockDetailScreen
            ticker={screen.ticker}
            onBack={() => goToTab(screen.from ?? 'dashboard')}
            onViewExplanation={() => setScreen({ type: 'explanation', ticker: screen.ticker })}
            onCompare={() => setScreen({ type: 'compare-with', ticker: screen.ticker })}
          />
        );
      case 'explanation':
        return (
          <MarketExplanationScreen
            ticker={screen.ticker}
            onBack={() => setScreen({ type: 'detail', ticker: screen.ticker })}
            onNext={() => setScreen({ type: 'simulation', ticker: screen.ticker })}
          />
        );
      case 'simulation':
        return (
          <SimulationResultsScreen
            ticker={screen.ticker}
            onBack={() => setScreen({ type: 'explanation', ticker: screen.ticker })}
            onHome={() => goToTab('dashboard')}
          />
        );
      case 'compare-with':
        return (
          <CompareScreen
            initialTicker={screen.ticker}
            onSelectStock={(t) => goToStock(t, 'compare')}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      <RecentSearchesProvider>
        <AlertsProvider>
          <WatchlistProvider>
            <PortfolioProvider>
              <PortfolioHistoryProvider>
                <View style={styles.root}>
                  <StatusBar style="light" />
                  <View style={styles.content}>
                    {renderScreen()}
                  </View>
                  <BottomNav active={activeTab ?? 'dashboard'} onNavigate={goToTab} />
                </View>
              </PortfolioHistoryProvider>
            </PortfolioProvider>
          </WatchlistProvider>
        </AlertsProvider>
      </RecentSearchesProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
  },
});
