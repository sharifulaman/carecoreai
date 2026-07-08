import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, CheckCircle2, XCircle, Sparkles, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { getSuggestion } from "./auditSuggestionLogic";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

const AUDIT_SECTIONS = {
  section_1_environment: "Environment & Property Standards",
  section_2_health_safety: "Health & Safety Checks",
  section_3_yp_records: "Young People Records & Care Planning",
  section_4_staff_compliance: "Staff Compliance & Practice",
  section_5_safeguarding: "Safeguarding & Behaviour Management",
};

const CHECKLIST_ITEMS = {
  section_1_environment: [
    "Home is clean, tidy, and free from hazards",
    "Bedrooms are personalised and maintained",
    "Kitchen area is clean and hygienic",
    "Bathrooms are clean and in good condition",
    "Communal areas are safe and welcoming",
    "Internet/Wi-Fi operational and accessible",
    "Furniture in good condition with fire label",
    "Windows, doors, and locks functioning properly",
    "Lighting and heating systems working",
    "Laundry facilities available and working",
    "Garden/external areas safe and maintained",
  ],
  section_2_health_safety: [
    "Fire risk assessment is current",
    "Fire extinguishers available and in date",
    "Fire alarm checks completed and recorded",
    "Emergency lighting tested",
    "Fire exits clear and accessible",
    "First aid kit available and stocked",
    "Medication storage secure and compliant",
    "COSHH materials stored safely",
    "Electrical equipment appears safe",
    "PAT test certificate available and valid",
    "Food hygiene standards maintained",
    "Gas safety certificate available and valid",
    "Electrical safety certificate available and valid",
  ],
  section_3_yp_records: [
    "Support plans updated regularly and personalised",
    "Risk assessments updated regularly",
    "Pathway plans available and up to date",
    "Key work sessions completed and recorded",
    "Progress reports sent to IRO/social worker",
    "Weekly reports sent to social workers",
    "Daily logs accurate and professional",
    "Incidents recorded appropriately",
    "Safeguarding concerns recorded and followed up",
    "Missing from home reports completed",
    "Return home interviews completed",
    "Young people consent forms completed",
    "Education/employment records updated",
  ],
  section_4_staff_compliance: [
    "Staff files complete and compliant",
    "DBS checks valid",
    "Mandatory training up to date",
    "Supervisions completed regularly",
    "Team meetings take place regularly",
    "Staff understand required policies",
    "Staffing rota appropriately covered",
    "Staff interaction with young people positive",
    "Handover records completed properly",
  ],
  section_5_safeguarding: [
    "Safeguarding concerns managed appropriately",
    "Young people know how to raise concerns",
    "Missing from home procedures followed",
    "Incident debriefs completed",
    "Behaviour support strategies effective",
    "Sanctions/restorative approaches recorded",
    "Multi-agency cooperation evident",
    "Police/social worker communication recorded",
  ],
};

export default function AuditForm({ orgId, user, homes, onClose, onSaved, editDraft }) {
  const qc = useQueryClient();
  const [homeId, setHomeId] = useState(editDraft?.home_id || "");
  const [auditDate, setAuditDate] = useState(editDraft?.audit_date || new Date().toISOString().split("T")[0]);
  const [auditTime, setAuditTime] = useState(editDraft?.audit_time || "09:00");
  const [visitType, setVisitType] = useState(editDraft?.visit_type || "planned");
  const [registeredManager, setRegisteredManager] = useState(editDraft?.registered_manager_name || "");
  const [staffOnDuty, setStaffOnDuty] = useState(() => {
    const s = editDraft?.staff_on_duty;
    return Array.isArray(s) ? s : (typeof s === "string" ? s.split(",").map(x => x.trim()).filter(Boolean) : []);
  });
  const [youngPeoplePresent, setYoungPeoplePresent] = useState(editDraft?.young_people_present?.toString() || "");
  const [openStaffSelect, setOpenStaffSelect] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");

  const [sectionResponses, setSectionResponses] = useState(editDraft ? {
    section_1_environment: editDraft.section_1_environment || {},
    section_2_health_safety: editDraft.section_2_health_safety || {},
    section_3_yp_records: editDraft.section_3_yp_records || {},
    section_4_staff_compliance: editDraft.section_4_staff_compliance || {},
    section_5_safeguarding: editDraft.section_5_safeguarding || {},
  } : {});
  const [strengths, setStrengths] = useState(editDraft?.overall_strengths || "");
  const [improvements, setImprovements] = useState(editDraft?.areas_improvement || "");
  const [concerns, setConcerns] = useState(editDraft?.immediate_concerns || "");
  const [errors, setErrors] = useState({});
  const [isDraft, setIsDraft] = useState(!!editDraft);

  const selectedHome = homes.find(h => h.id === homeId);

  // Fetch additional data for suggestions when homeId is selected
  const { data: homeResidents = [], isFetching: residentsFetching } = useQuery({
    queryKey: ["audit-residents", homeId],
    queryFn: () => base44.entities.Resident.filter({ home_id: homeId, status: "active" }),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: homeStaff = [] } = useQuery({
    queryKey: ["audit-staff-all"],
    queryFn: () => base44.entities.StaffProfile.filter({ status: "active" }),
    staleTime: 30 * 1000,
  });

  const staffOptions = useMemo(() => homeStaff.map(s => s.full_name).filter(Boolean), [homeStaff]);

  useEffect(() => {
    if (homeId && !isDraft && !residentsFetching) {
      if (youngPeoplePresent === "") {
        setYoungPeoplePresent(homeResidents.length.toString());
      }
    }
  }, [homeId, residentsFetching, homeResidents.length, isDraft, youngPeoplePresent]);

  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["audit-training", homeId],
    queryFn: () => base44.entities.TrainingRecord.filter({}, "-created_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: safeguarding = [] } = useQuery({
    queryKey: ["audit-sg", homeId],
    queryFn: () => base44.entities.SafeguardingRecord.filter({ home_id: homeId }, "-created_date", 200),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ["audit-plans", homeId],
    queryFn: () => base44.entities.SupportPlan.filter({}, "-created_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ["audit-risk", homeId],
    queryFn: () => base44.entities.RiskAssessment.filter({}, "-created_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: dailyLogs = [] } = useQuery({
    queryKey: ["audit-logs", homeId],
    queryFn: () => base44.entities.DailyLog.filter({ home_id: homeId }, "-date", 200),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  const { data: missingFromHome = [] } = useQuery({
    queryKey: ["audit-mfh", homeId],
    queryFn: () => base44.entities.MissingFromHome.filter({ home_id: homeId }, "-reported_missing_datetime", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch visit reports for progress report / weekly report checks
  const { data: visitReports = [] } = useQuery({
    queryKey: ["audit-visit-reports", homeId],
    queryFn: () => base44.entities.VisitReport.filter({ home_id: homeId }, "-visit_datetime", 200),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch incidents for incident recording checks
  const { data: incidents = [] } = useQuery({
    queryKey: ["audit-incidents", homeId],
    queryFn: () => base44.entities.Incident.filter({ home_id: homeId }, "-incident_datetime", 200),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch supervision records for staff compliance
  const { data: supervisionRecords = [] } = useQuery({
    queryKey: ["audit-supervisions", homeId],
    queryFn: () => base44.entities.SupervisionRecord.filter({}, "-session_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch policy acknowledgements for staff compliance
  const { data: policyAcknowledgements = [] } = useQuery({
    queryKey: ["audit-policy-acks", homeId],
    queryFn: () => base44.entities.PolicyAcknowledgement.filter({}, "-created_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch shifts for rota coverage check
  const { data: shifts = [] } = useQuery({
    queryKey: ["audit-shifts", homeId],
    queryFn: () => base44.entities.Shift.filter({ home_id: homeId }, "-date", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch handover records
  const { data: handoverRecords = [] } = useQuery({
    queryKey: ["audit-handovers", homeId],
    queryFn: () => base44.entities.HandoverRecord.filter({ home_id: homeId }, "-created_date", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch complaints for safeguarding section
  const { data: complaints = [] } = useQuery({
    queryKey: ["audit-complaints", homeId],
    queryFn: () => base44.entities.Complaint.filter({ home_id: homeId }, "-created_date", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch behaviour support plans
  const { data: behaviourPlans = [] } = useQuery({
    queryKey: ["audit-behaviour-plans", homeId],
    queryFn: () => base44.entities.BehaviourSupportPlan.filter({}, "-created_date", 500),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch warning letters for sanctions check
  const { data: warningLetters = [] } = useQuery({
    queryKey: ["audit-warnings", homeId],
    queryFn: () => base44.entities.WarningLetter.filter({ home_id: homeId }, "-issued_date", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch SWPA feedback for staff interaction check
  const { data: swpaFeedback = [] } = useQuery({
    queryKey: ["audit-swpa-feedback", homeId],
    queryFn: () => base44.entities.SWPAFeedbackSubmission.filter({ home_id: homeId }, "-submitted_at", 100),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Fetch check chore instances for the home (HomeCheckInstance has home_id)
  const { data: checkInstances = [] } = useQuery({
    queryKey: ["audit-check-instances", homeId],
    queryFn: () => base44.entities.HomeCheckInstance.filter({ home_id: homeId }, "-scheduled_date", 300),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Build sets of instance_ids and completion_ids for this home
  const instanceIds = useMemo(() => new Set(checkInstances.map(i => i.id)), [checkInstances]);

  // Fetch ALL check chore item responses and filter by instance_id in memory
  const { data: checkResponses = [] } = useQuery({
    queryKey: ["audit-check-responses", homeId],
    queryFn: () => base44.entities.HomeCheckItemResponse.filter({}, "-completed_at", 2000),
    enabled: !!homeId,
    staleTime: 30 * 1000,
  });

  // Build a map of item_title (lowercase) → latest response for this home
  const checkResponseByTitle = useMemo(() => {
    if (instanceIds.size === 0) return {};
    const map = {};
    checkResponses
      .filter(r => r.instance_id && instanceIds.has(r.instance_id))
      .forEach(r => {
        const key = (r.item_title || "").toLowerCase();
        if (!key) return;
        if (!map[key] || (r.completed_at || "") > (map[key].completed_at || "")) {
          map[key] = r;
        }
      });
    return map;
  }, [checkResponses, instanceIds]);

  // Build suggestion context
  const suggestionCtx = useMemo(() => ({
    home: selectedHome,
    residents: homeResidents,
    homeStaff,
    trainingRecords,
    safeguarding,
    supportPlans,
    riskAssessments,
    dailyLogs,
    missingFromHome,
    checkResponses,
    checkResponseByTitle,
    visitReports,
    incidents,
    supervisionRecords,
    policyAcknowledgements,
    shifts,
    handoverRecords,
    complaints,
    behaviourPlans,
    warningLetters,
    swpaFeedback,
  }), [selectedHome, homeResidents, homeStaff, trainingRecords, safeguarding, supportPlans, riskAssessments, dailyLogs, missingFromHome, checkResponses, checkResponseByTitle, visitReports, incidents, supervisionRecords, policyAcknowledgements, shifts, handoverRecords, complaints, behaviourPlans, warningLetters, swpaFeedback]);

  const buildPayload = (status) => {
    let totalItems = 0;
    let yesCount = 0;
    Object.values(sectionResponses).forEach(section => {
      Object.values(section).forEach(val => {
        if (val !== "n/a") totalItems++;
        if (val === "yes") yesCount++;
      });
    });
    const score = totalItems > 0 ? Math.round((yesCount / totalItems) * 100) : 0;
    const complianceRating = score >= 80 ? "good" : score >= 60 ? "requires_improvement" : "inadequate";
    const ofstedImpact = score >= 80 ? 8 : score >= 60 ? 2 : -5;

    return {
      org_id: orgId,
      home_id: homeId,
      home_name: selectedHome?.name,
      audit_date: auditDate,
      audit_time: auditTime,
      auditor_id: user?.id,
      auditor_name: user?.full_name,
      registered_manager_name: registeredManager,
      visit_type: visitType,
      staff_on_duty: Array.isArray(staffOnDuty) ? staffOnDuty : staffOnDuty.split(",").map(s => s.trim()).filter(Boolean),
      young_people_present: parseInt(youngPeoplePresent) || 0,
      ...sectionResponses,
      overall_strengths: strengths,
      areas_improvement: improvements,
      immediate_concerns: concerns,
      overall_score: score,
      compliance_rating: complianceRating,
      ofsted_impact: ofstedImpact,
      status,
      workflow_status: status === "submitted" ? "maker_submitted" : "pending",
      submitted_by_id: user?.id,
      submitted_by_name: user?.full_name,
      submitted_at: status === "submitted" ? new Date().toISOString() : editDraft?.submitted_at || null,
    };
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload("submitted");
      if (editDraft?.id) {
        await base44.entities.InternalAuditSubmission.update(editDraft.id, payload);
      } else {
        await base44.entities.InternalAuditSubmission.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Audit submitted successfully");
      qc.invalidateQueries({ queryKey: ["internal-audits"] });
      qc.invalidateQueries({ queryKey: ["audit-drafts"] });
      onSaved?.();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload("draft");
      if (editDraft?.id) {
        await base44.entities.InternalAuditSubmission.update(editDraft.id, payload);
      } else {
        await base44.entities.InternalAuditSubmission.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Draft saved successfully");
      qc.invalidateQueries({ queryKey: ["audit-drafts"] });
      onSaved?.();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const validateForm = () => {
    const newErrors = {};
    const errorMessages = [];

    // Required field validation
    if (!homeId) {
      newErrors.homeId = "Home is required";
      errorMessages.push("• Home is required");
    }
    if (!auditDate) {
      newErrors.auditDate = "Audit date is required";
      errorMessages.push("• Audit date is required");
    }
    if (!registeredManager?.trim()) {
      newErrors.registeredManager = "Registered manager name is required";
      errorMessages.push("• Registered manager name is required");
    }
    if (!youngPeoplePresent || isNaN(parseInt(youngPeoplePresent))) {
      newErrors.youngPeoplePresent = "Valid number required";
      errorMessages.push("• Young people present count is required (valid number)");
    }
    
    // Check that ALL checklist items are completed
    let totalItems = 0;
    let completedItems = 0;
    Object.values(sectionResponses).forEach(section => {
      Object.values(section || {}).forEach(val => {
        totalItems++;
        if (val) completedItems++;
      });
    });
    
    // Count expected items from CHECKLIST_ITEMS
    let expectedItems = 0;
    Object.values(CHECKLIST_ITEMS).forEach(items => {
      expectedItems += items.length;
    });
    
    if (completedItems < expectedItems) {
      newErrors.sections = `Please complete all checklist items (${completedItems}/${expectedItems} completed)`;
      errorMessages.push(`• All checklist items must be completed (${completedItems}/${expectedItems} completed)`);
    }

    setErrors(newErrors);
    
    // Show toast with all errors
    if (errorMessages.length > 0) {
      toast.error(`Validation errors:\n\n${errorMessages.join('\n')}`, { duration: 5 });
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    createMutation.mutate();
  };

  const handleSaveDraft = () => {
    if (!homeId) {
      toast.error("Please select a home before saving draft");
      return;
    }
    saveDraftMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between p-6 border-b border-border/30 sticky top-0 bg-card/95">
          <h2 className="text-xl font-bold">{isDraft ? "Resume Audit Draft" : "New Internal Audit"}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Placement Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Home *</label>
              <select
                value={homeId}
                onChange={(e) => { setHomeId(e.target.value); setErrors({...errors, homeId: ""}); setYoungPeoplePresent(""); }}
                className={`w-full px-3 py-2 border rounded-lg bg-background ${errors.homeId ? "border-red-500" : "border-border"}`}
              >
                <option value="">Select home</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              {errors.homeId && <p className="text-xs text-red-500 mt-1">{errors.homeId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Audit Date *</label>
              <Input 
                type="date" 
                value={auditDate} 
                onChange={(e) => { setAuditDate(e.target.value); setErrors({...errors, auditDate: ""}); }}
                className={errors.auditDate ? "border-red-500" : ""}
              />
              {errors.auditDate && <p className="text-xs text-red-500 mt-1">{errors.auditDate}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Audit Time</label>
              <Input type="time" value={auditTime} onChange={(e) => setAuditTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Visit Type</label>
              <select value={visitType} onChange={(e) => setVisitType(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                <option value="planned">Planned</option>
                <option value="unannounced">Unannounced</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Registered Manager *</label>
              <AutocompleteInput
                value={registeredManager}
                onChange={(val) => { setRegisteredManager(val); setErrors({...errors, registeredManager: ""}); }}
                options={staffOptions}
                placeholder="Name"
              />
              {errors.registeredManager && <p className="text-xs text-red-500 mt-1">{errors.registeredManager}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Young People Present *</label>
              <Input 
                type="number" 
                value={youngPeoplePresent} 
                onChange={(e) => { setYoungPeoplePresent(e.target.value); setErrors({...errors, youngPeoplePresent: ""}); }}
                className={errors.youngPeoplePresent ? "border-red-500" : ""}
              />
              {errors.youngPeoplePresent && <p className="text-xs text-red-500 mt-1">{errors.youngPeoplePresent}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium block mb-1">Staff on Duty</label>
              <Popover open={openStaffSelect} onOpenChange={setOpenStaffSelect}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    className="flex w-full items-center justify-between border border-slate-200 rounded-xl px-3 py-2 min-h-[42px] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                  >
                    <div className="flex flex-wrap gap-1">
                      {staffOnDuty.length === 0 && <span className="text-slate-500">Select staff...</span>}
                      {staffOnDuty.map(staff => (
                        <Badge key={staff} variant="secondary" className="mr-1 flex items-center gap-1 font-normal bg-slate-100 border border-slate-200 hover:bg-slate-200">
                          {staff}
                          <span 
                            className="cursor-pointer text-slate-500 hover:text-slate-700" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setStaffOnDuty(prev => prev.filter(s => s !== staff));
                            }}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </Badge>
                      ))}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search or type new..." value={staffSearch} onValueChange={setStaffSearch} />
                    <CommandList>
                      <CommandEmpty>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-100 rounded-sm"
                          onClick={() => { 
                            if(staffSearch) setStaffOnDuty(prev => [...prev, staffSearch]); 
                            setOpenStaffSelect(false);
                            setStaffSearch("");
                          }}
                        >
                          Add "{staffSearch}"
                        </button>
                      </CommandEmpty>
                      <CommandGroup>
                        {staffOptions.filter(opt => !staffOnDuty.includes(opt)).map((opt) => (
                          <CommandItem
                            key={opt}
                            value={opt}
                            onSelect={(currentValue) => {
                              const original = staffOptions.find(o => o.toLowerCase() === currentValue) || currentValue;
                              if (!staffOnDuty.includes(original)) {
                                setStaffOnDuty(prev => [...prev, original]);
                              }
                              setStaffSearch("");
                            }}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            {opt}
                          </CommandItem>
                        ))}
                        {staffSearch && !staffOptions.some(o => o.toLowerCase() === staffSearch.toLowerCase()) && (
                          <CommandItem
                            value={staffSearch}
                            onSelect={() => { 
                              if (!staffOnDuty.includes(staffSearch)) {
                                setStaffOnDuty(prev => [...prev, staffSearch]); 
                              }
                              setStaffSearch("");
                            }}
                          >
                            <Check className="mr-2 h-4 w-4 opacity-0" />
                            Add "{staffSearch}"
                          </CommandItem>
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Sections Validation Error */}
          {errors.sections && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-500 font-medium">{errors.sections}</p>
            </div>
          )}

          {/* Global Set All Controls */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <span className="text-xs font-semibold text-cyan-400 flex-1">Set all items (all sections):</span>
            {[
              { val: "yes", label: "All Yes", cls: "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/30" },
              { val: "no", label: "All No", cls: "bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-500/30" },
              { val: "n/a", label: "All N/A", cls: "bg-slate-500/15 text-slate-600 hover:bg-slate-500/25 border-slate-500/30" },
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  const updated = {};
                  Object.entries(CHECKLIST_ITEMS).forEach(([sectionKey, items]) => {
                    updated[sectionKey] = {};
                    items.forEach(item => {
                      updated[sectionKey][item] = opt.val;
                    });
                  });
                  setSectionResponses(updated);
                }}
                className={`px-3 py-1 rounded text-xs font-semibold border cursor-pointer transition-colors ${opt.cls}`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const updated = {};
                Object.entries(CHECKLIST_ITEMS).forEach(([sectionKey, items]) => {
                  updated[sectionKey] = {};
                  items.forEach(item => {
                    updated[sectionKey][item] = "";
                  });
                });
                setSectionResponses(updated);
              }}
              className="px-3 py-1 rounded text-xs font-semibold border cursor-pointer transition-colors bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-500/30"
            >
              Reset All
            </button>
          </div>

          {/* Audit Sections */}
          {Object.entries(AUDIT_SECTIONS).map(([sectionKey, sectionTitle]) => (
            <div key={sectionKey} className="border-t border-border/30 pt-6">
              <h3 className="font-semibold mb-4 text-cyan-400">{sectionTitle}</h3>
              <div className="space-y-2">
                {CHECKLIST_ITEMS[sectionKey]?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded bg-muted/20">
                    <label className="text-sm flex-1 min-w-0">{item}</label>
                    {(() => {
                      const suggestion = homeId ? getSuggestion(item, suggestionCtx) : null;
                      if (!homeId) return (
                        <div className="shrink-0 w-28 text-[9px] text-slate-300 italic text-right">Select home</div>
                      );
                      if (!suggestion) return (
                        <div className="shrink-0 w-28 text-[9px] text-slate-300 italic text-right">Manual check</div>
                      );
                      const isPass = suggestion.status === "pass";
                      return (
                        <button
                          type="button"
                          onClick={() => setSectionResponses({
                            ...sectionResponses,
                            [sectionKey]: { ...sectionResponses[sectionKey], [item]: isPass ? "yes" : "no" }
                          })}
                          title={suggestion.detail}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold shrink-0 w-28 cursor-pointer transition-colors ${
                            isPass
                              ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 border border-green-500/30"
                              : "bg-red-500/15 text-red-600 hover:bg-red-500/25 border border-red-500/30"
                          }`}
                        >
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          {isPass ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <XCircle className="w-3 h-3 shrink-0" />}
                          <span className="truncate">{isPass ? "Pass" : "Fail"}</span>
                        </button>
                      );
                    })()}

                    <select
                      value={sectionResponses[sectionKey]?.[item] || ""}
                      onChange={(e) => setSectionResponses({
                        ...sectionResponses,
                        [sectionKey]: { ...sectionResponses[sectionKey], [item]: e.target.value }
                      })}
                      className="w-20 px-2 py-1 border border-border rounded text-sm shrink-0"
                    >
                      <option value="">Select</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="n/a">N/A</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="border-t border-border/30 pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Strengths Identified</label>
              <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Areas Requiring Improvement</label>
              <Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Immediate Safeguarding / Health & Safety Concerns</label>
              <Textarea value={concerns} onChange={(e) => setConcerns(e.target.value)} rows={3} />
            </div>
          </div>
        </div>

        <div className="border-t border-border/30 px-6 py-4 flex flex-wrap justify-end gap-2 bg-card sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saveDraftMutation.isPending}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-4 py-2 bg-slate-200 text-slate-900 hover:bg-slate-300 transition-colors disabled:opacity-50"
          >
            {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
          </button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-gradient-to-r from-cyan-500 to-blue-600">
            {createMutation.isPending ? "Submitting..." : "Submit Audit"}
          </Button>
        </div>
      </div>
    </div>
  );
}