import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";

function ChartCard({ title, footer, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex-1">{children}</div>
      {footer && <p className="text-xs text-muted-foreground border-t border-border pt-2">{footer}</p>}
    </div>
  );
}

const renderCenterLabel = (totalStaff) => ({ cx, cy }) => (
  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
    <tspan x={cx} dy="-8" fontSize="20" fontWeight="bold" fill="currentColor">{totalStaff}</tspan>
    <tspan x={cx} dy="20" fontSize="11" fill="#94a3b8">Staff</tspan>
  </text>
);

export default function TrainingCharts({ donutData, homeCompletion, monthlyData, totalStaff }) {
  const totalCells = donutData.reduce((s, d) => s + d.value, 0);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const orgAvgPct = homeCompletion.length > 0
    ? Math.round(homeCompletion.reduce((s, h) => s + h.pct, 0) / homeCompletion.length)
    : 0;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Donut */}
      <ChartCard title="Training Completion Status" footer={`Total Staff: ${totalStaff}`}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              labelLine={false}
              label={donutData.length > 0 ? renderCenterLabel(totalStaff) : undefined}
            >
              {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(v, name) => [`${v} (${totalCells ? Math.round(v / totalCells * 100) : 0}%)`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {donutData.map(d => (
            <div key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              {d.name}: {d.value} ({totalCells ? Math.round(d.value / totalCells * 100) : 0}%)
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Bar chart per home */}
      <ChartCard title="Completion % by Home" footer={`Organisation Average: ${orgAvgPct}%`}>
        {homeCompletion.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-xs text-muted-foreground">No home data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={homeCompletion} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={40} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="pct" fill="#3b82f6" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 10, formatter: v => `${v}%` }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Line chart */}
      <ChartCard
        title="Monthly Training Progress"
        footer={`${currentMonth?.label || ""} Completion: ${currentMonth?.completion || 0}%`}
      >
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={v => `${v}%`} />
            <Line type="monotone" dataKey="completion" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Completion %" />
            <Line type="monotone" dataKey="target" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 4" dot={false} name="Target %" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-3 mt-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-4 h-0.5 bg-blue-500 inline-block" /> Completion %
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-4 h-0.5 bg-green-500 inline-block border-dashed border-t-2" /> Target (85%)
          </div>
        </div>
      </ChartCard>
    </div>
  );
}