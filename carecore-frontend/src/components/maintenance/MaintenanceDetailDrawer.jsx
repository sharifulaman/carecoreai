import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { X, Edit2, CheckCircle2, Upload, MessageSquare, PoundSterling } from "lucide-react";
import { format } from "date-fns";
import { PriorityBadge, StatusBadge, CategoryBadge, CATEGORY_LABELS } from "./MaintenanceBadges";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const STATUSES = ["open","reported","assigned","in_progress","awaiting_contractor","awaiting_parts","planned","completed","cancelled"];

export default function MaintenanceDetailDrawer({ issue, onClose, onRefresh, user, staffProfile, canEdit = true }) {
  const [tab, setTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...issue });
  const [note, setNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionForm, setCompletionForm] = useState({ completion_note: "", actual_cost: "", completed_by_name: user?.full_name || "" });

  const { data: roleDefinitions = [] } = useQuery({ 
    queryKey: ["role-definitions"], 
    queryFn: () => base44.roles.fetchDefinitions(),
    staleTime: 5 * 60 * 1000
  });

  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank 
    ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
  const isSupportWorker = roleRank <= 10;

  const { data: staffList = [] } = useQuery({ 
    queryKey: ["staff"], 
    queryFn: () => secureGateway.filter("StaffProfile"), 
    staleTime: 5 * 60 * 1000 
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["maintenance-contracts", ORG_ID],
    queryFn: () => base44.entities.MaintenanceContract.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const staffOptions = staffList.map(s => s.full_name).filter(Boolean);
  const contractorOptions = Array.from(new Set(contracts.map(c => c.contractor_name).filter(Boolean)));

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.PropertyMaintenance.update(issue.id, {
      issue_title: form.issue_title,
      category: form.category,
      priority: form.priority,
      status: form.status,
      assigned_to_name: form.assigned_to_name,
      contractor_name: form.contractor_name,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      description: form.description,
      notes: form.notes,
      due_at: form.due_at,
    });
    setSaving(false);
    setEditMode(false);
    toast.success("Issue updated.");
    onRefresh();
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setAddingNote(true);
    await base44.entities.MaintenanceNote.create({
      org_id: ORG_ID,
      maintenance_id: issue.id,
      note: note.trim(),
      note_type: "general",
      created_by_name: user?.full_name || "Staff",
    });
    setNote("");
    setAddingNote(false);
    toast.success("Note added.");
  };

  const handleComplete = async () => {
    if (!completionForm.completion_note.trim()) {
      toast.error("Please add a completion note.");
      return;
    }
    setCompleting(true);
    await base44.entities.PropertyMaintenance.update(issue.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
      completed_by_name: completionForm.completed_by_name,
      actual_cost: completionForm.actual_cost ? parseFloat(completionForm.actual_cost) : undefined,
      notes: issue.notes ? issue.notes + "\n" + completionForm.completion_note : completionForm.completion_note,
    });
    setCompleting(false);
    toast.success("Issue marked as completed.");
    onRefresh();
    onClose();
  };

  const handleStatusChange = async (newStatus) => {
    await base44.entities.PropertyMaintenance.update(issue.id, { status: newStatus });
    toast.success(`Status updated to ${newStatus.replace(/_/g," ")}.`);
    onRefresh();
  };

  const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
  const PRIORITY_OPTIONS = ["low","medium","high","urgent"];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex-1 min-w-0 pr-4">
          <p className="text-xs text-slate-400 font-mono mb-1">#{issue.issue_reference}</p>
          <h2 className="text-base font-bold text-slate-900 leading-tight">{issue.issue_title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <PriorityBadge priority={issue.priority} />
            <StatusBadge status={issue.status} />
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4">
        {["details", "complete", "notes"]
          .filter(t => {
            if (t === "complete") {
              if (isSupportWorker) return false;
              return canEdit || issue.status === "completed";
            }
            return true;
          })
          .map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors capitalize ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
              {t === "complete" ? "Mark Complete" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))
        }
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === "details" && (
          <div className="space-y-4">
            {/* Edit toggle */}
            <div className="flex justify-end">
              {canEdit && (
                !editMode ? (
                  <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 text-xs text-blue-600 font-medium border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditMode(false)} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
                  </div>
                )
              )}
            </div>

            <dl className="space-y-3">
              {[
                { label: "Home", value: issue.home_name },
                { label: "Reported By", value: issue.reported_by_name || "—" },
                { label: "Reported At", value: issue.reported_at ? format(new Date(issue.reported_at), "d MMM yyyy, HH:mm") : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3">
                  <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">{label}</dt>
                  <dd className="text-xs text-slate-700">{value}</dd>
                </div>
              ))}
              <div className="flex gap-3 items-center">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Due At</dt>
                <dd className="flex-1">{editMode ? (
                  <input type="datetime-local" value={form.due_at ? form.due_at.slice(0, 16) : ""} onChange={e => set("due_at", e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none w-full max-w-[200px]" />
                ) : <span className="text-xs text-slate-700">{issue.due_at ? format(new Date(issue.due_at), "d MMM yyyy, HH:mm") : "—"}</span>}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Category</dt>
                <dd>{editMode ? (
                  <select value={form.category} onChange={e => set("category", e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none">
                    {CATEGORY_OPTIONS.map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                ) : <CategoryBadge category={issue.category} />}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Priority</dt>
                <dd>{editMode ? (
                  <select value={form.priority} onChange={e => set("priority", e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none">
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                ) : <PriorityBadge priority={issue.priority} />}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Status</dt>
                <dd>{editMode ? (
                  <select value={form.status} onChange={e => set("status", e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                  </select>
                ) : <StatusBadge status={issue.status} />}</dd>
              </div>
              <div className="flex gap-3 items-center">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Assigned To</dt>
                <dd className="flex-1">{editMode ? (
                  <div className="w-full max-w-[200px]">
                    <AutocompleteInput 
                      value={form.assigned_to_name || ""} 
                      onChange={val => set("assigned_to_name", val)}
                      options={staffOptions}
                      placeholder="Search staff..."
                    />
                  </div>
                ) : <span className="text-xs text-slate-700">{issue.assigned_to_name || "—"}</span>}</dd>
              </div>
              <div className="flex gap-3 items-center">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Contractor</dt>
                <dd className="flex-1">{editMode ? (
                  <div className="w-full max-w-[200px]">
                    <AutocompleteInput 
                      value={form.contractor_name || ""} 
                      onChange={val => set("contractor_name", val)}
                      options={contractorOptions}
                      placeholder="Search contractors..."
                    />
                  </div>
                ) : <span className="text-xs text-slate-700">{issue.contractor_name || "—"}</span>}</dd>
              </div>
              <div className="flex gap-3 items-center">
                <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Est. Cost</dt>
                <dd className="flex-1">{editMode ? (
                  <div className="flex items-center gap-1 w-full max-w-[200px]">
                    <span className="text-slate-500 text-xs">£</span>
                    <input type="number" step="0.01" value={form.estimated_cost || ""} onChange={e => set("estimated_cost", e.target.value)} className="text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none flex-1" />
                  </div>
                ) : <span className="text-xs text-slate-700">{issue.estimated_cost ? `£${issue.estimated_cost.toLocaleString()}` : "—"}</span>}</dd>
              </div>
              {issue.actual_cost && (
                <div className="flex gap-3">
                  <dt className="text-xs font-semibold text-slate-500 w-28 shrink-0">Actual Cost</dt>
                  <dd className="text-xs text-slate-700">£{issue.actual_cost.toLocaleString()}</dd>
                </div>
              )}
            </dl>

            {/* Description */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Description</p>
              {editMode ? (
                <textarea rows={3} value={form.description || ""} onChange={e => set("description", e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none resize-none" />
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">{issue.description || "No description provided."}</p>
              )}
            </div>

            {/* Evidence Photo */}
            {issue.photo_url && !editMode && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Evidence Photo</p>
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={issue.photo_url} alt="Evidence" className="w-full h-auto max-h-64 object-contain" />
                </div>
              </div>
            )}

            {/* Quick status change */}
            {canEdit && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Change Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.filter(s => s !== issue.status).map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium">
                      {s.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "complete" && (
          <div className="space-y-4">
            {issue.status === "completed" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Issue Completed</p>
                <p className="text-xs text-slate-400 mt-1">
                  {issue.completed_at ? format(new Date(issue.completed_at), "d MMM yyyy, HH:mm") : ""}
                  {issue.completed_by_name ? ` by ${issue.completed_by_name}` : ""}
                </p>
                {issue.actual_cost && <p className="text-xs text-slate-500 mt-1">Actual cost: £{issue.actual_cost}</p>}
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  Marking this issue as completed will update the status and log the completion details.
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Completed By</label>
                  <input type="text" value={completionForm.completed_by_name} onChange={e => setCompletionForm(f => ({ ...f, completed_by_name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Completion Note *</label>
                  <textarea rows={3} value={completionForm.completion_note} onChange={e => setCompletionForm(f => ({ ...f, completion_note: e.target.value }))} placeholder="Describe what was done to resolve this issue..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Actual Cost (£)</label>
                  <input type="number" min="0" step="0.01" value={completionForm.actual_cost} onChange={e => setCompletionForm(f => ({ ...f, actual_cost: e.target.value }))} placeholder="e.g. 145.00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <button onClick={handleComplete} disabled={completing} className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors">
                  {completing ? "Completing..." : "✓ Mark as Completed"}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "notes" && (
          <div className="space-y-4">

            {issue.notes && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Existing Notes</p>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{issue.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}