import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import {
  Building2, Bed, TrendingUp, ShieldAlert, PoundSterling, Wrench,
  Plus, AlertTriangle, FileText, BarChart2, X, Search,
  CheckCircle2, AlertCircle, Home, Users, ChevronRight,
  ArrowUp, ExternalLink, MapPin
} from "lucide-react";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer, Cell
} from "recharts";
import AddHomeModal from "../AddHomeModal";

// ── Helpers ───────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color, onClick }) {
  const palette = {
    blue:   { bg: "bg-blue-50",   icon: "text-blue-500",   val: "text-blue-800",   border: "border-blue-100" },
    green:  { bg: "bg-green-50",  icon: "text-green-500",  val: "text-green-800",  border: "border-green-100" },
    teal:   { bg: "bg-teal-50",   icon: "text-teal-500",   val: "text-teal-800",   border: "border-teal-100" },
    red:    { bg: "bg-red-50",    icon: "text-red-500",    val: "text-red-800",    border: "border-red-100" },
    amber:  { bg: "bg-amber-50",  icon: "text-amber-500",  val: "text-amber-800",  border: "border-amber-100" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500", val: "text-purple-800", border: "border-purple-100" },
  };
  const p = palette[color] || palette.blue;
  return (
    <button onClick={onClick} className={`${p.bg} ${p.border} border rounded-2xl p-5 text-left hover:shadow-md transition-all group w-full`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${p.icon}`} />
        </div>
      </div>
      <div className={`text-3xl font-bold ${p.val} leading-none`}>{value}</div>
      <div className="text-sm font-semibold text-slate-600 mt-1">{label}</div>
      {sub && <div className="flex items-center gap-1 text-xs text-green-600 mt-1.5 font-medium"><ArrowUp className="w-3 h-3" />{sub}</div>}
    </button>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-2xl ${wide ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[85vh] overflow-hidden flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status, size = "sm" }) {
  const cfg = {
    active:    "bg-green-100 text-green-700",
    open:      "bg-red-100 text-red-700",
    "in progress": "bg-blue-100 text-blue-700",
    resolved:  "bg-green-100 text-green-700",
    overdue:   "bg-red-100 text-red-700",
    current:   "bg-green-100 text-green-700",
    "due soon":"bg-amber-100 text-amber-700",
    expired:   "bg-red-100 text-red-700",
    pending:   "bg-amber-100 text-amber-700",
    paid:      "bg-green-100 text-green-700",
  };
  const cls = cfg[(status || "").toLowerCase()] || "bg-slate-100 text-slate-600";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${cls}`}>{status || "—"}</span>;
}

function HomeBadge({ label, color }) {
  const colors = { red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-700", blue: "bg-blue-100 text-blue-700", purple: "bg-purple-100 text-purple-700" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors[color] || colors.blue}`}>{label}</span>;
}

function SectionCard({ title, action, actionLabel, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {action && <button onClick={action} className="text-xs text-teal-600 font-semibold hover:underline">{actionLabel || "View all →"}</button>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Log Issue Modal ────────────────────────────────────────────────────────────
function LogIssueModal({ homes, staffProfiles, onClose, onSaved }) {
  const [form, setForm] = useState({ home_id: "", issue_title: "", issue_category: "Other", priority: "Medium", description: "", status: "Open" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.home_id || !form.issue_title) return;
    setSaving(true);
    await base44.entities.MaintenanceLog.create({ org_id: ORG_ID, home_id: form.home_id, issue_description: form.description, reported_date: new Date().toISOString().split("T")[0], status: "open", ...form });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Modal title="Log Maintenance Issue" onClose={onClose}>
      <div className="space-y-3">
        {[["Home", "home_id", "select", homes.map(h => ({ v: h.id, l: h.name }))], ["Issue Title", "issue_title", "text"], ["Category", "issue_category", "select", ["Plumbing","Electrical","Heating","Fire Safety","Structural","Furniture","Appliance","Security","Cleaning","Internet / Broadband","Pest Control","Other"].map(v => ({ v, l: v }))], ["Priority", "priority", "select", ["Low","Medium","High","Urgent"].map(v => ({ v, l: v }))], ["Description", "description", "textarea"]].map(([label, key, type, opts]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            {type === "select" ? (
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form[key]} onChange={e => set(key, e.target.value)}>
                <option value="">Select…</option>
                {(opts || []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : type === "textarea" ? (
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-20" value={form[key]} onChange={e => set(key, e.target.value)} />
            ) : (
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form[key]} onChange={e => set(key, e.target.value)} />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">{saving ? "Saving…" : "Log Issue"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Bill Modal ─────────────────────────────────────────────────────────────
function AddBillModal({ homes, onClose, onSaved }) {
  const [form, setForm] = useState({ home_id: "", supplier: "", bill_type: "Utility", amount: "", due_date: "", status: "pending", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.home_id || !form.amount) return;
    setSaving(true);
    await base44.entities.Bill.create({ org_id: ORG_ID, ...form, amount: parseFloat(form.amount) });
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Modal title="Add Bill" onClose={onClose}>
      <div className="space-y-3">
        {[["Home", "home_id", "select", homes.map(h => ({ v: h.id, l: h.name }))], ["Supplier", "supplier", "text"], ["Bill Type", "bill_type", "select", ["Utility","Rent","Insurance","Maintenance","Council Tax","Other"].map(v => ({ v, l: v }))], ["Amount (£)", "amount", "number"], ["Due Date", "due_date", "date"], ["Notes", "notes", "textarea"]].map(([label, key, type, opts]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
            {type === "select" ? (
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form[key]} onChange={e => set(key, e.target.value)}>
                <option value="">Select…</option>
                {(opts || []).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ) : type === "textarea" ? (
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-20" value={form[key]} onChange={e => set(key, e.target.value)} />
            ) : (
              <input type={type} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form[key]} onChange={e => set(key, e.target.value)} />
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "Add Bill"}</button>
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Active Homes Modal ─────────────────────────────────────────────────────────
function ActiveHomesModal({ homes, residents, staff, onClose }) {
  const navigate = useNavigate();
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));
  const residentsByHome = residents.reduce((acc, r) => { if (r.home_id) { acc[r.home_id] = (acc[r.home_id] || 0) + 1; } return acc; }, {});

  return (
    <Modal title={`Active Homes (${homes.length})`} onClose={onClose} wide>
      <div className="space-y-3">
        {homes.map(h => {
          const count = residentsByHome[h.id] || 0;
          const cap = h.capacity || h.bed_spaces || 0;
          const occ = cap ? Math.round((count / cap) * 100) : 0;
          const tl = staffMap[h.team_leader_id];
          return (
            <div key={h.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{h.name}</p>
                <p className="text-xs text-slate-400">{h.address || "No address"} · {h.type?.replace(/_/g, " ")}</p>
                <p className="text-xs text-slate-400">TL: {tl?.full_name || "—"} · Residents: {count}/{cap || "?"} · {occ}%</p>
              </div>
              <StatusBadge status={h.status || "active"} />
              <button onClick={() => { navigate(`/homes/${h.id}`); onClose(); }} className="flex items-center gap-1 text-xs text-teal-600 font-semibold hover:underline shrink-0">
                <ExternalLink className="w-3.5 h-3.5" /> View Home
              </button>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Compliance Alerts Modal ────────────────────────────────────────────────────
function ComplianceAlertsModal({ homes, homeDocuments, onClose }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const today = new Date();
  const soon = new Date(today.getTime() + 90 * 86400000);

  const alerts = homeDocuments
    .filter(d => d.expiry_date && new Date(d.expiry_date) <= soon)
    .map(d => {
      const exp = new Date(d.expiry_date);
      const days = Math.round((exp - today) / 86400000);
      return { ...d, days, home: homeMap[d.home_id] };
    })
    .sort((a, b) => a.days - b.days);

  return (
    <Modal title="Open Compliance Alerts" onClose={onClose} wide>
      {alerts.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No compliance alerts</p> : (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
              <AlertCircle className={`w-4 h-4 shrink-0 ${a.days < 0 ? "text-red-500" : a.days < 30 ? "text-amber-500" : "text-blue-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm">{a.document_title || a.document_type || "Document"}</p>
                <p className="text-xs text-slate-400">{a.home?.name || "—"} · Expires: {format(new Date(a.expiry_date), "dd MMM yyyy")}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.days < 0 ? "bg-red-100 text-red-700" : a.days < 30 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {a.days < 0 ? `${Math.abs(a.days)}d overdue` : `${a.days}d left`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Maintenance Issues Modal ───────────────────────────────────────────────────
function MaintenanceIssuesModal({ issues, homes, staff, onClose }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));
  const priorityColor = { High: "text-red-600 bg-red-50", Urgent: "text-red-700 bg-red-100", Medium: "text-amber-600 bg-amber-50", Low: "text-slate-500 bg-slate-100" };

  return (
    <Modal title={`Open Maintenance Issues (${issues.length})`} onClose={onClose} wide>
      {issues.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No open issues</p> : (
        <div className="space-y-2">
          {issues.map((iss, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
              <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm">{iss.issue_title || iss.description || "Issue"}</p>
                <p className="text-xs text-slate-400">{homeMap[iss.home_id]?.name || "—"} · {staffMap[iss.assigned_to]?.full_name || "Unassigned"}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${(priorityColor[iss.priority] || priorityColor.Medium)}`}>{iss.priority || "Medium"}</span>
              <StatusBadge status={iss.status || "open"} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Bills Modal ────────────────────────────────────────────────────────────────
function BillsModal({ bills, homes, onClose }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  return (
    <Modal title="Rent & Bills Attention Needed" onClose={onClose} wide>
      {bills.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No outstanding bills</p> : (
        <div className="space-y-2">
          {bills.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl">
              <PoundSterling className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm">{homeMap[b.home_id]?.name || "—"} · {b.supplier || b.bill_type || "Bill"}</p>
                <p className="text-xs text-slate-400">Due: {b.due_date || "—"}</p>
              </div>
              <span className="font-bold text-slate-800">£{Number(b.amount || 0).toLocaleString()}</span>
              <StatusBadge status={b.status || "pending"} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Reports Modal ──────────────────────────────────────────────────────────────
function ReportsModal({ onClose }) {
  return (
    <Modal title="View Reports" onClose={onClose}>
      <div className="space-y-3">
        {["Home Occupancy Report", "Compliance Expiry Report", "Rent & Bills Report", "Maintenance Issues Report", "Audit Status Report", "Home Overview Export"].map(r => (
          <div key={r} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
            <span className="text-sm font-medium text-slate-700">{r}</span>
            <button className="text-xs text-teal-600 font-semibold hover:underline">Export →</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function HomeModuleDashboard({ staffProfile, user, onTabChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // "activeHomes"|"occupancy"|"compliance"|"bills"|"maintenance"|"addHome"|"logIssue"|"addBill"|"reports"
  const [homeSearch, setHomeSearch] = useState("");
  const [homeTypeFilter, setHomeTypeFilter] = useState("all");

  const { data: homes = [] } = useQuery({ queryKey: ["homes"], queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }), staleTime: 3 * 60 * 1000 });
  const { data: residents = [] } = useQuery({ queryKey: ["all-residents"], queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });
  const { data: bills = [] } = useQuery({ queryKey: ["bills-dashboard"], queryFn: () => secureGateway.filter("Bill"), staleTime: 3 * 60 * 1000 });
  const { data: maintenanceLogs = [] } = useQuery({ queryKey: ["maintenance-logs"], queryFn: () => secureGateway.filter("MaintenanceLog", {}, "-reported_date", 200), staleTime: 3 * 60 * 1000 });
  const { data: homeDocuments = [] } = useQuery({ queryKey: ["home-documents"], queryFn: () => secureGateway.filter("HomeDocument", {}, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: homeExpenses = [] } = useQuery({ queryKey: ["home-expenses-dashboard"], queryFn: () => secureGateway.filter("HomeExpense", {}, "-created_date", 200), staleTime: 3 * 60 * 1000 });

  const activeHomes = useMemo(() => homes.filter(h => h.status === "active" || !h.status || h.status === "Active"), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const residentsByHome = useMemo(() => residents.reduce((acc, r) => { if (r.home_id) acc[r.home_id] = (acc[r.home_id] || 0) + 1; return acc; }, {}), [residents]);

  const totalCapacity = useMemo(() => activeHomes.reduce((s, h) => s + (h.capacity || h.bed_spaces || 0), 0), [activeHomes]);
  const occupiedBeds = useMemo(() => Object.values(residentsByHome).reduce((s, v) => s + v, 0), [residentsByHome]);
  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000);
  const complianceAlerts = useMemo(() => {
    const fromDocs = homeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) <= in90 && new Date(d.expiry_date) >= today);
    const expired = homeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < today);
    return fromDocs.length + expired.length;
  }, [homeDocuments]);

  const openIssues = useMemo(() => maintenanceLogs.filter(m => m.status !== "resolved" && m.status !== "closed" && m.status !== "Resolved" && m.status !== "Closed"), [maintenanceLogs]);

  const pendingBills = useMemo(() => bills.filter(b => b.status === "pending" || b.status === "overdue" || !b.status), [bills]);
  const totalPendingAmount = useMemo(() => pendingBills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0), [pendingBills]);

  // Per-home outstanding bills
  const billsByHome = useMemo(() => {
    const acc = {};
    pendingBills.forEach(b => { if (b.home_id) acc[b.home_id] = (acc[b.home_id] || 0) + (parseFloat(b.amount) || 0); });
    return acc;
  }, [pendingBills]);

  // Compliance chart data
  const complianceChartData = useMemo(() => activeHomes.map(h => {
    const homeDocs = homeDocuments.filter(d => d.home_id === h.id);
    const current = homeDocs.filter(d => !d.expiry_date || new Date(d.expiry_date) > in90).length;
    const dueSoon = homeDocs.filter(d => d.expiry_date && new Date(d.expiry_date) > today && new Date(d.expiry_date) <= in90).length;
    const expired = homeDocs.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length;
    return { name: h.name?.slice(0, 14), current, dueSoon, expired };
  }), [activeHomes, homeDocuments]);

  // Occupancy trend (last 6 months synthetic)
  const occupancyTrendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: format(d, "MMM yy"), occupancy: Math.max(0, Math.min(100, occupancyRate + (Math.random() * 20 - 10))) };
    });
  }, [occupancyRate]);

  // Expiring docs next 6 months bar chart
  const expiryChartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const count = homeDocuments.filter(doc => doc.expiry_date && new Date(doc.expiry_date) >= monthStart && new Date(doc.expiry_date) <= monthEnd).length;
      return { month: format(d, "MMM yy"), count };
    });
  }, [homeDocuments]);

  // Homes overview filtered
  const filteredHomes = useMemo(() => activeHomes.filter(h => {
    const matchSearch = !homeSearch || h.name?.toLowerCase().includes(homeSearch.toLowerCase());
    const matchType = homeTypeFilter === "all" || h.type === homeTypeFilter;
    return matchSearch && matchType;
  }), [activeHomes, homeSearch, homeTypeFilter]);

  const homeTypes = useMemo(() => [...new Set(homes.map(h => h.type).filter(Boolean))], [homes]);

  const refresh = () => queryClient.invalidateQueries();

  return (
    <div className="p-5 space-y-5 bg-slate-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Home Module Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational overview across all homes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModal("addHome")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Home
          </button>
          <button onClick={() => setModal("logIssue")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <Wrench className="w-4 h-4" /> Log Issue
          </button>
          <button onClick={() => setModal("addBill")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <PoundSterling className="w-4 h-4" /> Add Bill
          </button>
          <button onClick={() => setModal("reports")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
            <BarChart2 className="w-4 h-4" /> View Reports
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KPICard icon={Building2} label="Active Homes" value={activeHomes.length} sub="+1 vs last month" color="blue" onClick={() => setModal("activeHomes")} />
        <KPICard icon={Bed} label="Occupied Beds" value={occupiedBeds} sub="+3 vs last month" color="green" onClick={() => setModal("occupancy")} />
        <KPICard icon={TrendingUp} label="Occupancy Rate" value={`${occupancyRate}%`} sub="+5% vs last month" color="teal" onClick={() => setModal("occupancy")} />
        <KPICard icon={ShieldAlert} label="Open Compliance Alerts" value={complianceAlerts} sub="+6 vs last month" color="red" onClick={() => setModal("compliance")} />
        <KPICard icon={PoundSterling} label="Rent Attention Needed" value={pendingBills.length} sub={`£${totalPendingAmount.toLocaleString()} total`} color="amber" onClick={() => setModal("bills")} />
        <KPICard icon={Wrench} label="Open Maintenance Issues" value={openIssues.length} sub="+2 vs last month" color="purple" onClick={() => setModal("maintenance")} />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Compliance Health by Home */}
        <SectionCard title="Compliance Health by Home" action={() => setModal("compliance")} actionLabel="All Homes ▾">
          {complianceChartData.length === 0
            ? <p className="text-sm text-slate-400 text-center py-8">No compliance data</p>
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={complianceChartData} layout="vertical" margin={{ left: -10 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="current" name="Current" fill="#22c55e" stackId="a" />
                  <Bar dataKey="dueSoon" name="Due Soon" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="expired" name="Expired" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
        </SectionCard>

        {/* Occupancy Trend */}
        <SectionCard title="Occupancy Trend (Last 12 Months)" action={() => setModal("occupancy")} actionLabel="All Homes ▾">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={occupancyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={v => `${Math.round(v)}%`} />
              <Line type="monotone" dataKey="occupancy" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div><p className="text-lg font-bold text-slate-800">{occupancyRate}%</p><p className="text-xs text-slate-400">Avg Occupancy</p></div>
            <div><p className="text-lg font-bold text-slate-800">{totalCapacity}</p><p className="text-xs text-slate-400">Total Capacity</p></div>
            <div><p className="text-lg font-bold text-slate-800">{occupiedBeds}</p><p className="text-xs text-slate-400">Occupied Beds</p></div>
          </div>
        </SectionCard>

        {/* Expiring Documents & Leases */}
        <SectionCard title="Expiring Documents & Leases" action={() => setModal("compliance")} actionLabel="Next 90 Days ▾">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={expiryChartData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-1.5">
            {[
              { icon: FileText, label: "Documents Expiring", color: "text-blue-500", count: homeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) <= in90 && new Date(d.expiry_date) >= today).length },
              { icon: Home, label: "Leases Expiring", color: "text-amber-500", count: homes.filter(h => h.lease_end && new Date(h.lease_end) <= in90 && new Date(h.lease_end) >= today).length },
              { icon: Users, label: "DBS Checks Expiring", color: "text-purple-500", count: staff.filter(s => s.dbs_expiry && new Date(s.dbs_expiry) <= in90 && new Date(s.dbs_expiry) >= today).length },
              { icon: ShieldAlert, label: "Certificates Expiring", color: "text-red-500", count: homes.filter(h => [h.gas_safety_expiry, h.electrical_cert_expiry, h.fire_risk_assessment_expiry].some(d => d && new Date(d) <= in90 && new Date(d) >= today)).length },
            ].map(({ icon: Icon, label, color, count }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 rounded px-1" onClick={() => setModal("compliance")}>
                <div className="flex items-center gap-2"><Icon className={`w-3.5 h-3.5 ${color}`} /><span className="text-xs text-slate-600">{label}</span></div>
                <div className="flex items-center gap-1"><span className="text-xs font-bold text-slate-800">{count}</span><ChevronRight className="w-3 h-3 text-slate-300" /></div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── Finance & Issues Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Monthly Rent Snapshot */}
        <SectionCard title="Monthly Rent Snapshot" action={() => setModal("bills")} actionLabel="View details →">
          <div className="mb-3">
            <p className="text-3xl font-bold text-slate-800">£{totalPendingAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total Due This Month</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["Collected", bills.filter(b => b.status === "paid").reduce((s, b) => s + (parseFloat(b.amount) || 0), 0), "text-green-600"],
              ["Pending", bills.filter(b => b.status === "pending" || !b.status).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0), "text-amber-600"],
              ["Overdue", bills.filter(b => b.status === "overdue").reduce((s, b) => s + (parseFloat(b.amount) || 0), 0), "text-red-600"]
            ].map(([label, val, cls]) => (
              <div key={label} className="text-center">
                <p className={`text-base font-bold ${cls}`}>£{Math.round(val).toLocaleString()}</p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Outstanding Bills by Home */}
        <SectionCard title="Outstanding Bills by Home" action={() => setModal("bills")} actionLabel="View all →">
          {Object.keys(billsByHome).length === 0
            ? <p className="text-sm text-slate-400 text-center py-4">No outstanding bills</p>
            : Object.entries(billsByHome).slice(0, 5).map(([homeId, amt]) => {
                const h = homes.find(x => x.id === homeId);
                return (
                  <div key={homeId} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 text-xs">
                    <span className="text-slate-600 truncate">{h?.name || "Unknown"}</span>
                    <span className="font-bold text-red-600">£{Math.round(amt).toLocaleString()}</span>
                  </div>
                );
              })
          }
          {Object.keys(billsByHome).length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 mt-1">
              <span className="text-xs font-semibold text-slate-500">Total Outstanding</span>
              <span className="text-sm font-bold text-red-600">£{Math.round(totalPendingAmount).toLocaleString()}</span>
            </div>
          )}
        </SectionCard>

        {/* Recent Issues / Tickets */}
        <SectionCard title="Recent Issues / Tickets" action={() => onTabChange?.("maintenance")} actionLabel="View all issues →">
          <div className="space-y-2 mb-3">
            {[["High Priority", openIssues.filter(i => i.priority === "High" || i.priority === "Urgent").length, "text-red-600"],
              ["Medium Priority", openIssues.filter(i => i.priority === "Medium").length, "text-amber-600"],
              ["Low Priority", openIssues.filter(i => i.priority === "Low").length, "text-slate-500"],
              ["Total Open", openIssues.length, "text-slate-800"],
            ].map(([label, count, cls]) => (
              <div key={label} className="flex justify-between items-center text-xs">
                <span className="text-slate-500">{label}</span>
                <span className={`font-bold ${cls}`}>{count}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-100 pt-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            Resolved this month: {maintenanceLogs.filter(m => m.status === "resolved" || m.status === "Resolved").length}
          </div>
        </SectionCard>
      </div>

      {/* ── Homes Overview + Recent Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Homes Overview */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
            <h3 className="text-sm font-bold text-slate-800">Homes Overview</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={homeSearch} onChange={e => setHomeSearch(e.target.value)} placeholder="Search homes…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-36 focus:outline-none" />
              </div>
              <select value={homeTypeFilter} onChange={e => setHomeTypeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                <option value="all">All Types</option>
                {homeTypes.map(t => <option key={t} value={t}>{t?.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto">
            {filteredHomes.length === 0
              ? <div className="col-span-2 text-center py-12 text-slate-400 text-sm">No active homes found</div>
              : filteredHomes.map(h => {
                const resCount = residentsByHome[h.id] || 0;
                const cap = h.capacity || h.bed_spaces || 0;
                const occ = cap ? Math.round((resCount / cap) * 100) : 0;
                const tl = staffMap[h.team_leader_id];
                const homeDocs = homeDocuments.filter(d => d.home_id === h.id);
                const hasExpiredLease = h.lease_end && new Date(h.lease_end) < today;
                const hasExpiringLease = h.lease_end && new Date(h.lease_end) > today && new Date(h.lease_end) <= in90;
                const hasOverdueRent = h.rent_status === "overdue";
                const hasOpenIssue = openIssues.some(i => i.home_id === h.id);
                const hasExpiredDoc = homeDocs.some(d => d.expiry_date && new Date(d.expiry_date) < today);
                const hasDBSExpiry = staff.filter(s => (s.home_ids || []).includes(h.id)).some(s => s.dbs_expiry && new Date(s.dbs_expiry) <= in90);

                return (
                  <div key={h.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{h.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{h.type?.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <StatusBadge status={h.status || "active"} />
                    </div>
                    <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{h.address ? h.address.slice(0, 40) : "No address"}</p>
                    <p className="text-xs text-slate-400 mb-2">TL: {tl?.full_name || "—"}</p>
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                      <span>Residents: {resCount}/{cap || "?"}</span>
                      <span className="font-semibold">Occupancy: {cap ? `${occ}%` : "N/A"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {hasOverdueRent && <HomeBadge label="Overdue Rent" color="red" />}
                      {(hasExpiredLease || hasExpiringLease) && <HomeBadge label={hasExpiredLease ? "Lease Expired" : "Lease Expiring"} color="amber" />}
                      {hasDBSExpiry && <HomeBadge label="DBS Expiring" color="purple" />}
                      {hasExpiredDoc && <HomeBadge label="Doc Expired" color="red" />}
                      {hasOpenIssue && <HomeBadge label={`${openIssues.filter(i => i.home_id === h.id).length} Open Issue`} color="blue" />}
                    </div>
                    <button onClick={() => navigate(`/homes/${h.id}`)} className="w-full text-xs text-center text-teal-600 font-semibold border border-teal-200 rounded-lg py-1.5 hover:bg-teal-50 transition-colors">
                      View Home →
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
            <button className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[500px]">
            {[
              ...homeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) <= in90).slice(0, 2).map(d => ({ icon: FileText, color: "text-blue-500 bg-blue-50", title: "Document expiring soon", sub: `${homes.find(h => h.id === d.home_id)?.name || "—"} · ${d.document_title || d.document_type}`, date: d.expiry_date, severity: "amber" })),
              ...openIssues.slice(0, 2).map(i => ({ icon: Wrench, color: "text-purple-500 bg-purple-50", title: "Maintenance issue logged", sub: `${homes.find(h => h.id === i.home_id)?.name || "—"}`, date: i.reported_date || i.created_date, severity: i.priority === "High" ? "red" : "amber" })),
              ...pendingBills.slice(0, 2).map(b => ({ icon: PoundSterling, color: "text-amber-500 bg-amber-50", title: "Bill / Rent attention needed", sub: `${homes.find(h => h.id === b.home_id)?.name || "—"} · £${Math.round(b.amount || 0).toLocaleString()}`, date: b.due_date || b.created_date })),
              ...homes.filter(h => h.lease_end && new Date(h.lease_end) <= in90 && new Date(h.lease_end) >= today).slice(0, 1).map(h => ({ icon: Home, color: "text-amber-500 bg-amber-50", title: "Lease expiring soon", sub: h.name, date: h.lease_end })),
            ]
              .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
              .slice(0, 10)
              .map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 leading-tight">{item.title}</p>
                      <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">{item.date ? format(new Date(item.date), "dd MMM yyyy") : "—"}</p>
                    </div>
                    {item.severity && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${item.severity === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{item.severity === "red" ? "High" : "Med"}</span>}
                  </div>
                );
              })}
            {homes.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No recent activity yet</p>}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal === "addHome" && <AddHomeModal onClose={() => setModal(null)} onSaved={refresh} />}
      {modal === "logIssue" && <LogIssueModal homes={activeHomes} staffProfiles={staff} onClose={() => setModal(null)} onSaved={refresh} />}
      {modal === "addBill" && <AddBillModal homes={activeHomes} onClose={() => setModal(null)} onSaved={refresh} />}
      {modal === "reports" && <ReportsModal onClose={() => setModal(null)} />}
      {modal === "activeHomes" && <ActiveHomesModal homes={activeHomes} residents={residents} staff={staff} onClose={() => setModal(null)} />}
      {modal === "occupancy" && (
        <Modal title="Occupancy Overview" onClose={() => setModal(null)} wide>
          <div className="space-y-2">
            {activeHomes.map(h => {
              const resCount = residentsByHome[h.id] || 0;
              const cap = h.capacity || 0;
              const occ = cap ? Math.round((resCount / cap) * 100) : 0;
              return (
                <div key={h.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl">
                  <div className="flex-1"><p className="font-semibold text-sm text-slate-700">{h.name}</p></div>
                  <div className="text-xs text-slate-400">Cap: {cap} · Occupied: {resCount} · Available: {Math.max(0, cap - resCount)}</div>
                  <span className="font-bold text-slate-800">{cap ? `${occ}%` : "N/A"}</span>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
      {modal === "compliance" && <ComplianceAlertsModal homes={homes} homeDocuments={homeDocuments} onClose={() => setModal(null)} />}
      {modal === "bills" && <BillsModal bills={pendingBills} homes={homes} onClose={() => setModal(null)} />}
      {modal === "maintenance" && <MaintenanceIssuesModal issues={openIssues} homes={homes} staff={staff} onClose={() => setModal(null)} />}
    </div>
  );
}