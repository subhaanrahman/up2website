import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
}

const StatCard = ({ label, value, trend, subtitle }: StatCardProps) => {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="text-2xl font-bold text-foreground"
        style={{
          fontFamily: "'Akira Expanded', sans-serif",
          fontWeight: 900,
          fontStretch: "expanded",
          letterSpacing: "0.05em",
        }}
      >
        {value}
      </span>
      {subtitle && (
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}
          >
            {isPositive ? "+" : ""}
            {trend}%
          </span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
