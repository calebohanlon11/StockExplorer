import StockRow from "./StockRow";
import Card from "./Card";
import { Star, Bell } from "lucide-react";

interface WatchlistScreenProps {
  onSelectStock: (ticker: string) => void;
}

const watchlistStocks = [
  { ticker: "TSLA", name: "Tesla, Inc.", price: "248.42", change: -3.42, chartData: [260, 255, 258, 250, 245, 248], alert: true },
  { ticker: "AAPL", name: "Apple Inc.", price: "192.53", change: 0.87, chartData: [190, 189, 191, 190, 192, 192], alert: false },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: "875.28", change: 4.15, chartData: [840, 850, 855, 860, 870, 875], alert: true },
  { ticker: "GOOGL", name: "Alphabet Inc.", price: "141.80", change: -0.45, chartData: [143, 142, 142, 141, 142, 141], alert: false },
  { ticker: "MSFT", name: "Microsoft Corp.", price: "378.91", change: 1.23, chartData: [370, 373, 375, 374, 377, 378], alert: false },
];

const WatchlistScreen = ({ onSelectStock }: WatchlistScreenProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" /> Watchlist
          </h1>
          <p className="text-muted-foreground text-sm">{watchlistStocks.length} stocks tracked</p>
        </div>
        <button className="p-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Gainers</p>
          <p className="text-lg font-bold text-gain">3</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Losers</p>
          <p className="text-lg font-bold text-loss">2</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Alerts</p>
          <p className="text-lg font-bold text-accent">2</p>
        </Card>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {watchlistStocks.map((stock) => (
          <StockRow key={stock.ticker} {...stock} onClick={() => onSelectStock(stock.ticker)} />
        ))}
      </div>
    </div>
  );
};

export default WatchlistScreen;
