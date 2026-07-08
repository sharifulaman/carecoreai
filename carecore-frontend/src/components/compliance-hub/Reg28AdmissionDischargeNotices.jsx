import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Plus, X, Download, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── helpers ─────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    draft: "bg-red-100 text-red-700",
    sent: "bg-amber-100 text-amber-700",
    confirmed: "bg-green-100 text-green-700",
    overdue: "bg-red-700 text-white",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${type === "admission" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {type}
    </span>
  );
}

// ─── Print notice ─────────────────────────────────────────────────────────────

function printNotice(notice) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Regulation 28 Notice — ${notice.notice_type === "admission" ? "Admission" : "Discharge"}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
    h2 { font-size: 14px; font-weight: bold; margin-top: 24px; margin-bottom: 8px; color: #0066cc; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 6px 10px; border-bottom: 1px solid #e0e0e0; font-size: 13px; }
    td:first-child { font-weight: bold; width: 220px; color: #555; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; font-size: 11px; color: #666; font-style: italic; }
    .address-block { margin-bottom: 30px; }
    .date-line { text-align: right; margin-bottom: 20px; font-size: 13px; }
  </style>
</head>
<body>
<div class="date-line">Date: ${notice.notification_date ? format(new Date(notice.notification_date), "dd MMMM yyyy") : format(new Date(), "dd MMMM yyyy")}</div>

<div class="address-block">
  <strong>To:</strong><br/>
  ${notice.receiving_la_contact_name || "The Designated Officer"}<br/>
  ${notice.receiving_la_name}<br/>
  ${notice.receiving_la_address || ""}<br/>
  ${notice.receiving_la_email ? "Email: " + notice.receiving_la_email : ""}
</div>

<h1>Regulation 28 Notice — ${notice.notice_type === "admission" ? "Admission" : "Discharge"} of Child</h1>

<p>We write to notify you of the ${notice.notice_type} of the following child in accordance with Regulation 28 of the Supported Accommodation (England) Regulations 2023.</p>

<h2>1. Child Details</h2>
<table>
  <tr><td>Full name</td><td>${notice.child_name || "—"}</td></tr>
  <tr><td>Date of birth</td><td>${notice.child_dob ? format(new Date(notice.child_dob), "dd MMMM yyyy") : "—"}</td></tr>
</table>

<h2>2. Accommodation Basis</h2>
<table>
  <tr><td>Legal basis</td><td>${
    notice.accommodation_basis === "section_22c_6d" ? "Section 22C(6)(d) Children Act 1989" :
    notice.accommodation_basis === "section_23b_8b" ? "Section 23B(8)(b) Children Act 1989" :
    notice.accommodation_basis || "—"
  }</td></tr>
  <tr><td>Subject to care order</td><td>${notice.subject_to_care_order ? "Yes" : "No"}${notice.care_order_type && notice.care_order_type !== "none" ? " (" + notice.care_order_type.replace(/_/g, " ") + ")" : ""}</td></tr>
</table>

<h2>3. IRO / Personal Adviser</h2>
<table>
  <tr><td>Name</td><td>${notice.iro_or_pa_name || "—"}</td></tr>
  <tr><td>Contact</td><td>${notice.iro_or_pa_contact || "—"}</td></tr>
</table>

<h2>4. Accommodating Authority</h2>
<table>
  <tr><td>Local Authority</td><td>${notice.accommodating_authority_name || "—"}</td></tr>
  <tr><td>Contact</td><td>${notice.accommodating_authority_contact || "—"}</td></tr>
</table>

<h2>5. Education Health and Care Plan</h2>
<table>
  <tr><td>Has EHC Plan</td><td>${notice.has_ehc_plan ? "Yes" : "No"}${notice.ehc_plan_la ? " — responsible LA: " + notice.ehc_plan_la : ""}</td></tr>
  <tr><td>Has SEN statement</td><td>${notice.has_sen_statement ? "Yes" : "No"}${notice.sen_statement_la ? " — responsible LA: " + notice.sen_statement_la : ""}</td></tr>
</table>

<h2>6. Placement Details</h2>
<table>
  ${notice.notice_type === "admission" ? `<tr><td>Admission date</td><td>${notice.admission_date ? format(new Date(notice.admission_date), "dd MMMM yyyy") : "—"}</td></tr>` : ""}
  ${notice.notice_type === "discharge" ? `<tr><td>Discharge date</td><td>${notice.discharge_date ? format(new Date(notice.discharge_date), "dd MMMM yyyy") : "—"}</td></tr><tr><td>Destination</td><td>${notice.discharge_destination || "—"}</td></tr><tr><td>Reason</td><td>${notice.discharge_reason?.replace(/_/g, " ") || "—"}</td></tr>` : ""}
  <tr><td>Home</td><td>${notice.home_name || "—"}${notice.home_address ? ", " + notice.home_address : ""}</td></tr>
</table>

<p style="margin-top: 30px;">Yours sincerely,</p>
<br/><br/>
<p>_________________________</p>
<p>Registered Service Manager</p>

<div class="footer">
  Submitted in accordance with Regulation 28 of the Supported Accommodation (England) Regulations 2023.
</div>
</body>
</html>`;
  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Notice Form Modal ────────────────────────────────────────────────────────

function NoticeFormModal({ notice: editNotice, homes, residents, staffProfile, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Pre-populate from draft if editing
  const pre = editNotice || {};
  const [noticeType, setNoticeType] = useState(pre.notice_type || "admission");
  const [homeId, setHomeId] = useState(pre.home_id || "");
  const [residentId, setResidentId] = useState(pre.resident_id || "");
  const [admissionDate, setAdmissionDate] = useState(pre.admission_date || format(new Date(), "yyyy-MM-dd"));
  const [dischargeDate, setDischargeDate] = useState(pre.discharge_date || "");

  // Section 2 — statutory
  const [childName, setChildName] = useState(pre.child_name || "");
  const [childDob, setChildDob] = useState(pre.child_dob || "");
  const [accommodationBasis, setAccommodationBasis] = useState(pre.accommodation_basis || "");
  const [subjectToCareOrder, setSubjectToCareOrder] = useState(pre.subject_to_care_order || false);
  const [careOrderType, setCareOrderType] = useState(pre.care_order_type || "none");
  const [iroName, setIroName] = useState(pre.iro_or_pa_name || "");
  const [iroContact, setIroContact] = useState(pre.iro_or_pa_contact || "");
  const [accAuthName, setAccAuthName] = useState(pre.accommodating_authority_name || "");
  const [accAuthContact, setAccAuthContact] = useState(pre.accommodating_authority_contact || "");
  const [hasEhc, setHasEhc] = useState(pre.has_ehc_plan || false);
  const [ehcLa, setEhcLa] = useState(pre.ehc_plan_la || "");
  const [hasSen, setHasSen] = useState(pre.has_sen_statement || false);
  const [senLa, setSenLa] = useState(pre.sen_statement_la || "");

  // Section 3 — receiving LA
  const [sameAsAcc, setSameAsAcc] = useState(pre.is_same_as_accommodating_authority || false);
  const [laName, setLaName] = useState(pre.receiving_la_name || "");
  const [laContact, setLaContact] = useState(pre.receiving_la_contact_name || "");
  const [laEmail, setLaEmail] = useState(pre.receiving_la_email || "");
  const [laAddress, setLaAddress] = useState(pre.receiving_la_address || "");

  // Section 4 — notification record
  const [notifDate, setNotifDate] = useState(pre.notification_date || format(new Date(), "yyyy-MM-dd"));
  const [notifMethod, setNotifMethod] = useState(pre.notification_method || "email");
  const [confRef, setConfRef] = useState(pre.confirmation_reference || "");
  const [confReceived, setConfReceived] = useState(pre.notification_confirmed_received || false);

  // Section 5 — discharge
  const [dischDest, setDischDest] = useState(pre.discharge_destination || "");
  const [dischReason, setDischReason] = useState(pre.discharge_reason || "");

  const homeResidents = useMemo(() => residents.filter(r => r.home_id === homeId && r.status === "active"), [residents, homeId]);
  const selectedResident = useMemo(() => residents.find(r => r.id === residentId), [residents, residentId]);
  const selectedHome = useMemo(() => homes.find(h => h.id === homeId), [homes, homeId]);

  // Auto-populate from resident
  const handleResidentChange = (rid) => {
    setResidentId(rid);
    const r = residents.find(x => x.id === rid);
    if (!r) return;
    if (!childName) setChildName(r.full_name || r.display_name || "");
    if (!childDob && r.dob) setChildDob(r.dob);
    if (!accAuthName && r.placing_local_authority) setAccAuthName(r.placing_local_authority);
    if (!iroName && r.iro_name) setIroName(r.iro_name);
    if (!iroContact && r.iro_contact) setIroContact(r.iro_contact);
    if (!admissionDate && r.placement_start) setAdmissionDate(r.placement_start);
    if (!dischargeDate && r.placement_end) setDischargeDate(r.placement_end);
  };

  // Sync receiving LA from accommodating if checkbox ticked
  const handleSameAsAcc = (val) => {
    setSameAsAcc(val);
    if (val) { setLaName(accAuthName); setLaContact(accAuthContact); }
  };

  const mut = useMutation({
    mutationFn: async () => {
      const placementDate = noticeType === "admission" ? admissionDate : dischargeDate;
      const daysSince = placementDate ? Math.floor((new Date() - new Date(placementDate)) / 86400000) : null;
      const payload = {
        org_id: ORG_ID,
        home_id: homeId,
        home_name: selectedHome?.name || "",
        home_address: selectedHome?.address || "",
        resident_id: residentId,
        resident_name: selectedResident?.display_name || selectedResident?.full_name || "",
        notice_type: noticeType,
        child_name: childName,
        child_dob: childDob,
        accommodation_basis: accommodationBasis,
        subject_to_care_order: subjectToCareOrder,
        care_order_type: subjectToCareOrder ? careOrderType : "none",
        iro_or_pa_name: iroName,
        iro_or_pa_contact: iroContact,
        accommodating_authority_name: accAuthName,
        accommodating_authority_contact: accAuthContact,
        has_ehc_plan: hasEhc,
        ehc_plan_la: hasEhc ? ehcLa : "",
        has_sen_statement: hasSen,
        sen_statement_la: hasSen ? senLa : "",
        is_same_as_accommodating_authority: sameAsAcc,
        receiving_la_name: laName,
        receiving_la_contact_name: laContact,
        receiving_la_email: laEmail,
        receiving_la_address: laAddress,
        notification_date: notifDate,
        notification_method: notifMethod,
        notification_sent_by_id: staffProfile?.id,
        notification_sent_by_name: staffProfile?.full_name,
        notification_confirmed_received: confReceived,
        confirmation_received_at: confReceived ? new Date().toISOString() : null,
        confirmation_reference: confRef,
        admission_date: noticeType === "admission" ? admissionDate : null,
        discharge_date: noticeType === "discharge" ? dischargeDate : null,
        discharge_destination: noticeType === "discharge" ? dischDest : "",
        discharge_reason: noticeType === "discharge" ? dischReason : "",
        status: "sent",
        days_since_placement_change: daysSince,
        notified_within_required_period: daysSince !== null ? daysSince <= 2 : null,
        created_by_id: staffProfile?.id,
        created_by_name: staffProfile?.full_name,
      };
      if (editNotice?.id) {
        await secureGateway.update("AdmissionDischargeNotice", editNotice.id, payload);
      } else {
        await secureGateway.create("AdmissionDischargeNotice", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reg28-notices"] });
      onSaved();
    },
  });

  const step1Valid = homeId && residentId && (noticeType === "admission" ? admissionDate : dischargeDate);
  const step2Valid = childName && childDob && accommodationBasis && iroName && accAuthName;
  const step3Valid = laName;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold">{editNotice ? "Edit Notice" : "New Reg 28 Notice"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of {noticeType === "discharge" ? 5 : 4}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-border">
          {["Placement", "Statutory Fields", "Receiving LA", "Notification Record", ...(noticeType === "discharge" ? ["Discharge"] : [])].map((label, i) => (
            <div key={i} className={`flex-1 text-center py-2 text-xs font-medium pointer-events-none select-none ${step === i + 1 ? "text-primary border-b-2 border-primary" : i + 1 < step ? "text-green-600" : "text-muted-foreground"}`}>
              {i + 1 < step ? "✓ " : ""}{label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* STEP 1 — Placement */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Notice Type *</label>
                <div className="flex gap-2 mt-1">
                  {["admission", "discharge"].map(t => (
                    <button key={t} onClick={() => setNoticeType(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${noticeType === t ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"}`}>
                      {t === "admission" ? "Admission" : "Discharge"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Home *</label>
                <select value={homeId} onChange={e => { setHomeId(e.target.value); setResidentId(""); }}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select home…</option>
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resident *</label>
                <select value={residentId} onChange={e => handleResidentChange(e.target.value)} disabled={!homeId}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background disabled:opacity-50">
                  <option value="">Select resident…</option>
                  {homeResidents.map(r => <option key={r.id} value={r.id}>{r.display_name || r.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{noticeType === "admission" ? "Admission" : "Discharge"} Date *</label>
                <input type="date"
                  value={noticeType === "admission" ? admissionDate : dischargeDate}
                  onChange={e => noticeType === "admission" ? setAdmissionDate(e.target.value) : setDischargeDate(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
            </div>
          )}

          {/* STEP 2 — Statutory Fields */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
                These are the 5 statutory fields required by Reg 28(3). Pre-populated from resident record where possible — please verify before sending.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Child full name *</label>
                  <input type="text" value={childName} onChange={e => setChildName(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date of birth *</label>
                  <input type="date" value={childDob} onChange={e => setChildDob(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Accommodation basis *</label>
                <select value={accommodationBasis} onChange={e => setAccommodationBasis(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select…</option>
                  <option value="section_22c_6d">Section 22C(6)(d) Children Act 1989</option>
                  <option value="section_23b_8b">Section 23B(8)(b) Children Act 1989</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={subjectToCareOrder} onChange={e => setSubjectToCareOrder(e.target.checked)} />
                  Subject to a care order or interim care order
                </label>
                {subjectToCareOrder && (
                  <select value={careOrderType} onChange={e => setCareOrderType(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="care_order_s31">Care Order (s31)</option>
                    <option value="interim_care_order_s38">Interim Care Order (s38)</option>
                    <option value="supervision_order">Supervision Order</option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">IRO / PA name *</label>
                  <input type="text" value={iroName} onChange={e => setIroName(e.target.value)}
                    placeholder="Independent Reviewing Officer or Personal Adviser"
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">IRO / PA contact</label>
                  <input type="text" value={iroContact} onChange={e => setIroContact(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Accommodating authority *</label>
                  <input type="text" value={accAuthName} onChange={e => setAccAuthName(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Accommodating authority contact</label>
                  <input type="text" value={accAuthContact} onChange={e => setAccAuthContact(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={hasEhc} onChange={e => setHasEhc(e.target.checked)} />
                  Child has an Education Health and Care (EHC) plan
                </label>
                {hasEhc && (
                  <input type="text" value={ehcLa} onChange={e => setEhcLa(e.target.value)}
                    placeholder="Which LA is responsible for the EHC plan?"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={hasSen} onChange={e => setHasSen(e.target.checked)} />
                  Child has a SEN statement
                </label>
                {hasSen && (
                  <input type="text" value={senLa} onChange={e => setSenLa(e.target.value)}
                    placeholder="Which LA is responsible for the SEN statement?"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                )}
              </div>
            </div>
          )}

          {/* STEP 3 — Receiving LA */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                The <strong>receiving LA</strong> is the local authority for the area where the home is located — this may be different from the accommodating authority.
              </p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={sameAsAcc} onChange={e => handleSameAsAcc(e.target.checked)} />
                The receiving LA is the same as the accommodating authority
              </label>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Receiving LA name *</label>
                <input type="text" value={laName} onChange={e => setLaName(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Contact name</label>
                  <input type="text" value={laContact} onChange={e => setLaContact(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <input type="email" value={laEmail} onChange={e => setLaEmail(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <textarea value={laAddress} onChange={e => setLaAddress(e.target.value)} rows={2}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
            </div>
          )}

          {/* STEP 4 — Notification record */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Date notice was sent</label>
                  <input type="date" value={notifDate} onChange={e => setNotifDate(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Method</label>
                  <select value={notifMethod} onChange={e => setNotifMethod(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                    <option value="email">Email</option>
                    <option value="letter">Letter</option>
                    <option value="portal">Portal</option>
                    <option value="hand_delivered">Hand delivered</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Confirmation reference (any ref number from LA)</label>
                <input type="text" value={confRef} onChange={e => setConfRef(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={confReceived} onChange={e => setConfReceived(e.target.checked)} />
                LA has confirmed receipt of this notice
              </label>
            </div>
          )}

          {/* STEP 5 — Discharge only */}
          {step === 5 && noticeType === "discharge" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Discharge destination</label>
                <input type="text" value={dischDest} onChange={e => setDischDest(e.target.value)}
                  placeholder="Where is the child going?"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Discharge reason</label>
                <select value={dischReason} onChange={e => setDischReason(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select…</option>
                  <option value="planned_move">Planned move</option>
                  <option value="placement_breakdown">Placement breakdown</option>
                  <option value="age_18_transition">Age 18 transition</option>
                  <option value="move_to_independence">Move to independence</option>
                  <option value="return_to_family">Return to family</option>
                  <option value="transfer_to_other_provider">Transfer to other provider</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < (noticeType === "discharge" ? 5 : 4) ? (
            <Button onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !step1Valid : step === 2 ? !step2Valid : step === 3 ? !step3Valid : false}
              className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : "Submit Notice"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Reg28AdmissionDischargeNotices({ homes, residents, staffProfile }) {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [editNotice, setEditNotice] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterHome, setFilterHome] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ["reg28-notices"],
    queryFn: () => secureGateway.filter("AdmissionDischargeNotice", { is_deleted: false }, "-created_date", 300),
    staleTime: 60 * 1000,
  });

  const confirmMut = useMutation({
    mutationFn: (id) => secureGateway.update("AdmissionDischargeNotice", id, {
      status: "confirmed",
      notification_confirmed_received: true,
      confirmation_received_at: new Date().toISOString(),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reg28-notices"] }),
  });

  const thisYear = new Date().getFullYear();
  const yearNotices = notices.filter(n => {
    const d = n.admission_date || n.discharge_date;
    return d && new Date(d).getFullYear() === thisYear;
  });

  const filtered = notices.filter(n => {
    if (filterType !== "all" && n.notice_type !== filterType) return false;
    if (filterType === "outstanding" && n.status !== "draft") return false;
    if (filterHome !== "all" && n.home_id !== filterHome) return false;
    const d = n.admission_date || n.discharge_date;
    if (filterDateFrom && d && d < filterDateFrom) return false;
    if (filterDateTo && d && d > filterDateTo) return false;
    return true;
  });

  // Apply type filter separately for "outstanding"
  const displayNotices = filterType === "outstanding"
    ? notices.filter(n => n.status === "draft" && (filterHome === "all" || n.home_id === filterHome))
    : filtered;

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Reg 28 — Notification of Admissions and Discharges</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            A written notice must be sent to the local authority for the area in which the home is located for every admission and discharge. This is separate from the accommodating authority and separate from Ofsted notification.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Notice
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Total Notices (This Year)</p>
          <p className="text-2xl font-bold mt-1">{yearNotices.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700">Admissions</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{yearNotices.filter(n => n.notice_type === "admission").length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700">Discharges</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{yearNotices.filter(n => n.notice_type === "discharge").length}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-700">Outstanding (Draft)</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{notices.filter(n => n.status === "draft").length}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {["all", "admission", "discharge", "outstanding", "confirmed"].map(f => (
          <button key={f} onClick={() => setFilterType(f)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${filterType === f ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background hover:bg-muted"}`}>
            {f === "outstanding" ? "Outstanding" : f === "all" ? "All" : f}
          </button>
        ))}
        <select value={filterHome} onChange={e => setFilterHome(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background">
          <option value="all">All homes</option>
          {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background" />
        <span className="text-xs text-muted-foreground">to</span>
        <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
          className="text-xs border border-border rounded-lg px-3 py-1.5 bg-background" />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Resident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Receiving LA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Notified</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Days</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
              ) : displayNotices.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">No notices found.</td></tr>
              ) : displayNotices.map(n => {
                const placementDate = n.admission_date || n.discharge_date;
                const daysSince = placementDate ? Math.floor((new Date() - new Date(placementDate)) / 86400000) : null;
                return (
                  <tr key={n.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3"><TypeBadge type={n.notice_type} /></td>
                    <td className="px-4 py-3 text-xs font-medium">{n.resident_name || "—"}</td>
                    <td className="px-4 py-3 text-xs">{n.home_name || homeMap[n.home_id]?.name || "—"}</td>
                    <td className="px-4 py-3 text-xs">{placementDate ? format(new Date(placementDate), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-xs">{n.receiving_la_name || "—"}</td>
                    <td className="px-4 py-3 text-xs">{n.notification_date ? format(new Date(n.notification_date), "dd MMM yyyy") : <span className="text-muted-foreground">Not yet</span>}</td>
                    <td className="px-4 py-3 text-xs capitalize">{n.notification_method?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={n.status} /></td>
                    <td className="px-4 py-3 text-xs">
                      {daysSince !== null ? (
                        <span className={daysSince > 2 && n.status === "draft" ? "text-red-600 font-semibold" : ""}>{daysSince}d</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {n.status === "draft" && (
                          <button onClick={() => setEditNotice(n)}
                            className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">
                            Complete
                          </button>
                        )}
                        {n.status === "sent" && (
                          <button onClick={() => confirmMut.mutate(n.id)}
                            className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 font-medium whitespace-nowrap">
                            <Check className="w-3 h-3 inline mr-0.5" />Confirm
                          </button>
                        )}
                        <button onClick={() => printNotice(n)}
                          className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium">
                          <Download className="w-3 h-3 inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {(showNew || editNotice) && (
        <NoticeFormModal
          notice={editNotice}
          homes={homes}
          residents={residents}
          staffProfile={staffProfile}
          onClose={() => { setShowNew(false); setEditNotice(null); }}
          onSaved={() => { setShowNew(false); setEditNotice(null); }}
        />
      )}
    </div>
  );
}