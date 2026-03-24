import { useState } from "react";
import SearchBar from "./SearchBar";
import Card from "./Card";
import StockRow from "./StockRow";
import { Clock, Flame } from "lucide-react";

const recentSearches = ["TSLA", "AAPL", "MSFT", "GOOGL", "AMZN"];

const popularStocks = [
  { ticker: "TSLA", name: "Tesla, Inc.", price: "248.42", change: -3.42, chartData: [260, 255, 258, 250, 245, 248] },
  { ticker: "NVDA", name: "NVIDIA Corp.", price: "875.28", change: 4.15, chartData: [840, 850, 855, 860, 870, 875] },
  { ticker: "AMC", name: "AMC Entertainment", price: "4.82", change: 12.3, chartData: [4.2, 4.3, 4.5, 4.6, 4.7, 4.8] },
];

interface StockSearchScreenProps {
  onSearch: (ticker: string) => void;
}

const StockSearchScreen = ({ onSearch }: StockSearchScreenProps) => {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Search</h1>
        <p className="text-muted-foreground text-sm">Find any stock for market insights</p>
      </div>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmit={() => query && onSearch(query.toUpperCase())}
      />

      {/* Recent Searches */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" /> Recent
        </h2>
        <div className="flex gap-2 flex-wrap">
          {recentSearches.map((ticker) => (
            <button
              key={ticker}
              onClick={() => onSearch(ticker)}
              className="px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Popular */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Flame className="h-3.5 w-3.5" /> Popular right now
        </h2>
        <div className="flex flex-col gap-3">
          {popularStocks.map((stock) => (
            <StockRow key={stock.ticker} {...stock} onClick={() => onSearch(stock.ticker)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StockSearchScreen;
