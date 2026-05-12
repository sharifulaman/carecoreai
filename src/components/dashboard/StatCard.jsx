import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, trend, color = "primary", onClick }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl border border-border p-5 transition-all hover:shadow-md pointer-events-auto select-none",
        onClick && "cursor-pointer hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className={cn("text-xs mt-2 font-medium", trend.startsWith("+") ? "text-green-500" : "text-red-500")}>
              {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", colorMap[color])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}