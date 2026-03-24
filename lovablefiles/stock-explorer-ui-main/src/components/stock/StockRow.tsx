import Card from "./Card";
import MiniChart from "./MiniChart";

interface StockRowProps {
  ticker: string;
  name: string;
  price: string;
  change: number;
  chartData: number[];
  onClick?: () => void;
}

const StockRow = ({ ticker, name, price, change, chartData, onClick }: StockRowProps) => {
  const positive = change >= 0;

  return (
    <Card onClick={onClick} className="flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground text-sm">{ticker}</p>
        <p className="text-muted-foreground text-xs truncate">{name}</p>
      </div>
      <MiniChart data={chartData} positive={positive} />
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-foreground text-sm">${price}</p>
        <p className={`text-xs font-medium ${positive ? "text-gain" : "text-loss"}`}>
          {positive ? "+" : ""}{change.toFixed(2)}%
        </p>
      </div>
    </Card>
  );
};

export default StockRow;
