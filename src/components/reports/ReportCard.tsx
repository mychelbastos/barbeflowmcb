import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function ReportCard({ icon: Icon, label, value, change, changeType = "neutral" }: Props) {
  const changeColor = changeType === "positive" ? "text-emerald-500" : changeType === "negative" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
      {change && (
        <span className={`text-xs font-medium ${changeColor}`}>{change}</span>
      )}
    </div>
  );
}
