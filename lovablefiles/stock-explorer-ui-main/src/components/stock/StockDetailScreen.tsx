import Card from "./Card";
import StatRow from "./StatRow";
import MiniChart from "./MiniChart";
import { ArrowLeft, TrendingDown, TrendingUp, Info, Zap } from "lucide-react";

interface StockDetailScreenProps {
  ticker: string;
  onBack: () => void;
  onViewExplanation: () => void;
}

const priceHistory = [260, 255, 258, 250, 245, 248, 242, 245, 240, 238, 244, 248];

const StockDetailScreen = ({ ticker, onBack, onViewExplanation }: StockDetailScreenProps) => {
  const currentPrice = 248.42;
  const change = -3.42;
  const positive = change >= 0;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{ticker}</h1>
          <p className="text-muted-foreground text-sm">Tesla, Inc. · NASDAQ</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">${currentPrice}</p>
          <div className={`flex items-center gap-1 justify-end ${positive ? "text-gain" : "text-loss"}`}>
            {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span className="text-sm font-semibold">{change}%</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <Card glow={positive ? "green" : "none"}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>
        <svg width="100%" height="80" viewBox="0 0 360 80" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={positive ? "hsl(145,80%,50%)" : "hsl(0,75%,55%)"} stopOpacity="0.3" />
              <stop offset="100%" stopColor={positive ? "hsl(145,80%,50%)" : "hsl(0,75%,55%)"} stopOpacity="0" />
            </linearGradient>
          </defs>
          {(() => {
            const min = Math.min(...priceHistory);
            const max = Math.max(...priceHistory);
            const range = max - min || 1;
            const pts = priceHistory.map((v, i) => {
              const x = (i / (priceHistory.length - 1)) * 360;
              const y = 80 - ((v - min) / range) * 70 - 5;
              return `${x},${y}`;
            }).join(" ");
            const areaPath = `M0,80 L${priceHistory.map((v, i) => {
              const x = (i / (priceHistory.length - 1)) * 360;
              const y = 80 - ((v - min) / range) * 70 - 5;
              return `${x},${y}`;
            }).join(" L")} L360,80 Z`;
            return (
              <>
                <path d={areaPath} fill="url(#chartGrad)" />
                <polyline points={pts} fill="none" stroke={positive ? "hsl(145,80%,50%)" : "hsl(0,75%,55%)"} strokeWidth="2.5" strokeLinecap="round" />
              </>
            );
          })()}
        </svg>
      </Card>

      {/* Key Stats */}
      <Card>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Statistics</h3>
        <StatRow label="Market Cap" value="$789.2B" />
        <StatRow label="P/E Ratio" value="62.4" />
        <StatRow label="52W High" value="$299.29" />
        <StatRow label="52W Low" value="$152.37" />
        <StatRow label="Avg Volume" value="98.2M" />
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onViewExplanation}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <Zap className="h-4 w-4" /> AI Analysis
        </button>
        <button className="px-5 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-2">
          <Info className="h-4 w-4" /> More
        </button>
      </div>
    </div>
  );
};

export default StockDetailScreen;
