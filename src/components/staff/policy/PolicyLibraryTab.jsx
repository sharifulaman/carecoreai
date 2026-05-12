import { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { Search, Filter, FileText, MoreVertical, Eye, Download, UserPlus, X, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import PolicyProgressCharts from "./PolicyProgressCharts";
import StaffAcknowledgementTracker from "./StaffAcknowledgementTracker";
import PolicyActivityFeed from "./PolicyActivityFeed";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Draft: "bg-slate-100 text-slate-600",
  Archived: "bg-red-100 text-red-700",
  "Due Soon": "bg-amber-100 text-amber-700",
};

function ProgressBar({ value, color = "bg-teal-500" }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value || 0)}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700">{value || 0}%</span>
    </div>
  );
}

function PolicyActionMenu({ policy, onView, onAssign, onArchive, canManage }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
        <MoreVertical className="w-4 h-4 text-slate-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
            {[
              { label: "View Policy", action: onView, icon: Eye },
              { label: "View Assignments", action: () => setOpen(false), icon: UserPlus },
              ...(canManage ? [
                { label: "Assign Policy", action: () => { onAssign(); setOpen(false); }, icon: UserPlus },
                { label: "Archive Policy", action: () => { onArchive(policy); setOpen(false); }, icon: X, danger: true },
              ] : []),
            ].map(item => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${item.danger ? "text-red-600" : "text-slate-700"}`}>
                  <Icon className="w-3.5 h-3.5" />{item.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ViewPolicyModal({ policy, assignments, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);

  const myAssignment = assignments.find(a => a.policy_id === policy?.id && !["Exempted", "Cancelled"].includes(a.status));
  const canAcknowledge = myAssignment && myAssignment.viewed_at && !myAssignment.acknowledged_at;

  const handleView = async () => {
    if (myAssignment && !myAssignment.viewed_at) {
      await base44.entities.HRPolicyStaffAssignment.update(myAssignment.id, {
        viewed_at: new Date().toISOString(),
        status: "Viewed",
      });
    }
    if (policy.current_file_url) window.open(policy.current_file_url, "_blank");
  };

  const handleAcknowledge = async () => {
    if (!ackChecked) { toast.error("Please confirm you have read the policy"); return; }
    setAcknowledging(true);
    await base44.entities.HRPolicyStaffAssignment.update(myAssignment.id, {
      acknowledged_at: new Date().toISOString(),
      status: "Acknowledged",
      acknowledgement_text: "I confirm that I have read and understood this policy.",
    });
    await base44.entities.HRPolicyActivityEvent.create({
      org_id: ORG_ID,
      event_type: "Policy Acknowledged",
      event_title: `Policy acknowledged: ${policy.policy_title}`,
      policy_id: policy.id,
      policy_title: policy.policy_title,
      staff_id: myAssignment.staff_id,
      staff_name: myAssignment.staff_name,
      staff_assignment_id: myAssignment.id,
      performed_by_staff_id: myAssignment.staff_id,
      performed_by_name: myAssignment.staff_name,
      event_date: new Date().toISOString(),
    });
    toast.success("Policy acknowledged");
    setAcknowledging(false);
    setConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">{policy.policy_title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[["Category", policy.category], ["Version", `v${policy.current_version_number || "1.0"}`], ["Status", policy.status], ["Effective", policy.effective_date], ["Review Date", policy.review_date]].map(([k, v]) => v ? (
              <div key={k}><span className="text-slate-400">{k}: </span><span className="font-medium text-slate-700">{v}</span></div>
            ) : null)}
          </div>
          {policy.description && <p className="text-sm text-slate-600">{policy.description}</p>}
          {policy.current_file_url && (
            <button onClick={handleView} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
              <ExternalLink className="w-4 h-4" /> Open Policy Document
            </button>
          )}
          {myAssignment && !myAssignment.acknowledged_at && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              {!confirming ? (
                <button onClick={() => setConfirming(true)} disabled={!myAssignment.viewed_at}
                  className="w-full py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-40 transition-colors">
                  {myAssignment.viewed_at ? "Acknowledge This Policy" : "Open document first to acknowledge"}
                </button>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} className="mt-0.5" />
                    <p className="text-sm text-slate-700">I confirm that I have read and understood this policy.</p>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={handleAcknowledge} disabled={!ackChecked || acknowledging}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
                      {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Confirm Acknowledgement
                    </button>
                    <button onClick={() => setConfirming(false)} className="px-3 border border-slate-200 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {myAssignment?.acknowledged_at && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-sm text-green-700 font-semibold">✓ Policy acknowledged on {format(new Date(myAssignment.acknowledged_at), "dd MMM yyyy")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PolicyLibraryTab({ refreshKey, onRefresh, staffProfile, staff, homes, canManage, onAssign }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewingPolicy, setViewingPolicy] = useState(null);

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-policies", refreshKey],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["hr-staff-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyStaffAssignment.filter({ org_id: ORG_ID }, "-assigned_at", 500),
    staleTime: 60000,
  });

  const policyStats = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!map[a.policy_id]) map[a.policy_id] = { total: 0, viewed: 0, acked: 0, required: 0 };
      map[a.policy_id].total++;
      if (a.viewed_at) map[a.policy_id].viewed++;
      if (a.acknowledged_at) map[a.policy_id].acked++;
      if (a.acknowledgement_required) map[a.policy_id].required++;
    });
    return map;
  }, [assignments]);

  const filtered = useMemo(() => policies.filter(p => {
    const q = search.toLowerCase();
    return !q || p.policy_title?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  }), [policies, search]);

  const handleArchive = async (policy) => {
    if (window.confirm(`Archive "${policy.policy_title}"? This cannot be undone.`)) {
      await base44.entities.HRPolicy.update(policy.id, { status: "Archived", archived_at: new Date().toISOString() });
      queryClient.invalidateQueries({ queryKey: ["hr-policies"] });
      toast.success("Policy archived");
    }
  };

  return (
    <div className="space-y-4">
      {/* Main content + right panel */}
      <div className="flex gap-4">
        {/* Left: Policy library table */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Policy Library card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Policy Library</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none w-44" />
                </div>
                <button className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                  <Filter className="w-3.5 h-3.5" /> Filters
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{["Policy Name", "Category", "Version", "Assigned To", "Due Date", "Read Rate", "Ack Rate", "Status", "Action"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-16 text-center">
                      <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">No policies uploaded yet. Upload your first policy.</p>
                    </td></tr>
                  ) : filtered.map(policy => {
                    const stats = policyStats[policy.id] || { total: 0, viewed: 0, acked: 0 };
                    const readPct = stats.total > 0 ? Math.round((stats.viewed / stats.total) * 100) : 0;
                    const ackPct = stats.total > 0 ? Math.round((stats.acked / stats.total) * 100) : 0;
                    return (
                      <tr key={policy.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-400 shrink-0" />
                            <button onClick={() => setViewingPolicy(policy)} className="font-medium text-slate-700 hover:text-teal-600 transition-colors text-left">{policy.policy_title}</button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{policy.category}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">v{policy.current_version_number || "1.0"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{stats.total > 0 ? `${stats.total} staff` : "Unassigned"}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{policy.review_date || "—"}</td>
                        <td className="px-4 py-3"><ProgressBar value={readPct} color="bg-blue-500" /></td>
                        <td className="px-4 py-3"><ProgressBar value={ackPct} color="bg-green-500" /></td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[policy.status] || STATUS_COLORS.Draft}`}>{policy.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <PolicyActionMenu policy={policy} canManage={canManage} onView={() => setViewingPolicy(policy)} onAssign={onAssign} onArchive={handleArchive} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">Showing {filtered.length} of {policies.length} policies</div>}
          </div>

          {/* Charts */}
          <PolicyProgressCharts assignments={assignments} />

          {/* Staff Acknowledgement Tracker */}
          <StaffAcknowledgementTracker assignments={assignments} staff={staff} canManage={canManage} staffProfile={staffProfile} onRefresh={onRefresh} />
        </div>

        {/* Right panel — Quick Assignment + Activity */}
        <div className="w-72 xl:w-80 shrink-0 space-y-4">
          <PolicyActivityFeed refreshKey={refreshKey} />
        </div>
      </div>

      {viewingPolicy && (
        <ViewPolicyModal
          policy={viewingPolicy}
          assignments={assignments}
          onClose={() => { setViewingPolicy(null); onRefresh(); }}
        />
      )}
    </div>
  );
}