import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, endOfMonth, isAfter, isBefore, differenceInDays, isToday } from "date-fns";
import {
  Download, Wrench, Search, Home, Users, BedDouble, TrendingUp,
  PoundSterling, AlertTriangle, Eye, ChevronRight, Info, X, FileText
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => `£${Math.round(n || 0).toLocaleString()}`;
const today = new Date();

function daysOverdueLabel(dueDateStr) {
  if (!dueDateStr) return "—";
  const due = new Date(dueDateStr);
  if (isToday(due)) return { label: "Today", cls: "text-amber-600 font-semibold" };
  if (isBefore(due, today)) {
    const d = differenceInDays(today, due);
    return { label: `Overdue ${d} day${d !== 1 ? "s" : ""}`, cls: "text-red-600 font-semibold" };
  }
  const d = differenceInDays(due, today);
  return { label: `In ${d} day${d !== 1 ? "s" : ""}`, cls: "text-green-600" };
}

function occStatus(rate, isOutreach) {
  if (isOutreach) return { label: "Outreach", cls: "bg-blue-100 text-blue-700" };
  if (rate >= 100) return { label: "Full", cls: "bg-purple-100 text-purple-700" };
  if (rate >= 75) return { label: "High", cls: "bg-green-100 text-green-700" };
  if (rate >= 50) return { label: "Moderate", cls: "bg-amber-100 text-amber-700" };
  return { label: "Low", cls: "bg-red-100 text-red-700" };
}

const PRIORITY_CFG = {
  urgent: { label: "Critical", cls: "bg-red-100 text-red-700", order: 0 },
  critical: { label: "Critical", cls: "bg-red-100 text-red-700", order: 0 },
  high: { label: "High", cls: "bg-orange-100 text-orange-700", order: 1 },
  medium: { label: "Medium", cls: "bg-yellow-100 text-yellow-700", order: 2 },
  low: { label: "Low", cls: "bg-green-100 text-green-700", order: 3 },
};
const STATUS_CFG = {
  reported: { label: "Open", cls: "bg-slate-100 text-slate-600" },
  assigned: { label: "Assigned", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In Progress", cls: "bg-teal-100 text-teal-700" },
  awaiting_contractor: { label: "Waiting Contractor", cls: "bg-purple-100 text-purple-700" },
  awaiting_parts: { label: "Waiting Parts", cls: "bg-amber-100 text-amber-700" },
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color, trend, onClick }) {
  const colors = {
    blue:   { bg: "bg-blue-50",   border: "border-blue-100",   icon: "text-blue-400",   val: "text-blue-800" },
    green:  { bg: "bg-green-50",  border: "border-green-100",  icon: "text-green-400",  val: "text-green-800" },
    teal:   { bg: "bg-teal-50",   border: "border-teal-100",   icon: "text-teal-400",   val: "text-teal-800" },
    purple: { bg: "bg-purple-50", border: "border-purple-100", icon: "text-purple-400", val: "text-purple-800" },
    red:    { bg: "bg-red-50",    border: "border-red-100",    icon: "text-red-400",    val: "text-red-800" },
    amber:  { bg: "bg-amber-50",  border: "border-amber-100",  icon: "text-amber-400",  val: "text-amber-800" },
    orange: { bg: "bg-orange-50", border: "border-orange-100", icon: "text-orange-400", val: "text-orange-800" },
  };
  const c = colors[color] || colors.blue;
  return (
    <button onClick={onClick} className={`${c.bg} ${c.border} border rounded-2xl p-4 text-left hover:shadow-md transition-all w-full`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${c.val} leading-none`}>{value}</div>
      <div className="text-[11px] font-semibold text-slate-500 mt-1">{label}</div>
      <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>
      {trend && <div className={`text-[10px] font-semibold mt-2 ${trend.up ? "text-green-600" : "text-red-500"}`}>{trend.up ? "↑" : "↓"} {trend.label}</div>}
    </button>
  );
}

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ onClose, onExport }) {
  const [checks, setChecks] = useState({ kpi: true, occupancy: true, finance: true, maintenance: true, filters: true });
  const [format2, setFormat2] = useState("csv");
  const toggle = (k) => setChecks(c => ({ ...c, [k]: !c[k] }));
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Export Data</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="space-y-2 mb-4">
          {[["kpi","KPI Summary"],["occupancy","Occupancy Table"],["finance","Financial Snapshot"],["maintenance","Maintenance Issues"],["filters","Include Filter Summary"]].map(([k,l]) => (
            <label key={k} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={checks[k]} onChange={() => toggle(k)} className="rounded" />
              {l}
            </label>
          ))}
        </div>
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Format</p>
          <div className="flex gap-2">
            {["csv","excel","pdf"].map(f => (
              <button key={f} onClick={() => setFormat2(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${format2 === f ? "bg-teal-600 text-white border-teal-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onExport(checks, format2)} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function OccupancyFinanceTab({ homes, staffProfile }) {
  const navigate = useNavigate();

  // Filters
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterOcc, setFilterOcc] = useState("");
  const [filterBillStatus, setFilterBillStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(today), "yyyy-MM-dd"));
  const [showExport, setShowExport] = useState(false);

  const isFinanceAllowed = ["admin", "admin_officer", "team_leader"].includes(staffProfile?.role);

  // Data
  const { data: residents = [] } = useQuery({ queryKey: ["occ-residents"], queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: bills = [] } = useQuery({ queryKey: ["occ-bills"], queryFn: () => secureGateway.filter("Bill"), staleTime: 3 * 60 * 1000 });
  const { data: maintenance = [] } = useQuery({ queryKey: ["occ-maintenance"], queryFn: () => base44.entities.PropertyMaintenance.filter({}, "-reported_at", 200), staleTime: 60 * 1000 });

  // Filtered homes
  const visibleHomes = useMemo(() => {
    let h = homes;
    if (filterHome) h = h.filter(x => x.id === filterHome);
    if (filterType) h = h.filter(x => (x.type || "").includes(filterType));
    if (search) h = h.filter(x => (x.name || "").toLowerCase().includes(search.toLowerCase()));
    return h;
  }, [homes, filterHome, filterType, search]);

  const homeIds = useMemo(() => new Set(visibleHomes.map(h => h.id)), [visibleHomes]);

  // Occupancy
  const residentsByHome = useMemo(() => residents.reduce((acc, r) => {
    if (r.home_id && homeIds.has(r.home_id)) acc[r.home_id] = (acc[r.home_id] || 0) + 1;
    return acc;
  }, {}), [residents, homeIds]);

  const homeRows = useMemo(() => {
    return visibleHomes.map(h => {
      const isOutreach = (h.type || "").includes("outreach");
      const cap = isOutreach ? 0 : (h.capacity || h.bed_spaces || 0);
      const occ = residentsByHome[h.id] || 0;
      const avail = Math.max(0, cap - occ);
      const rate = cap > 0 ? Math.round((occ / cap) * 100) : 0;
      const status = occStatus(rate, isOutreach);
      return { ...h, isOutreach, cap, occ, avail, rate, status };
    }).filter(h => {
      if (!filterOcc) return true;
      if (filterOcc === "outreach") return h.isOutreach;
      if (filterOcc === "full") return h.rate >= 100;
      if (filterOcc === "high") return h.rate >= 75 && h.rate < 100;
      if (filterOcc === "moderate") return h.rate >= 50 && h.rate < 75;
      if (filterOcc === "low") return h.rate < 50 && !h.isOutreach;
      if (filterOcc === "available") return h.avail > 0;
      return true;
    }).sort((a, b) => {
      if (a.isOutreach !== b.isOutreach) return a.isOutreach ? 1 : -1;
      return b.rate - a.rate;
    });
  }, [visibleHomes, residentsByHome, filterOcc]);

  const totalCap = homeRows.filter(h => !h.isOutreach).reduce((s, h) => s + h.cap, 0);
  const totalOcc = homeRows.filter(h => !h.isOutreach).reduce((s, h) => s + h.occ, 0);
  const totalAvail = Math.max(0, totalCap - totalOcc);
  const occRate = totalCap > 0 ? ((totalOcc / totalCap) * 100).toFixed(1) : "0.0";

  // Bills
  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo + "T23:59:59");

  const filteredBills = useMemo(() => bills.filter(b => {
    if (!homeIds.has(b.home_id)) return false;
    const due = b.due_date ? new Date(b.due_date) : null;
    if (due && (isBefore(due, fromDate) || isAfter(due, toDate))) return false;
    if (filterBillStatus && filterBillStatus !== "all") {
      if (filterBillStatus === "paid" && b.status !== "paid") return false;
      if (filterBillStatus === "pending" && b.status !== "pending") return false;
      if (filterBillStatus === "overdue" && !(b.status !== "paid" && due && isBefore(due, today))) return false;
      if (filterBillStatus === "due_soon" && !(b.status !== "paid" && due && isAfter(due, today) && differenceInDays(due, today) <= 30)) return false;
    }
    return true;
  }), [bills, homeIds, fromDate, toDate, filterBillStatus]);

  const unpaidBills = filteredBills.filter(b => b.status !== "paid");
  const overdueBills = unpaidBills.filter(b => b.due_date && isBefore(new Date(b.due_date), today));
  const dueSoonBills = unpaidBills.filter(b => b.due_date && isAfter(new Date(b.due_date), today) && differenceInDays(new Date(b.due_date), today) <= 30);
  const dueLaterBills = unpaidBills.filter(b => b.due_date && differenceInDays(new Date(b.due_date), today) > 30);

  const sumBills = (arr) => arr.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const totalOutstanding = sumBills(unpaidBills);
  const totalOverdue = sumBills(overdueBills);
  const totalDueSoon = sumBills(dueSoonBills);
  const totalDueLater = sumBills(dueLaterBills);
  const totalPaid = sumBills(filteredBills.filter(b => b.status === "paid"));
  const totalPending = sumBills(filteredBills.filter(b => b.status === "pending" || !b.status));

  const monthlyCost = sumBills(filteredBills.filter(b => b.status !== "cancelled"));

  // Top cost homes
  const topCostHomes = useMemo(() => {
    const byHome = {};
    filteredBills.filter(b => b.status !== "paid").forEach(b => {
      if (b.home_id) byHome[b.home_id] = (byHome[b.home_id] || 0) + (parseFloat(b.amount) || 0);
    });
    return Object.entries(byHome).map(([hid, amt]) => ({ home: homes.find(h => h.id === hid), amt })).filter(x => x.home).sort((a, b) => b.amt - a.amt).slice(0, 5);
  }, [filteredBills, homes]);

  // Donut chart
  const donutData = [
    { name: "Paid", value: Math.round(totalPaid), color: "#22c55e" },
    { name: "Pending", value: Math.round(totalPending), color: "#f59e0b" },
    { name: "Overdue", value: Math.round(totalOverdue), color: "#ef4444" },
    { name: "Due Later", value: Math.round(totalDueLater), color: "#3b82f6" },
  ].filter(d => d.value > 0);

  // Maintenance
  const urgentMaint = useMemo(() => {
    return maintenance.filter(m => {
      if (!homeIds.has(m.home_id)) return false;
      if (["completed", "closed", "cancelled"].includes(m.status)) return false;
      if (filterPriority && m.priority !== filterPriority) return false;
      return true;
    }).sort((a, b) => {
      const pa = PRIORITY_CFG[a.priority]?.order ?? 5;
      const pb = PRIORITY_CFG[b.priority]?.order ?? 5;
      if (pa !== pb) return pa - pb;
      const da = a.due_at ? new Date(a.due_at) : new Date("2099-01-01");
      const db = b.due_at ? new Date(b.due_at) : new Date("2099-01-01");
      return da - db;
    }).slice(0, 10);
  }, [maintenance, homeIds, filterPriority]);

  const urgentCount = useMemo(() => maintenance.filter(m => homeIds.has(m.home_id) && !["completed", "closed", "cancelled"].includes(m.status) && ["urgent", "critical", "high"].includes(m.priority)).length, [maintenance, homeIds]);

  // Export
  const handleExport = (checks, fmt2) => {
    const rows = [];
    if (checks.filters) {
      rows.push(["Filter Summary"]);
      rows.push(["Date From", dateFrom, "Date To", dateTo]);
      rows.push([]);
    }
    if (checks.kpi) {
      rows.push(["KPI Summary"]);
      rows.push(["Total Capacity", totalCap, "Occupied Beds", totalOcc, "Available Beds", totalAvail, "Occupancy Rate", `${occRate}%`]);
      rows.push([]);
    }
    if (checks.occupancy) {
      rows.push(["Occupancy & Home Performance"]);
      rows.push(["Home", "Type", "Capacity", "Occupied", "Available", "Rate", "Status"]);
      homeRows.forEach(h => rows.push([h.name, h.type || "", h.cap || "—", h.occ, h.isOutreach ? "—" : h.avail, h.isOutreach ? "Outreach" : `${h.rate}%`, h.status.label]));
      rows.push([]);
    }
    if (checks.maintenance) {
      rows.push(["Top 10 Urgent Maintenance Issues"]);
      rows.push(["Priority", "Issue Title", "Home", "Category", "Reported On", "Due Date", "Status", "Assigned To"]);
      urgentMaint.forEach(m => rows.push([m.priority, m.issue_title, m.home_name || "", m.category || "", m.reported_at ? format(new Date(m.reported_at), "dd MMM yyyy") : "", m.due_at ? format(new Date(m.due_at), "dd MMM yyyy") : "", m.status, m.assigned_to_name || ""]));
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carecore-occupancy-finance-maintenance-summary-${format(today, "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Export generated successfully.");
    setShowExport(false);
  };

  return (
    <div className="p-4 space-y-4 bg-slate-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Occupancy, Finance &amp; Maintenance Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track bed occupancy, outstanding bills, home costs and urgent maintenance risks.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowExport(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
            <Download className="w-3.5 h-3.5" /> Export Data
          </button>
          <button onClick={() => navigate("/care")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 shadow-sm">
            <Wrench className="w-3.5 h-3.5" /> View Maintenance Module
          </button>
        </div>
      </div>

      {/* ── Filter Row ── */}
      <div className="flex flex-wrap gap-2 items-center bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 min-w-[150px]">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search home..." className="text-xs text-slate-600 focus:outline-none bg-transparent w-full" />
        </div>
        <select value={filterHome} onChange={e => setFilterHome(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
          <option value="">All Homes</option>
          {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
          <option value="">All Types</option>
          {[["outreach","Outreach"],["18_plus","18 Plus"],["24_hours","24 Hours"],["care","Care"],["supported","Supported Accommodation"]].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs text-slate-600 bg-transparent focus:outline-none w-[110px]" />
          <span className="text-slate-400 text-xs">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs text-slate-600 bg-transparent focus:outline-none w-[110px]" />
        </div>
        <select value={filterOcc} onChange={e => setFilterOcc(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
          <option value="">All Occupancy</option>
          {[["full","Full"],["high","High Occupancy"],["moderate","Moderate"],["low","Low Occupancy"],["available","Available Beds"],["outreach","Outreach / Non-bed"]].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterBillStatus} onChange={e => setFilterBillStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
          <option value="">All Bill Status</option>
          {[["paid","Paid"],["pending","Pending"],["overdue","Overdue"],["due_soon","Due Soon"],["due_later","Due Later"]].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 focus:outline-none">
          <option value="">All Priority</option>
          {[["critical","Critical"],["high","High"],["medium","Medium"],["low","Low"]].map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <KPICard icon={Home} label="Total Capacity" value={totalCap} sub="Across permitted homes" color="blue" />
        <KPICard icon={Users} label="Occupied Beds" value={totalOcc} sub="Currently placed" color="green" />
        <KPICard icon={BedDouble} label="Available Beds" value={totalAvail} sub="Placement capacity" color="teal" />
        <KPICard icon={TrendingUp} label="Occupancy Rate" value={`${occRate}%`} sub="Live utilisation" color="purple" />
        {isFinanceAllowed ? (
          <KPICard icon={PoundSterling} label="Outstanding Bills" value={fmt(totalOutstanding)} sub="Pending / unpaid" color="red" />
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center text-xs text-slate-400 font-semibold">Restricted</div>
        )}
        {isFinanceAllowed ? (
          <KPICard icon={PoundSterling} label="Monthly Cost" value={fmt(monthlyCost)} sub="Current month" color="amber" />
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-center text-xs text-slate-400 font-semibold">Restricted</div>
        )}
        <KPICard icon={AlertTriangle} label="Urgent Maintenance" value={urgentCount} sub="High priority open" color="orange" />
      </div>

      {/* ── Two-column: Occupancy | Finance ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* A. Occupancy & Home Performance */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">A. Occupancy &amp; Home Performance</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>{["Home","Type","Capacity","Occupied","Available","Occupancy Rate","Status","Action"].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {homeRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No homes found</td></tr>
                ) : homeRows.map(h => (
                  <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5"><Home className="w-3 h-3 text-slate-300 shrink-0" />{h.name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{h.type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{h.isOutreach ? "—" : h.cap}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700">{h.occ}</td>
                    <td className="px-3 py-2.5 text-slate-500">{h.isOutreach ? "—" : h.avail}</td>
                    <td className="px-3 py-2.5">
                      {h.isOutreach ? <span className="text-slate-400">—</span> : (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${h.rate >= 75 ? "bg-green-500" : h.rate >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${Math.min(h.rate, 100)}%` }} />
                          </div>
                          <span className="font-bold text-slate-700">{h.rate}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${h.status.cls}`}>{h.status.label}</span></td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => navigate(`/homes/${h.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button onClick={() => toast.info("Occupancy report — open the full Homes module for detailed reporting.")} className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
              View full occupancy report <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* B. Financial Snapshot */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          {!isFinanceAllowed ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center flex-1 flex flex-col items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Financial Snapshot Restricted</p>
              <p className="text-xs text-slate-400 mt-1">You do not have permission to view finance data.</p>
            </div>
          ) : (
            <>
              {/* B. Financial Snapshot Header */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-800">B. Financial Snapshot</h2>
                </div>
                <div className="p-4 space-y-3">
                  {/* B1. Outstanding Bills by Status */}
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outstanding Bills by Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      [fmt(totalOutstanding), "Total Outstanding", "bg-red-50 text-red-800 border-red-100"],
                      [fmt(totalOverdue), "Overdue", "bg-orange-50 text-orange-800 border-orange-100"],
                      [fmt(totalDueSoon), "Due Soon", "bg-amber-50 text-amber-800 border-amber-100"],
                      [fmt(totalDueLater), "Due Later", "bg-blue-50 text-blue-800 border-blue-100"],
                    ].map(([val, label, cls]) => (
                      <div key={label} className={`border rounded-xl p-2.5 ${cls}`}>
                        <p className="text-sm font-bold leading-none">{val}</p>
                        <p className="text-[10px] font-semibold mt-1 opacity-70">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* B2. Top Cost Homes */}
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-1">Top Cost Homes (This Month)</p>
                  {topCostHomes.length === 0 ? (
                    <p className="text-xs text-slate-400">No cost data for this period</p>
                  ) : topCostHomes.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className="text-slate-700 font-medium truncate max-w-[120px]">{item.home?.name}</span>
                      </div>
                      <span className="font-bold text-slate-800 shrink-0">{fmt(item.amt)}</span>
                    </div>
                  ))}

                  <button onClick={() => navigate("/finance")} className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1 mt-1">
                    View full finance report <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bill Summary Donut */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Bill Summary (This Month)</p>
                {donutData.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No bill data</p>
                ) : (
                  <div className="flex items-center gap-2">
                    <div style={{ width: 100, height: 100 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" paddingAngle={2}>
                            {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-1">
                      {donutData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-slate-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-slate-700">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => navigate("/finance")} className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1 mt-2">
                  View all bills <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── C. Top 10 Urgent Maintenance Issues ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-800">C. Top 10 Urgent Maintenance Issues</h2>
          <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">{urgentCount} Open Issues</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{["Priority","Issue Title","Home","Category","Reported On","Due Date / SLA","Status","Assigned To","Days Overdue","Action"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {urgentMaint.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">No urgent maintenance issues found</td></tr>
              ) : urgentMaint.map(m => {
                const prCfg = PRIORITY_CFG[m.priority] || PRIORITY_CFG.low;
                const stCfg = STATUS_CFG[m.status] || STATUS_CFG.reported;
                const due = daysOverdueLabel(m.due_at);
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${prCfg.cls}`}>{prCfg.label}</span></td>
                    <td className="px-3 py-2.5 font-medium text-slate-700">{m.issue_title}</td>
                    <td className="px-3 py-2.5 text-slate-500">{m.home_name || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500 capitalize">{m.category?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-500">{m.reported_at ? format(new Date(m.reported_at), "dd MMM yyyy") : "—"}</td>
                    <td className="px-3 py-2.5">
                      {typeof due === "object" ? <span className={due.cls}>{due.label}</span> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${stCfg.cls}`}>{stCfg.label}</span></td>
                    <td className="px-3 py-2.5 text-slate-500">{m.assigned_to_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      {m.due_at && isBefore(new Date(m.due_at), today)
                        ? <span className="text-red-600 font-semibold">{differenceInDays(today, new Date(m.due_at))} day{differenceInDays(today, new Date(m.due_at)) !== 1 ? "s" : ""}</span>
                        : m.due_at ? <span className="text-green-600">In {differenceInDays(new Date(m.due_at), today)}d</span>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => navigate("/care")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap">
                        View Details <Eye className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100">
          <button onClick={() => navigate("/care")} className="text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">
            View all maintenance issues <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── Info note ── */}
      <div className="flex items-center gap-2 text-xs text-slate-400 pb-2">
        <Info className="w-3.5 h-3.5 shrink-0" />
        All data is based on the homes and teams you have access to.
      </div>

      {/* ── Export Modal ── */}
      {showExport && <ExportModal onClose={() => setShowExport(false)} onExport={handleExport} />}
    </div>
  );
}