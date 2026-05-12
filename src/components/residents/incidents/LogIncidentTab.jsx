import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import {
  AlertTriangle, Sparkles, ChevronRight, CheckCircle2, Circle,
  X, Plus, Upload, Eye, Trash2, Lock, Save, Send, Shield,
  User, Clock, MapPin, ClipboardList, Bell, Paperclip, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const qc = useQueryClient();
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
  const validation = {
    incidentType: !!incidentType,
    dateTime: !!date && !!time,
    ypSelected: !!ypId,
    description: briefDesc.trim().length > 0,
    riskLevel: !!riskLevel,
    actionTaken: selectedActions.length > 0,
    location: !!location,
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
      const payload = {
        org_id: ORG_ID,
        date,
        time,
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
        manager_summary: usedSummary || draftSummary,
        status,
        type: "incident",
        description: briefDesc,
        reviewed_by_id: null,
      };
      await secureGateway.create("AccidentReport", payload);
      toast.success(status === "Draft" ? "Draft saved." : "Incident submitted for manager review.");
      qc.invalidateQueries({ queryKey: ["accidents"] });
      qc.invalidateQueries({ queryKey: ["accidents", "all"] });
      // Reset form
      setIncidentType(""); setLocation(""); setBriefDesc(""); setDetailedAccount("");
      setPerceivedHarm(""); setRiskLevel(""); setSelectedActions([]); setOutcome("");
      setActionNotes(""); setSelectedNotifs([]); setPoliceRef(""); setReg40Notes("");
      setAttachments([]); setYpId(""); setUsedSummary(""); setDate(today); setTime(nowTime);
      if (status === "Submitted") setView("list");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Incident list (existing records) ──
  const IncidentList = () => {
    const records = [...(accidents || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 30);
    return (
      <div className="space-y-3 mt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Incident Register</h3>
          <button onClick={() => setView("log")} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> Log New Incident
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">YP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400 text-sm">No incidents recorded.</td></tr>
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
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      a.status === "open" || a.status === "Draft" ? "bg-slate-100 text-slate-600" :
                      a.status === "Submitted" || a.status === "submitted" ? "bg-blue-50 text-blue-600" :
                      a.status === "reviewed" || a.status === "Actioned" ? "bg-amber-50 text-amber-600" :
                      "bg-green-50 text-green-600"
                    }`}>{a.status}</span>
                  </td>
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
                  <div className="relative">
                    <select
                      value={incidentType}
                      onChange={e => setIncidentType(e.target.value)}
                      size={8}
                      className="w-full border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 overflow-hidden"
                    >
                      <option value="" disabled className="text-slate-400 px-3 py-2">Select incident type...</option>
                      {INCIDENT_TYPES.map(t => (
                        <option
                          key={t}
                          value={t}
                          className={`px-3 py-2 cursor-pointer ${incidentType === t ? "bg-teal-600 text-white" : "hover:bg-teal-50"}`}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
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
              </SectionCard>

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