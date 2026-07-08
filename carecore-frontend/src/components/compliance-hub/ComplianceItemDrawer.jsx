import { useState } from "react";
import { X, FileText, Upload, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import Portal from "@/components/ui/Portal";

const CATEGORY_LABELS = {
  gas_safety:"Gas Safety",electrical_safety:"Electrical Safety",fire_safety:"Fire Safety",
  water_safety:"Water Safety",emergency_lighting:"Emergency Lighting",insurance:"Insurance",
  property_licence:"Property Licence",local_authority:"Local Authority",health_safety:"Health & Safety",
  risk_assessment:"Risk Assessment",staff_compliance:"Staff Compliance",yp_resident_records:"YP / Resident Records",
  audit_visit:"Audit Visit",policy_review:"Policy Review",maintenance_compliance:"Maintenance Compliance",other:"Other"
};

const STATUS_CFG = {
  current:{ label:"Current", cls:"bg-green-100 text-green-700" },
  expired:{ label:"Expired", cls:"bg-red-100 text-red-700" },
  due_in_30:{ label:"Due in 30 Days", cls:"bg-amber-100 text-amber-700" },
  due_in_90:{ label:"Due in 90 Days", cls:"bg-yellow-100 text-yellow-700" },
  review_required:{ label:"Review Required", cls:"bg-blue-100 text-blue-700" },
  missing_evidence:{ label:"Missing Evidence", cls:"bg-orange-100 text-orange-700" },
  renewal_requested:{ label:"Renewal Requested", cls:"bg-purple-100 text-purple-700" },
  assigned:{ label:"Assigned", cls:"bg-teal-100 text-teal-700" },
  closed:{ label:"Closed", cls:"bg-slate-100 text-slate-500" },
};

export default function ComplianceItemDrawer({ item, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const today = new Date();
  const days = item.expiry_date ? Math.round((new Date(item.expiry_date) - today) / 86400000) : null;

  const { data: evidence = [] } = useQuery({ queryKey: ["compliance-evidence", item.id], queryFn: () => base44.entities.ComplianceEvidence.filter({ compliance_item_id: item.id }), enabled: !!item.id });
  const { data: notes = [] } = useQuery({ queryKey: ["compliance-notes", item.id], queryFn: () => base44.entities.ComplianceNote.filter({ compliance_item_id: item.id }), enabled: !!item.id });
  const { data: tasks = [] } = useQuery({ queryKey: ["compliance-tasks", item.id], queryFn: () => base44.entities.ComplianceTask.filter({ compliance_item_id: item.id }), enabled: !!item.id });

  const statusCfg = STATUS_CFG[item.status] || STATUS_CFG.current;
  const TABS = ["Overview","Evidence","Audit Notes","Tasks"];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{item.item_name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{item.home_name} · {CATEGORY_LABELS[item.category] || item.category}</p>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
          {days !== null && (
            <span className={`text-xs font-bold ${days < 0 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-green-600"}`}>
              {days < 0 ? `${Math.abs(days)}d overdue` : `${days} days remaining`}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-100 overflow-x-auto scrollbar-none px-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t.toLowerCase().replace(/ /g,"-"))}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.toLowerCase().replace(/ /g,"-") ? "border-teal-500 text-teal-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            >{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" && (
            <div className="space-y-3">
              {[
                ["Home", item.home_name],
                ["Category", CATEGORY_LABELS[item.category] || item.category],
                ["Owner", item.owner_name],
                ["Priority", item.priority],
                ["Expiry Date", item.expiry_date ? format(new Date(item.expiry_date), "dd MMM yyyy") : "—"],
                ["Issue Date", item.issue_date ? format(new Date(item.issue_date), "dd MMM yyyy") : "—"],
                ["Renewal Frequency", item.renewal_frequency?.replace(/_/g," ")],
                ["Evidence Status", item.evidence_status?.replace(/_/g," ")],
                ["Reminder", item.reminder_days_before ? `${item.reminder_days_before} days before` : "—"],
                ["Last Reviewed", item.last_reviewed_date ? format(new Date(item.last_reviewed_date), "dd MMM yyyy") : "—"],
                ["Last Reviewed By", item.last_reviewed_by],
                ["Created By", item.created_by_name],
              ].map(([k, v]) => v ? (
                <div key={k} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
                  <span className="text-slate-400 text-xs">{k}</span>
                  <span className="font-medium text-slate-700 text-xs text-right max-w-[200px] capitalize">{v}</span>
                </div>
              ) : null)}
              {item.notes && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
                  <p className="text-xs text-slate-600">{item.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-3">
              {evidence.length === 0 ? (
                <div className="text-center py-10">
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No evidence uploaded yet</p>
                </div>
              ) : evidence.map(ev => (
                <div key={ev.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{ev.file_name || "Evidence file"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{ev.evidence_type} · Uploaded by {ev.uploaded_by_name}</p>
                      {ev.uploaded_at && <p className="text-[10px] text-slate-400">{format(new Date(ev.uploaded_at), "dd MMM yyyy, HH:mm")}</p>}
                    </div>
                    {ev.is_latest && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Latest</span>}
                  </div>
                  {ev.file_url && <a href={ev.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-teal-600 font-semibold hover:underline">View/Download →</a>}
                  {ev.notes && <p className="mt-1 text-xs text-slate-500">{ev.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {activeTab === "audit-notes" && (
            <div className="space-y-3">
              {notes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No notes yet</p>
              ) : notes.map(n => (
                <div key={n.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold capitalize">{n.note_type?.replace(/_/g," ")}</span>
                    <span className="text-[10px] text-slate-400">{n.added_by_name}</span>
                  </div>
                  <p className="text-xs text-slate-700">{n.note_text}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No tasks linked</p>
              ) : tasks.map(t => (
                <div key={t.id} className="border border-slate-200 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <p className="text-xs font-semibold text-slate-700">{t.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold capitalize ${t.status === "completed" ? "bg-green-100 text-green-700" : t.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{t.status?.replace(/_/g," ")}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Assigned to {t.assigned_to_name||"—"} · Due {t.due_date||"—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}