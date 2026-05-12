import { useState } from "react";
import { X, User, Briefcase, PoundSterling, FileText, Shield, Pencil, Save, Eye, EyeOff } from "lucide-react";
import RTWStatusCard from "../rtw/RTWStatusCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import PhotoUpload from "../PhotoUpload";
import { logAudit } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";
import DocumentsTab from "./DocumentsTab";
import GenerateContractModal from "../contracts/GenerateContractModal";
import ContractTimeline from "../contracts/ContractTimeline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";

const roleColors = {
  admin: "bg-red-500/10 text-red-600",
  admin_officer: "bg-orange-500/10 text-orange-600",
  team_leader: "bg-purple-500/10 text-purple-500",
  support_worker: "bg-blue-500/10 text-blue-500",
};

const TABS = [
  { key: "personal", label: "Personal", icon: User },
  { key: "employment", label: "Employment", icon: Briefcase },
  { key: "pay", label: "Pay & Bank", icon: PoundSterling },
  { key: "dbs", label: "DBS & Compliance", icon: Shield },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "notes", label: "Notes", icon: FileText },
];

// Which fields each role can edit
const EDITABLE_BY_ROLE = {
  admin: ["phone", "dob", "gender", "nationality", "address",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
    "job_title", "contract_type", "start_date", "end_date", "probation_end_date",
    "team_leader_id", "home_ids", "role", "status",
    "pay_type", "hourly_rate", "annual_salary", "pay_frequency", "tax_code",
    "bank_sort_code", "bank_account_number", "ni_number",
    "dbs_number", "dbs_expiry", "dbs_issue_date", "dbs_type", "notes"],
  admin_officer: ["phone", "dob", "gender", "nationality", "address",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship",
    "job_title", "contract_type", "start_date", "end_date", "probation_end_date",
    "team_leader_id", "home_ids",
    "pay_type", "hourly_rate", "annual_salary", "pay_frequency", "tax_code",
    "bank_sort_code", "bank_account_number", "ni_number",
    "dbs_number", "dbs_expiry", "dbs_issue_date", "dbs_type", "notes"],
  team_leader: ["job_title", "home_ids", "notes"],
  support_worker: ["phone", "address",
    "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship"],
};

function FieldRow({ label, fieldKey, value, editMode, canEdit, type = "text", onChange, children }) {
  if (!editMode || !canEdit) {
    if (!value && !children) return null;
    return (
      <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-right max-w-[60%]">{children || value}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 gap-3">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <Input
        type={type}
        value={value || ""}
        onChange={e => onChange(fieldKey, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="h-7 text-xs w-48 text-right"
      />
    </div>
  );
}

function MaskedField({ label, fieldKey, value, editMode, canEdit, onChange }) {
  const [shown, setShown] = useState(false);

  if (!editMode || !canEdit) {
    if (!value) return null;
    return (
      <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium font-mono">{shown ? value : "••••••••"}</span>
          <button onClick={() => setShown(s => !s)} className="text-[10px] text-primary hover:underline">
            {shown ? "Hide" : "Show"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 gap-3">
      <label className="text-xs text-muted-foreground shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        <Input
          type={shown ? "text" : "password"}
          value={value || ""}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="h-7 text-xs w-40 font-mono"
        />
        <button onClick={() => setShown(s => !s)} className="text-muted-foreground hover:text-foreground p-1">
          {shown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function StaffProfileModal({ member, user, homes = [], allStaff = [], onClose }) {
  const [currentMember, setCurrentMember] = useState(member);
  const [activeTab, setActiveTab] = useState("personal");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ ...currentMember });
  const [localPhoto, setLocalPhoto] = useState(member.photo_url || "");
  const [showContractModal, setShowContractModal] = useState(false);
  const queryClient = useQueryClient();

  const viewerRole = user?.role === "admin" || user?.role === "admin_officer"
    ? user.role
    : (user?.role === "team_leader" ? "team_leader" : "support_worker");

  // Support workers can only edit their OWN profile
  const isSelf = allStaff.find(s => s.email === user?.email)?.id === member.id;
  const isAdmin = viewerRole === "admin" || viewerRole === "admin_officer";
  const canEdit = isAdmin || (viewerRole === "team_leader") || (viewerRole === "support_worker" && isSelf);

  const editableFields = EDITABLE_BY_ROLE[viewerRole] || [];
  const canEditField = (key) => editableFields.includes(key);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const updatePhoto = useMutation({
    mutationFn: (url) => secureGateway.update("StaffProfile", currentMember.id, { photo_url: url }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["staff"] }); toast.success("Photo updated"); },
  });

  const saveRTW = async (rtwData) => {
    await secureGateway.update("StaffProfile", currentMember.id, rtwData);
    // Audit: deliberately omit share code from audit log
    const { rtw_share_code, ...auditData } = rtwData;
    await logAudit({
      entity_name: "StaffProfile",
      entity_id: currentMember.id,
      action: "rtw_check",
      changed_by: user?.id,
      changed_by_name: user?.full_name || "",
      old_values: { rtw_checked: currentMember.rtw_checked },
      new_values: { ...auditData, rtw_share_code: rtwData.rtw_share_code ? "share code check completed" : undefined },
      org_id: ORG_ID,
      description: `Right to Work check recorded for ${currentMember.full_name} — ${rtwData.rtw_document_type}`,
      retention_category: "employment",
    });
    setCurrentMember(prev => ({ ...prev, ...rtwData }));
    setForm(prev => ({ ...prev, ...rtwData }));
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    toast.success("RTW check saved");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Only send fields this user is allowed to change
      const patch = {};
      editableFields.forEach(k => { if (form[k] !== member[k]) patch[k] = form[k]; });
      if (Object.keys(patch).length === 0) { toast("No changes to save"); return; }
      await secureGateway.update("StaffProfile", member.id, patch);
      // Audit trail — sanitise sensitive fields automatically via logAudit
      const isStatusChange = "status" in patch;
      await logAudit({
        entity_name: "StaffProfile",
        entity_id: member.id,
        action: isStatusChange ? "status_change" : "update",
        changed_by: user?.id,
        changed_by_name: user?.full_name || user?.email || "",
        old_values: Object.fromEntries(editableFields.map(k => [k, member[k]])),
        new_values: patch,
        org_id: ORG_ID,
        description: isStatusChange
          ? `Staff status changed: ${member.full_name} → ${patch.status}`
          : `Staff profile updated for ${member.full_name}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Profile saved");
      setEditMode(false);
    },
  });

  const assignedHomes = homes.filter(h => (form.home_ids || []).includes(h.id));
  const teamLeader = allStaff.find(s => s.id === form.team_leader_id);

  const toggleHomeAssignment = (homeId) => {
    const curr = form.home_ids || [];
    setField("home_ids", curr.includes(homeId) ? curr.filter(h => h !== homeId) : [...curr, homeId]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-border">
          <PhotoUpload
            currentUrl={localPhoto}
            onUploaded={(url) => { setLocalPhoto(url); updatePhoto.mutate(url); }}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg">{form.full_name}</h2>
            <p className="text-sm text-muted-foreground">{form.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={cn("text-xs capitalize", roleColors[form.role] || "bg-muted text-muted-foreground")}>
                {form.role?.replace(/_/g, " ")}
              </Badge>
              {form.employee_id && <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{form.employee_id}</span>}
              {form.status && (
                <Badge className={form.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"} variant="outline">
                  {form.status}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && !editMode && (
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setEditMode(true)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
            {editMode && (
              <>
                <Button size="sm" className="gap-1.5 h-8" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="w-3.5 h-3.5" /> {saveMutation.isPending ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setEditMode(false); setForm({ ...member }); }}>
                  Cancel
                </Button>
              </>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            if (t.key === "pay" && !isAdmin) return null;
            const isActive = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-1">

          {/* PERSONAL */}
          {activeTab === "personal" && (
            <>
              <FieldRow label="Phone" fieldKey="phone" value={form.phone} editMode={editMode} canEdit={canEditField("phone")} onChange={setField} />
              <FieldRow label="Date of Birth" fieldKey="dob" value={form.dob} editMode={editMode} canEdit={canEditField("dob")} type="date" onChange={setField} />
              {editMode && canEditField("gender") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Gender</label>
                  <Select value={form.gender || ""} onValueChange={v => setField("gender", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non_binary">Non-binary</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="Gender" fieldKey="gender" value={form.gender} editMode={false} canEdit={false} onChange={setField} />
              )}
              <FieldRow label="Nationality" fieldKey="nationality" value={form.nationality} editMode={editMode} canEdit={canEditField("nationality")} onChange={setField} />
              <FieldRow label="Address" fieldKey="address" value={form.address} editMode={editMode} canEdit={canEditField("address")} onChange={setField} />
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Emergency Contact</p>
                <FieldRow label="Name" fieldKey="emergency_contact_name" value={form.emergency_contact_name} editMode={editMode} canEdit={canEditField("emergency_contact_name")} onChange={setField} />
                <FieldRow label="Phone" fieldKey="emergency_contact_phone" value={form.emergency_contact_phone} editMode={editMode} canEdit={canEditField("emergency_contact_phone")} onChange={setField} />
                <FieldRow label="Relationship" fieldKey="emergency_contact_relationship" value={form.emergency_contact_relationship} editMode={editMode} canEdit={canEditField("emergency_contact_relationship")} onChange={setField} />
              </div>
            </>
          )}

          {/* EMPLOYMENT */}
          {activeTab === "employment" && (
            <>
              <FieldRow label="Job Title" fieldKey="job_title" value={form.job_title} editMode={editMode} canEdit={canEditField("job_title")} onChange={setField} />
              {editMode && canEditField("contract_type") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Contract Type</label>
                  <Select value={form.contract_type || ""} onValueChange={v => setField("contract_type", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="zero_hours">Zero Hours</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="Contract Type" fieldKey="contract_type" value={form.contract_type?.replace(/_/g, " ")} editMode={false} canEdit={false} onChange={setField} />
              )}
              <FieldRow label="Start Date" fieldKey="start_date" value={form.start_date} editMode={editMode} canEdit={canEditField("start_date")} type="date" onChange={setField} />
              <FieldRow label="End Date" fieldKey="end_date" value={form.end_date} editMode={editMode} canEdit={canEditField("end_date")} type="date" onChange={setField} />
              <FieldRow label="Probation End" fieldKey="probation_end_date" value={form.probation_end_date} editMode={editMode} canEdit={canEditField("probation_end_date")} type="date" onChange={setField} />
              {editMode && canEditField("team_leader_id") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Team Leader</label>
                  <Select value={form.team_leader_id || ""} onValueChange={v => setField("team_leader_id", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>None</SelectItem>
                      {allStaff.filter(s => s.role === "team_leader" && s.status === "active").map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="Team Leader" fieldKey="team_leader_id" value={teamLeader?.full_name} editMode={false} canEdit={false} onChange={setField} />
              )}
              {editMode && canEditField("home_ids") ? (
                <div className="py-2 border-b border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Assigned Homes</p>
                  <div className="flex flex-wrap gap-2">
                    {homes.map(h => (
                      <label key={h.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="rounded w-3 h-3"
                          checked={(form.home_ids || []).includes(h.id)}
                          onChange={() => toggleHomeAssignment(h.id)} />
                        {h.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <FieldRow label="Assigned Homes" fieldKey="home_ids" value={assignedHomes.map(h => h.name).join(", ") || "None"} editMode={false} canEdit={false} onChange={setField} />
              )}
              {isAdmin && editMode && canEditField("status") && (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Status</label>
                  <Select value={form.status || "active"} onValueChange={v => setField("status", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* PAY & BANK — admin only */}
          {activeTab === "pay" && isAdmin && (
            <>
              {editMode && canEditField("pay_type") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Pay Type</label>
                  <Select value={form.pay_type || "hourly"} onValueChange={v => setField("pay_type", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="Pay Type" value={form.pay_type} editMode={false} canEdit={false} onChange={setField} />
              )}
              <FieldRow label="Hourly Rate (£)" fieldKey="hourly_rate" value={form.hourly_rate} editMode={editMode} canEdit={canEditField("hourly_rate")} type="number" onChange={setField} />
              <FieldRow label="Annual Salary (£)" fieldKey="annual_salary" value={form.annual_salary} editMode={editMode} canEdit={canEditField("annual_salary")} type="number" onChange={setField} />
              {editMode && canEditField("pay_frequency") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">Pay Frequency</label>
                  <Select value={form.pay_frequency || "monthly"} onValueChange={v => setField("pay_frequency", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="fortnightly">Fortnightly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="Pay Frequency" value={form.pay_frequency} editMode={false} canEdit={false} onChange={setField} />
              )}
              <FieldRow label="Tax Code" fieldKey="tax_code" value={form.tax_code} editMode={editMode} canEdit={canEditField("tax_code")} onChange={setField} />
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Bank Details</p>
                <MaskedField label="Sort Code" fieldKey="bank_sort_code" value={form.bank_sort_code} editMode={editMode} canEdit={canEditField("bank_sort_code")} onChange={setField} />
                <MaskedField label="Account Number" fieldKey="bank_account_number" value={form.bank_account_number} editMode={editMode} canEdit={canEditField("bank_account_number")} onChange={setField} />
                <MaskedField label="NI Number" fieldKey="ni_number" value={form.ni_number} editMode={editMode} canEdit={canEditField("ni_number")} onChange={setField} />
              </div>
            </>
          )}

          {/* DBS */}
          {activeTab === "dbs" && (
            <>
              {/* Right to Work — admin only */}
              {isAdmin && (
                <div className="pb-4 mb-4 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Right to Work (UK Law)</p>
                  <RTWStatusCard
                    member={currentMember}
                    user={user}
                    allStaff={allStaff}
                    onSave={saveRTW}
                  />
                </div>
              )}

              {/* Working Time Opt-Out — admin only */}
              {isAdmin && (
                <div className="pb-3 mb-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">Working Time (WTR 1998)</p>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-muted-foreground">48-Hour Opt-Out Signed</span>
                    {editMode ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!form.working_time_opt_out}
                          onChange={e => {
                            setField("working_time_opt_out", e.target.checked);
                            if (!e.target.checked) {
                              setField("opt_out_signed_date", "");
                              setField("opt_out_document_url", "");
                            }
                          }}
                          className="rounded w-3.5 h-3.5 accent-primary"
                        />
                        <span className="text-xs">{form.working_time_opt_out ? "Yes" : "No"}</span>
                      </label>
                    ) : (
                      <span className={`text-xs font-medium ${form.working_time_opt_out ? "text-amber-600" : "text-muted-foreground"}`}>
                        {form.working_time_opt_out ? "Yes — Opt-Out Signed" : "No"}
                      </span>
                    )}
                  </div>
                  {form.working_time_opt_out && (
                    <>
                      <FieldRow label="Opt-Out Signed Date" fieldKey="opt_out_signed_date" value={form.opt_out_signed_date} editMode={editMode} canEdit={true} type="date" onChange={setField} />
                      {editMode && (
                        <div className="flex items-center justify-between py-2 border-b border-border/50">
                          <span className="text-xs text-muted-foreground">Opt-Out Document</span>
                          <div className="flex items-center gap-2">
                            {form.opt_out_document_url && (
                              <a href={form.opt_out_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View</a>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="text-xs"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const { base44: b44 } = await import("@/api/base44Client");
                                const { file_url } = await b44.integrations.Core.UploadFile({ file });
                                setField("opt_out_document_url", file_url);
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {!editMode && form.opt_out_document_url && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">Opt-Out Document</span>
                          <a href={form.opt_out_document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View Document</a>
                        </div>
                      )}
                      {isAdmin && !editMode && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                            onClick={() => {
                              if (confirm(`Withdraw WTR opt-out for ${member.full_name}? They must give 7 days notice to withdraw.`)) {
                                setField("working_time_opt_out", false);
                                setField("opt_out_signed_date", "");
                                setField("opt_out_document_url", "");
                                saveMutation.mutate();
                              }
                            }}
                          >
                            Withdraw Opt-Out
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {editMode && canEditField("dbs_type") ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50 gap-3">
                  <label className="text-xs text-muted-foreground shrink-0">DBS Type</label>
                  <Select value={form.dbs_type || "enhanced"} onValueChange={v => setField("dbs_type", v)}>
                    <SelectTrigger className="h-7 text-xs w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="enhanced">Enhanced</SelectItem>
                      <SelectItem value="enhanced_barred">Enhanced + Barred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <FieldRow label="DBS Type" value={form.dbs_type} editMode={false} canEdit={false} onChange={setField} />
              )}
              <FieldRow label="DBS Number" fieldKey="dbs_number" value={form.dbs_number} editMode={editMode} canEdit={canEditField("dbs_number")} onChange={setField} />
              <FieldRow label="Issue Date" fieldKey="dbs_issue_date" value={form.dbs_issue_date} editMode={editMode} canEdit={canEditField("dbs_issue_date")} type="date" onChange={setField} />
              <FieldRow label="Expiry Date" fieldKey="dbs_expiry" value={form.dbs_expiry} editMode={editMode} canEdit={canEditField("dbs_expiry")} type="date" onChange={setField} />
            </>
          )}

          {/* DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* Contracts Timeline */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-muted-foreground">Employment Contracts</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowContractModal(true)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      + Generate Contract
                    </button>
                  )}
                </div>
                <ContractTimeline staffId={member.id} user={user} isAdmin={isAdmin} />
              </div>

              {/* Other Documents */}
              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-3">Documents</p>
                <DocumentsTab staffId={member.id} user={user} />
              </div>
            </div>
          )}

          {/* NOTES */}
          {activeTab === "notes" && (
            <div>
              {editMode && canEditField("notes") ? (
                <textarea
                  value={form.notes || ""}
                  onChange={e => setField("notes", e.target.value)}
                  className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[120px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Add notes about this staff member…"
                />
              ) : form.notes ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No notes recorded.</p>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          {editMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setForm({ ...member }); }}>Discard</Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>

      {showContractModal && (
        <GenerateContractModal
          member={currentMember}
          org={null}
          staffProfile={null}
          user={user}
          onClose={() => setShowContractModal(false)}
          onGenerated={() => queryClient.invalidateQueries({ queryKey: ["staff-documents-contracts"] })}
        />
      )}
    </div>
  );
}