import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { format, subMonths, startOfMonth, parseISO, isValid } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle2,
  BookOpen, Shield, FileText, ArrowUpRight, ExternalLink, Filter
} from "lucide-react";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const MANAGEMENT_ROLES = new Set(["admin", "rsm", "regional_manager", "team_manager", "team_leader", "risk_manager", "risk_officer"]);

function KPICard({ label, value, icon: IconComp, color = "text-foreground", border = "border-border", sub }) {
  return (
    <div className={`bg-card border ${border} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-1">
        {IconComp && <IconComp className={`w-4 h-4 ${color}`} />}
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function OutcomeImpactDashboard() {
  const { user, staffProfile } = useOutletContext();
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isSenior = MANAGEMENT_ROLES.has(staffRole);

  // Filters
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterHome, setFilterHome] = useState("all");
  const [filterResident, setFilterResident] = useState("all");
  const [filterRecordType, setFilterRecordType] = useState("all");
  const [filterRiskChange, setFilterRiskChange] = useState("all");
  const [filterReviewStatus, setFilterReviewStatus] = useState("all");
  const [filterStaff, setFilterStaff] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  // Data queries
  const { data: homes = [] } = useQuery({ queryKey: ["oid-homes"], queryFn: () => secureGateway.filter("Home", { status: "active" }) });
  const { data: residents = [] } = useQuery({ queryKey: ["oid-residents"], queryFn: () => secureGateway.filter("Resident", {}, "-created_date", 500) });
  const { data: staff = [] } = useQuery({ queryKey: ["oid-staff"], queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }) });
  const { data: outcomes = [] } = useQuery({ queryKey: ["oid-outcomes"], queryFn: () => secureGateway.filter("RecordImpactOutcome", {}, "-created_date", 500) });
  const { data: complaints = [] } = useQuery({ queryKey: ["oid-complaints"], queryFn: () => base44.entities.Complaint.filter({}, "-received_datetime", 500) });
  const { data: ilsSessions = [] } = useQuery({ queryKey: ["oid-ils"], queryFn: () => secureGateway.filter("ILSSessionLog", {}, "-session_date", 500) });
  const { data: appointments = [] } = useQuery({ queryKey: ["oid-apts"], queryFn: () => base44.entities.Appointment.filter({}, "-start_datetime", 500) });
  const { data: supportPlans = [] } = useQuery({ queryKey: ["oid-sp"], queryFn: () => secureGateway.filter("SupportPlan", {}, "-created_date", 300) });
  const { data: riskAssessments = [] } = useQuery({ queryKey: ["oid-ra"], queryFn: () => secureGateway.filter("RiskAssessment", {}, "-created_date", 300) });
  const { data: ofstedNotifications = [] } = useQuery({ queryKey: ["oid-ofsted"], queryFn: () => base44.entities.OfstedNotification.filter({ status: "pending" }) });

  const today = new Date().toISOString().split("T")[0];
  const thisMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // Role-based filtering of outcomes
  const permittedHomeIds = useMemo(() => {
    if (isSenior) return new Set(homes.map(h => h.id));
    return new Set((staffProfile?.home_ids || [staffProfile?.primary_home_id]).filter(Boolean));
  }, [isSenior, homes, staffProfile]);

  const filteredOutcomes = useMemo(() => {
    let r = outcomes.filter(o => {
      if (!isSenior && !permittedHomeIds.has(o.home_id)) return false;
      const d = o.created_date?.split("T")[0] || "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (filterHome !== "all" && o.home_id !== filterHome) return false;
      if (filterResident !== "all" && o.resident_id !== filterResident) return false;
      if (filterRecordType !== "all" && o.record_type !== filterRecordType) return false;
      if (filterRiskChange !== "all" && o.risk_change !== filterRiskChange) return false;
      if (filterReviewStatus !== "all" && o.manager_review_status !== filterReviewStatus) return false;
      if (filterStaff !== "all" && o.responsible_person_id !== filterStaff) return false;
      if (overdueOnly && !(o.follow_up_required && o.target_date && o.target_date < today && !o.completion_date)) return false;
      if (escalatedOnly && o.manager_review_status !== "escalated") return false;
      return true;
    });
    return r;
  }, [outcomes, isSenior, permittedHomeIds, dateFrom, dateTo, filterHome, filterResident, filterRecordType, filterRiskChange, filterReviewStatus, filterStaff, overdueOnly, escalatedOnly, today]);

  // KPI calculations
  const kpis = useMemo(() => {
    const awaitingReview = filteredOutcomes.filter(o => o.manager_review_status === "pending").length;
    const openFollowUp = filteredOutcomes.filter(o => o.follow_up_required && !o.completion_date).length;
    const overdueFollowUp = filteredOutcomes.filter(o => o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today).length;
    const riskIncreased = filteredOutcomes.filter(o => o.risk_change === "increased").length;
    const riskReduced = filteredOutcomes.filter(o => o.risk_change === "reduced").length;
    const ilsThisMonth = ilsSessions.filter(s => s.session_date >= thisMonthStart).length;
    const missedApts = appointments.filter(a => a.attendance_status === "missed" && a.follow_up_required).length;
    const reg27Pending = ofstedNotifications.length;
    const complaintLearning = complaints.filter(c => ["upheld", "partially_upheld"].includes(c.outcome_complaint_outcome) && c.outcome_follow_up_required && !["closed", "resolved"].includes(c.status)).length;
    const spUpdateRequired = filteredOutcomes.filter(o => o.support_plan_updated === "no").length;
    const raUpdateRequired = filteredOutcomes.filter(o => o.risk_assessment_updated === "no").length;

    return { awaitingReview, openFollowUp, overdueFollowUp, riskIncreased, riskReduced, ilsThisMonth, missedApts, reg27Pending, complaintLearning, spUpdateRequired, raUpdateRequired };
  }, [filteredOutcomes, ilsSessions, appointments, ofstedNotifications, complaints, today, thisMonthStart]);

  // Chart: Risk change trend by month (last 6 months)
  const riskTrendData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      const monthOutcomes = outcomes.filter(o => (o.created_date || "").startsWith(key));
      months.push({
        month: label,
        increased: monthOutcomes.filter(o => o.risk_change === "increased").length,
        reduced: monthOutcomes.filter(o => o.risk_change === "reduced").length,
        unchanged: monthOutcomes.filter(o => o.risk_change === "unchanged").length,
      });
    }
    return months;
  }, [outcomes]);

  // Chart: Follow-up actions by status
  const followUpStatusData = useMemo(() => {
    const open = filteredOutcomes.filter(o => o.follow_up_required && !o.completion_date && (!o.target_date || o.target_date >= today)).length;
    const overdue = filteredOutcomes.filter(o => o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today).length;
    const completed = filteredOutcomes.filter(o => o.follow_up_required && o.completion_date).length;
    const notRequired = filteredOutcomes.filter(o => !o.follow_up_required).length;
    return [
      { name: "Open", value: open },
      { name: "Overdue", value: overdue },
      { name: "Completed", value: completed },
      { name: "Not required", value: notRequired },
    ].filter(d => d.value > 0);
  }, [filteredOutcomes, today]);

  // Chart: Record outcomes by module
  const outcomesByModule = useMemo(() => {
    const counts = {};
    filteredOutcomes.forEach(o => {
      const key = (o.record_type || "other").replace(/_/g, " ");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredOutcomes]);

  // Chart: ILS progress by skill area
  const ilsBySkill = useMemo(() => {
    const counts = {};
    ilsSessions.filter(s => s.session_date >= thisMonthStart).forEach(s => {
      const key = (s.skill_area || "other").replace(/_/g, " ");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([area, sessions]) => ({ area, sessions })).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  }, [ilsSessions, thisMonthStart]);

  // Table rows
  const tableRows = useMemo(() => {
    return filteredOutcomes
      .sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""))
      .slice(0, 50);
  }, [filteredOutcomes]);

  const residentMap = useMemo(() => Object.fromEntries(residents.map(r => [r.id, r])), [residents]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Outcome &amp; Impact Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-module outcome evidence, follow-up actions, risk changes and learning</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
          <span className="text-xs text-muted-foreground self-center">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />

          <Select value={filterHome} onValueChange={setFilterHome}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All homes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All YPs" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All young people</SelectItem>
              {residents.filter(r => r.status === "active").map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterRecordType} onValueChange={setFilterRecordType}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All record types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All record types</SelectItem>
              {["incident","missing_episode","appointment","ils_session","key_work_session","complaint","safeguarding_concern","risk_assessment"].map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g," ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRiskChange} onValueChange={setFilterRiskChange}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Risk change" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any risk change</SelectItem>
              <SelectItem value="increased">Increased</SelectItem>
              <SelectItem value="reduced">Reduced</SelectItem>
              <SelectItem value="unchanged">Unchanged</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterReviewStatus} onValueChange={setFilterReviewStatus}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Review status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>

          {isSenior && (
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Button
            variant={overdueOnly ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setOverdueOnly(v => !v)}
          >
            {overdueOnly ? "✓ " : ""}Overdue only
          </Button>
          <Button
            variant={escalatedOnly ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setEscalatedOnly(v => !v)}
          >
            {escalatedOnly ? "✓ " : ""}Escalated only
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <SectionHeader title="KPI Summary" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <KPICard label="Awaiting outcome review" value={kpis.awaitingReview} icon={Clock} color={kpis.awaitingReview > 0 ? "text-amber-600" : "text-foreground"} border={kpis.awaitingReview > 0 ? "border-amber-300" : "border-border"} />
          <KPICard label="Open follow-up actions" value={kpis.openFollowUp} icon={CheckCircle2} color={kpis.openFollowUp > 0 ? "text-blue-600" : "text-foreground"} border={kpis.openFollowUp > 0 ? "border-blue-300" : "border-border"} />
          <KPICard label="Overdue follow-ups" value={kpis.overdueFollowUp} icon={AlertTriangle} color={kpis.overdueFollowUp > 0 ? "text-red-600" : "text-foreground"} border={kpis.overdueFollowUp > 0 ? "border-red-400" : "border-border"} />
          <KPICard label="Risk increased" value={kpis.riskIncreased} icon={TrendingUp} color={kpis.riskIncreased > 0 ? "text-red-600" : "text-foreground"} border={kpis.riskIncreased > 0 ? "border-red-300" : "border-border"} />
          <KPICard label="Risk reduced" value={kpis.riskReduced} icon={TrendingDown} color={kpis.riskReduced > 0 ? "text-green-600" : "text-foreground"} border={kpis.riskReduced > 0 ? "border-green-300" : "border-border"} />
          <KPICard label="ILS sessions (month)" value={kpis.ilsThisMonth} icon={BookOpen} />
          <KPICard label="Missed apts needing follow-up" value={kpis.missedApts} icon={AlertTriangle} color={kpis.missedApts > 0 ? "text-amber-600" : "text-foreground"} border={kpis.missedApts > 0 ? "border-amber-300" : "border-border"} />
          <KPICard label="Reg 27 decision pending" value={kpis.reg27Pending} icon={Shield} color={kpis.reg27Pending > 0 ? "text-red-600" : "text-foreground"} border={kpis.reg27Pending > 0 ? "border-red-400" : "border-border"} sub={kpis.reg27Pending > 0 ? "Urgent" : undefined} />
          <KPICard label="Complaint learning open" value={kpis.complaintLearning} icon={BookOpen} color={kpis.complaintLearning > 0 ? "text-orange-600" : "text-foreground"} border={kpis.complaintLearning > 0 ? "border-orange-300" : "border-border"} />
          <KPICard label="Support plan updates required" value={kpis.spUpdateRequired} icon={FileText} color={kpis.spUpdateRequired > 0 ? "text-amber-600" : "text-foreground"} />
          <KPICard label="Risk assessment updates required" value={kpis.raUpdateRequired} icon={Shield} color={kpis.raUpdateRequired > 0 ? "text-amber-600" : "text-foreground"} />
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Risk change trend */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Risk change trend (6 months)" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={riskTrendData}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="increased" stroke="#ef4444" strokeWidth={2} name="Increased" dot={false} />
              <Line type="monotone" dataKey="reduced" stroke="#22c55e" strokeWidth={2} name="Reduced" dot={false} />
              <Line type="monotone" dataKey="unchanged" stroke="#94a3b8" strokeWidth={1} name="Unchanged" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Follow-up by status */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Follow-up actions by status" />
          {followUpStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No follow-up data in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={followUpStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                  {followUpStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Outcomes by module */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="Record outcomes by module" />
          {outcomesByModule.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No outcome records in range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={outcomesByModule} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Records" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ILS by skill area */}
        <div className="bg-card border border-border rounded-xl p-4">
          <SectionHeader title="ILS progress by skill area (this month)" />
          {ilsBySkill.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No ILS sessions this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ilsBySkill} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={120} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#22c55e" name="Sessions" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Outcome Records</h2>
          <span className="text-xs text-muted-foreground">{filteredOutcomes.length} records (showing up to 50)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-4 py-2 text-xs font-semibold">Date</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Record type</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Young person</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Home</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Immediate outcome</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Risk change</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Follow-up</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Responsible</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Target date</th>
                <th className="text-left px-4 py-2 text-xs font-semibold">Manager review</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">No outcome records match the current filters.</td></tr>
              ) : tableRows.map(o => {
                const isOverdue = o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today;
                return (
                  <tr key={o.id} className={`border-b border-border/50 last:border-0 hover:bg-muted/20 ${isOverdue ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2 text-xs">{o.created_date ? format(new Date(o.created_date), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-2 text-xs capitalize">{(o.record_type || "—").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-xs font-medium">{o.resident_name || residentMap[o.resident_id]?.display_name || "—"}</td>
                    <td className="px-4 py-2 text-xs">{o.home_name || homeMap[o.home_id]?.name || "—"}</td>
                    <td className="px-4 py-2 text-xs max-w-[160px] truncate" title={o.immediate_outcome}>{o.immediate_outcome || "—"}</td>
                    <td className="px-4 py-2">
                      {o.risk_change && o.risk_change !== "not_applicable" ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          o.risk_change === "increased" ? "bg-red-100 text-red-700" :
                          o.risk_change === "reduced" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{o.risk_change}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      {o.follow_up_required ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isOverdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {isOverdue ? "⚠ Overdue" : "Pending"}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">No</span>}
                    </td>
                    <td className="px-4 py-2 text-xs">{o.responsible_person_name || "—"}</td>
                    <td className="px-4 py-2 text-xs">{o.target_date || "—"}</td>
                    <td className="px-4 py-2">
                      {o.manager_review_status ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${
                          o.manager_review_status === "approved" ? "bg-green-100 text-green-700" :
                          o.manager_review_status === "escalated" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>{o.manager_review_status.replace(/_/g, " ")}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: "Residents", path: "/residents" },
          { label: "Compliance Hub", path: "/compliance-hub" },
          { label: "Audit Trail", path: "/audit-trail" },
          { label: "Analytics", path: "/analytics" },
        ].map(l => (
          <a key={l.path} href={l.path} className="flex items-center gap-1 text-primary hover:underline">
            <ArrowUpRight className="w-3 h-3" />{l.label}
          </a>
        ))}
      </div>
    </div>
  );
}