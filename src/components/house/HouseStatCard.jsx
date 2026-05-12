import { cn } from "@/lib/utils";

const colors = {
  red: "bg-red-500/10 text-red-500",
  blue: "bg-blue-500/10 text-blue-500",
  amber: "bg-amber-500/10 text-amber-500",
  purple: "bg-purple-500/10 text-purple-500",
  green: "bg-green-500/10 text-green-500",
  orange: "bg-orange-500/10 text-orange-500",
};

export default function HouseStatCard({ title, value, sub, icon: IconComp, color = "blue", onClick, wide }) {
  const Icon = IconComp;
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border transition-shadow p-4 md:p-5",
        wide ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6" : "",
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : ""
      )}
      onClick={onClick}
    >
      {wide ? (
        <>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={cn("w-10 h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0", colors[color])}>
              <Icon className="w-5 md:w-6 h-5 md:h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl md:text-3xl font-bold leading-tight">{value}</p>
            </div>
          </div>
          {sub && <p className="text-xs md:text-sm font-medium text-muted-foreground sm:text-right">{sub}</p>}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs md:text-sm text-muted-foreground font-medium">{title}</p>
            <div className={cn("w-8 md:w-9 h-8 md:h-9 rounded-lg flex items-center justify-center", colors[color])}>
              <Icon className="w-4 md:w-5 h-4 md:h-5" />
            </div>
          </div>
          <p className="text-2xl md:text-3xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}