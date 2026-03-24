import Card from "./Card";
import StatRow from "./StatRow";
import { PieChart, TrendingUp, DollarSign, BarChart3 } from "lucide-react";

const holdings = [
  { ticker: "TSLA", shares: 15, avgCost: 220, currentPrice: 248.42, allocation: 28 },
  { ticker: "NVDA", shares: 5, avgCost: 750, currentPrice: 875.28, allocation: 33 },
  { ticker: "AAPL", shares: 20, avgCost: 175, currentPrice: 192.53, allocation: 29 },
  { ticker: "MSFT", shares: 3, avgCost: 350, currentPrice: 378.91, allocation: 10 },
];

const totalValue = holdings.reduce((acc, h) => acc + h.shares * h.currentPrice, 0);
const totalCost = holdings.reduce((acc, h) => acc + h.shares * h.avgCost, 0);
const totalGain = totalValue - totalCost;
const totalGainPct = ((totalGain / totalCost) * 100).toFixed(2);

const PortfolioScreen = () => {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <PieChart className="h-6 w-6 text-primary" /> Portfolio
        </h1>
        <p className="text-muted-foreground text-sm">Your investment overview</p>
      </div>

      {/* Portfolio Value */}
      <Card glow="green">
        <p className="text-xs text-muted-foreground mb-1">Total Value</p>
        <p className="text-3xl font-bold text-foreground">${totalValue.toLocaleString("en", { minimumFractionDigits: 2 })}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-semibold ${totalGain >= 0 ? "text-gain" : "text-loss"}`}>
            {totalGain >= 0 ? "+" : ""}${totalGain.toLocaleString("en", { minimumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${totalGain >= 0 ? "bg-gain text-gain" : "bg-loss text-loss"}`}>
            {totalGain >= 0 ? "+" : ""}{totalGainPct}%
          </span>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invested</p>
            <p className="font-bold text-foreground text-sm">${totalCost.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Holdings</p>
            <p className="font-bold text-foreground text-sm">{holdings.length} stocks</p>
          </div>
        </Card>
      </div>

      {/* Holdings */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Holdings</h2>
        {holdings.map((h) => {
          const gain = (h.currentPrice - h.avgCost) * h.shares;
          const gainPct = ((h.currentPrice - h.avgCost) / h.avgCost * 100).toFixed(1);
          const positive = gain >= 0;
          return (
            <Card key={h.ticker} className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-foreground text-sm">{h.ticker}</span>
                  <span className="text-muted-foreground text-xs ml-2">{h.shares} shares</span>
                </div>
                <span className="text-xs text-muted-foreground">{h.allocation}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 mb-2">
                <div className="bg-primary rounded-full h-1.5" style={{ width: `${h.allocation}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg ${h.avgCost}</span>
                <span className={positive ? "text-gain font-semibold" : "text-loss font-semibold"}>
                  {positive ? "+" : ""}{gainPct}% (${gain >= 0 ? "+" : ""}{gain.toFixed(0)})
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioScreen;
