import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format, addMonths } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Plus, Download, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function StatusBadge({ status }) {
  const cfg = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    superseded: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</span>;
}

function PolicyFormModal({ existing, staffProfile, policyType, onClose, onSaved }) {
  const qc = useQueryClient();

  const pre = existing || {};
  const [versionNumber, setVersionNumber] = useState(pre.version_number || "v1.0");
  const [effectiveDate, setEffectiveDate] = useState(pre.effective_date || format(new Date(), "yyyy-MM-dd"));
  const [reviewDate, setReviewDate] = useState(pre.review_date || format(addMonths(new Date(), 12), "yyyy-MM-dd"));
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      let documentUrl = pre.document_url || "";
      let documentFileName = pre.document_file_name || "";
      if (docFile) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file: docFile });
        documentUrl = res.file_url;
        documentFileName = docFile.name;
        setUploading(false);
      }
      const payload = {
        org_id: ORG_ID,
        policy_type: policyType,
        version_number: versionNumber,
        effective_date: effectiveDate,
        review_date: reviewDate,
        status: "pending",
        prepared_by_id: staffProfile?.id,
        prepared_by_name: staffProfile?.full_name,
        prepared_at: new Date().toISOString(),
        document_url: documentUrl,
        document_file_name: documentFileName,
        document_uploaded_at: docFile ? new Date().toISOString() : (pre.document_uploaded_at || null),
        document_uploaded_by_id: docFile ? staffProfile?.id : (pre.document_uploaded_by_id || null),
      };

      if (existing?.id) {
        payload.previous_version_id = existing.id;
      }
      await secureGateway.create("ChildProtectionPolicy", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`policies-${policyType}`] });
      toast.success("Policy saved successfully");
      onSaved();
    },
  });

  const isValid = versionNumber && effectiveDate && reviewDate;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold">Add policy</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Version number *</label>
              <input type="text" value={versionNumber} onChange={e => setVersionNumber(e.target.value)}
                placeholder="v1.0" className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Effective date *</label>
              <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Review date *</label>
              <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Upload policy document (PDF, optional)</label>
            <input type="file" accept=".pdf,.doc,.docx"
              onChange={e => setDocFile(e.target.files[0])}
              className="mt-1 w-full text-sm text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mut.mutate()} disabled={!isValid || mut.isPending || uploading}>
            {mut.isPending || uploading ? "Saving…" : "Save Policy"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Reg21MissingChildPolicy({ staffProfile }) {
  const qc = useQueryClient();
  const policyType = "missing_child";
  const [activeTab, setActiveTab] = useState("policy");
  const [showForm, setShowForm] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: [`policies-${policyType}`],
    queryFn: () => secureGateway.filter("ChildProtectionPolicy", { org_id: ORG_ID, policy_type: policyType, is_deleted: false }, "-created_date", 50),
    staleTime: 60 * 1000,
  });

  const pendingPlan = plans.find(p => p.status === "pending");
  const activePlan = plans.find(p => p.status === "active");
  const isOverdue = activePlan?.review_date && new Date(activePlan.review_date) < new Date();
  const isReviewSoon = activePlan?.review_date && !isOverdue && new Date(activePlan.review_date) < new Date(Date.now() + 30 * 86400000);

  const approvePlan = useMutation({
    mutationFn: async (planToApprove) => {
      if (activePlan) {
        await secureGateway.update("ChildProtectionPolicy", activePlan.id, {
          status: "superseded",
          superseded_at: new Date().toISOString()
        });
      }
      await secureGateway.update("ChildProtectionPolicy", planToApprove.id, {
        status: "active",
        approved_by_id: staffProfile?.id,
        approved_by_name: staffProfile?.full_name,
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`policies-${policyType}`] });
      toast.success("Policy approved successfully");
    },
  });

  const canEdit = ["admin", "rsm", "admin_manager", "regional_manager"].includes(staffProfile?.role);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Regulation 21 — Missing Child Policy</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            A written policy must be in place setting out the procedure to be followed when a child is missing from the supported accommodation.
          </p>
        </div>
        {canEdit && !activePlan && !pendingPlan && (
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Create Policy</Button>
        )}
        {canEdit && (activePlan || pendingPlan) && (
          <Button variant="outline" onClick={() => setShowForm(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> New Version</Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`border rounded-xl p-4 ${activePlan ? "bg-card border-border" : "bg-red-50 border-red-200"}`}>
          <p className="text-xs text-muted-foreground">Current Version</p>
          <p className={`text-2xl font-bold mt-1 ${!activePlan ? "text-red-600" : ""}`}>{activePlan?.version_number || "None"}</p>
        </div>
        <div className={`border rounded-xl p-4 ${isOverdue ? "bg-red-50 border-red-200" : "bg-card border-border"}`}>
          <p className="text-xs text-muted-foreground">Review Due</p>
          <p className={`text-2xl font-bold mt-1 ${isOverdue ? "text-red-600" : ""}`}>
            {activePlan?.review_date ? format(new Date(activePlan.review_date), "dd MMM yyyy") : "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Policies</p>
          <p className="text-2xl font-bold mt-1">{plans.length}</p>
        </div>
      </div>

      {/* Status banner */}
      {!activePlan && !pendingPlan && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-600 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">No missing child policy exists. This is required for Ofsted registration.</p>
            {canEdit && (
              <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-red-700 font-semibold underline hover:no-underline">Create one now →</button>
            )}
          </div>
        </div>
      )}
      {activePlan && isOverdue && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-700">Your missing child policy is overdue for review (due {format(new Date(activePlan.review_date), "dd MMM yyyy")}).</p>
        </div>
      )}
      {activePlan && isReviewSoon && !isOverdue && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-700">Review due on {format(new Date(activePlan.review_date), "dd MMM yyyy")} — within 30 days.</p>
        </div>
      )}
      {activePlan && !isOverdue && !isReviewSoon && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700">Missing child policy is current. Version {activePlan.version_number} effective {format(new Date(activePlan.effective_date), "dd MMM yyyy")}.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          ["policy", "The Policy"],
          ["older_policies", "Older Policies"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1 — The Policy */}
      {activeTab === "policy" && (
        <div className="space-y-4">
          {isLoading && <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>}
          
          {pendingPlan && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                    <StatusBadge status="pending" />
                    New Version Pending Approval
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">Version {pendingPlan.version_number} was uploaded by {pendingPlan.prepared_by_name}. Approve to activate it.</p>
                </div>
                {canEdit && (
                  <Button onClick={() => approvePlan.mutate(pendingPlan)} disabled={approvePlan.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {approvePlan.isPending ? "Approving..." : "Approve Policy"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {!isLoading && !activePlan && !pendingPlan && (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
              No active missing child policy. {canEdit && <button className="text-primary hover:underline ml-1" onClick={() => setShowForm(true)}>Create one now →</button>}
            </div>
          )}
          
          {activePlan && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status={activePlan.status} />
                  <span className="text-sm font-semibold">{activePlan.version_number}</span>
                  <span className="text-xs text-muted-foreground">Effective {format(new Date(activePlan.effective_date), "dd MMM yyyy")}</span>
                </div>
                <div className="flex gap-2">
                  {activePlan.document_url && (
                    <a href={activePlan.document_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download PDF</Button>
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-xs text-muted-foreground">
                <div><span className="font-medium text-foreground">Prepared by:</span> {activePlan.prepared_by_name || "—"}{activePlan.prepared_at ? " · " + format(new Date(activePlan.prepared_at), "dd MMM yyyy") : ""}</div>
                <div><span className="font-medium text-foreground">Approved by:</span> {activePlan.approved_by_name || "—"}{activePlan.approved_at ? " · " + format(new Date(activePlan.approved_at), "dd MMM yyyy") : ""}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 — Older Policies */}
      {activeTab === "older_policies" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-semibold">Version</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Effective Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Superseded At</th>
                <th className="text-right px-4 py-3 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.filter(p => p.status !== "active" && p.status !== "pending").map((plan) => (
                <tr key={plan.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{plan.version_number || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={plan.status} />
                  </td>
                  <td className="px-4 py-3 text-xs">{plan.effective_date ? format(new Date(plan.effective_date), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-xs">{plan.superseded_at ? format(new Date(plan.superseded_at), "dd MMM yyyy") : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {plan.document_url && (
                      <a href={plan.document_url} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline inline-flex items-center">
                        <Download className="w-3 h-3 mr-1" /> PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {plans.filter(p => p.status !== "active" && p.status !== "pending").length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No older policies found.</div>
          )}
        </div>
      )}

      {showForm && (
        <PolicyFormModal
          existing={activePlan}
          staffProfile={staffProfile}
          policyType={policyType}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}
    </div>
  );
}