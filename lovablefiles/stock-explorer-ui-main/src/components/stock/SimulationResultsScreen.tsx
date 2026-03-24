import Card from "./Card";
import StatRow from "./StatRow";
import { ArrowLeft, Target, Lightbulb, Shield } from "lucide-react";

interface SimulationResultsScreenProps {
  ticker: string;
  onBack: () => void;
  onHome: () => void;
}

const SimulationResultsScreen = ({ ticker, onBack, onHome }: SimulationResultsScreenProps) => {
  return (
    <div className="flex flex-col gap-5">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" /> Simulation
        </h1>
        <p className="text-muted-foreground text-sm">Based on 142 similar historical events for {ticker}</p>
      </div>

      {/* Main Stats */}
      <Card glow="green">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Projected Outcomes</h3>
        <StatRow label="Avg return after 5 days" value="+1.8%" valueColor="text-gain" />
        <StatRow label="Avg return after 20 days" value="+4.2%" valueColor="text-gain" />
        <StatRow label="Win rate (5 days)" value="64%" valueColor="text-primary" />
        <StatRow label="Win rate (20 days)" value="71%" valueColor="text-primary" />
      </Card>

      {/* Risk */}
      <Card>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5" /> Risk Assessment
        </h3>
        <StatRow label="Best case (5d)" value="+9.4%" valueColor="text-gain" />
        <StatRow label="Worst case (5d)" value="-7.2%" valueColor="text-loss" />
        <StatRow label="Median outcome" value="+1.3%" valueColor="text-gain" />
        <StatRow label="Std deviation" value="3.8%" />
      </Card>

      {/* Insight */}
      <Card className="border-primary/20">
        <div className="flex gap-3">
          <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            <span className="font-semibold">AI Insight:</span> Historically, {ticker} recovers within a week after similar drops. The probability of a positive return is significantly above average, though volatility remains elevated.
          </p>
        </div>
      </Card>

      <button
        onClick={onHome}
        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 transition-opacity"
      >
        Search Another Stock
      </button>
    </div>
  );
};

export default SimulationResultsScreen;
