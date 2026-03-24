interface StatRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

const StatRow = ({ label, value, valueColor }: StatRowProps) => {
  return (
    <div className="flex justify-between items-center py-3 border-b border-border last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={`font-bold text-sm ${valueColor || "text-foreground"}`}>{value}</span>
    </div>
  );
};

export default StatRow;
