import { useState } from "react";
import { FileText, ClipboardList, MessageSquare, Package } from "lucide-react";
import { format } from "date-fns";
import DailyLogTimeline from "@/components/daily-logs/DailyLogTimeline";

const MINI_TABS = [
  { key: "daily-logs", label: "Daily Logs" },
  { key: "visit-reports", label: "Visit Reports" },
  { key: "complaints", label: "Complaints" },
  { key: "documents", label: "Documents" },
];

function EmptyState({ message }) {
  return <div className="text-center py-12 text-slate-400 text-sm">{message}</div>;
}

function RecordModal({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-4 capitalize">{record._type || "Record"}</h3>
        <div className="space-y-2 text-sm">
          {Object.entries(record).filter(([k, v]) => v && !["id", "org_id", "_type"].includes(k)).map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-slate-400 capitalize w-40 shrink-0">{k.replace(/_/g, " ")}</span>
              <span className="text-slate-700 font-medium break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Close</button>
      </div>
    </div>
  );
}

export default function WorkspaceRecordsTab({ resident, data, isAdminOrTL, staffProfile, user }) {
  const [activeTab, setActiveTab] = useState("daily-logs");
  const [selectedRecord, setSelectedRecord] = useState(null);

  return (
    <div className="space-y-4">
      {/* Mini tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none">
        {MINI_TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === t.key ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >{t.label}</button>
        ))}
      </div>

      <div className={activeTab !== "daily-logs" ? "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" : ""}>
        {activeTab === "daily-logs" && (
          <DailyLogTimeline resident={resident} staffProfile={staffProfile} user={user} />
        )}

        {activeTab === "visit-reports" && (
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Worker</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.visitReports || []).length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No visit reports found" /></td></tr>
              ) : (data.visitReports || []).map(v => (
                <tr key={v.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs text-slate-500">{v.date || "—"}</td>
                  <td className="px-4 py-3 text-xs">{v.worker_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{v.duration_minutes ? `${v.duration_minutes} min` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${v.status === "approved" ? "bg-green-100 text-green-700" : v.status === "submitted" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{v.status || "Draft"}</span>
                  </td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...v, _type: "Visit Report" })} className="text-xs text-teal-600 hover:underline">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "complaints" && (
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Raised By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Outcome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.complaints || []).length === 0 ? (
                <tr><td colSpan={6}><EmptyState message="No complaints recorded" /></td></tr>
              ) : (data.complaints || []).map(c => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs text-slate-500">{c.received_datetime ? format(new Date(c.received_datetime), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{c.complaint_type?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-xs">{c.complainant_name || c.complainant_type || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${c.status === "resolved" || c.status === "closed" ? "bg-green-100 text-green-700" : c.status === "investigating" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{c.status || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{c.outcome_category?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3"><button onClick={() => setSelectedRecord({ ...c, _type: "Complaint" })} className="text-xs text-teal-600 hover:underline">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "documents" && (
          <table className="w-full text-sm min-w-[600px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Document</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Uploaded</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Sign-off</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Action</th>
            </tr></thead>
            <tbody>
              {(data.residentDocuments || []).length === 0 ? (
                <tr><td colSpan={5}><EmptyState message="No documents found" /></td></tr>
              ) : (data.residentDocuments || []).map(d => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3 text-xs font-medium">{d.document_type || d.title || "Document"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.upload_date || d.created_date ? format(new Date(d.upload_date || d.created_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-xs">{d.uploaded_by_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.signoff_status === "signed" ? "bg-green-100 text-green-700" : d.signoff_required ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                      {d.signoff_status === "signed" ? "Signed" : d.signoff_required ? "Pending sign-off" : "No sign-off needed"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 hover:underline">View</a>
                    ) : (
                      <button onClick={() => setSelectedRecord({ ...d, _type: "Document" })} className="text-xs text-teal-600 hover:underline">View</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedRecord && <RecordModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </div>
  );
}