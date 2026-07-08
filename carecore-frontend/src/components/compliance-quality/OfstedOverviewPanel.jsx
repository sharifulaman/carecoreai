import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = { Completed: "#22c55e", "In Progress": "#f59e0b", Overdue: "#ef4444", Planned: "#a855f7" };

export default function OfstedOverviewPanel({ modules, onModuleClick }) {
  const completed  = modules.filter(m => m.status === "completed").length;
  const inProgress = modules.filter(m => m.status === "in_progress").length;
  const overdue    = modules.filter(m => m.status === "overdue" || m.status === "attention").length;
  const planned    = modules.filter(m => m.status === "planned").length;
  const total      = modules.length;

  const data = [
    { name: "Completed",   value: completed  },
    { name: "In Progress", value: inProgress },
    { name: "Overdue",     value: overdue    },
    { name: "Planned",     value: planned    },
  ].filter(d => d.value > 0);

  const pct = (n) => total ? Math.round((n / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">OFSTED Overview</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Your compliance snapshot</p>
      </div>

      {/* Donut chart */}
      <div className="relative flex items-center justify-center h-40">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              dataKey="value"
              strokeWidth={2}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={COLORS[entry.name] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip formatter={(val, name) => [`${val} (${pct(val)}%)`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-1.5">
        {[
          { label: "Completed",   value: completed,  color: "bg-green-500",  pct: pct(completed)  },
          { label: "In Progress", value: inProgress, color: "bg-amber-400",  pct: pct(inProgress) },
          { label: "Overdue",     value: overdue,    color: "bg-red-500",    pct: pct(overdue)    },
          { label: "Not Started", value: planned,    color: "bg-purple-400", pct: pct(planned)    },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
              <span className="text-muted-foreground">{row.label}</span>
            </div>
            <span className="font-medium text-foreground">{row.value} ({row.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}