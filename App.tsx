import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';
import { WatchlistProvider } from './context/WatchlistContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { RecentSearchesProvider } from './context/RecentSearchesContext';
import { AlertsProvider } from './context/AlertsContext';
import { PortfolioHistoryProvider } from './context/PortfolioHistoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import BottomNav, { Tab } from './components/BottomNav';
import DashboardScreen from './screens/DashboardScreen';
import StockSearchScreen from './screens/StockSearchScreen';
import StockDetailScreen from './screens/StockDetailScreen';
import SetupAnalysisScreen from './screens/SetupAnalysisScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import CompareScreen from './screens/CompareScreen';
import ProfileScreen from './screens/ProfileScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PaywallScreen from './screens/PaywallScreen';
import { isSupabaseConfigured } from './constants/config';
import Colors from './constants/colors';

type Screen =
  | { type: 'tab'; tab: Tab }
  | { type: 'detail'; ticker: string; from?: Tab }
  | { type: 'analysis'; ticker: string; from?: Tab }
  | { type: 'compare-with'; ticker: string }
  | { type: 'welcome' }
  | { type: 'auth'; mode: 'signup' | 'signin' }
  | { type: 'onboarding' }
  | { type: 'paywall' }
  | { type: 'profile' };

function AppContent() {
  const { user } = useAuth();
  const {
    subState, hasCompletedOnboarding, isFullAccess, loaded,
    startTrial, enterPreview, signOut,
  } = useSubscription();

  const initialScreen = (): Screen => {
    if (!loaded) return { type: 'welcome' };
    if (isSupabaseConfigured()) {
      if (user) {
        if (!hasCompletedOnboarding) return { type: 'onboarding' };
        return { type: 'tab', tab: 'dashboard' };
      }
      return { type: 'welcome' };
    }
    if (subState === 'none') return { type: 'welcome' };
    if (!hasCompletedOnboarding) return { type: 'welcome' };
    return { type: 'tab', tab: 'dashboard' };
  };

  const [screen, setScreen] = useState<Screen>(initialScreen);

  React.useEffect(() => {
    if (!loaded) return;
    const toDashboard = (t: Screen['type']) =>
      t === 'welcome' || t === 'auth' || t === 'onboarding' || t === 'paywall';
    if (isSupabaseConfigured()) {
      if (user && hasCompletedOnboarding) {
        setScreen((prev) => (toDashboard(prev.type) ? { type: 'tab', tab: 'dashboard' } : prev));
      } else if (user && !hasCompletedOnboarding) {
        setScreen((prev) => (prev.type === 'welcome' || prev.type === 'auth' ? { type: 'onboarding' } : prev));
      }
      return;
    }
    if (subState !== 'none' && hasCompletedOnboarding) {
      setScreen((prev) => (toDashboard(prev.type) ? { type: 'tab', tab: 'dashboard' } : prev));
    }
  }, [loaded, user, hasCompletedOnboarding, subState]);

  const activeTab = screen.type === 'tab' ? screen.tab : undefined;

  const goToStock = (ticker: string, from?: Tab) =>
    setScreen({ type: 'detail', ticker, from });
  const goToTab = (tab: Tab) => setScreen({ type: 'tab', tab });

  const showPaywall = () => setScreen({ type: 'paywall' });

  const renderScreen = () => {
    switch (screen.type) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => setScreen({ type: 'auth', mode: 'signup' })}
            onSignIn={() => setScreen({ type: 'auth', mode: 'signin' })}
          />
        );

      case 'auth':
        return (
          <AuthScreen
            initialMode={screen.mode}
            onAuthenticated={(isNew) => {
              if (isNew) {
                setScreen({ type: 'onboarding' });
              } else {
                setScreen({ type: 'tab', tab: 'dashboard' });
              }
            }}
          />
        );

      case 'onboarding':
        return (
          <OnboardingScreen
            onComplete={() => setScreen({ type: 'paywall' })}
            onSkip={() => setScreen({ type: 'paywall' })}
          />
        );

      case 'paywall':
        return (
          <PaywallScreen
            onStartTrial={async (plan) => {
              await startTrial(plan);
              setScreen({ type: 'tab', tab: 'dashboard' });
            }}
            onSkip={async () => {
              await enterPreview();
              setScreen({ type: 'tab', tab: 'dashboard' });
            }}
          />
        );

      case 'profile':
        return (
          <ProfileScreen
            onBack={() => goToTab('dashboard')}
            onSignOut={async () => {
              await signOut();
              setScreen({ type: 'welcome' });
            }}
            onUpgrade={() => setScreen({ type: 'paywall' })}
          />
        );

      case 'tab':
        switch (screen.tab) {
          case 'dashboard':
            return (
              <DashboardScreen
                onSelectStock={(t) => goToStock(t, 'dashboard')}
                onProfile={() => setScreen({ type: 'profile' })}
              />
            );
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
            onViewAnalysis={() => {
              if (isFullAccess) {
                setScreen({ type: 'analysis', ticker: screen.ticker, from: screen.from });
              } else {
                showPaywall();
              }
            }}
            onCompare={() => setScreen({ type: 'compare-with', ticker: screen.ticker })}
          />
        );
      case 'analysis':
        return (
          <SetupAnalysisScreen
            ticker={screen.ticker}
            onBack={() => setScreen({ type: 'detail', ticker: screen.ticker, from: screen.from })}
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

  const showNav = screen.type === 'tab' || screen.type === 'detail' || screen.type === 'analysis' || screen.type === 'compare-with' || screen.type === 'profile';
  const showPadding = screen.type !== 'welcome' && screen.type !== 'auth' && screen.type !== 'onboarding' && screen.type !== 'paywall';

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.content, !showPadding && styles.contentFullScreen]}>
        {renderScreen()}
      </View>
      {showNav && <BottomNav active={activeTab ?? 'dashboard'} onNavigate={goToTab} />}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SubscriptionProvider>
          <RecentSearchesProvider>
            <AlertsProvider>
              <WatchlistProvider>
                <PortfolioProvider>
                  <PortfolioHistoryProvider>
                    <AppContent />
                  </PortfolioHistoryProvider>
                </PortfolioProvider>
              </WatchlistProvider>
            </AlertsProvider>
          </RecentSearchesProvider>
        </SubscriptionProvider>
      </AuthProvider>
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
  contentFullScreen: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
});
