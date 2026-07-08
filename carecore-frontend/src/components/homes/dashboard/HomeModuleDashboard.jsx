import { useState, useMemo } from "react";
import XLSX from "xlsx-js-style";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { useModuleActions } from "@/lib/PermissionContext";
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
import AddMaintenanceModal from "../../house/AddMaintenanceModal";
import BillForm from "../../house/BillForm";

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
function ReportsModal({ onClose, homes = [], residents = [], documents = [], bills = [], maintenanceLogs = [], staff = [] }) {
  const [exporting, setExporting] = useState(null);

  const downloadExcel = (filename, sheetName, headers, rows) => {
    const aoa = [
      headers,
      ...rows.map(row => headers.map(header => row[header] ?? ""))
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Dynamic row heights
    const rowHeights = [{ hpt: 26 }]; // header height: 26 pt
    for (let r = 0; r < rows.length; r++) {
      rowHeights.push({ hpt: 20 }); // data row height: 20 pt
    }
    ws["!rows"] = rowHeights;

    // Auto-fit column widths
    const maxValLengths = headers.map((header) => {
      let maxLen = header.length;
      rows.forEach(row => {
        const val = String(row[header] ?? "");
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
    });
    ws["!cols"] = maxValLengths;

    // Apply styles to cells
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) continue;

        const isHeader = R === 0;
        const isEvenRow = R % 2 === 0;

        ws[cellRef].s = {
          fill: {
            patternType: "solid",
            fgColor: { rgb: isHeader ? "0F766E" : (isEvenRow ? "F8FAFC" : "FFFFFF") }
          },
          font: {
            name: "Segoe UI",
            sz: isHeader ? 11 : 10,
            bold: isHeader,
            color: { rgb: isHeader ? "FFFFFF" : "1E293B" }
          },
          alignment: {
            vertical: "center",
            horizontal: isHeader ? "center" : "left",
            wrapText: true
          },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const exportOccupancyReport = () => {
    const headers = ["Home Name", "Type", "Address", "Postcode", "Status", "Capacity", "Occupied Beds", "Vacancy", "Occupancy Rate (%)"];
    const rows = homes.map(h => {
      const occupied = residents.filter(r => r.home_id === h.id).length;
      const capacity = h.capacity || h.bed_spaces || 0;
      const vacancy = Math.max(0, capacity - occupied);
      const rate = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
      return {
        "Home Name": h.name,
        "Type": h.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—",
        "Address": h.address || "—",
        "Postcode": h.postcode || "—",
        "Status": h.status || "active",
        "Capacity": capacity,
        "Occupied Beds": occupied,
        "Vacancy": vacancy,
        "Occupancy Rate (%)": `${rate}%`,
      };
    });
    downloadExcel("home_occupancy_report", "Occupancy", headers, rows);
  };

  const exportComplianceReport = () => {
    const headers = ["Home Name", "Document Title", "Document Type", "Reference", "Details", "Expiry Date", "Days to Expiry", "Status"];
    const rows = documents
      .filter(d => d.expiry_date)
      .map(d => {
        const home = homes.find(h => h.id === d.home_id);
        const days = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
        let status = "Current";
        if (days < 0) status = "Expired";
        else if (days <= 90) status = "Due Soon";
        
        return {
          "Home Name": home?.name || "—",
          "Document Title": d.document_title || d.title || "—",
          "Document Type": d.document_type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—",
          "Reference": d.reference || "—",
          "Details": d.details || "—",
          "Expiry Date": d.expiry_date,
          "Days to Expiry": days,
          "Status": status,
        };
      });
    downloadExcel("compliance_expiry_report", "Compliance", headers, rows);
  };

  const exportRentBillsReport = () => {
    const headers = ["Home Name", "Supplier", "Bill Type", "Amount (£)", "Due Date", "Status", "Notes"];
    const rows = bills.map(b => {
      const home = homes.find(h => h.id === b.home_id);
      return {
        "Home Name": home?.name || "—",
        "Supplier": b.supplier || "—",
        "Bill Type": b.bill_type || "—",
        "Amount (£)": b.amount || 0,
        "Due Date": b.due_date || "—",
        "Status": b.status || "pending",
        "Notes": b.notes || "—",
      };
    });
    downloadExcel("rent_and_bills_report", "Rent and Bills", headers, rows);
  };

  const exportMaintenanceReport = () => {
    const headers = ["Home Name", "Issue Title", "Category", "Priority", "Status", "Reported Date", "Reported By", "Assigned To", "Contractor", "Estimated Cost (£)", "Actual Cost (£)"];
    const rows = maintenanceLogs.map(m => {
      const home = homes.find(h => h.id === m.home_id);
      return {
        "Home Name": home?.name || "—",
        "Issue Title": m.issue_title || m.title || "—",
        "Category": m.category || m.issue_category || "—",
        "Priority": m.priority || "—",
        "Status": m.status || "reported",
        "Reported Date": m.reported_date || m.date_reported || "—",
        "Reported By": m.reported_by_name || "—",
        "Assigned To": m.assigned_to_name || "—",
        "Contractor": m.contractor_name || "—",
        "Estimated Cost (£)": m.estimated_cost || 0,
        "Actual Cost (£)": m.actual_cost || 0,
      };
    });
    downloadExcel("maintenance_issues_report", "Maintenance Logs", headers, rows);
  };

  const exportAuditStatusReport = async () => {
    const headers = ["Home Name", "Audit Category", "Item Name", "Compliance Score", "Action Required", "Completed At", "Completed By"];
    const responses = await secureGateway.filter("HomeCheckItemResponse");
    const rows = responses.map(r => {
      const home = homes.find(h => h.id === r.home_id);
      const staffMember = staff.find(s => s.id === r.completed_by);
      return {
        "Home Name": home?.name || "—",
        "Audit Category": r.category || "—",
        "Item Name": r.item_name || "—",
        "Compliance Score": r.score || r.status || "—",
        "Action Required": r.action_required || "—",
        "Completed At": r.completed_at || "—",
        "Completed By": r.completed_by_name || staffMember?.full_name || "—",
      };
    });
    downloadExcel("audit_status_report", "Audits", headers, rows);
  };

  const exportHomeOverview = () => {
    const headers = ["Home Name", "Type", "Address", "Postcode", "Phone", "Email", "Team Leader", "Monthly Rent (£)", "Landlord Name", "Landlord Contact", "Landlord Email", "Lease Start", "Lease End", "Status"];
    const rows = homes.map(h => {
      const leader = staff.find(s => s.id === h.team_leader_id);
      return {
        "Home Name": h.name,
        "Type": h.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "—",
        "Address": h.address || "—",
        "Postcode": h.postcode || "—",
        "Phone": h.phone || "—",
        "Email": h.email || "—",
        "Team Leader": leader?.full_name || "—",
        "Monthly Rent (£)": h.monthly_rent || 0,
        "Landlord Name": h.landlord_name || "—",
        "Landlord Contact": h.landlord_contact || "—",
        "Landlord Email": h.landlord_email || "—",
        "Lease Start": h.lease_start || "—",
        "Lease End": h.lease_end || "—",
        "Status": h.status || "active",
      };
    });
    downloadExcel("home_overview_export", "Home Overview", headers, rows);
  };

  const handleExport = async (r) => {
    setExporting(r);
    try {
      if (r === "Home Occupancy Report") {
        exportOccupancyReport();
      } else if (r === "Compliance Expiry Report") {
        exportComplianceReport();
      } else if (r === "Rent & Bills Report") {
        exportRentBillsReport();
      } else if (r === "Maintenance Issues Report") {
        exportMaintenanceReport();
      } else if (r === "Audit Status Report") {
        await exportAuditStatusReport();
      } else if (r === "Home Overview Export") {
        exportHomeOverview();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to export report.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <Modal title="Export Operational Reports" onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
        {[
          {
            name: "Home Occupancy Report",
            description: "Analyze vacancies, bed space capacity, and current occupancy rates across all properties.",
            icon: Users,
            color: "from-emerald-500 to-teal-500 text-teal-600 bg-teal-50 border-teal-100",
          },
          {
            name: "Compliance Expiry Report",
            description: "Monitor safety certificates, document expiry dates, and compliance alerts.",
            icon: ShieldAlert,
            color: "from-amber-500 to-orange-500 text-orange-600 bg-orange-50 border-orange-100",
          },
          {
            name: "Rent & Bills Report",
            description: "Track property expenditures, utility bills, rental agreements, and payment status.",
            icon: PoundSterling,
            color: "from-yellow-500 to-amber-600 text-amber-700 bg-amber-50 border-amber-100",
          },
          {
            name: "Maintenance Issues Report",
            description: "Review property maintenance logs, repair tickets, categories, and estimated costs.",
            icon: Wrench,
            color: "from-indigo-500 to-purple-600 text-purple-600 bg-purple-50 border-purple-100",
          },
          {
            name: "Audit Status Report",
            description: "Export internal audit responses, checklist scores, and compliance evaluations.",
            icon: CheckCircle2,
            color: "from-blue-500 to-cyan-500 text-blue-600 bg-blue-50 border-blue-100",
          },
          {
            name: "Home Overview Export",
            description: "Get a complete master directory of property addresses, landlord details, and lease periods.",
            icon: Home,
            color: "from-slate-500 to-slate-700 text-slate-700 bg-slate-50 border-slate-100",
          },
        ].map(r => {
          const Icon = r.icon;
          const isExporting = exporting === r.name;
          return (
            <div 
              key={r.name} 
              className="flex flex-col justify-between p-5 border border-slate-100 bg-white rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color.split(" ").slice(0,2).join(" ")} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm leading-tight">{r.name}</h4>
                  <p className="text-xs text-slate-400 mt-1.5 leading-normal">{r.description}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-end">
                <button
                  onClick={() => handleExport(r.name)}
                  disabled={exporting !== null}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200/60 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping mr-1" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <span>Download Excel</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// ── Recent Activity Modal ──────────────────────────────────────────────────────
function RecentActivityModal({ activities, onClose }) {
  return (
    <Modal title={`Recent Activity (${activities.length})`} onClose={onClose} wide>
      {activities.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No recent activity</p> : (
        <div className="space-y-3">
          {activities.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-700 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.date ? format(new Date(item.date), "dd MMM yyyy") : "—"}</p>
                </div>
                {item.severity && <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${item.severity === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{item.severity === "red" ? "High" : "Medium"}</span>}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function HomeModuleDashboard({ staffProfile, user, onTabChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null);
  const [billSaving, setBillSaving] = useState(false);
  const [homeSearch, setHomeSearch] = useState("");
  const [homeTypeFilter, setHomeTypeFilter] = useState("all");
  const [homeStatusTab, setHomeStatusTab] = useState("active");

  const { canAdd: canAddHome } = useModuleActions("homes");
  const { canAdd: canAddFinance } = useModuleActions("finance");

  const { data: rawHomes = [] } = useQuery({ queryKey: ["homes"], queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }), staleTime: 3 * 60 * 1000 });
  const { data: residents = [] } = useQuery({ queryKey: ["all-residents"], queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });
  const { data: bills = [] } = useQuery({ queryKey: ["bills-dashboard"], queryFn: () => secureGateway.filter("Bill"), staleTime: 3 * 60 * 1000 });
  const { data: maintenanceLogs = [] } = useQuery({ queryKey: ["maintenance-logs"], queryFn: () => secureGateway.filter("MaintenanceLog", {}, "-reported_date", 200), staleTime: 3 * 60 * 1000 });
  const { data: homeDocuments = [] } = useQuery({ queryKey: ["home-documents"], queryFn: () => secureGateway.filter("HomeDocument", {}, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: homeExpenses = [] } = useQuery({ queryKey: ["home-expenses-dashboard"], queryFn: () => secureGateway.filter("HomeExpense", {}, "-created_date", 200), staleTime: 3 * 60 * 1000 });
  const { data: roleDefinitions = [], isLoading: isLoadingRoles } = useQuery({ queryKey: ["roleDefinitions"], queryFn: () => base44.roleDefinitions.list(), staleTime: 10 * 60 * 1000 });
  const { data: staffAssignments = [] } = useQuery({ 
    queryKey: ["staff-assignments", staffProfile?.id], 
    queryFn: () => base44.entities.StaffServiceAssignment.filter({ staff_id: staffProfile?.id }), 
    enabled: !!staffProfile?.id,
    staleTime: 5 * 60 * 1000 
  });

  // Built-in rank fallback for known system roles when roleDefinitions aren't loaded yet
  const BUILTIN_RANKS = {
    system_admin: 100, admin: 100,
    rsm: 50, regional_manager: 50,
    team_leader: 20,
    support_worker: 10,
  };
  const userRoleDef = roleDefinitions.find(r => r.role_name === staffProfile?.role);
  const roleRank = userRoleDef
    ? userRoleDef.rank
    : (BUILTIN_RANKS[staffProfile?.role] ?? 0);
  const isHighRank = isLoadingRoles
    ? (BUILTIN_RANKS[staffProfile?.role] ?? 0) > 10
    : roleRank > 10;

  // isAdmin: rank >= 50 (admin/system_admin/rsm sees all homes)
  // isTeamLeader: rank > 10 but < 50 (TL only sees homes they are assigned to via team_leader_id)
  // others: rank <= 10 (support workers see StaffServiceAssignment homes)
  const isAdmin = roleRank >= 50;
  const isTeamLeader = !isAdmin && roleRank > 10; // e.g. team_leader rank 20

  const homes = useMemo(() => {
    if (isAdmin) return rawHomes;
    const myId = staffProfile?.id;
    if (isTeamLeader && myId) {
      return rawHomes.filter(h =>
        h.team_leader_id === myId ||
        (h.team_leader_ids || []).includes(myId)
      );
    }
    // Support worker / rank <= 10: filter by StaffServiceAssignment
    const assignmentHomeIds = staffAssignments.map(a => a.home_id).filter(Boolean);
    const allAssignedIds = new Set([...assignmentHomeIds, ...(staffProfile?.home_ids || [])]);
    return rawHomes.filter(h => allAssignedIds.has(h.id));
  }, [rawHomes, isAdmin, isTeamLeader, staffProfile, staffAssignments]);

  const activeHomes = useMemo(() => homes.filter(h => h.status === "active" || !h.status || h.status === "Active"), [homes]);
  const homeIdsSet = useMemo(() => new Set(homes.map(h => h.id)), [homes]);

  const allowedResidents = useMemo(() => isHighRank ? residents : residents.filter(r => homeIdsSet.has(r.home_id)), [residents, isHighRank, homeIdsSet]);
  const allowedMaintenanceLogs = useMemo(() => isHighRank ? maintenanceLogs : maintenanceLogs.filter(m => homeIdsSet.has(m.home_id)), [maintenanceLogs, isHighRank, homeIdsSet]);
  const allowedHomeDocuments = useMemo(() => isHighRank ? homeDocuments : homeDocuments.filter(d => homeIdsSet.has(d.home_id)), [homeDocuments, isHighRank, homeIdsSet]);
  const allowedBills = useMemo(() => isHighRank ? bills : bills.filter(b => homeIdsSet.has(b.home_id)), [bills, isHighRank, homeIdsSet]);
  const allowedExpenses = useMemo(() => isHighRank ? homeExpenses : homeExpenses.filter(e => homeIdsSet.has(e.home_id)), [homeExpenses, isHighRank, homeIdsSet]);

  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const residentsByHome = useMemo(() => allowedResidents.reduce((acc, r) => { if (r.home_id) acc[r.home_id] = (acc[r.home_id] || 0) + 1; return acc; }, {}), [allowedResidents]);

  const totalCapacity = useMemo(() => activeHomes.reduce((s, h) => s + (h.capacity || h.bed_spaces || 0), 0), [activeHomes]);
  const occupiedBeds = useMemo(() => Object.values(residentsByHome).reduce((s, v) => s + v, 0), [residentsByHome]);
  const occupancyRate = totalCapacity > 0 ? Math.round((occupiedBeds / totalCapacity) * 100) : 0;

  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000);
  const complianceAlerts = useMemo(() => {
    const fromDocs = allowedHomeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) <= in90 && new Date(d.expiry_date) >= today);
    const expired = allowedHomeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) < today);
    return fromDocs.length + expired.length;
  }, [allowedHomeDocuments]);

  const openIssues = useMemo(() => allowedMaintenanceLogs.filter(m => m.status !== "resolved" && m.status !== "closed" && m.status !== "Resolved" && m.status !== "Closed"), [allowedMaintenanceLogs]);

  const pendingBills = useMemo(() => allowedBills.filter(b => b.status === "pending" || b.status === "overdue" || !b.status), [allowedBills]);
  const totalPendingAmount = useMemo(() => pendingBills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0), [pendingBills]);

  const allRecentActivities = useMemo(() => {
    return [
      ...allowedHomeDocuments.filter(d => d.expiry_date && new Date(d.expiry_date) <= in90).map(d => ({ icon: FileText, color: "text-blue-500 bg-blue-50", title: "Document expiring soon", sub: `${homes.find(h => h.id === d.home_id)?.name || "—"} · ${d.document_title || d.document_type}`, date: d.expiry_date, severity: "amber" })),
      ...openIssues.map(i => ({ icon: Wrench, color: "text-purple-500 bg-purple-50", title: "Maintenance issue logged", sub: `${homes.find(h => h.id === i.home_id)?.name || "—"}`, date: i.reported_date || i.created_date, severity: i.priority === "High" ? "red" : "amber" })),
      ...pendingBills.map(b => ({ icon: PoundSterling, color: "text-amber-500 bg-amber-50", title: "Bill / Rent attention needed", sub: `${homes.find(h => h.id === b.home_id)?.name || "—"} · £${Math.round(b.amount || 0).toLocaleString()}`, date: b.due_date || b.created_date })),
      ...homes.filter(h => h.lease_end && new Date(h.lease_end) <= in90 && new Date(h.lease_end) >= today).map(h => ({ icon: Home, color: "text-amber-500 bg-amber-50", title: "Lease expiring soon", sub: h.name, date: h.lease_end })),
    ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [allowedHomeDocuments, openIssues, pendingBills, homes, in90, today]);

  // Per-home outstanding bills
  const billsByHome = useMemo(() => {
    const acc = {};
    pendingBills.forEach(b => { if (b.home_id) acc[b.home_id] = (acc[b.home_id] || 0) + (parseFloat(b.amount) || 0); });
    return acc;
  }, [pendingBills]);

  // Compliance chart data
  const complianceChartData = useMemo(() => activeHomes.map(h => {
    const homeDocs = allowedHomeDocuments.filter(d => d.home_id === h.id);
    const current = homeDocs.filter(d => !d.expiry_date || new Date(d.expiry_date) > in90).length;
    const dueSoon = homeDocs.filter(d => d.expiry_date && new Date(d.expiry_date) > today && new Date(d.expiry_date) <= in90).length;
    const expired = homeDocs.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length;
    return { name: h.name?.slice(0, 14), current, dueSoon, expired };
  }), [activeHomes, allowedHomeDocuments]);

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
      const count = allowedHomeDocuments.filter(doc => doc.expiry_date && new Date(doc.expiry_date) >= monthStart && new Date(doc.expiry_date) <= monthEnd).length;
      return { month: format(d, "MMM yy"), count };
    });
  }, [allowedHomeDocuments]);

  // Status counts
  const statusCounts = useMemo(() => {
    const c = { active: 0, pending: 0, rejected: 0 };
    homes.forEach(h => {
      const s = (h.status || "active").toLowerCase();
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [homes]);

  // Homes overview filtered
  const filteredHomes = useMemo(() => homes.filter(h => {
    const s = (h.status || "active").toLowerCase();
    const matchStatus = s === homeStatusTab;
    const matchSearch = !homeSearch || h.name?.toLowerCase().includes(homeSearch.toLowerCase());
    const matchType = homeTypeFilter === "all" || h.type === homeTypeFilter;
    return matchStatus && matchSearch && matchType;
  }), [homes, homeSearch, homeTypeFilter, homeStatusTab]);



  const refresh = () => queryClient.invalidateQueries();

  const recentIssuesCard = (
    <SectionCard title="Recent Issues / Tickets" action={() => setModal("maintenance")} actionLabel="View all issues →">
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
        Resolved this month: {allowedMaintenanceLogs.filter(m => m.status === "resolved" || m.status === "Resolved").length}
      </div>
    </SectionCard>
  );

  return (
    <div className="p-5 space-y-5 bg-slate-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Home Module Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operational overview across all homes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAddHome && isHighRank && (
            <button onClick={() => setModal("addHome")} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Add Home
            </button>
          )}
          {canAddHome && (
            <button onClick={() => setModal("logIssue")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <Wrench className="w-4 h-4" /> Log Issue
            </button>
          )}
          {canAddFinance && (
            <button onClick={() => setModal("addBill")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <PoundSterling className="w-4 h-4" /> Add Bill
            </button>
          )}
          {isHighRank && (
            <button onClick={() => setModal("reports")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <BarChart2 className="w-4 h-4" /> View Reports
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className={`grid grid-cols-2 md:grid-cols-3 ${isHighRank ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-3`}>
        <KPICard icon={Building2} label="Active Homes" value={activeHomes.length} sub="+1 vs last month" color="blue" onClick={() => setModal("activeHomes")} />
        <KPICard icon={Bed} label="Occupied Beds" value={occupiedBeds} sub="+3 vs last month" color="green" onClick={() => setModal("occupancy")} />
        <KPICard icon={TrendingUp} label="Occupancy Rate" value={`${occupancyRate}%`} sub="+5% vs last month" color="teal" onClick={() => setModal("occupancy")} />
        <KPICard icon={ShieldAlert} label="Open Compliance Alerts" value={complianceAlerts} sub="+6 vs last month" color="red" onClick={() => setModal("compliance")} />
        {isHighRank && (
          <KPICard icon={PoundSterling} label="Rent Attention Needed" value={pendingBills.length} sub={`£${totalPendingAmount.toLocaleString()} total`} color="amber" onClick={() => setModal("bills")} />
        )}
        <KPICard icon={Wrench} label="Open Maintenance Issues" value={openIssues.length} sub="+2 vs last month" color="purple" onClick={() => setModal("maintenance")} />
      </div>

      {/* ── Charts Row ── */}
      <div className={`grid grid-cols-1 ${isHighRank ? 'xl:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>

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
        {isHighRank && (
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
        )}

        {/* Expiring Documents & Leases */}
        {isHighRank && (
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
        )}

        {!isHighRank && recentIssuesCard}
      </div>

      {/* ── Finance & Issues Row ── */}
      {isHighRank && (
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
        {recentIssuesCard}
      </div>
      )}

      {/* ── Homes Overview + Recent Activity ── */}
      <div className={`grid grid-cols-1 ${isHighRank ? 'xl:grid-cols-3' : 'xl:grid-cols-1'} gap-4`}>
        {/* Homes Overview */}
        <div className={`${isHighRank ? 'xl:col-span-2' : ''} bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
            <h3 className="text-sm font-bold text-slate-800">Homes Overview</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={homeSearch} onChange={e => setHomeSearch(e.target.value)} placeholder="Search homes…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-36 focus:outline-none" />
              </div>
              <select value={homeTypeFilter} onChange={e => setHomeTypeFilter(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                <option value="all">All Types</option>
                <option value="outreach">Outreach</option>
                <option value="24_hours">24 Hours Housing</option>
                <option value="18_plus">18+ Accommodation</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-6 border-b border-slate-100 px-5 pt-3">
            {[
              { id: "active", label: "Active", count: statusCounts.active, activeClass: "text-blue-600 border-blue-600", badgeClass: "bg-blue-50 text-blue-600" },
              { id: "pending", label: "Pending", count: statusCounts.pending, activeClass: "text-amber-600 border-amber-600", badgeClass: "bg-amber-50 text-amber-600" },
              { id: "rejected", label: "Rejected", count: statusCounts.rejected, activeClass: "text-red-600 border-red-600", badgeClass: "bg-red-50 text-red-600" },
            ]
            .filter(tab => isHighRank || tab.id === "active")
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setHomeStatusTab(tab.id)}
                className={`pb-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${homeStatusTab === tab.id ? tab.activeClass : "border-transparent text-slate-500 hover:text-slate-700"}`}
              >
                {tab.label}
                <span className={`py-0.5 px-2 rounded-full text-xs font-bold ${homeStatusTab === tab.id ? tab.badgeClass : "bg-slate-100 text-slate-500"}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
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
        {isHighRank && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col self-start w-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
            <button onClick={() => setModal("recentActivity")} className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
          </div>
          <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto custom-scrollbar">
            {allRecentActivities.slice(0, 7).map((item, i) => {
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
            {allRecentActivities.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No recent activity yet</p>}
          </div>
        </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal === "logIssue" && <AddMaintenanceModal properties={activeHomes} staffProfile={staffProfile} onClose={() => setModal(null)} onSuccess={() => { refresh(); setModal(null); }} />}
      {modal === "addBill" && (
        <BillForm
          properties={activeHomes}
          saving={billSaving}
          onClose={() => setModal(null)}
          onSubmit={async (data) => {
            setBillSaving(true);
            await base44.entities.Bill.create({ org_id: ORG_ID, ...data });
            setBillSaving(false);
            refresh();
            setModal(null);
          }}
        />
      )}
      {modal === "reports" && (
        <ReportsModal 
          onClose={() => setModal(null)} 
          homes={homes}
          residents={allowedResidents}
          documents={allowedHomeDocuments}
          bills={allowedBills}
          maintenanceLogs={allowedMaintenanceLogs}
          staff={staff}
        />
      )}
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
      {modal === "recentActivity" && <RecentActivityModal activities={allRecentActivities} onClose={() => setModal(null)} />}
      {modal === "addHome" && <AddHomeModal staffProfiles={staff} user={user} onClose={() => setModal(null)} onSuccess={() => { refresh(); setModal(null); }} />}
    </div>
  );
}