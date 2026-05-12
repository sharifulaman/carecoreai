import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";

const PT_COLORS = {
  "18_plus": "#3B82F6", "18plus_accommodation": "#3B82F6",
  "24_hours": "#8B5CF6", "24hours_housing": "#8B5CF6",
  "care": "#10B981", "care_services": "#10B981",
  "outreach": "#F59E0B",
};

const ROLE_COLORS = {
  admin: "#1e3a5f",
  team_leader: "#3B82F6",
  support_worker: "#93c5fd",
};

const ROLE_LABELS = {
  admin: "Admin",
  team_leader: "Team Leader",
  support_worker: "Support Worker",
};

export default function StaffCapacitySection({ homes, residents, staffProfiles }) {
  const navigate = useNavigate();

  // 5A — Capacity bar chart
  const capacityData = useMemo(() => {
    return [...homes]
      .map(home => {
        const count = residents.filter(r => r.home_id === home.id && r.status === "active").length;
        return { id: home.id, name: home.name.split(" ")[0], fullName: home.name, count, property_type: home.property_type };
      })
      .sort((a, b) => b.count - a.count);
  }, [homes, residents]);

  // 5B — Staff donut
  const staffData = useMemo(() => {
    const active = staffProfiles.filter(s => s.status !== "inactive" && s.status !== "archived");
    const grouped = {};
    active.forEach(s => { grouped[s.role] = (grouped[s.role] || 0) + 1; });
    return Object.entries(grouped).map(([role, count]) => ({ name: ROLE_LABELS[role] || role, value: count, role }));
  }, [staffProfiles]);

  const totalStaff = staffData.reduce((s, d) => s + d.value, 0);

  const CapacityTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-popover border border-border rounded-lg shadow p-2 text-xs">
        <p className="font-semibold">{d?.fullName}</p>
        <p>{d?.count} residents</p>
      </div>
    );
  };

  const StaffTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow p-2 text-xs">
        <p className="font-semibold">{payload[0]?.name}</p>
        <p>{payload[0]?.value} staff</p>
      </div>
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Staff & Capacity</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 5A — Capacity (65%) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium mb-3">Resident Capacity by Home</p>
          {capacityData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No homes with residents.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, capacityData.length * 36)}>
              <BarChart data={capacityData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                <Tooltip content={<CapacityTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Residents" onClick={d => navigate(`/homes/${d.id}`)}>
                  {capacityData.map((entry, i) => (
                    <Cell key={i} fill={PT_COLORS[entry.property_type] || "#3B82F6"} style={{ cursor: "pointer" }} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Property type legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-border">
            {[
              { pt: "18_plus", color: "#3B82F6", label: "18+" },
              { pt: "24_hours", color: "#8B5CF6", label: "24 hrs" },
              { pt: "care", color: "#10B981", label: "Care" },
              { pt: "outreach", color: "#F59E0B", label: "Outreach" },
            ].map(({ pt, color, label }) => (
              <span key={pt} className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 5B — Staff donut (35%) */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center">
          <p className="text-sm font-medium mb-3 self-start">Staff by Role</p>
          {totalStaff === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No staff profiles found.</p>
          ) : (
            <>
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={staffData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" stroke="none">
                      {staffData.map((entry, i) => (
                        <Cell key={i} fill={ROLE_COLORS[entry.role] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<StaffTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-xl font-bold">{totalStaff}</p>
                  <p className="text-xs text-muted-foreground">Staff</p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 self-stretch">
                {staffData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ROLE_COLORS[staffData[i]?.role] || "#94a3b8" }} />
                      {d.name}
                    </span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}