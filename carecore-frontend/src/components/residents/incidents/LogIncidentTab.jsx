import { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, Sparkles, ChevronRight, CheckCircle2, Circle,
  X, Plus, Upload, Eye, Trash2, Lock, Save, Send, Shield,
  User, Clock, MapPin, ClipboardList, Bell, Paperclip, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { IncidentRestraintSection } from "./IncidentRestraintSection.jsx";
import { IncidentPoliceSection } from "./IncidentPoliceSection.jsx";
import { IncidentPeopleInvolvedSection } from "./IncidentPeopleInvolvedSection.jsx";
import { IncidentManagerReviewSection } from "./IncidentManagerReviewSection.jsx";
import IncidentTLReviewModal from "./IncidentTLReviewModal.jsx";
import IncidentImpactOutcomeSection from "./IncidentImpactOutcomeSection.jsx";
import IncidentOutcomeKPIs from "./IncidentOutcomeKPIs.jsx";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";


// ── Constants ────────────────────────────────────────────────────────────────

const INCIDENT_TYPES = [
  "Missing from Home","Return from Missing","Self-Harm Concern","Emotional Distress",
  "Aggression Toward Staff","Aggression Toward Peer","Damage to Property","Substance Misuse",
  "Alcohol Use","Medication Refusal","Medication Error","Fall / Accident","Health Concern",
  "Bullying","Online Safety","Exploitation Concern","Curfew Breach","Absence from Education",
  "Boundary Incident","Complaint","Other",
];

const LOCATIONS = [
  "Bedroom","Communal Area","Kitchen","Garden","Bathroom","Office",
  "School / College","Community","Public Transport","Online",
  "Hospital / GP / Clinic","Police Station","Unknown","Other",
];

const SHIFTS = ["Morning","Afternoon","Evening","Night","Custom"];

const HARM_OPTIONS = [
  "No apparent harm","Emotional distress","Physical injury","Risk of exploitation",
  "Risk of self-harm","Risk to others","Missing / absent risk","Medication / health risk",
  "Environmental risk","Unknown","Other",
];

const RISK_LEVELS = [
  { value: "No immediate risk", color: "text-green-700 bg-green-50 border-green-300" },
  { value: "Monitor", color: "text-amber-600 bg-amber-50 border-amber-300" },
  { value: "Elevated", color: "text-orange-600 bg-orange-50 border-orange-300" },
  { value: "High", color: "text-red-600 bg-red-50 border-red-400" },
  { value: "Immediate danger", color: "text-red-800 bg-red-100 border-red-600" },
];

const ACTIONS = [
  "Spoken with young person","De-escalation used","Removed from situation","First aid provided",
  "Emotional support provided","Young person checked for injury","Room/environment made safe",
  "Separated from peer","Medication checked","Missing protocol started","Police contacted",
  "Emergency services contacted","Social worker informed","Manager informed","Parent/carer informed",
  "Body map completed","Safeguarding referral considered","Reg 40 considered","Risk assessment updated",
  "Key worker follow-up arranged",
];

const OUTCOMES = [
  "Young person settled","Young person remains distressed","Young person missing",
  "Young person returned","Situation de-escalated","Medical attention arranged",
  "Police involved","Safeguarding escalated","Manager review pending",
  "Further monitoring required","Other",
];

const NOTIFICATIONS = [
  "Notify Manager","Notify On-Call","Notify Social Worker","Notify Parent / Carer",
  "Notify Police","Notify Emergency Services","Consider Safeguarding","Consider Reg 40",
  "Consider Ofsted Notification","Notify IRO","Notify Placing Authority",
];

const SAFEGUARDING_TYPES = [
  "Self-Harm Concern","Exploitation Concern","Bullying","Online Safety",
  "Substance Misuse","Aggression Toward Peer","Aggression Toward Staff",
];

const MISSING_TYPES = ["Missing from Home","Return from Missing"];

// ── Small UI helpers ─────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, iconColor = "text-teal-600", iconBg = "bg-teal-50", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function StyledSelect({ value, onChange, placeholder, options, disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 text-slate-800 disabled:opacity-50 pr-8"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
    </div>
  );
}

function StyledInput({ value, onChange, type = "text", placeholder, className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 ${className}`}
    />
  );
}

function Chip({ label, onRemove, color = "teal" }) {
  const colors = {
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    green: "bg-green-50 text-green-700 border-green-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${colors[color]}`}>
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

function ValidationItem({ label, done }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done
        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        : <Circle className="w-4 h-4 text-slate-300 shrink-0" />}
      <span className={done ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LogIncidentTab({ residents, homes, staff, user, staffProfile, isAdminOrTL, accidents }) {
  const [reviewingIncident, setReviewingIncident] = useState(null);


  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });
  const fileInputRef = useRef();

  // View toggle: log form vs incident list
  const [view, setView] = useState("log");

  // ── Form state ──
  const today = format(new Date(), "yyyy-MM-dd");
  const nowTime = format(new Date(), "HH:mm");

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [incidentType, setIncidentType] = useState("");
  const [location, setLocation] = useState("");
  const [reportedBy, setReportedBy] = useState(staffProfile?.full_name || "");
  const [shift, setShift] = useState("Evening");

  const [ypId, setYpId] = useState("");
  const [briefDesc, setBriefDesc] = useState("");
  const [detailedAccount, setDetailedAccount] = useState("");

  const [perceivedHarm, setPerceivedHarm] = useState("");
  const [riskLevel, setRiskLevel] = useState("");

  const [selectedActions, setSelectedActions] = useState([]);
  const [outcome, setOutcome] = useState("");
  const [actionNotes, setActionNotes] = useState("");

  const [selectedNotifs, setSelectedNotifs] = useState([]);
  const [policeRef, setPoliceRef] = useState("");
  const [reg40Notes, setReg40Notes] = useState("");

  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // New sections form state
  const [reg27Trigger, setReg27Trigger] = useState(false);
  // Impact & Outcome state
  const [incidentImpact, setIncidentImpact] = useState({
    immediate_outcome: "",
    impact_on_young_person: "",
    risk_change: "",
    progress_made: "",
    learning_identified: "",
    follow_up_required: false,
    follow_up_action: "",
    responsible_person_id: "",
    responsible_person_name: "",
    target_date: "",
    completion_date: "",
    debrief_completed: "",
    risk_assessment_updated: "",
    support_plan_updated: "",
    safeguarding_referral_required: null,
    reg27_notification_required: "",
  });

  const [extendedForm, setExtendedForm] = useState({
    was_restraint_used: false,
    restraint_type: "",
    reason_restraint_used: "",
    restraint_injury: false,
    police_called: false,
    police_callout_date: "",
    police_callout_time: "",
    police_reason: "",
    police_callout_to_manage_behaviour: false,
    child_arrested: "",
    child_convicted: "",
    police_reference_number: "",
    exclude_from_annex_a: false,
    exclusion_reason: "",
    people_involved: [],
    manager_review_status: "",
    closure_outcome: "",
    manager_signoff_datetime: "",
    manager_review_notes: "",
  });

  // ── Derived ──
  const selectedYP = useMemo(() => residents.find(r => r.id === ypId), [residents, ypId]);
  const keyWorker = useMemo(() => {
    if (!selectedYP?.key_worker_id) return null;
    return staff.find(s => s.id === selectedYP.key_worker_id);
  }, [selectedYP, staff]);

  const calcAge = (dob) => {
    if (!dob) return null;
    const d = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
    return age;
  };

  // ── Conditional logic ──
  const isMissingType = MISSING_TYPES.includes(incidentType);
  const isSafeguardingType = SAFEGUARDING_TYPES.includes(incidentType);
  const isHighRisk = riskLevel === "High" || riskLevel === "Immediate danger";
  const physicalInjury = perceivedHarm === "Physical injury" || selectedActions.includes("First aid provided");
  const policeSelected = selectedNotifs.includes("Notify Police") || selectedNotifs.includes("Notify Emergency Services");
  const reg40Selected = selectedActions.includes("Reg 40 considered") || selectedNotifs.includes("Consider Reg 40");

  // Auto-suggest actions / notifications based on type
  useMemo(() => {
    if (isMissingType && !selectedActions.includes("Missing protocol started")) {
      setSelectedActions(prev => prev.includes("Missing protocol started") ? prev : [...prev, "Missing protocol started"]);
    }
    if (isHighRisk) {
      setSelectedNotifs(prev => {
        const n = [...prev];
        if (!n.includes("Notify Manager")) n.push("Notify Manager");
        if (!n.includes("Notify On-Call")) n.push("Notify On-Call");
        return n;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentType, riskLevel]);

  // ── Validation ──
  const policeValid = !extendedForm.police_called || (
    !!extendedForm.police_callout_reason &&
    (extendedForm.police_callout_reason !== "behaviour_management" || (!!extendedForm.child_arrested && !!extendedForm.child_convicted))
  );
  const restraintValid = !extendedForm.was_restraint_used || (
    !!extendedForm.restraint_type &&
    !!extendedForm.reason_restraint_used?.trim() &&
    extendedForm.restraint_injury !== "" && extendedForm.restraint_injury !== undefined
  );

  const validation = {
    incidentType: !!incidentType,
    dateTime: !!date && !!time,
    ypSelected: !!ypId,
    description: briefDesc.trim().length > 0,
    riskLevel: !!riskLevel,
    actionTaken: selectedActions.length > 0,
    location: !!location,
    reportedBy: !!reportedBy,
    policeSection: policeValid,
    restraintSection: restraintValid,
  };
  const validCount = Object.values(validation).filter(Boolean).length;
  const allValid = validCount === Object.keys(validation).length;

  // ── Draft manager summary (rule-based) ──
  const draftSummary = useMemo(() => {
    if (!incidentType && !ypId) return "";
    const ypName = selectedYP?.display_name || "Young person";
    const age = calcAge(selectedYP?.dob);
    const ageStr = age ? ` (${age})` : "";
    const loc = location || "unknown location";
    const dt = date && time ? `${date}, ${time}` : date || "";
    const actions = selectedActions.slice(0, 3).join(", ").toLowerCase() || "actions taken";
    const risk = riskLevel ? ` Risk level recorded as ${riskLevel}.` : "";
    const descPart = briefDesc.trim() ? ` ${briefDesc.trim().slice(0, 120)}${briefDesc.length > 120 ? "..." : ""}` : "";
    return `${ypName}${ageStr} was involved in a ${(incidentType || "reported incident").toLowerCase()} on ${dt} at ${loc}.${descPart}${risk} Immediate actions included: ${actions}. This incident has been logged for manager review.`;
  }, [incidentType, ypId, selectedYP, location, date, time, selectedActions, riskLevel, briefDesc]);

  const [usedSummary, setUsedSummary] = useState("");
  const [showSummaryBox, setShowSummaryBox] = useState(true);

  // ── File handling ──
  const handleFiles = (files) => {
    const accepted = ["pdf","docx","jpg","jpeg","png","mp4"];
    Array.from(files).forEach(file => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!accepted.includes(ext)) { toast.error(`${file.name} — unsupported format`); return; }
      if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} exceeds 20MB`); return; }
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: file.name,
          size: (file.size / 1024).toFixed(0) + " KB",
          file,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  // ── Submit ──
  const handleSave = async (status) => {
    if (status === "Submitted" && !allValid) {
      toast.error("Please complete all required fields before submitting.");
      return;
    }
    setSubmitting(true);
    try {
      const incidentDatetime = date && time ? new Date(`${date}T${time}:00`).toISOString() : new Date().toISOString();
      const isReg27 = reg27Trigger;
      const payload = {
        org_id: ORG_ID,
        date,
        time,
        incident_datetime: incidentDatetime,
        incident_type: incidentType,
        location,
        reported_by: reportedBy,
        shift,
        resident_id: ypId,
        resident_name: selectedYP?.display_name || "",
        home_id: selectedYP?.home_id || "",
        brief_description: briefDesc,
        detailed_account: detailedAccount,
        perceived_harm: perceivedHarm,
        risk_level: riskLevel,
        actions_taken: selectedActions,
        outcome,
        action_notes: actionNotes,
        notifications: selectedNotifs,
        police_ref: policeRef,
        reg40_notes: reg40Notes,
        narrative: detailedAccount || briefDesc,
        manager_summary: usedSummary || draftSummary,
        status,
        type: "incident",
        description: briefDesc,
        reviewed_by_id: null,
        reg27_trigger: isReg27,
        recorded_by_name: reportedBy,
        recorded_by_id: staffProfile?.id || null,
        ...extendedForm,
        manager_review_status: status === "Submitted" ? (isReg27 ? "pending_tl" : "pending_review") : extendedForm.manager_review_status,
      };
      const createdIncident = await secureGateway.create("AccidentReport", payload);

      // Save Impact & Outcome record linked to this incident
      if (createdIncident?.id) {
        const hasImpactData = incidentImpact.immediate_outcome || incidentImpact.impact_on_young_person ||
          incidentImpact.risk_change || incidentImpact.learning_identified || incidentImpact.follow_up_required;
        if (hasImpactData) {
          await secureGateway.create("RecordImpactOutcome", {
            org_id: ORG_ID,
            record_type: "incident",
            record_id: createdIncident.id,
            resident_id: ypId || null,
            resident_name: selectedYP?.display_name || "",
            home_id: selectedYP?.home_id || "",
            manager_review_status: "pending",
            ...incidentImpact,
          });
        }
      }

      // Push into the maker-checker workflow engine — replaces the legacy
      // direct ApprovalWorkflow create. Reg 27/Ofsted flow below is separate
      // and untouched.
      if (status === "Submitted" && createdIncident?.id) {
        const homeId = selectedYP?.home_id || "";
        const homeObj = homes.find(h => h.id === homeId);
        const priority = isReg27 ? "critical" : extendedForm.was_restraint_used ? "high" : (isHighRisk ? "urgent" : "routine");

        triggerWorkflow({
          workflowType: "incident_report",
          entityId:     createdIncident.id,
          entityRef:    `INC-${createdIncident.id.slice(0, 8)}`,
          title:        `Incident — ${incidentType} — ${selectedYP?.display_name || ""}`,
          description:  `Risk: ${riskLevel}${extendedForm.was_restraint_used ? " — Restraint used" : ""}`,
          homeId:       homeId,
          homeName:     homeObj?.name || "",
          priority,
        });

        const deadline = isReg27 ? new Date(new Date(incidentDatetime).getTime() + 24 * 3600 * 1000).toISOString() : null;

        await secureGateway.create("ApprovalWorkflow", {
          org_id: ORG_ID,
          entity_type: "incident_report",
          entity_id: createdIncident.id,
          entity_reference: `Incident — ${incidentType} — ${selectedYP?.display_name || ""}`,
          home_id: homeId,
          home_name: homeObj?.name || "",
          status: "pending_tl",
          current_step: 1,
          submitted_by: staffProfile?.id || null,
          submitted_by_name: staffProfile?.full_name || reportedBy || "",
          submitted_at: new Date().toISOString(),
          priority,
          deadline_datetime: deadline,
          notes: `${incidentType} — Risk: ${riskLevel}${extendedForm.was_restraint_used ? " — Restraint used" : ""}`,
        });
      }

       // If Reg 27 triggered, create draft OfstedNotification and notify TL
      if (status === "Submitted" && isReg27 && createdIncident?.id) {
        const homeId = selectedYP?.home_id;
        const homeObj = homes.find(h => h.id === homeId);
        const residentInitials = selectedYP?.display_name
          ? selectedYP.display_name.split(' ').map(n => n[0]).join('').toUpperCase()
          : 'YP';
        const deadlineDatetime = new Date(new Date(incidentDatetime).getTime() + 24 * 3600 * 1000).toISOString();

        // Determine Ofsted notification type from incident type
        const notifTypeMap = {
          serious_injury: 'serious_injury_to_child',
          restraint: 'serious_injury_to_child',
          safeguarding_concern: 'allegation_against_staff',
          police_behaviour_management: 'police_involvement_serious',
          police_victim_of_crime: 'police_involvement_serious',
          medical_emergency: 'serious_accident',
          fire_evacuation: 'serious_accident',
        };
        const notifType = notifTypeMap[incidentType] || 'other_serious_event';

        const ofstedNotif = await secureGateway.create("OfstedNotification", {
          org_id: ORG_ID,
          home_id: homeId || "",
          home_name: homeObj?.name || "",
          home_address: homeObj?.address || "",
          notification_type: notifType,
          event_date: incidentDatetime,
          resident_id: ypId || null,
          resident_name: selectedYP?.display_name || null,
          resident_initials: residentInitials,
          incident_id: createdIncident.id,
          incident_type: incidentType,
          event_summary: briefDesc || detailedAccount,
          deadline_datetime: deadlineDatetime,
          submitted_by_id: staffProfile?.id || null,
          submitted_by_name: reportedBy || staffProfile?.full_name || null,
          status: "pending_tl",
          is_reg27: true,
          is_deleted: false,
        });

        // Update incident with notification link
        if (ofstedNotif?.id) {
          await secureGateway.update("AccidentReport", createdIncident.id, {
            reg27_notification_id: ofstedNotif.id,
          });
        }

        // Notify TL(s)
        const teamLeaders = staff.filter(s =>
          s.role === "team_leader" &&
          (homeId ? (s.home_ids?.includes(homeId) || s.primary_home_id === homeId) : true)
        );
        for (const tl of teamLeaders.slice(0, 3)) {
          if (tl.user_id) {
            await createNotification({
              recipient_user_id: tl.user_id,
              recipient_staff_id: tl.id,
              title: "🚨 URGENT — REG 27 INCIDENT",
              body: `⚠️ URGENT — REG 27 INCIDENT. ${reportedBy || "A support worker"} submitted incident (${incidentType}) for ${selectedYP?.display_name || "young person"}. 24-hour Ofsted notification deadline applies. Review in Approvals immediately.`,
              type: "reg27_review",
              link: "/approvals",
              priority: "critical",
            });
          }
        }
        toast.success("Incident submitted — Reg 27 flow started. TL notified urgently.");
      } else {
        toast.success(status === "Draft" ? "Draft saved." : "Incident submitted for manager review.");
        
        // Standard TL notification (non-Reg 27)
        if (status === "Submitted") {
          const homeId = selectedYP?.home_id;
          const teamLeaders = staff.filter(s =>
            s.role === "team_leader" &&
            (homeId ? (s.home_ids?.includes(homeId) || s.primary_home_id === homeId) : true)
          );
          for (const tl of teamLeaders.slice(0, 3)) {
            if (tl.user_id) {
              await createNotification({
                recipient_user_id: tl.user_id,
                recipient_staff_id: tl.id,
                title: "Incident Pending Review",
                body: `${reportedBy || "A support worker"} has submitted an incident report for ${selectedYP?.display_name || "a young person"} (${incidentType}). Please review.`,
                type: "incident_review",
                link: "/residents",
                priority: isHighRisk ? "high" : "normal",
              });
            }
          }
        }
      }
      
      qc.invalidateQueries({ queryKey: ["accidents"] });
      qc.invalidateQueries({ queryKey: ["accidents", "all"] });
      // Reset form
      setIncidentImpact({
        immediate_outcome: "", impact_on_young_person: "", risk_change: "", progress_made: "",
        learning_identified: "", follow_up_required: false, follow_up_action: "",
        responsible_person_id: "", responsible_person_name: "", target_date: "", completion_date: "",
        debrief_completed: "", risk_assessment_updated: "", support_plan_updated: "",
        safeguarding_referral_required: null, reg27_notification_required: "",
      });
      setIncidentType(""); setLocation(""); setBriefDesc(""); setDetailedAccount("");
      setPerceivedHarm(""); setRiskLevel(""); setSelectedActions([]); setOutcome("");
      setActionNotes(""); setSelectedNotifs([]); setPoliceRef(""); setReg40Notes("");
      setAttachments([]); setYpId(""); setUsedSummary(""); setDate(today); setTime(nowTime); setReg27Trigger(false);
      setExtendedForm({
        was_restraint_used: false,
        restraint_type: "",
        reason_restraint_used: "",
        restraint_injury: false,
        police_called: false,
        police_callout_date: "",
        police_callout_time: "",
        police_reason: "",
        police_callout_to_manage_behaviour: false,
        child_arrested: "",
        child_convicted: "",
        police_reference_number: "",
        exclude_from_annex_a: false,
        exclusion_reason: "",
        people_involved: [],
        manager_review_status: "pending_review",
        closure_outcome: "",
        manager_signoff_datetime: "",
        manager_review_notes: "",
      });
      if (status === "Submitted") setView("list");
    } catch (err) {
      toast.error("Failed to save incident: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const REVIEW_BADGE = {
    pending_review: "bg-amber-100 text-amber-700",
    reviewed: "bg-green-100 text-green-700",
    returned_for_changes: "bg-red-100 text-red-700",
    submitted: "bg-blue-100 text-blue-600",
  };
  const REVIEW_LABEL = {
    pending_review: "Pending Review",
    reviewed: "Reviewed ✓",
    returned_for_changes: "Returned",
    submitted: "Submitted",
  };

  // ── Incident list (existing records) ──
  const IncidentList = () => {
    const pendingCount = (accidents || []).filter(a => a.manager_review_status === "pending_review").length;
    const records = [...(accidents || [])].sort((a, b) => {
      const d1 = new Date(b.incident_datetime || b.date || 0).getTime();
      const d2 = new Date(a.incident_datetime || a.date || 0).getTime();
      return d1 - d2;
    });
    return (
      <div className="space-y-3 mt-2">
        {/* Outcome KPI cards */}
        <IncidentOutcomeKPIs incidents={accidents || []} />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">Incident Register</h3>
            {isAdminOrTL && pendingCount > 0 && (
              <span className="text-xs font-bold bg-amber-100 text-amber-700 border border-amber-300 px-2.5 py-1 rounded-full">
                {pendingCount} pending review
              </span>
            )}
          </div>
          {isAdminOrTL && (
            <button onClick={() => setView("log")} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Log New Incident
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">YP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Review Status</th>
                {isAdminOrTL && <th className="px-4 py-3 text-xs font-semibold text-slate-500"></th>}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={isAdminOrTL ? 7 : 6} className="px-4 py-10 text-center text-slate-400 text-sm">No incidents recorded.</td></tr>
              ) : records.map(a => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{a.date || "—"}</td>
                  <td className="px-4 py-3 text-xs">{a.incident_type || a.type?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-xs">{a.resident_name || "—"}</td>
                  <td className="px-4 py-3">
                    {a.risk_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.risk_level === "High" || a.risk_level === "Immediate danger" ? "bg-red-50 text-red-600" :
                        a.risk_level === "Elevated" ? "bg-orange-50 text-orange-600" :
                        a.risk_level === "Monitor" ? "bg-amber-50 text-amber-600" :
                        "bg-green-50 text-green-600"
                      }`}>{a.risk_level}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate text-slate-600">{a.brief_description || a.description || "—"}</td>
                  <td className="px-4 py-3">
                    {a.manager_review_status ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REVIEW_BADGE[a.manager_review_status] || "bg-slate-100 text-slate-600"}`}>
                        {REVIEW_LABEL[a.manager_review_status] || a.manager_review_status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  {isAdminOrTL && (
                    <td className="px-4 py-3">
                      {(a.manager_review_status === "pending_review" || a.manager_review_status === "reviewed") && (
                        <button
                          onClick={() => setReviewingIncident(a)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                            a.manager_review_status === "pending_review"
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          {a.manager_review_status === "pending_review" ? "Review" : "View"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mt-3">
      {/* TL Review Modal */}
      {reviewingIncident && (
        <IncidentTLReviewModal
          incident={reviewingIncident}
          staffProfile={staffProfile}
          onClose={() => setReviewingIncident(null)}
          onSaved={() => setReviewingIncident(null)}
        />
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { key: "log", label: "Log Incident" },
          { key: "list", label: "Incident Register" },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v.key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "list" && <IncidentList />}

      {view === "log" && (
        <div className="space-y-3">
          {/* Page header */}
          <div className="flex items-start justify-between mb-2 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Log Incident</h2>
              <p className="text-sm text-slate-500 mt-0.5">Quick, guided recording with manager review</p>
            </div>
            {/* AI Assistant card */}
            <button className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow min-w-[240px]">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left flex-1">
                <p className="text-xs font-semibold text-slate-700">AI Assistant</p>
                <p className="text-xs text-slate-400">CareCore AI is here to help</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Alerts */}
          {isMissingType && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span><strong>Missing from Home protocol may apply.</strong> Ensure Missing protocol is started, manager is notified, and social worker is informed. Consider Reg 40.</span>
            </div>
          )}
          {isSafeguardingType && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <span><strong>Safeguarding consideration required.</strong> Manager review is mandatory for this incident type. Consider selecting "Consider Safeguarding" in Notifications.</span>
            </div>
          )}
          {isHighRisk && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span><strong>High risk / Immediate danger — escalation required.</strong> Manager and on-call have been added to notifications. Act immediately.</span>
            </div>
          )}
          {physicalInjury && (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <span><strong>Body map recommended.</strong> Physical injury or first aid has been recorded. Please complete a body map via the Body Map section.</span>
            </div>
          )}

          {/* Main layout: form + review panel */}
          <div className="flex gap-4 items-start">

            {/* Left: form */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* ── A. Incident Basics ── */}
              <SectionCard icon={ClipboardList} title="Incident Basics">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Date of incident</FieldLabel>
                    <StyledInput type="date" value={date} onChange={setDate} />
                  </div>
                  <div>
                    <FieldLabel required>Time of incident</FieldLabel>
                    <StyledInput type="time" value={time} onChange={setTime} />
                  </div>
                </div>

                <div>
                  <FieldLabel required>Incident type</FieldLabel>
                  <StyledSelect
                    value={incidentType}
                    onChange={setIncidentType}
                    placeholder="Select incident type..."
                    options={INCIDENT_TYPES}
                  />
                </div>

                <div>
                  <FieldLabel required>Location</FieldLabel>
                  <StyledSelect value={location} onChange={setLocation} placeholder="Select location..." options={LOCATIONS} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Reported by</FieldLabel>
                    <StyledSelect
                      value={reportedBy}
                      onChange={setReportedBy}
                      placeholder="Select staff..."
                      options={staff.map(s => ({ value: s.full_name, label: s.full_name }))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Shift</FieldLabel>
                    <StyledSelect value={shift} onChange={setShift} placeholder="Select shift..." options={SHIFTS} />
                  </div>
                </div>
              </SectionCard>

              {/* ── B. Young Person ── */}
              <SectionCard icon={User} title="Young Person">
                <div>
                  <FieldLabel required>Young person</FieldLabel>
                  <StyledSelect
                    value={ypId}
                    onChange={setYpId}
                    placeholder="Select young person..."
                    options={residents.map(r => {
                      const age = calcAge(r.dob);
                      return { value: r.id, label: `${r.display_name}${age ? ` (${age})` : ""}` };
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Date of birth</FieldLabel>
                    <StyledInput
                      value={selectedYP?.dob || ""}
                      onChange={() => {}}
                      disabled
                      placeholder="Auto-populated"
                      className="bg-slate-50 text-slate-500"
                    />
                  </div>
                  <div>
                    <FieldLabel>Key worker</FieldLabel>
                    <StyledInput
                      value={keyWorker?.full_name || ""}
                      onChange={() => {}}
                      disabled
                      placeholder="Auto-populated"
                      className="bg-slate-50 text-slate-500"
                    />
                  </div>
                </div>
                {selectedYP && (
                  <button className="w-full flex items-center justify-center gap-2 border border-teal-200 text-teal-700 rounded-xl py-2 text-sm font-medium hover:bg-teal-50 transition-colors">
                    <Eye className="w-4 h-4" /> View profile
                  </button>
                )}
              </SectionCard>

              {/* ── C. What Happened ── */}
              <SectionCard icon={FileText} title="What Happened">
                <div>
                  <FieldLabel required>Brief description</FieldLabel>
                  <textarea
                    value={briefDesc}
                    onChange={e => setBriefDesc(e.target.value.slice(0, 500))}
                    placeholder="Describe what happened: what, when, where, who was involved, what you saw / heard."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none"
                  />
                </div>
                <div>
                  <FieldLabel>Detailed account</FieldLabel>
                  <textarea
                    value={detailedAccount}
                    onChange={e => setDetailedAccount(e.target.value.slice(0, 2000))}
                    placeholder="Provide a more detailed account of the incident..."
                    rows={5}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-400">Minimise jargon, focus on facts.</p>
                    <p className="text-xs text-slate-400">{detailedAccount.length} / 2000</p>
                  </div>
                </div>
              </SectionCard>

              {/* ── D. Harm / Risk ── */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <SectionCard icon={AlertTriangle} title="Harm / Risk" iconColor="text-orange-500" iconBg="bg-orange-50">
                    <div>
                      <FieldLabel>Perceived harm to young person</FieldLabel>
                      <StyledSelect value={perceivedHarm} onChange={setPerceivedHarm} placeholder="Select perceived harm..." options={HARM_OPTIONS} />
                    </div>
                    <div>
                      <FieldLabel required>Risk level</FieldLabel>
                      <StyledSelect value={riskLevel} onChange={setRiskLevel} placeholder="Select risk level..." options={RISK_LEVELS.map(r => r.value)} />
                      {riskLevel && (
                        <div className={`mt-2 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${RISK_LEVELS.find(r => r.value === riskLevel)?.color || ""}`}>
                          {riskLevel}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>

                {/* AI Helper */}
                <div className="w-44 shrink-0">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-xs font-semibold text-slate-700">AI Helper</span>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <p className="text-xs text-slate-500 leading-relaxed">Get suggestions and quality checks from CareCore AI.</p>
                      <button
                        onClick={() => { if (draftSummary) { setUsedSummary(draftSummary); toast.success("Draft summary generated."); } else toast.info("Fill in incident details first."); }}
                        className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium transition-colors"
                      >
                        <Sparkles className="w-3 h-3" /> Draft manager summary
                      </button>
                      <button
                        onClick={() => toast.info("Risk assessment check — coming soon.")}
                        className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
                      >
                        <Shield className="w-3 h-3" /> Check linked risk assessment
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── D-1. Restraint Details ── */}
              <SectionCard icon={Shield} title="Restraint Details" iconColor="text-purple-600" iconBg="bg-purple-50">
                <IncidentRestraintSection form={extendedForm} setForm={setExtendedForm} />
              </SectionCard>

              {/* ── D-2. Police Involvement ── */}
              <SectionCard icon={AlertTriangle} title="Police Involvement" iconColor="text-red-600" iconBg="bg-red-50">
                <IncidentPoliceSection form={extendedForm} setForm={setExtendedForm} />
              </SectionCard>

              {/* ── D-3. People Involved ── */}
              <SectionCard icon={User} title="People Involved in Incident" iconColor="text-slate-600" iconBg="bg-slate-100">
                <IncidentPeopleInvolvedSection form={extendedForm} setForm={setExtendedForm} staff={staff} residents={residents} />
              </SectionCard>

              {/* ── E. Immediate Actions ── */}
              <SectionCard icon={CheckCircle2} title="Immediate Actions" iconColor="text-green-600" iconBg="bg-green-50">
                <div>
                  <FieldLabel required>Actions taken</FieldLabel>
                  {/* Chip display of selected */}
                  {selectedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedActions.map(a => (
                        <Chip key={a} label={a} onRemove={() => setSelectedActions(p => p.filter(x => x !== a))} color="teal" />
                      ))}
                    </div>
                  )}
                  {/* Dropdown to add */}
                  <div className="relative">
                    <select
                      value=""
                      onChange={e => { if (e.target.value && !selectedActions.includes(e.target.value)) setSelectedActions(p => [...p, e.target.value]); }}
                      className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 pr-8 text-slate-500"
                    >
                      <option value="">+ Add action taken...</option>
                      {ACTIONS.filter(a => !selectedActions.includes(a)).map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <FieldLabel>Outcome / current status</FieldLabel>
                  <StyledSelect value={outcome} onChange={setOutcome} placeholder="Select outcome..." options={OUTCOMES} />
                </div>

                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <textarea
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    placeholder="Any additional notes about immediate actions..."
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none"
                  />
                </div>

                {/* Reg 40 notes (conditional) */}
                {reg40Selected && (
                  <div>
                    <FieldLabel>Reg 40 decision notes (for manager review)</FieldLabel>
                    <textarea
                      value={reg40Notes}
                      onChange={e => setReg40Notes(e.target.value)}
                      placeholder="Record your Reg 40 consideration notes here..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 resize-none border-amber-300"
                    />
                  </div>
                )}
              </SectionCard>

              {/* ── F. Notifications ── */}
              <SectionCard icon={Bell} title="Notifications" iconColor="text-blue-600" iconBg="bg-blue-50">
                <div className="flex flex-wrap gap-2">
                  {NOTIFICATIONS.map(n => {
                    const sel = selectedNotifs.includes(n);
                    return (
                      <button
                        key={n}
                        onClick={() => setSelectedNotifs(p => sel ? p.filter(x => x !== n) : [...p, n])}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          sel ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                        }`}
                      >
                        {sel && <CheckCircle2 className="w-3 h-3" />}
                        {n}
                      </button>
                    );
                  })}
                </div>

                {/* Police reference field (conditional) */}
                {policeSelected && (
                  <div>
                    <FieldLabel>Police / emergency reference number</FieldLabel>
                    <StyledInput value={policeRef} onChange={setPoliceRef} placeholder="e.g. POL-2026-XXXXX" />
                  </div>
                )}

                {/* Reg 27 trigger */}
                <div className={`rounded-xl border-2 p-4 transition-colors ${reg27Trigger ? 'bg-red-50 border-red-400' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reg27Trigger}
                      onChange={e => setReg27Trigger(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-red-600"
                    />
                    <div>
                      <p className={`text-sm font-bold ${reg27Trigger ? 'text-red-800' : 'text-slate-700'}`}>
                        This incident requires Reg 27 Ofsted notification
                      </p>
                      <p className={`text-xs mt-0.5 ${reg27Trigger ? 'text-red-700' : 'text-slate-500'}`}>
                        Check this box if the incident is notifiable to Ofsted under Regulation 27. This will start an urgent 3-step approval flow (TL → TM → RSM) with a 24-hour Ofsted notification deadline.
                      </p>
                      {reg27Trigger && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span className="text-xs font-semibold text-red-700">24-hour Ofsted notification clock starts on submission</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </SectionCard>

              {/* ── G-1. Impact & Outcome ── */}
              <IncidentImpactOutcomeSection
                form={incidentImpact}
                setForm={setIncidentImpact}
                staff={staff}
                disabled={false}
              />

              {/* ── G. Attachments ── */}
              <SectionCard icon={Paperclip} title="Attachments" iconColor="text-slate-600" iconBg="bg-slate-100">
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Drag files here or <span className="text-teal-600 underline">click to upload</span></p>
                  <p className="text-xs text-slate-400 mt-1">Max 20MB per file</p>
                  <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png,.mp4" onChange={e => handleFiles(e.target.files)} />
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map(f => (
                      <div key={f.id} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="flex-1 text-sm text-slate-700 truncate">{f.name}</span>
                        <span className="text-xs text-slate-400 shrink-0">{f.size}</span>
                        <button className="text-slate-400 hover:text-slate-600"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => setAttachments(p => p.filter(x => x.id !== f.id))} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400">Accepted: PDF, DOCX, JPG, PNG, MP4</p>
              </SectionCard>

              {/* ── H. Submit ── */}
              <SectionCard icon={Send} title="Submit" iconColor="text-green-600" iconBg="bg-green-50">
                <p className="text-sm text-slate-500">When you're ready, review your entry on the right and submit for manager review.</p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleSave("Draft")}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> Save draft
                  </button>
                  <button
                    onClick={() => handleSave("Submitted")}
                    disabled={submitting || !allValid}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Lock className="w-4 h-4" /> Submit for review
                  </button>
                </div>
              </SectionCard>
            </div>

            {/* ── Right: Review Panel ── */}
            <div className="w-72 xl:w-80 shrink-0 sticky top-4 space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-4 py-3 border-b border-green-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800 text-sm">Review before submit</span>
                </div>

                <div className="px-4 py-3 space-y-4">
                  <p className="text-xs text-slate-500">Please review all details before submitting.</p>

                  {/* Validation */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Validation</p>
                    <div className="space-y-1.5">
                      <ValidationItem label="Incident type selected" done={validation.incidentType} />
                      <ValidationItem label="Date & time recorded" done={validation.dateTime} />
                      <ValidationItem label="Young person selected" done={validation.ypSelected} />
                      <ValidationItem label="Description provided" done={validation.description} />
                      <ValidationItem label="Risk level selected" done={validation.riskLevel} />
                      <ValidationItem label="At least one action taken" done={validation.actionTaken} />
                      <ValidationItem label="Location recorded" done={validation.location} />
                      <ValidationItem label="Reported by selected" done={validation.reportedBy} />
                      {extendedForm.police_called && <ValidationItem label="Police section complete" done={validation.policeSection} />}
                      {extendedForm.was_restraint_used && <ValidationItem label="Restraint section complete" done={validation.restraintSection} />}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Incident summary</p>
                    <div className="space-y-1.5 text-xs">
                      {[
                        ["Incident type", incidentType || "—"],
                        ["Date & time", date && time ? `${date}, ${time}` : "—"],
                        ["Young person", selectedYP?.display_name || "—"],
                        ["Location", location || "—"],
                        ["Risk level", riskLevel || "—"],
                        ["Actions taken", selectedActions.length > 0 ? `${selectedActions.length} selected` : "—"],
                        ["Notifications", selectedNotifs.length > 0 ? `${selectedNotifs.length} selected` : "—"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <span className="text-slate-500 shrink-0">{label}</span>
                          <span className="font-medium text-slate-700 text-right truncate max-w-[120px]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Draft manager summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Draft manager summary</p>
                      <span className="text-xs bg-teal-100 text-teal-600 font-semibold px-1.5 py-0.5 rounded">AI</span>
                    </div>
                    {showSummaryBox ? (
                      <textarea
                        value={usedSummary || draftSummary}
                        onChange={e => setUsedSummary(e.target.value)}
                        rows={6}
                        className="w-full text-xs text-slate-700 bg-white border border-green-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-teal-400"
                      />
                    ) : (
                      <p className="text-xs text-slate-400 italic">Fill in form details to generate.</p>
                    )}
                    <button
                      onClick={() => { setUsedSummary(usedSummary || draftSummary); toast.success("Summary applied."); }}
                      className="mt-2 w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors"
                    >
                      Use this summary
                    </button>
                  </div>
                </div>

                {/* Footer note */}
                <div className="px-4 py-3 bg-green-100/50 border-t border-green-200 space-y-1.5">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <Send className="w-3.5 h-3.5 mt-0.5 text-green-600 shrink-0" />
                    <span>Your submission will be sent to your manager for review.</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>All data is secure and confidential.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}