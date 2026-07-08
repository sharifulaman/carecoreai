import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format, addMonths } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Plus, Download, Printer, ChevronLeft, ChevronRight, X, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-green-100 text-green-700",
    under_review: "bg-amber-100 text-amber-700",
    superseded: "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</span>;
}

function Field({ label, value, empty = "Not recorded" }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{value || <span className="text-muted-foreground italic">{empty}</span>}</p>
    </div>
  );
}

// ─── Print cover letter ────────────────────────────────────────────────────────

function printCoverLetter(entry, plan, orgProfile) {
  const orgName = orgProfile?.provider_legal_name || orgProfile?.trading_name || "Our Organisation";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contingency Plan Cover Letter</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 50px; color: #333; line-height: 1.8; max-width: 650px; margin: 0 auto; }
    .date { text-align: right; margin-bottom: 30px; }
    .address { margin-bottom: 30px; }
    .subject { font-weight: bold; margin: 20px 0; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .signature { margin-top: 50px; }
    p { margin: 0 0 14px 0; }
  </style>
</head>
<body>
  <div class="date">${format(new Date(), "dd MMMM yyyy")}</div>
  <div class="address">
    <strong>${entry.contact_name || "The Designated Officer"}</strong><br>
    ${entry.la_name}<br>
    ${entry.contact_email ? "Email: " + entry.contact_email : ""}
  </div>
  <div class="subject">
    Re: Contingency Plan Policy — ${orgName}<br>
    Supported Accommodation (England) Regulations 2023 — Regulation 23
  </div>
  <p>Dear ${entry.contact_name || "Colleague"},</p>
  <p>Please find enclosed a copy of our Contingency Plan Policy prepared in accordance with Regulation 23 of the Supported Accommodation (England) Regulations 2023.</p>
  <p>This policy sets out the arrangements we have in place to protect children and ensure the appropriate transfer of records in the event that our supported accommodation undertaking ceases to operate, whether permanently or temporarily.</p>
  <p>This document is provided to your authority as required by Regulation 23(2) of the above Regulations.</p>
  <p>If you have any questions please do not hesitate to contact us${orgProfile?.contact_email ? " at " + orgProfile.contact_email : ""}${orgProfile?.contact_phone ? " or " + orgProfile.contact_phone : ""}.</p>
  <div class="signature">
    <p>Yours sincerely,</p>
    <br><br>
    <p>_______________________________</p>
    <p><strong>${plan?.approved_by_name || plan?.prepared_by_name || "Registered Service Manager"}</strong></p>
    <p>Registered Service Manager</p>
    <p>${orgName}</p>
  </div>
</body>
</html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function printPlan(plan, orgProfile) {
  const orgName = orgProfile?.provider_legal_name || "Organisation";
  const scenarios = [
    plan?.covers_permanent_closure && "Permanent closure",
    plan?.covers_temporary_closure && "Temporary closure",
    plan?.covers_registration_conditions && "Conditions imposed on registration",
    plan?.covers_registration_suspension && "Suspension of registration",
    plan?.covers_registration_cancellation && "Cancellation of registration",
  ].filter(Boolean).join(", ") || "Not specified";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Contingency Plan Policy — ${orgName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 20px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 10px; }
    h2 { font-size: 14px; font-weight: bold; margin-top: 28px; color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    p { margin: 0 0 10px 0; }
    .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
    pre { font-family: Arial; white-space: pre-wrap; word-wrap: break-word; font-size: 13px; }
    footer { margin-top: 40px; border-top: 1px solid #999; padding-top: 16px; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <h1>Contingency Plan Policy</h1>
  <div class="meta">
    <strong>Organisation:</strong> ${orgName} &nbsp;|&nbsp;
    <strong>Version:</strong> ${plan?.version_number || "—"} &nbsp;|&nbsp;
    <strong>Effective:</strong> ${plan?.effective_date ? format(new Date(plan.effective_date), "dd MMMM yyyy") : "—"} &nbsp;|&nbsp;
    <strong>Review due:</strong> ${plan?.review_date ? format(new Date(plan.review_date), "dd MMMM yyyy") : "—"}
  </div>
  <p>This policy is prepared in accordance with Regulation 23 of the Supported Accommodation (England) Regulations 2023.</p>

  <h2>1. Cessation Scenarios Covered</h2>
  <pre>${scenarios}</pre>

  <h2>2. What Happens to Children</h2>
  <p><strong>Transfer plan:</strong></p>
  <pre>${plan?.children_transfer_plan || "Not recorded"}</pre>
  <p><strong>Emergency accommodation arrangements:</strong></p>
  <pre>${plan?.emergency_accommodation_arrangements || "Not recorded"}</pre>
  <p><strong>LA notification process:</strong></p>
  <pre>${plan?.la_notification_process || "Not recorded"}</pre>
  <p><strong>Child notification process:</strong></p>
  <pre>${plan?.child_notification_process || "Not recorded"}</pre>
  <p><strong>Support continuity plan:</strong></p>
  <pre>${plan?.support_continuity_plan || "Not recorded"}</pre>

  <h2>3. What Happens to Records</h2>
  <p><strong>Responsible person:</strong> ${plan?.records_transfer_responsible_person || "—"}</p>
  <p><strong>Transfer process:</strong></p>
  <pre>${plan?.records_transfer_process || "Not recorded"}</pre>
  <p><strong>Interim storage:</strong></p>
  <pre>${plan?.records_storage_interim || "Not recorded"}</pre>
  <p><strong>Timescale:</strong> ${plan?.records_transfer_timescale || "—"}</p>
  <p><strong>Data protection measures:</strong></p>
  <pre>${plan?.data_protection_measures || "Not recorded"}</pre>

  <h2>4. Staffing During Cessation</h2>
  <p><strong>Designated lead:</strong> ${plan?.designated_lead_during_cessation_name || "—"}</p>
  <p><strong>Staff notification process:</strong></p>
  <pre>${plan?.staff_notification_process || "Not recorded"}</pre>
  <p><strong>RSM responsibilities:</strong></p>
  <pre>${plan?.rsm_responsibilities || "Not recorded"}</pre>

  <h2>5. Communication Plan</h2>
  <p><strong>Ofsted notification:</strong></p>
  <pre>${plan?.ofsted_notification_process || "Not recorded"}</pre>
  <p><strong>Other stakeholders:</strong></p>
  <pre>${plan?.other_stakeholder_notifications || "Not recorded"}</pre>

  <h2>6. Sign-off</h2>
  <p><strong>Prepared by:</strong> ${plan?.prepared_by_name || "—"}${plan?.prepared_at ? " on " + format(new Date(plan.prepared_at), "dd MMM yyyy") : ""}</p>
  <p><strong>Reviewed by:</strong> ${plan?.reviewed_by_name || "—"}${plan?.reviewed_at ? " on " + format(new Date(plan.reviewed_at), "dd MMM yyyy") : ""}</p>
  <p><strong>Approved by:</strong> ${plan?.approved_by_name || "—"}${plan?.approved_at ? " on " + format(new Date(plan.approved_at), "dd MMM yyyy") : ""}</p>

  <footer>
    Prepared under Regulation 23, Supported Accommodation (England) Regulations 2023. &nbsp; ${orgName}
  </footer>
</body>
</html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ─── Create/Edit Plan Modal (6 steps) ─────────────────────────────────────────

function PlanFormModal({ existing, allPlans, staff, staffProfile, orgProfile, onClose, onSaved }) {
  const qc = useQueryClient();

  const pre = existing || {};
  const [versionNumber, setVersionNumber] = useState(pre.version_number || "v1.0");
  const [effectiveDate, setEffectiveDate] = useState(pre.effective_date || format(new Date(), "yyyy-MM-dd"));
  const [reviewDate, setReviewDate] = useState(pre.review_date || format(addMonths(new Date(), 12), "yyyy-MM-dd"));
  const [coversPerm, setCoversPerm] = useState(pre.covers_permanent_closure ?? false);
  const [coversTemp, setCoversTemp] = useState(pre.covers_temporary_closure ?? false);
  const [coversRegCond, setCoversRegCond] = useState(pre.covers_registration_conditions ?? false);
  const [coversRegSusp, setCoversRegSusp] = useState(pre.covers_registration_suspension ?? false);
  const [coversRegCanc, setCoversRegCanc] = useState(pre.covers_registration_cancellation ?? false);

  const [childrenTransferPlan, setChildrenTransferPlan] = useState(pre.children_transfer_plan || "");
  const [emergencyAccomm, setEmergencyAccomm] = useState(pre.emergency_accommodation_arrangements || "");
  const [laNotifProcess, setLaNotifProcess] = useState(pre.la_notification_process || "");
  const [childNotifProcess, setChildNotifProcess] = useState(pre.child_notification_process || "");
  const [supportContinuity, setSupportContinuity] = useState(pre.support_continuity_plan || "");

  const [recordsResponsible, setRecordsResponsible] = useState(pre.records_transfer_responsible_person || "");
  const [recordsProcess, setRecordsProcess] = useState(pre.records_transfer_process || "");
  const [recordsStorage, setRecordsStorage] = useState(pre.records_storage_interim || "");
  const [recordsTimescale, setRecordsTimescale] = useState(pre.records_transfer_timescale || "");
  const [dataProtection, setDataProtection] = useState(pre.data_protection_measures || "");

  const [leadId, setLeadId] = useState(pre.designated_lead_during_cessation_id || "");
  const [staffNotif, setStaffNotif] = useState(pre.staff_notification_process || "");
  const [rsmResp, setRsmResp] = useState(pre.rsm_responsibilities || "");

  const [ofstedNotif, setOfstedNotif] = useState(pre.ofsted_notification_process || "");
  const [otherStakeholders, setOtherStakeholders] = useState(pre.other_stakeholder_notifications || "");

  const [preparedById, setPreparedById] = useState(pre.prepared_by_id || staffProfile?.id || "");
  const [reviewedById, setReviewedById] = useState(pre.reviewed_by_id || "");
  const [approvedById, setApprovedById] = useState(pre.approved_by_id || "");
  const [changeSummary, setChangeSummary] = useState(pre.change_summary || "");
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const leadName = staff.find(s => s.id === leadId)?.full_name || "";
  const preparedByName = staff.find(s => s.id === preparedById)?.full_name || "";
  const reviewedByName = staff.find(s => s.id === reviewedById)?.full_name || "";
  const approvedByName = staff.find(s => s.id === approvedById)?.full_name || "";

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
        version_number: versionNumber,
        effective_date: effectiveDate,
        review_date: reviewDate,
        status: "pending",
        covers_permanent_closure: coversPerm,
        covers_temporary_closure: coversTemp,
        covers_registration_conditions: coversRegCond,
        covers_registration_suspension: coversRegSusp,
        covers_registration_cancellation: coversRegCanc,
        children_transfer_plan: childrenTransferPlan,
        emergency_accommodation_arrangements: emergencyAccomm,
        la_notification_process: laNotifProcess,
        child_notification_process: childNotifProcess,
        support_continuity_plan: supportContinuity,
        records_transfer_responsible_person: recordsResponsible,
        records_transfer_process: recordsProcess,
        records_storage_interim: recordsStorage,
        records_transfer_timescale: recordsTimescale,
        data_protection_measures: dataProtection,
        designated_lead_during_cessation_id: leadId,
        designated_lead_during_cessation_name: leadName,
        staff_notification_process: staffNotif,
        rsm_responsibilities: rsmResp,
        ofsted_notification_process: ofstedNotif,
        other_stakeholder_notifications: otherStakeholders,
        prepared_by_id: preparedById,
        prepared_by_name: preparedByName,
        prepared_at: new Date().toISOString(),
        reviewed_by_id: reviewedById,
        reviewed_by_name: reviewedByName,
        reviewed_at: reviewedById ? new Date().toISOString() : null,
        approved_by_id: approvedById,
        approved_by_name: approvedByName,
        approved_at: approvedById ? new Date().toISOString() : null,
        document_url: documentUrl,
        document_file_name: documentFileName,
        document_uploaded_at: docFile ? new Date().toISOString() : (pre.document_uploaded_at || null),
        document_uploaded_by_id: docFile ? staffProfile?.id : (pre.document_uploaded_by_id || null),
        change_summary: changeSummary,
        la_copies_sent: pre.la_copies_sent || [],
      };

      if (existing?.id) {
        payload.previous_version_id = existing.id;
      }
      await secureGateway.create("ContingencyPlan", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reg23-plans"] });
      onSaved();
    },
  });

  const isValid = versionNumber && effectiveDate && reviewDate;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold">Add policy</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Body */}
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

        {/* Footer */}
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

// ─── Send Copy to LA modal ─────────────────────────────────────────────────────

function SendCopyModal({ plan, staffProfile, onClose, onSaved }) {
  const qc = useQueryClient();
  const [laName, setLaName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [method, setMethod] = useState("email");
  const [sentDate, setSentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const newEntry = {
        la_name: laName,
        contact_name: contactName,
        contact_email: contactEmail,
        method,
        sent_date: sentDate,
        sent_by_id: staffProfile?.id,
        sent_by_name: staffProfile?.full_name,
        confirmed_received: false,
        notes,
      };
      const updated = [...(plan.la_copies_sent || []), newEntry];
      await secureGateway.update("ContingencyPlan", plan.id, { la_copies_sent: updated });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reg23-plans"] }); onSaved(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Send Copy to Local Authority</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">LA Name *</label>
            <input type="text" value={laName} onChange={e => setLaName(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contact name</label>
              <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contact email</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="email">Email</option>
                <option value="letter">Letter</option>
                <option value="portal">Portal</option>
                <option value="hand_delivered">Hand delivered</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Date sent</label>
              <input type="date" value={sentDate} onChange={e => setSentDate(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={() => mut.mutate()} disabled={!laName || mut.isPending}>
            {mut.isPending ? "Saving…" : "Log Copy Sent"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Reg23ContingencyPlan({ staffProfile }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("policy");
  const [showForm, setShowForm] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [showSendCopy, setShowSendCopy] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["reg23-plans"],
    queryFn: () => secureGateway.filter("ContingencyPlan", { org_id: ORG_ID, is_deleted: false }, "-created_date", 50),
    staleTime: 60 * 1000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["reg23-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: orgProfile } = useQuery({
    queryKey: ["reg23-org"],
    queryFn: () => secureGateway.filter("OrganisationProfile", {}).then(r => r[0]),
    staleTime: 10 * 60 * 1000,
  });

  const pendingPlan = plans.find(p => p.status === "pending");
  const activePlan = plans.find(p => p.status === "active");
  const totalLaCopies = plans.reduce((sum, p) => sum + (p.la_copies_sent?.length || 0), 0);
  const isOverdue = activePlan?.review_date && new Date(activePlan.review_date) < new Date();
  const isReviewSoon = activePlan?.review_date && !isOverdue && new Date(activePlan.review_date) < new Date(Date.now() + 30 * 86400000);

  const confirmCopy = useMutation({
    mutationFn: async ({ plan, idx }) => {
      const updated = [...(plan.la_copies_sent || [])];
      updated[idx] = { ...updated[idx], confirmed_received: true, confirmation_date: format(new Date(), "yyyy-MM-dd") };
      await secureGateway.update("ContingencyPlan", plan.id, { la_copies_sent: updated });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reg23-plans"] }),
  });

  const approvePlan = useMutation({
    mutationFn: async (planToApprove) => {
      if (activePlan) {
        await secureGateway.update("ContingencyPlan", activePlan.id, {
          status: "superseded",
          superseded_at: new Date().toISOString()
        });
      }
      await secureGateway.update("ContingencyPlan", planToApprove.id, {
        status: "active",
        approved_by_id: staffProfile?.id,
        approved_by_name: staffProfile?.full_name,
        approved_at: new Date().toISOString()
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reg23-plans"] }),
  });

  const canEdit = ["admin", "rsm", "admin_manager", "regional_manager"].includes(staffProfile?.role);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Reg 23 — Contingency Plan Policy</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            A written contingency plan policy must be in place covering what happens to children and their records if the undertaking ceases to provide supported accommodation. A copy must be provided to any local authority considering placing a child.
          </p>
        </div>
        {canEdit && !activePlan && (
          <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Create Plan</Button>
        )}
        {canEdit && activePlan && (
          <Button variant="outline" onClick={() => setShowNewVersion(true)} className="gap-2 shrink-0"><Plus className="w-4 h-4" /> New Version</Button>
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
          <p className="text-xs text-muted-foreground">Total Policy</p>
          <p className="text-2xl font-bold mt-1">{plans.length}</p>
        </div>
      </div>

      {/* Status banner */}
      {!activePlan && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-600 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-700">No contingency plan policy exists. This is required for Ofsted registration under Regulation 23 of the Supported Accommodation (England) Regulations 2023.</p>
            {canEdit && (
              <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-red-700 font-semibold underline hover:no-underline">Create one now →</button>
            )}
          </div>
        </div>
      )}
      {activePlan && isOverdue && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-700">Your contingency plan policy is overdue for review (due {format(new Date(activePlan.review_date), "dd MMM yyyy")}).</p>
        </div>
      )}
      {activePlan && isReviewSoon && !isOverdue && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-700">Review due on {format(new Date(activePlan.review_date), "dd MMM yyyy")} — within 30 days.</p>
        </div>
      )}
      {activePlan && !isOverdue && !isReviewSoon && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700">Contingency plan policy is current. Version {activePlan.version_number} effective {format(new Date(activePlan.effective_date), "dd MMM yyyy")}.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          ["policy", "The Policy"],
          ["older_policies", "Older Policies"],
          /* ["la_copies", "LA Copies Sent"] */
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
            {key === "la_copies" && totalLaCopies > 0 && (
              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{totalLaCopies}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1 — The Policy */}
      {activeTab === "policy" && (
        <div className="space-y-4">
          {isLoading && <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>}
          {!isLoading && !activePlan && (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
              No active contingency plan policy. {canEdit && <button className="text-primary hover:underline ml-1" onClick={() => setShowForm(true)}>Create one now →</button>}
            </div>
          )}
          {activePlan && (
            <>
              {/* Policy header card */}
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
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printPlan(activePlan, orgProfile)}>
                      <Printer className="w-3.5 h-3.5" /> Print
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-xs text-muted-foreground">
                  <div><span className="font-medium text-foreground">Prepared by:</span> {activePlan.prepared_by_name || "—"}{activePlan.prepared_at ? " · " + format(new Date(activePlan.prepared_at), "dd MMM yyyy") : ""}</div>
                  <div><span className="font-medium text-foreground">Reviewed by:</span> {activePlan.reviewed_by_name || "—"}{activePlan.reviewed_at ? " · " + format(new Date(activePlan.reviewed_at), "dd MMM yyyy") : ""}</div>
                  <div><span className="font-medium text-foreground">Approved by:</span> {activePlan.approved_by_name || "—"}{activePlan.approved_at ? " · " + format(new Date(activePlan.approved_at), "dd MMM yyyy") : ""}</div>
                </div>
              </div>
            </>
          )}

          {pendingPlan && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mt-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Pending</span>
                  <span className="text-sm font-semibold">{pendingPlan.version_number}</span>
                  <span className="text-xs text-amber-700">Effective {format(new Date(pendingPlan.effective_date), "dd MMM yyyy")}</span>
                </div>
                <div className="flex gap-2">
                  {pendingPlan.document_url && (
                    <a href={pendingPlan.document_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download PDF</Button>
                    </a>
                  )}
                  {canEdit && (
                    <Button 
                      size="sm" 
                      className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" 
                      onClick={() => approvePlan.mutate(pendingPlan)}
                      disabled={approvePlan.isPending}
                    >
                      {approvePlan.isPending ? "Approving..." : "Approve Policy"}
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 text-xs text-amber-800/80">
                <div><span className="font-medium text-amber-900">Prepared by:</span> {pendingPlan.prepared_by_name || "—"}{pendingPlan.prepared_at ? " · " + format(new Date(pendingPlan.prepared_at), "dd MMM yyyy") : ""}</div>
                <div><span className="font-medium text-amber-900">Reviewed by:</span> {pendingPlan.reviewed_by_name || "—"}{pendingPlan.reviewed_at ? " · " + format(new Date(pendingPlan.reviewed_at), "dd MMM yyyy") : ""}</div>
                <div><span className="font-medium text-amber-900">Approved by:</span> Pending Approval</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 — Older Policies */}
      {activeTab === "older_policies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Historical versions of the contingency plan policy.</p>
          </div>
          {plans.filter(p => p.status !== "active").length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
              No older policies found.
            </div>
          ) : (
            <div className="space-y-3">
              {plans.filter(p => p.status !== "active").map(plan => (
                <div key={plan.id} className="bg-card border border-border rounded-xl p-5 opacity-75 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={plan.status} />
                      <span className="text-sm font-semibold">{plan.version_number}</span>
                      <span className="text-xs text-muted-foreground">Effective {format(new Date(plan.effective_date), "dd MMM yyyy")}</span>
                    </div>
                    <div className="flex gap-2">
                      {plan.document_url && (
                        <a href={plan.document_url} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-3.5 h-3.5" /> Download PDF</Button>
                        </a>
                      )}
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printPlan(plan, orgProfile)}>
                        <Printer className="w-3.5 h-3.5" /> Print
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4 text-xs text-muted-foreground">
                    <div><span className="font-medium text-foreground">Prepared by:</span> {plan.prepared_by_name || "—"}{plan.prepared_at ? " · " + format(new Date(plan.prepared_at), "dd MMM yyyy") : ""}</div>
                    <div><span className="font-medium text-foreground">Reviewed by:</span> {plan.reviewed_by_name || "—"}{plan.reviewed_at ? " · " + format(new Date(plan.reviewed_at), "dd MMM yyyy") : ""}</div>
                    <div><span className="font-medium text-foreground">Approved by:</span> {plan.approved_by_name || "—"}{plan.approved_at ? " · " + format(new Date(plan.approved_at), "dd MMM yyyy") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3 — LA Copies
      {activeTab === "la_copies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Log of every local authority that has been provided with a copy of the policy per Reg 23(2).</p>
            {activePlan && (
              <Button onClick={() => setShowSendCopy(true)} className="gap-2"><Plus className="w-4 h-4" /> Send Copy to LA</Button>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["LA Name", "Contact", "Date Sent", "Method", "Sent By", "Confirmed", "Confirmation Date", "Notes", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.flatMap(plan =>
                    (plan.la_copies_sent || []).map((entry, idx) => (
                      <tr key={`${plan.id}-${idx}`} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 text-xs font-medium">{entry.la_name}</td>
                        <td className="px-4 py-3 text-xs">
                          <div>{entry.contact_name || "—"}</div>
                          {entry.contact_email && <div className="text-muted-foreground">{entry.contact_email}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs">{entry.sent_date ? format(new Date(entry.sent_date), "dd MMM yyyy") : "—"}</td>
                        <td className="px-4 py-3 text-xs capitalize">{entry.method?.replace(/_/g, " ") || "—"}</td>
                        <td className="px-4 py-3 text-xs">{entry.sent_by_name || "—"}</td>
                        <td className="px-4 py-3">
                          {entry.confirmed_received
                            ? <span className="flex items-center gap-1 text-xs text-green-700"><Check className="w-3.5 h-3.5" /> Yes</span>
                            : <span className="text-xs text-muted-foreground">Pending</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">{entry.confirmation_date ? format(new Date(entry.confirmation_date), "dd MMM yyyy") : "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{entry.notes || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {!entry.confirmed_received && (
                              <button onClick={() => confirmCopy.mutate({ plan, idx })}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium whitespace-nowrap">
                                Mark confirmed
                              </button>
                            )}
                            <button onClick={() => printCoverLetter(entry, plan, orgProfile)}
                              className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium whitespace-nowrap">
                              Cover letter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {plans.flatMap(p => p.la_copies_sent || []).length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">No copies sent yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      */}

      {/* Modals */}
      {(showForm || showNewVersion) && (
        <PlanFormModal
          existing={showNewVersion ? activePlan : null}
          allPlans={plans}
          staff={staff}
          staffProfile={staffProfile}
          orgProfile={orgProfile}
          onClose={() => { setShowForm(false); setShowNewVersion(false); }}
          onSaved={() => { setShowForm(false); setShowNewVersion(false); }}
        />
      )}
      {showSendCopy && activePlan && (
        <SendCopyModal
          plan={activePlan}
          staffProfile={staffProfile}
          onClose={() => setShowSendCopy(false)}
          onSaved={() => setShowSendCopy(false)}
        />
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
      {children}
    </div>
  );
}