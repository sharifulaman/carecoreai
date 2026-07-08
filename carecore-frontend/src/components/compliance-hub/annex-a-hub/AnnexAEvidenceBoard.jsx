import { Eye, Wrench, StickyNote } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  Good: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Good" },
  Review: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Review" },
  Critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Critical" },
};

function StatusBadge({ status }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.Review;
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>{sc.label}</span>;
}

function EvidenceCard({ num, title, missing, evidence, completion, gaps, status, onAction }) {
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.Review;
  return (
    <div className={`bg-white border ${sc.border} rounded-xl p-3 flex flex-col`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-slate-400 shrink-0">{num}.</span>
          <h4 className="text-xs font-bold text-slate-700 truncate">{title}</h4>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="text-center">
          <p className="text-[8px] text-slate-400">Missing</p>
          <p className={`text-sm font-bold ${missing > 0 ? "text-red-600" : "text-slate-300"}`}>{missing}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-slate-400">Evidence</p>
          <p className="text-sm font-bold text-blue-600">{evidence}</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] text-slate-400">Complete</p>
          <p className={`text-sm font-bold ${completion >= 80 ? "text-green-600" : completion >= 50 ? "text-amber-600" : "text-red-600"}`}>{completion}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-1 mb-2">
        <div className={`h-full rounded-full ${completion >= 80 ? "bg-green-500" : completion >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${completion}%` }} />
      </div>

      {gaps.length > 0 && (
        <div className="mb-2 flex-1">
          <p className="text-[8px] text-slate-400 mb-0.5">Key Gaps:</p>
          <ul className="space-y-0.5">
            {gaps.slice(0, 2).map((g, i) => (
              <li key={i} className="text-[9px] text-red-600 flex items-start gap-1">
                <span className="shrink-0">•</span>
                <span className="line-clamp-1">{g}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-1 mt-auto pt-1.5 border-t border-slate-100">
        <button onClick={() => onAction("view", title)} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600">
          <Eye className="w-2.5 h-2.5" /> View
        </button>
        <button onClick={() => onAction("fix", title)} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-50 text-amber-600">
          <Wrench className="w-2.5 h-2.5" /> Fix
        </button>
        <button onClick={() => onAction("note", title)} className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-50 text-blue-600">
          <StickyNote className="w-2.5 h-2.5" /> Note
        </button>
      </div>
    </div>
  );
}

export default function AnnexAEvidenceBoard({ data, onAction, sectionFilter }) {
  const { orgProfile, currentResidents, homes, metrics, mfhRecords, complaints, incidents, allegations, exploitationRisks, referrals, staff, educationRecords, healthProfiles, staffMovements, readinessChecks, passedChecks, totalChecks } = data;

  // Compute section data
  const sections = [
    {
      num: 1, key: "overview", title: "Overview & Readiness",
      missing: totalChecks - passedChecks, evidence: passedChecks, completion: Math.round((passedChecks / totalChecks) * 100),
      gaps: readinessChecks.filter(c => !c.passed).map(c => c.label),
      status: passedChecks === totalChecks ? "Good" : passedChecks >= 7 ? "Review" : "Critical",
    },
    {
      num: 2, key: "provider", title: "Provider Details",
      missing: [!orgProfile?.provider_legal_name, !orgProfile?.trading_name, !orgProfile?.ofsted_urn, !orgProfile?.registration_date, !orgProfile?.registered_service_manager_name, !orgProfile?.registered_manager_qualification_held].filter(Boolean).length,
      evidence: 6 - [!orgProfile?.provider_legal_name, !orgProfile?.trading_name, !orgProfile?.ofsted_urn, !orgProfile?.registration_date, !orgProfile?.registered_service_manager_name, !orgProfile?.registered_manager_qualification_held].filter(Boolean).length,
      completion: Math.round(((6 - [!orgProfile?.provider_legal_name, !orgProfile?.trading_name, !orgProfile?.ofsted_urn, !orgProfile?.registration_date, !orgProfile?.registered_service_manager_name, !orgProfile?.registered_manager_qualification_held].filter(Boolean).length) / 6) * 100),
      gaps: [
        !orgProfile?.provider_legal_name ? "Provider legal name not set" : null,
        !orgProfile?.ofsted_urn ? "Ofsted URN missing" : null,
        !orgProfile?.registered_service_manager_name ? "RSM name not set" : null,
      ].filter(Boolean),
      status: !orgProfile?.ofsted_urn ? "Critical" : !orgProfile?.provider_legal_name ? "Review" : "Good",
    },
    {
      num: 3, key: "children", title: "Children & Placements",
      missing: currentResidents.filter(r => !r.accommodation_category).length,
      evidence: currentResidents.filter(r => r.accommodation_category).length,
      completion: currentResidents.length > 0 ? Math.round((currentResidents.filter(r => r.accommodation_category).length / currentResidents.length) * 100) : 0,
      gaps: [
        currentResidents.some(r => !r.accommodation_category) ? "Accommodation category incomplete" : null,
        currentResidents.some(r => !r.placing_local_authority) ? "Placing LA missing" : null,
        currentResidents.some(r => typeof r.uasc !== "boolean") ? "UASC status missing" : null,
      ].filter(Boolean),
      status: currentResidents.some(r => !r.accommodation_category) ? "Critical" : currentResidents.some(r => !r.placing_local_authority) ? "Review" : "Good",
    },
    {
      num: 4, key: "incidents", title: "Incidents, Missing & Complaints",
      missing: mfhRecords.filter(m => typeof m.rhi_offered_by_la !== "boolean").length + incidents.filter(i => i.police_called && !i.police_callout_reason).length,
      evidence: mfhRecords.length + complaints.length + incidents.length,
      completion: mfhRecords.length + incidents.length > 0
        ? Math.round(((mfhRecords.length + incidents.length - mfhRecords.filter(m => typeof m.rhi_offered_by_la !== "boolean").length - incidents.filter(i => i.police_called && !i.police_callout_reason).length) / (mfhRecords.length + incidents.length)) * 100)
        : 100,
      gaps: [
        mfhRecords.some(m => typeof m.rhi_offered_by_la !== "boolean") ? "MFH episodes RHI unanswered" : null,
        incidents.some(i => i.police_called && !i.police_callout_reason) ? "Police callout reason missing" : null,
        incidents.some(i => i.restraint_used && i.manager_review_status !== "reviewed") ? "Restraint incidents not reviewed" : null,
      ].filter(Boolean),
      status: incidents.some(i => i.restraint_used && i.manager_review_status !== "reviewed") ? "Critical" : mfhRecords.some(m => typeof m.rhi_offered_by_la !== "boolean") ? "Review" : "Good",
    },
    {
      num: 5, key: "safeguarding", title: "Safeguarding",
      missing: allegations.filter(a => !a.investigation_status).length,
      evidence: allegations.length + exploitationRisks.length + referrals.length,
      completion: allegations.length > 0 ? Math.round((allegations.filter(a => a.investigation_status).length / allegations.length) * 100) : 100,
      gaps: [
        allegations.some(a => !a.investigation_status) ? "Allegations without investigation status" : null,
        exploitationRisks.length === 0 && currentResidents.length > 0 ? "No exploitation risk assessments" : null,
      ].filter(Boolean),
      status: allegations.some(a => !a.investigation_status) ? "Critical" : "Good",
    },
    {
      num: 6, key: "staffing", title: "Staffing",
      missing: staff.filter(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()).length,
      evidence: staff.length,
      completion: staff.length > 0 ? Math.round((staff.filter(s => s.dbs_expiry && new Date(s.dbs_expiry) > new Date()).length / staff.length) * 100) : 0,
      gaps: [
        staff.some(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()) ? "DBS expired or missing" : null,
        staffMovements.filter(sm => sm.movement_type === "new_starter").length === 0 ? "No starters recorded" : null,
      ].filter(Boolean),
      status: staff.some(s => !s.dbs_expiry || new Date(s.dbs_expiry) <= new Date()) ? "Critical" : "Good",
    },
    {
      num: 7, key: "education", title: "Education, Employment & Health",
      missing: currentResidents.filter(r => !educationRecords.some(e => e.resident_id === r.id) || !healthProfiles.some(h => h.resident_id === r.id)).length,
      evidence: educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).length + healthProfiles.filter(h => currentResidents.some(r => r.id === h.resident_id)).length,
      completion: currentResidents.length > 0 ? Math.round(((educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).length + healthProfiles.filter(h => currentResidents.some(r => r.id === h.resident_id)).length) / (currentResidents.length * 2)) * 100) : 0,
      gaps: [
        currentResidents.some(r => !educationRecords.some(e => e.resident_id === r.id)) ? "No education records found" : null,
        currentResidents.some(r => !healthProfiles.some(h => h.resident_id === r.id)) ? "No health profiles found" : null,
      ].filter(Boolean),
      status: currentResidents.some(r => !educationRecords.some(e => e.resident_id === r.id)) ? "Critical" : "Review",
    },
    {
      num: 8, key: "premises", title: "Organisation & Premises",
      missing: homes.filter(h => !h.gas_safety_expiry || new Date(h.gas_safety_expiry) <= new Date()).length,
      evidence: homes.length,
      completion: homes.length > 0 ? Math.round((homes.filter(h => h.gas_safety_expiry && new Date(h.gas_safety_expiry) > new Date()).length / homes.length) * 100) : 0,
      gaps: [
        homes.some(h => !h.gas_safety_expiry || new Date(h.gas_safety_expiry) <= new Date()) ? "Gas safety expired" : null,
        homes.some(h => !h.electrical_cert_expiry || new Date(h.electrical_cert_expiry) <= new Date()) ? "Electrical cert expired" : null,
      ].filter(Boolean),
      status: homes.some(h => !h.gas_safety_expiry || new Date(h.gas_safety_expiry) <= new Date()) ? "Critical" : "Good",
    },
    {
      num: 9, key: "support", title: "Key People & Support Services",
      missing: currentResidents.filter(r => !r.social_worker_name).length,
      evidence: referrals.length + currentResidents.filter(r => r.social_worker_name).length,
      completion: currentResidents.length > 0 ? Math.round((currentResidents.filter(r => r.social_worker_name).length / currentResidents.length) * 100) : 0,
      gaps: [
        currentResidents.some(r => !r.social_worker_name) ? "Social worker links missing" : null,
        currentResidents.some(r => !r.placing_local_authority) ? "Local authority links missing" : null,
      ].filter(Boolean),
      status: currentResidents.some(r => !r.social_worker_name) ? "Review" : "Good",
    },
  ];

  const handleAction = (type, title) => {
    const sectionData = sections.find(s => s.title === title) || { title, key: title, gaps: [], missing: 0, evidence: 0, completion: 0 };
    if (type === "view") toast.info(`Viewing evidence for: ${title}`);
    else if (type === "fix") toast.info(`Fix gaps for: ${title}`);
    else if (type === "note") toast.info(`Add note to: ${title}`);
    onAction?.(type, sectionData);
  };

  return (
    <div>
      <h3 className="text-xs font-bold text-slate-700 mb-2">Annex A Evidence Board</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sections.map(s => (
          <div key={s.key} id={`annex-section-${s.key}`} className={sectionFilter !== "all" && sectionFilter !== s.key ? "opacity-40" : ""}>
            <EvidenceCard {...s} onAction={handleAction} />
          </div>
        ))}
      </div>
    </div>
  );
}