import { useState } from "react";
import BottomNav, { Tab } from "@/components/stock/BottomNav";
import DashboardScreen from "@/components/stock/DashboardScreen";
import StockSearchScreen from "@/components/stock/StockSearchScreen";
import StockDetailScreen from "@/components/stock/StockDetailScreen";
import MarketExplanationScreen from "@/components/stock/MarketExplanationScreen";
import SimulationResultsScreen from "@/components/stock/SimulationResultsScreen";
import WatchlistScreen from "@/components/stock/WatchlistScreen";
import PortfolioScreen from "@/components/stock/PortfolioScreen";

type Screen =
  | { type: "tab"; tab: Tab }
  | { type: "detail"; ticker: string }
  | { type: "explanation"; ticker: string }
  | { type: "simulation"; ticker: string };

const Index = () => {
  const [screen, setScreen] = useState<Screen>({ type: "tab", tab: "dashboard" });

  const activeTab = screen.type === "tab" ? screen.tab : undefined;

  const goToStock = (ticker: string) => setScreen({ type: "detail", ticker });
  const goToTab = (tab: Tab) => setScreen({ type: "tab", tab });

  const renderScreen = () => {
    switch (screen.type) {
      case "tab":
        switch (screen.tab) {
          case "dashboard":
            return <DashboardScreen onSelectStock={goToStock} />;
          case "search":
            return <StockSearchScreen onSearch={goToStock} />;
          case "watchlist":
            return <WatchlistScreen onSelectStock={goToStock} />;
          case "portfolio":
            return <PortfolioScreen />;
        }
        break;
      case "detail":
        return (
          <StockDetailScreen
            ticker={screen.ticker}
            onBack={() => goToTab("dashboard")}
            onViewExplanation={() => setScreen({ type: "explanation", ticker: screen.ticker })}
          />
        );
      case "explanation":
        return (
          <MarketExplanationScreen
            ticker={screen.ticker}
            onBack={() => setScreen({ type: "detail", ticker: screen.ticker })}
            onNext={() => setScreen({ type: "simulation", ticker: screen.ticker })}
          />
        );
      case "simulation":
        return (
          <SimulationResultsScreen
            ticker={screen.ticker}
            onBack={() => setScreen({ type: "explanation", ticker: screen.ticker })}
            onHome={() => goToTab("dashboard")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-background px-5 pt-8 pb-24 overflow-y-auto">
        {renderScreen()}
      </div>
      <BottomNav active={activeTab || "dashboard"} onNavigate={goToTab} />
    </div>
  );
};

export default Index;
