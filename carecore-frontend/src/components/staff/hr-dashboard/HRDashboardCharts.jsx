import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

export default function HRDashboardCharts({
  trainingCompletionData,
  homeCompletionData,
  monthlyProgressData,
  roleBreakdownData,
  onHomeClick,
}) {
  return (
    <>
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Training Completion Status Donut */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">Training Completion Status</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={trainingCompletionData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
            >
              {trainingCompletionData?.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 text-xs text-center text-muted-foreground">
          <p className="font-semibold text-foreground text-sm">85% Complete</p>
          <p>Last updated: 21 May 2026, 15:30</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          {trainingCompletionData?.map((d) => (
            <div key={d.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span>{d.name}: {d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Completion by Home */}
      <div className="bg-card rounded-xl border border-border p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold mb-4">Completion by Home</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={homeCompletionData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completion" fill="#10b981" name="% Complete" onClick={(data) => onHomeClick?.(data.name)} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Training Progress */}
      <div className="bg-card rounded-xl border border-border p-4 lg:col-span-2">
        <h3 className="text-sm font-semibold mb-4">Monthly Training Progress</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyProgressData}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <ReferenceLine y={90} stroke="#cbd5e1" strokeDasharray="5 5" label={{ value: "Target 90%", position: "right", offset: 10, fontSize: 11 }} />
            <Line type="monotone" dataKey="completion" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} fill="url(#gradient)" />
            <defs>
              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Staff by Role */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="text-sm font-semibold mb-4">Staff by Role</h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={roleBreakdownData}
              dataKey="count"
              nameKey="role"
              cx="50%"
              cy="50%"
              outerRadius={60}
            >
              {roleBreakdownData?.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-3 space-y-1 text-xs">
          {roleBreakdownData?.map((d) => (
            <div key={d.role} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.role}: {d.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}