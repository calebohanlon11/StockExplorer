import Card from "./Card";
import { ArrowLeft, TrendingDown, Brain, Newspaper } from "lucide-react";

interface MarketExplanationScreenProps {
  ticker: string;
  onBack: () => void;
  onNext: () => void;
}

const MarketExplanationScreen = ({ ticker, onBack, onNext }: MarketExplanationScreenProps) => {
  const priceChange = -3.42;
  const isNegative = priceChange < 0;

  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Ticker badge */}
      <Card glow="blue">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${isNegative ? "bg-loss text-loss" : "bg-gain text-gain"}`}>
              {isNegative ? <TrendingDown className="h-6 w-6" /> : "📈"}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{ticker}</h1>
              <p className="text-muted-foreground text-xs">Tesla, Inc.</p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${isNegative ? "bg-loss text-loss" : "bg-gain text-gain"}`}>
            {priceChange}%
          </div>
        </div>
      </Card>

      {/* AI Explanation */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" /> What happened today
        </h2>
        <Card>
          <p className="text-foreground leading-relaxed text-sm">
            Tesla shares dropped after the company reported lower-than-expected delivery numbers for Q4. Investor sentiment weakened amid concerns about increased competition in the EV market from BYD and Rivian.
          </p>
        </Card>
      </div>

      {/* News Headlines */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Newspaper className="h-3.5 w-3.5" /> Related Headlines
        </h2>
        <div className="flex flex-col gap-2">
          {[
            { title: "Tesla Deliveries Miss Estimates as Competition Heats Up", source: "Reuters", time: "2h ago" },
            { title: "EV Market Share Battle: BYD Overtakes Tesla in Q4", source: "Bloomberg", time: "4h ago" },
            { title: "Analysts Cut TSLA Price Targets After Delivery Miss", source: "CNBC", time: "5h ago" },
          ].map((article, i) => (
            <Card key={i} className="py-3">
              <p className="text-foreground text-sm font-medium leading-snug">{article.title}</p>
              <p className="text-muted-foreground text-xs mt-1">{article.source} · {article.time}</p>
            </Card>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 transition-opacity"
      >
        See What Usually Happens Next →
      </button>
    </div>
  );
};

export default MarketExplanationScreen;
