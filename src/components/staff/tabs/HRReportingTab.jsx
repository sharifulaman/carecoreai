import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { differenceInDays, differenceInMonths, format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Download, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import RTWComplianceReport from "../rtw/RTWComplianceReport";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#10b981", "#6b7280"];

function RAGBadge({ pct }) {
  if (pct >= 80) return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" />{pct}%</span>;
  if (pct >= 60) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{pct}%</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" />{pct}%</span>;
}

function Section({ title, children, onExport }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{title}</h3>
        {onExport && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onExport}>
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function exportCSV(filename, rows, headers) {
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HRReportingTab({ staff = [], homes = [] }) {
  // RTW compliance is rendered inline via RTWComplianceReport component
  const today = new Date();

  const { data: leaveRequests = [] } = useQuery({ queryKey: ["leave-requests"], queryFn: () => secureGateway.filter("LeaveRequest"), staleTime: 60000 });
  const { data: supervisions = [] } = useQuery({ queryKey: ["supervision-records"], queryFn: () => secureGateway.filter("SupervisionRecord"), staleTime: 60000 });
  const { data: appraisals = [] } = useQuery({ queryKey: ["appraisal-records"], queryFn: () => secureGateway.filter("AppraisalRecord"), staleTime: 60000 });
  const { data: training = [] } = useQuery({ queryKey: ["training-records-all"], queryFn: () => secureGateway.filter("TrainingRecord"), staleTime: 60000 });
  const { data: timesheets = [] } = useQuery({ queryKey: ["timesheets"], queryFn: () => secureGateway.filter("Timesheet"), staleTime: 60000 });

  const activeStaff = staff.filter(s => s.status === "active");

  // --- Absence Analytics ---
  const sickByMonth = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = subMonths(today, 11 - i);
      const label = format(m, "MMM yy");
      const monthStr = format(m, "yyyy-MM");
      const days = leaveRequests
        .filter(r => r.leave_type === "sick_leave" && r.status === "approved" && r.date_from?.startsWith(monthStr))
        .reduce((sum, r) => sum + (r.days_requested || 0), 0);
      return { label, days };
    });
  }, [leaveRequests]);

  const absenceByType = useMemo(() => {
    const map = {};
    leaveRequests.filter(r => r.status === "approved").forEach(r => {
      map[r.leave_type] = (map[r.leave_type] || 0) + (r.days_requested || 0);
    });
    return Object.entries(map).map(([type, days], i) => ({
      name: type.replace(/_/g, " "), days, fill: COLORS[i % COLORS.length]
    }));
  }, [leaveRequests]);

  const bradfordScores = useMemo(() => {
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
    return activeStaff.map(s => {
      const sicks = leaveRequests.filter(r => r.staff_id === s.id && r.leave_type === "sick_leave" && r.status === "approved" && new Date(r.date_from) > cutoff);
      const spells = sicks.length;
      const days = sicks.reduce((sum, r) => sum + (r.days_requested || 0), 0);
      return { name: s.full_name, spells, days, score: spells * spells * days };
    }).sort((a, b) => b.score - a.score);
  }, [activeStaff, leaveRequests]);

  // --- Turnover ---
  const leavers12m = staff.filter(s => {
    if (!s.end_date) return false;
    const diff = differenceInDays(today, parseISO(s.end_date));
    return diff >= 0 && diff <= 365;
  });
  const turnoverPct = activeStaff.length ? Math.round((leavers12m.length / (activeStaff.length + leavers12m.length)) * 100) : 0;

  const avgTenure = useMemo(() => {
    const months = activeStaff.filter(s => s.start_date).map(s => differenceInMonths(today, parseISO(s.start_date)));
    return months.length ? Math.round(months.reduce((a, b) => a + b, 0) / months.length) : 0;
  }, [activeStaff]);

  const starterLeaverData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(today, 5 - i);
      const monthStr = format(m, "yyyy-MM");
      const starters = staff.filter(s => s.start_date?.startsWith(monthStr)).length;
      const leavers = staff.filter(s => s.end_date?.startsWith(monthStr)).length;
      return { label: format(m, "MMM"), starters, leavers };
    });
  }, [staff]);

  // --- Compliance ---
  const dbsValidPct = useMemo(() => {
    const withDbs = activeStaff.filter(s => s.dbs_expiry);
    if (!withDbs.length) return 0;
    const valid = withDbs.filter(s => differenceInDays(parseISO(s.dbs_expiry), today) > 0).length;
    return Math.round((valid / withDbs.length) * 100);
  }, [activeStaff]);

  const supervisionPct = useMemo(() => {
    if (!activeStaff.length) return 0;
    const compliant = activeStaff.filter(s => {
      const last = supervisions.filter(r => r.supervisee_id === s.id).sort((a, b) => b.session_date?.localeCompare(a.session_date))[0];
      if (!last) return false;
      return differenceInDays(today, parseISO(last.session_date)) <= 56;
    }).length;
    return Math.round((compliant / activeStaff.length) * 100);
  }, [activeStaff, supervisions]);

  const appraisalPct = useMemo(() => {
    if (!activeStaff.length) return 0;
    const compliant = activeStaff.filter(s => {
      const last = appraisals.filter(r => r.appraisee_id === s.id).sort((a, b) => b.appraisal_date?.localeCompare(a.appraisal_date))[0];
      if (!last) return false;
      return differenceInDays(today, parseISO(last.appraisal_date)) <= 365;
    }).length;
    return Math.round((compliant / activeStaff.length) * 100);
  }, [activeStaff, appraisals]);

  // --- Payroll ---
  const payrollByMonth = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(today, 5 - i);
      const label = format(m, "MMM");
      const monthStr = format(m, "yyyy-MM");
      const total = timesheets.filter(t => t.pay_period_label?.includes(format(m, "MMMM yyyy")))
        .reduce((sum, t) => sum + (t.gross_pay || 0), 0);
      return { label, total };
    });
  }, [timesheets]);

  const payrollByHome = useMemo(() => {
    return homes.map(h => {
      const total = timesheets.filter(t => t.home_id === h.id).reduce((sum, t) => sum + (t.gross_pay || 0), 0);
      return { name: h.name.substring(0, 12), total };
    }).filter(h => h.total > 0);
  }, [homes, timesheets]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Workforce Analytics</h2>
        <p className="text-xs text-muted-foreground">Real-time HR reporting for compliance, absence, turnover and payroll.</p>
      </div>

      {/* Compliance Summary — top level RAG */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "DBS Valid", pct: dbsValidPct, sub: "of staff with valid DBS" },
          { label: "Supervision (8wk)", pct: supervisionPct, sub: "had supervision in 8 weeks" },
          { label: "Appraisal (12mo)", pct: appraisalPct, sub: "had appraisal in 12 months" },
          { label: "Staff Turnover", pct: turnoverPct, sub: "left in last 12 months", invert: true },
        ].map(card => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <RAGBadge pct={card.pct} />
            <p className="text-[10px] text-muted-foreground mt-1.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Absence */}
      <Section title="Sick Days by Month (12 months)"
        onExport={() => exportCSV("sick_days.csv", sickByMonth, ["label", "days"])}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={sickByMonth}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="days" fill="#ef4444" radius={[3,3,0,0]} name="Sick Days" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Absence by Type"
          onExport={() => exportCSV("absence_by_type.csv", absenceByType, ["name", "days"])}>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={absenceByType} dataKey="days" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name }) => name}>
                {absenceByType.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Bradford Factor (top risk)"
          onExport={() => exportCSV("bradford.csv", bradfordScores.slice(0, 10), ["name", "spells", "days", "score"])}>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
            <div className="grid grid-cols-4 text-[10px] text-muted-foreground font-medium px-2">
              <span>Staff</span><span className="text-right">Spells</span><span className="text-right">Days</span><span className="text-right">Score</span>
            </div>
            {bradfordScores.slice(0, 10).map((s, i) => (
              <div key={i} className={`grid grid-cols-4 text-xs px-2 py-1 rounded ${s.score >= 450 ? "bg-red-50 text-red-700" : s.score >= 200 ? "bg-amber-50 text-amber-700" : ""}`}>
                <span className="truncate">{s.name}</span>
                <span className="text-right">{s.spells}</span>
                <span className="text-right">{s.days}</span>
                <span className="text-right font-semibold">{s.score}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Turnover */}
      <Section title="Starters vs Leavers (6 months)"
        onExport={() => exportCSV("turnover.csv", starterLeaverData, ["label", "starters", "leavers"])}>
        <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
          <span>Avg tenure: <strong className="text-foreground">{avgTenure} months</strong></span>
          <span>Leavers (12m): <strong className="text-foreground">{leavers12m.length}</strong></span>
          <span>Turnover rate: <strong className="text-foreground">{turnoverPct}%</strong></span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={starterLeaverData}>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="starters" fill="#10b981" radius={[3,3,0,0]} name="Starters" />
            <Bar dataKey="leavers" fill="#ef4444" radius={[3,3,0,0]} name="Leavers" />
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* RTW Compliance Report */}
      <RTWComplianceReport staff={staff} />

      {/* Payroll */}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Total Wage Cost by Month"
          onExport={() => exportCSV("payroll_trend.csv", payrollByMonth, ["label", "total"])}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={payrollByMonth}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `£${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Gross Pay" />
            </LineChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Payroll Cost by Home"
          onExport={() => exportCSV("payroll_by_home.csv", payrollByHome, ["name", "total"])}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={payrollByHome} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={v => `£${v.toFixed(2)}`} />
              <Bar dataKey="total" fill="#8b5cf6" radius={[0,3,3,0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>
    </div>
  );
}