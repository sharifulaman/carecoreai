import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function PolicyProgressCharts({ assignments = [] }) {
  const deptData = useMemo(() => {
    const depts = {};
    assignments.filter(a => a.acknowledgement_required && !["Exempted", "Cancelled"].includes(a.status)).forEach(a => {
      const dept = a.staff_department || "Unknown";
      if (!depts[dept]) depts[dept] = { dept, Read: 0, Acknowledged: 0, Outstanding: 0, total: 0 };
      depts[dept].total++;
      if (a.viewed_at) depts[dept].Read++;
      if (a.acknowledged_at) depts[dept].Acknowledged++;
      else depts[dept].Outstanding++;
    });
    return Object.values(depts).map(d => ({
      dept: d.dept.slice(0, 14),
      Read: d.total > 0 ? Math.round((d.Read / d.total) * 100) : 0,
      Acknowledged: d.total > 0 ? Math.round((d.Acknowledged / d.total) * 100) : 0,
      Outstanding: d.total > 0 ? Math.round((d.Outstanding / d.total) * 100) : 0,
    }));
  }, [assignments]);

  const roleData = useMemo(() => {
    const roles = {};
    assignments.filter(a => a.acknowledgement_required && !["Exempted", "Cancelled"].includes(a.status)).forEach(a => {
      const role = a.staff_role?.replace(/_/g, " ") || "Unknown";
      if (!roles[role]) roles[role] = { role, Acknowledged: 0, Outstanding: 0, total: 0 };
      roles[role].total++;
      if (a.acknowledged_at) roles[role].Acknowledged++;
      else roles[role].Outstanding++;
    });
    return Object.values(roles).map(r => ({
      role: r.role.slice(0, 20),
      Acknowledged: r.total > 0 ? Math.round((r.Acknowledged / r.total) * 100) : 0,
      Outstanding: r.total > 0 ? Math.round((r.Outstanding / r.total) * 100) : 0,
    }));
  }, [assignments]);

  const empty = <div className="flex items-center justify-center h-32 text-sm text-slate-400">No assignment data yet</div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" />
          Read & Acknowledgement Progress by Department
        </h3>
        {deptData.length === 0 ? empty : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={deptData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 10 }} width={80} />
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Tooltip formatter={v => `${v}%`} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Read" fill="#3b82f6" stackId="a" name="Read" />
              <Bar dataKey="Acknowledged" fill="#22c55e" stackId="b" name="Acknowledged" />
              <Bar dataKey="Outstanding" fill="#ef4444" stackId="c" name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
          Policy Completion by Role
        </h3>
        {roleData.length === 0 ? empty : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={roleData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <YAxis type="category" dataKey="role" tick={{ fontSize: 10 }} width={110} />
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <Tooltip formatter={v => `${v}%`} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Acknowledged" fill="#22c55e" name="Acknowledged" />
              <Bar dataKey="Outstanding" fill="#ef4444" name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}