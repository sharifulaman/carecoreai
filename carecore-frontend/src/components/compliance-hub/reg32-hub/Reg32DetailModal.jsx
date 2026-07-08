import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_COLORS } from "@/lib/reg32Scoring";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertTriangle, FileQuestion, ThumbsUp, TrendingUp, Filter, CheckCircle2, FileText, StickyNote, Plus } from "lucide-react";

const DOMAIN_LABELS = {
  safety: "Safety & Safeguarding",
  relationships: "Relationships & Voice",
  health: "Health & Wellbeing",
  education: "Education & Outcomes",
  staffing: "Staffing & Supervision",
  complaints: "Complaints & Learning",
};

const FINDING_CAT_CONFIG = {
  Critical: { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  "Requires Evidence": { icon: FileQuestion, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Strengths: { icon: ThumbsUp, bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  Improvements: { icon: TrendingUp, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
};

function StatusBadge({ status }) {
  const sc = STATUS_COLORS[status] || STATUS_COLORS["Requires Action"];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${sc.bg} ${sc.text}`}>{status}</span>
  );
}

function EmptyState({ message }) {
  return <div className="py-8 text-center text-sm text-slate-400">{message}</div>;
}

function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-xs">
        <thead className="bg-slate-50">
          <tr>{headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-semibold text-slate-600">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ── Quality Score Breakdown ──────────────────────────────────────────────────
function QualityScoreView({ data }) {
  const entries = Object.entries(data);
  return (
    <DataTable headers={["Domain", "Score", "Status", "Evidence", "Risks"]}>
      {entries.map(([key, d]) => {
        const status = d.score >= 80 ? "Good" : d.score >= 60 ? "Requires Action" : "Critical";
        return (
          <tr key={key} className="border-t border-slate-100">
            <td className="px-3 py-2 font-medium text-slate-700">{DOMAIN_LABELS[key]}</td>
            <td className="px-3 py-2"><span className="font-bold">{d.score}</span>/100</td>
            <td className="px-3 py-2"><StatusBadge status={status} /></td>
            <td className="px-3 py-2 text-slate-500">{d.evidenceCount}</td>
            <td className="px-3 py-2"><span className={d.riskCount > 0 ? "text-red-600 font-medium" : "text-slate-400"}>{d.riskCount}</span></td>
          </tr>
        );
      })}
    </DataTable>
  );
}

// ── Homes List ───────────────────────────────────────────────────────────────
function HomesView({ data, onFilterHome, onClose }) {
  return (
    <div className="space-y-3">
      <DataTable headers={["#", "Home", "Service", "Score", "Status", "Flags", "Action"]}>
        {data.map((h, i) => (
          <tr key={h.homeId} className="border-t border-slate-100 hover:bg-slate-50">
            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-slate-700">{h.homeName}</td>
            <td className="px-3 py-2 text-slate-500">{h.serviceType}</td>
            <td className="px-3 py-2 font-bold">{h.score}/100</td>
            <td className="px-3 py-2"><StatusBadge status={h.status} /></td>
            <td className="px-3 py-2 text-slate-500">{h.flags}</td>
            <td className="px-3 py-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onFilterHome?.(h.homeId); onClose(); }}>
                <Filter className="w-3 h-3" /> Filter
              </Button>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}

// ── Young People List ────────────────────────────────────────────────────────
function YoungPeopleView({ data, homes }) {
  const homeName = (id) => homes?.find(h => h.id === id)?.name || "—";
  if (data.length === 0) return <EmptyState message="No young people in the selected homes." />;
  return (
    <DataTable headers={["Name", "Home", "Status", "Risk Level", "Education"]}>
      {data.slice(0, 50).map(yp => (
        <tr key={yp.id} className="border-t border-slate-100">
          <td className="px-3 py-2 font-medium text-slate-700">{yp.display_name || yp.full_name || "—"}</td>
          <td className="px-3 py-2 text-slate-500">{homeName(yp.home_id)}</td>
          <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${yp.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{yp.status}</span></td>
          <td className="px-3 py-2"><span className={`text-xs font-medium ${yp.risk_level === "critical" ? "text-red-600" : yp.risk_level === "high" ? "text-amber-600" : "text-slate-500"}`}>{yp.risk_level || "—"}</span></td>
          <td className="px-3 py-2 text-slate-500">{yp.education_status?.replace(/_/g, " ") || "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

// ── Evidence Readiness Items ─────────────────────────────────────────────────
function EvidenceReadinessView({ data }) {
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.label} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">{item.label}</p>
            <p className="text-xs text-slate-400">{item.completed} / {item.total} completed</p>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full ${item.percentage >= 80 ? "bg-green-500" : item.percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${item.percentage}%` }} />
          </div>
          <span className="text-sm font-bold text-slate-700 w-10 text-right">{item.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Risks / Findings ─────────────────────────────────────────────────────────
function RisksView({ data }) {
  if (data.length === 0) return <EmptyState message="No unresolved risks in this period." />;
  return (
    <div className="space-y-2">
      {data.map(f => {
        const cfg = FINDING_CAT_CONFIG[f.category] || FINDING_CAT_CONFIG.Improvements;
        const Icon = cfg.icon;
        return (
          <div key={f.id} className={`border ${cfg.border} ${cfg.bg} rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-4 h-4 ${cfg.text} shrink-0 mt-0.5`} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{f.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                  <span className="font-medium">{f.sourceModule}</span>
                  {f.affectedHomes?.length > 0 && <span>· {f.affectedHomes.join(", ")}</span>}
                  <span>· {f.owner}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LA Reviews ───────────────────────────────────────────────────────────────
function LAReviewsView({ data }) {
  if (data.length === 0) return <EmptyState message="No LA feedback records in this period." />;
  return (
    <DataTable headers={["Date", "Home", "Reviewer", "Status", "Notes"]}>
      {data.map(r => (
        <tr key={r.id} className="border-t border-slate-100">
          <td className="px-3 py-2 text-slate-500">{r.created_date?.slice(0, 10) || "—"}</td>
          <td className="px-3 py-2 font-medium text-slate-700">{r.home_name || "—"}</td>
          <td className="px-3 py-2 text-slate-500">{r.reviewer_name || "—"}</td>
          <td className="px-3 py-2"><span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{r.status || "—"}</span></td>
          <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{r.notes || r.feedback_summary || "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

// ── Supervision Records ──────────────────────────────────────────────────────
function SupervisionView({ data }) {
  if (data.length === 0) return <EmptyState message="No supervision records in this period." />;
  return (
    <DataTable headers={["Date", "Supervisee", "Supervisor", "Status", "Type"]}>
      {data.map(r => (
        <tr key={r.id} className="border-t border-slate-100">
          <td className="px-3 py-2 text-slate-500">{r.session_date?.slice(0, 10) || "—"}</td>
          <td className="px-3 py-2 font-medium text-slate-700">{r.supervisee_name || "—"}</td>
          <td className="px-3 py-2 text-slate-500">{r.supervisor_name || "—"}</td>
          <td className="px-3 py-2"><span className={`text-xs px-1.5 py-0.5 rounded ${r.status === "completed" ? "bg-green-100 text-green-700" : r.status === "missed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span></td>
          <td className="px-3 py-2 text-slate-500">{r.supervision_type || "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

// ── Domain Detail ────────────────────────────────────────────────────────────
function DomainDetailView({ data }) {
  const { domainKey, domainScore } = data;
  const status = domainScore.score >= 80 ? "Good" : domainScore.score >= 60 ? "Requires Action" : "Critical";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
        <div className="text-4xl font-black text-slate-800">{domainScore.score}<span className="text-lg text-slate-400">/100</span></div>
        <div>
          <StatusBadge status={status} />
          <p className="text-xs text-slate-500 mt-1">{DOMAIN_LABELS[domainKey]}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-500">Evidence Count</p>
          <p className="text-2xl font-bold text-slate-800">{domainScore.evidenceCount}</p>
        </div>
        <div className="p-3 border border-slate-200 rounded-lg">
          <p className="text-xs text-slate-500">Risk Count</p>
          <p className={`text-2xl font-bold ${domainScore.riskCount > 0 ? "text-red-600" : "text-slate-800"}`}>{domainScore.riskCount}</p>
        </div>
      </div>
    </div>
  );
}

// ── Home Detail ──────────────────────────────────────────────────────────────
function HomeDetailView({ data, onFilterHome, onClose }) {
  const h = data;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        <div>
          <p className="text-sm font-semibold text-slate-800">{h.homeName}</p>
          <p className="text-xs text-slate-500">{h.serviceType}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-slate-800">{h.score}<span className="text-sm text-slate-400">/100</span></div>
          <StatusBadge status={h.status} />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Domain Scores</p>
        <DataTable headers={["Domain", "Score", "Status", "Evidence", "Risks"]}>
          {Object.entries(h.domainScores || {}).map(([key, d]) => {
            const st = d.score >= 80 ? "Good" : d.score >= 60 ? "Requires Action" : "Critical";
            return (
              <tr key={key} className="border-t border-slate-100">
                <td className="px-3 py-2 font-medium text-slate-700">{DOMAIN_LABELS[key]}</td>
                <td className="px-3 py-2 font-bold">{d.score}/100</td>
                <td className="px-3 py-2"><StatusBadge status={st} /></td>
                <td className="px-3 py-2 text-slate-500">{d.evidenceCount}</td>
                <td className="px-3 py-2"><span className={d.riskCount > 0 ? "text-red-600 font-medium" : "text-slate-400"}>{d.riskCount}</span></td>
              </tr>
            );
          })}
        </DataTable>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { onFilterHome?.(h.homeId); onClose(); }}>
          <Filter className="w-3.5 h-3.5" /> Filter dashboard by this home
        </Button>
      </div>
    </div>
  );
}

// ── Finding Note Form ────────────────────────────────────────────────────────
function FindingNoteForm({ data, onClose }) {
  const [note, setNote] = useState("");
  const handleSubmit = () => {
    if (!note.trim()) { toast.error("Please enter a note"); return; }
    toast.success("Note saved to finding");
    onClose();
  };
  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 rounded-lg">
        <p className="text-sm font-semibold text-slate-700">{data.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{data.sourceModule} · {data.owner}</p>
      </div>
      <div>
        <Label className="text-xs">Manager Note</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note about this finding..." className="mt-1" rows={4} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} className="gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Save Note</Button>
      </DialogFooter>
    </div>
  );
}

// ── Finding Action Form ──────────────────────────────────────────────────────
function FindingActionForm({ data, onClose }) {
  const [action, setAction] = useState("");
  const [owner, setOwner] = useState(data.owner || "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const handleSubmit = () => {
    if (!action.trim()) { toast.error("Please enter an action"); return; }
    toast.success("Action created and linked to finding");
    onClose();
  };
  return (
    <div className="space-y-3">
      <div className="p-3 bg-slate-50 rounded-lg">
        <p className="text-sm font-semibold text-slate-700">{data.title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{data.sourceModule} · {data.owner}</p>
      </div>
      <div>
        <Label className="text-xs">Action Required</Label>
        <Textarea value={action} onChange={e => setAction(e.target.value)} placeholder="Describe the action to be taken..." className="mt-1" rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Responsible Person</Label>
          <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Name" className="mt-1 h-8 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Due Date</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 h-8 text-sm" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Priority</Label>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="mt-1 w-full h-8 px-2 text-sm border border-slate-200 rounded-lg">
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Create Action</Button>
      </DialogFooter>
    </div>
  );
}

// ── Finding Resolve Confirmation ─────────────────────────────────────────────
function FindingResolveForm({ data, onClose }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-slate-700">Mark this finding as resolved?</p>
          <p className="text-xs text-slate-500 mt-0.5">{data.title}</p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { toast.success("Finding marked as resolved"); onClose(); }} className="bg-green-600 hover:bg-green-700 gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Resolve
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Finding Evidence View ────────────────────────────────────────────────────
function FindingEvidenceView({ data, rawData }) {
  const sourceModule = data.sourceModule;
  let records = [];
  switch (sourceModule) {
    case "Safeguarding": records = rawData?.safeguardingRecords || []; break;
    case "Missing From Home": records = rawData?.mfhRecords || []; break;
    case "Complaints": records = rawData?.complaints || []; break;
    case "YP Views": records = rawData?.ypViews || []; break;
    case "LA Reviews": records = rawData?.laReviews || []; break;
    case "Daily Logs": records = rawData?.dailyLogs || []; break;
    case "Support Plans": records = rawData?.supportPlans || []; break;
    case "Appointments": records = rawData?.appointments || []; break;
    case "Supervision": records = rawData?.supervisionRecords || []; break;
    case "Incidents": records = rawData?.incidents || []; break;
    default: records = [];
  }
  if (records.length === 0) return <EmptyState message={`No ${sourceModule} records found.`} />;
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-2">{records.length} {sourceModule} record(s) linked to this finding.</p>
      <div className="max-h-96 overflow-y-auto space-y-2">
        {records.slice(0, 20).map((r, i) => (
          <div key={r.id || i} className="p-3 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-700">{r.home_name || r.resident_name || r.supervisee_name || "—"}</span>
              <span className="text-slate-400">{(r.date_of_concern || r.session_date || r.incident_datetime || r.created_date || r.date || "")?.slice(0, 10)}</span>
            </div>
            <p className="text-slate-500 line-clamp-2">{r.description || r.narrative || r.notes || r.title || r.summary || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Evidence Category View ───────────────────────────────────────────────────
function EvidenceCategoryView({ data, rawData }) {
  const label = data.label;
  let records = [];
  switch (label) {
    case "Young People's Views": records = rawData?.ypViews || []; break;
    case "LA Feedback": records = rawData?.laReviews || []; break;
    case "Complaints Resolved": records = (rawData?.complaints || []).filter(c => ["resolved", "closed"].includes(c.status)); break;
    case "Staff Supervision": records = rawData?.supervisionRecords || []; break;
    case "Key Work Sessions": records = (rawData?.dailyLogs || []).filter(d => d.log_type === "Key Work Session"); break;
    case "Health Support": records = rawData?.appointments || []; break;
    case "Education / Employment Outcomes": records = (rawData?.residents || []).filter(r => ["enrolled_college", "enrolled_school", "employed", "training"].includes(r.education_status)); break;
    case "Incident Learning": records = (rawData?.incidents || []).filter(i => i.status === "closed"); break;
    default: records = [];
  }
  if (records.length === 0) return <EmptyState message={`No records found for ${label}.`} />;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">{records.length} records · {data.completed}/{data.total} completed ({data.percentage}%)</p>
      </div>
      <div className="max-h-96 overflow-y-auto space-y-2">
        {records.slice(0, 30).map((r, i) => (
          <div key={r.id || i} className="p-3 border border-slate-200 rounded-lg text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-slate-700">{r.home_name || r.display_name || r.full_name || r.resident_name || r.supervisee_name || "—"}</span>
              <span className="text-slate-400">{(r.created_date || r.session_date || r.date || r.appointment_date || "")?.slice(0, 10)}</span>
            </div>
            <p className="text-slate-500 line-clamp-2">{r.description || r.narrative || r.notes || r.title || r.summary || r.education_status || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Modal Component ─────────────────────────────────────────────────────
function ModalBody({ modal, onClose, onFilterHome }) {
  switch (modal.type) {
    case "quality-score": return <QualityScoreView data={modal.data} />;
    case "homes": return <HomesView data={modal.data} onFilterHome={onFilterHome} onClose={onClose} />;
    case "young-people": return <YoungPeopleView data={modal.data} homes={modal.homes} />;
    case "evidence-readiness": return <EvidenceReadinessView data={modal.data} />;
    case "risks": return <RisksView data={modal.data} />;
    case "la-reviews": return <LAReviewsView data={modal.data} />;
    case "supervision": return <SupervisionView data={modal.data} />;
    case "domain-detail": return <DomainDetailView data={modal.data} />;
    case "home-detail": return <HomeDetailView data={modal.data} onFilterHome={onFilterHome} onClose={onClose} />;
    case "finding-note": return <FindingNoteForm data={modal.data} onClose={onClose} />;
    case "finding-action": return <FindingActionForm data={modal.data} onClose={onClose} />;
    case "finding-resolve": return <FindingResolveForm data={modal.data} onClose={onClose} />;
    case "finding-evidence": return <FindingEvidenceView data={modal.data} rawData={modal.rawData} />;
    case "evidence-category": return <EvidenceCategoryView data={modal.data} rawData={modal.rawData} />;
    default: return <EmptyState message="No data available." />;
  }
}

export default function Reg32DetailModal({ modal, onClose, onFilterHome }) {
  if (!modal) return null;
  return (
    <Dialog open={!!modal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modal.title}</DialogTitle>
        </DialogHeader>
        <ModalBody modal={modal} onClose={onClose} onFilterHome={onFilterHome} />
      </DialogContent>
    </Dialog>
  );
}