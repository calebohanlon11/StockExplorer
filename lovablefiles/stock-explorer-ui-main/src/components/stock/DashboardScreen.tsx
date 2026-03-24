import Card from "./Card";
import StockRow from "./StockRow";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";

const marketStats = [
  { label: "S&P 500", value: "4,782.82", change: +0.34, icon: TrendingUp },
  { label: "NASDAQ", value: "15,003.22", change: -0.18, icon: TrendingDown },
  { label: "DOW", value: "37,562.11", change: +0.12, icon: Activity },
  { label: "VIX", value: "14.32", change: -2.1, icon: BarChart3 },
];

const trendingStocks = [
  { ticker: "TSLA", name: "Tesla, Inc.", price: "248.42", change: -3.42, chartData: [260, 255, 258, 250, 245, 248] },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: "875.28", change: 4.15, chartData: [840, 850, 855, 860, 870, 875] },
  { ticker: "AAPL", name: "Apple Inc.", price: "192.53", change: 0.87, chartData: [190, 189, 191, 190, 192, 192] },
  { ticker: "META", name: "Meta Platforms", price: "505.75", change: 2.31, chartData: [490, 495, 498, 500, 503, 505] },
];

interface DashboardScreenProps {
  onSelectStock: (ticker: string) => void;
}

const DashboardScreen = ({ onSelectStock }: DashboardScreenProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground text-sm">Good evening</p>
        <h1 className="text-2xl font-bold text-foreground">Markets Overview</h1>
      </div>

      {/* Market Indices */}
      <div className="grid grid-cols-2 gap-3">
        {marketStats.map(({ label, value, change, icon: Icon }) => (
          <Card key={label} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${change >= 0 ? "text-gain" : "text-loss"}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="font-bold text-foreground">{value}</p>
            <span className={`text-xs font-semibold ${change >= 0 ? "text-gain bg-gain" : "text-loss bg-loss"} px-2 py-0.5 rounded-full self-start`}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
          </Card>
        ))}
      </div>

      {/* Trending */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trending Stocks</h2>
          <span className="text-xs text-primary font-medium">See all</span>
        </div>
        <div className="flex flex-col gap-3">
          {trendingStocks.map((stock) => (
            <StockRow key={stock.ticker} {...stock} onClick={() => onSelectStock(stock.ticker)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
