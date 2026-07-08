import { ChevronRight, ChevronDown, Save, X as XIcon, Loader2, ExternalLink, CheckCircle2, Pencil, Plus, User, Building2, Phone, MapPin, Calendar, Mail, Glasses, Hash, FileText, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";

const taskConfigs = {
  gp: {
    entity: "Resident",
    fields: ["nhs_number", "gp_name", "gp_practice", "gp_phone", "gp_email", "gp_address", "gp_registered_date"],
    label: "GP Details",
    icon: "🏥",
  },
  dentist: {
    entity: "Resident",
    fields: ["dentist_name", "dentist_practice", "dentist_phone", "dentist_address", "dentist_last_appointment", "dentist_next_appointment"],
    label: "Dentist Registration",
    icon: "🦷",
  },
  optician: {
    entity: "Resident",
    fields: ["optician_name", "optician_practice", "optician_phone", "optician_address", "optician_last_appointment", "optician_next_appointment", "optician_needs_glasses"],
    label: "Optician Details",
    icon: "👁️",
  },
  allergies: {
    entity: "Resident",
    fields: ["allergies"],
    label: "Allergies",
    icon: "⚠️",
    isArray: true,
  },
  conditions: {
    entity: "Resident",
    fields: ["medical_conditions"],
    label: "Medical Conditions",
    icon: "💊",
    isArray: true,
  },
  bodymap: {
    entity: "BodyMap",
    label: "Body Map",
    icon: "🏃",
    openModal: true,
  },
  healthnotes: {
    entity: "Resident",
    fields: ["health_notes"],
    label: "Health Notes",
    icon: "📝",
  },
  appointments: {
    entity: "Appointment",
    label: "Appointments",
    icon: "📅",
    openModal: true,
  },
  education: {
    entity: "Resident",
    fields: ["education_status", "education_provider", "education_course", "education_enrolment_date"],
    label: "Education Update",
    icon: "🎓",
    annexAFields: true,
  },
  neet: {
    entity: "NEETRecord",
    fields: ["currently_neet", "date_neet_started", "reason_currently_neet", "action_plan"],
    label: "Employment / NEET",
    icon: "💼",
  },
  pathway: {
    entity: "PathwayPlan",
    label: "Pathway Plan",
    icon: "📋",
    openModal: true,
  },
  pa: {
    entity: "PAVisit",
    fields: ["visit_date", "visit_type", "visit_notes", "next_visit_date"],
    label: "Visit Logs / reports",
    icon: "💬",
    openModal: true,
  },
  keypeople: {
    entity: "KeyPerson",
    label: "Contact",
    icon: "👥",
    openModal: true,
  },
  missing: {
    entity: "MissingFromHome",
    label: "Missing Episode Check",
    icon: "🔍",
    openModal: true,
    urgent: true,
  },
  risk: {
    entity: "RiskAssessment",
    fields: ["risk_level", "risk_summary", "review_date"],
    label: "Risk Assessment",
    icon: "⚠️",
    openModal: true,
    urgent: true,
  },
  cse: {
    entity: "CSERecord",
    fields: ["cse_status", "last_review_date", "risk_level"],
    label: "CSE / CCE Risk",
    icon: "🛡️",
    openModal: true,
    urgent: true,
  },
  complaint: {
    entity: "Complaint",
    label: "Recent Complaints",
    icon: "🗣️",
    openModal: true,
  },
  incident: {
    entity: "Incident",
    label: "Recent Incidents",
    icon: "🚨",
    openModal: true,
    urgent: true,
  },
  documents: {
    entity: "Document",
    label: "Missing Documents",
    icon: "📂",
    openModal: true,
  },
  annexa: {
    entity: "Resident",
    label: "Annex A Checks",
    icon: "✅",
    isReadOnly: true,
  },
};

const statusConfig = {
  completed: "bg-emerald-500",
  due: "bg-amber-400",
  overdue: "bg-red-500",
  open: "bg-red-500", // Fix for matching backend 'open' statuses
  pending: "bg-amber-400",
  resolved: "bg-emerald-500",
};

const iconThemes = {
  gp: "bg-purple-50 text-purple-600",
  dentist: "bg-indigo-50 text-indigo-600",
  optician: "bg-orange-50 text-orange-600",
  allergies: "bg-amber-50 text-amber-600",
  conditions: "bg-red-50 text-red-600",
  bodymap: "bg-orange-50 text-orange-600",
  healthnotes: "bg-purple-50 text-purple-600",
  appointments: "bg-blue-50 text-blue-600",
  education: "bg-indigo-50 text-indigo-600",
  neet: "bg-stone-100 text-stone-600",
  pathway: "bg-orange-50 text-orange-600",
  pa: "bg-purple-50 text-purple-600",
  keypeople: "bg-indigo-50 text-indigo-600",
  missing: "bg-blue-50 text-blue-600",
  risk: "bg-blue-50 text-blue-600",
  cse: "bg-red-50 text-red-600",
  complaint: "bg-purple-50 text-purple-600",
  incident: "bg-orange-50 text-orange-600",
  documents: "bg-amber-50 text-amber-600",
  annexa: "bg-emerald-50 text-emerald-600",
};

export default function ExpandableTaskCard({ taskKey, selectedResident, status, onTaskClick, side, isExpanded, onToggle }) {
  const navigate = useNavigate();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [newAllergy, setNewAllergy] = useState({ allergen: "", severity: "moderate", reaction: "", notes: "" });
  const [newCondition, setNewCondition] = useState({ condition: "", diagnosed_date: "", notes: "" });

  useEffect(() => {
    if (!expanded) {
      setIsEditing(false);
    }
  }, [expanded]);

  const SEVERITY_COLOURS = {
    mild: "bg-yellow-100 text-yellow-700",
    moderate: "bg-orange-100 text-orange-700",
    severe: "bg-red-100 text-red-700",
    anaphylactic: "bg-red-600 text-white",
  };
  const config = taskConfigs[taskKey];

  useEffect(() => {
    if (!expanded || !selectedResident || !config) return;
    fetchData();
  }, [expanded, selectedResident?.id, config]);

  async function fetchData() {
    if (!config) return;
    setLoading(true);
    try {
      if (config.openModal) {
        setFormData({ modalMode: true });
      } else if (config.isReadOnly) {
        // For Annex A, load resident data
        setFormData({ resident: selectedResident });
      } else if (config.entity === "Resident") {
        const records = await secureGateway.filter("Resident", { id: selectedResident?.id });
        const data = records[0] || { id: selectedResident?.id };
        if (config.isArray) {
          config.fields.forEach(f => {
            if (Array.isArray(data[f])) {
              data[f] = data[f].map(item => item?.allergen || item?.condition || item?.notes || item).filter(Boolean).join(", ");
            }
          });
        }
        setFormData(data);
      } else {
        // Sort by -created_date to always get the most recent record first
        const records = await secureGateway.filter(config.entity, { resident_id: selectedResident?.id }, "-created_date", 1);
        setFormData(records[0] || { resident_id: selectedResident?.id });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  if (!config) return null;

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!formData || !selectedResident) return;
    setSaving(true);
    try {
      if (config.entity === "Resident") {
        const saveData = { ...formData, id: selectedResident.id };
        if (config.isArray) {
          config.fields.forEach(f => {
            if (typeof saveData[f] === "string") {
              saveData[f] = saveData[f].split(",").map(s => s.trim()).filter(Boolean).map(s => {
                if (f === "allergies") return { allergen: s };
                if (f === "medical_conditions") return { condition: s };
                return s;
              });
            }
          });
        }
        await secureGateway.update("Resident", selectedResident.id, saveData);
      } else {
        const saveData = { 
          ...formData, 
          resident_id: selectedResident.id,
          resident_name: selectedResident.display_name || selectedResident.name,
          home_id: selectedResident.home_id
        };
        if (formData.id) {
          await secureGateway.update(config.entity, formData.id, saveData);
        } else {
          await secureGateway.create(config.entity, saveData);
        }
      }
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      toast.success("Data saved");
      setIsEditing(false);
      await fetchData(); // Re-fetch so the display refreshes immediately
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleTaskClick() {
    if (taskKey === "pa" && selectedResident) {
      navigate(`/residents?yp=${selectedResident.id}&group=records&tab=daily-logs-tab`);
      return;
    }
    if (taskKey === "risk" && selectedResident) {
      navigate(`/residents?yp=${selectedResident.id}&group=safety&tab=risk-assessment`);
      return;
    }
    if (taskKey === "documents" && selectedResident) {
      navigate(`/young-people/${selectedResident.id}/workspace`);
      return;
    }
    if (config.openModal) {
      onTaskClick?.();
    }
  }

  return (
    <div className={`relative w-full ${expanded ? "z-50" : "z-10 hover:z-20"}`}>
      {/* Anchor for SVG lines */}
      <div
        id={`anchor-${taskKey}`}
        className={`absolute w-1.5 h-1.5 bg-slate-200 rounded-full pointer-events-none ${side === "left" ? "-right-0.5" : "-left-0.5"} top-1/2 -translate-y-1/2 z-0`}
      />
      <button
        onClick={() => {
          if (config.openModal) {
            handleTaskClick();
          } else {
            if (onToggle) onToggle(!expanded);
            else setInternalExpanded(!internalExpanded);
          }
        }}
        className={`relative w-full flex h-[46px] items-center justify-between px-5 hover:bg-slate-50 transition bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 z-20 ${expanded && !config.openModal ? "rounded-t-2xl border-b-slate-100" : "rounded-full"}`}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 flex items-center justify-center text-[18px]">
            {config.icon}
          </span>
          <span className="truncate text-sm font-semibold text-slate-700">{config.label}</span>
        </span>
        <div className="flex items-center gap-3 shrink-0">
          {showSuccess && <CheckCircle2 size={16} className="text-emerald-500" />}
          <span className={`h-2.5 w-2.5 rounded-full ${statusConfig[status] || statusConfig.due}`} />
          <ChevronRight size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Absolute Floating Popup Placeholder */}
      {expanded && !config.openModal && (
        <div className="absolute top-full left-0 w-full bg-white border border-slate-200 border-t-0 p-4 space-y-4 rounded-b-2xl shadow-xl z-10 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-slate-500" />
            </div>
          ) : config.isReadOnly ? (
            <AnnexAChecklist resident={selectedResident} />
          ) : !isEditing ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-[15px] text-slate-800 tracking-tight">Your {config.label.split(" ")[0]}</span>
                <button onClick={() => {
                  if (taskKey === "pa" && selectedResident) {
                    navigate(`/residents?yp=${selectedResident.id}&group=records&tab=daily-logs-tab`);
                    return;
                  }
                  if (config.openModal) {
                    onTaskClick(taskKey);
                  } else {
                    setIsEditing(true);
                  }
                }} className="text-[11px] text-blue-600 flex items-center hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
                  EDIT
                </button>
              </div>

              {config.isArray ? (
                <div className="space-y-3">
                  {config.fields?.map(field => {
                    const val = formData?.[field];
                    let arr = [];
                    if (Array.isArray(val)) arr = val;
                    else if (typeof val === "string") arr = val.split(",").map(s => s.trim()).filter(Boolean);

                    if (arr.length === 0) return <div key={field} className="p-4 text-sm text-slate-400 italic bg-slate-50/30 rounded-xl border border-slate-100">No records found.</div>;

                    return arr.map((item, idx) => {
                      const itemName = typeof item === "string" ? item : (item.allergen || item.condition || item.name || JSON.stringify(item));
                      const Icon = field.includes("allerg") ? FileText : User;

                      return (
                        <div key={`${field}-${idx}`} className="border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden divide-y divide-slate-100">
                          <div className="flex items-center justify-between p-3 group hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <Icon size={14} className="text-slate-400 shrink-0" />
                              <span className="text-[13px] text-slate-600 font-medium tracking-wide">{config.label}</span>
                            </div>
                            <span className="text-[13px] text-slate-800 font-semibold text-right max-w-[50%] truncate" title={itemName}>{itemName}</span>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              ) : (
                <div className="border border-slate-100 rounded-xl bg-slate-50/30 overflow-hidden divide-y divide-slate-100">
                  {config.fields?.map((field) => {
                    const val = formData?.[field];
                    let displayVal = "—";

                    if (typeof val === "boolean") {
                      displayVal = val ? "Yes" : "No";
                    } else if (val) {
                      displayVal = val;
                    }

                    let Icon = FileText;
                    if (field.includes("name")) Icon = User;
                    else if (field.includes("practice")) Icon = Building2;
                    else if (field.includes("phone")) Icon = Phone;
                    else if (field.includes("address")) Icon = MapPin;
                    else if (field.includes("date") || field.includes("appointment")) Icon = Calendar;
                    else if (field.includes("email")) Icon = Mail;
                    else if (field.includes("glasses")) Icon = Glasses;
                    else if (field.includes("nhs")) Icon = Hash;

                    return (
                      <div key={field} className="flex items-center justify-between p-3 group hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Icon size={14} className="text-slate-400" />
                          <span className="text-[13px] text-slate-600 font-medium tracking-wide">{field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</span>
                        </div>
                        <span className="text-[13px] text-slate-800 font-semibold text-right max-w-[50%] truncate" title={displayVal}>{displayVal}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-700 font-medium">Keep your details up to date for better care.</p>
              </div>
            </div>
          ) : (
            <>
              {config.fields?.map((field) => (
                <div key={field}>
                  <Label className="text-sm font-semibold text-slate-700 mb-1.5 block">
                    {field.replace(/_/g, " ").toUpperCase()}
                  </Label>
                  {field.includes("date") || field.includes("appointment") ? (
                    <Input
                      type="date"
                      value={formData?.[field] ? formData[field].split("T")[0] : ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="text-sm"
                    />
                  ) : field.includes("registered") || field.includes("needs_glasses") || field === "currently_neet" ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={formData?.[field] || false}
                        onChange={(e) => handleChange(field, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-600">Yes</span>
                    </div>
                  ) : (
                    <Input
                      value={formData?.[field] || ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1" size="sm">
                  <Save size={14} /> {saving ? "Saving..." : "Save"}
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 gap-1" size="sm">
                  <XIcon size={14} /> Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AnnexAChecklist({ resident }) {
  const mandatoryFields = [
    { key: "accommodation_category", label: "Accommodation Category", check: (r) => !!r?.accommodation_category },
    { key: "placing_local_authority", label: "Placing LA", check: (r) => !!r?.placing_local_authority },
    { key: "uasc", label: "UASC Status", check: (r) => r?.uasc !== undefined && r?.uasc !== null },
    { key: "gp_registered", label: "GP Registered", check: (r) => !!r?.gp_name },
    { key: "dentist_registered", label: "Dentist Registered", check: (r) => !!r?.dentist_name },
    { key: "education_status", label: "Education Status", check: (r) => !!r?.education_status },
  ];

  return (
    <div className="space-y-2">
      {mandatoryFields.map((field) => {
        const hasValue = field.check(resident);
        return (
          <div key={field.key} className="flex items-center gap-2 text-sm p-2 rounded-lg border border-slate-200">
            {hasValue ? (
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-red-500 shrink-0" />
            )}
            <span className={hasValue ? "text-slate-700" : "text-red-600 font-medium"}>{field.label}</span>
          </div>
        );
      })}
    </div>
  );
}