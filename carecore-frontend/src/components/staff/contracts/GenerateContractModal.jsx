import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { logAudit } from "@/lib/logAudit";

function mergFields(html, data) {
  let result = html;
  const fields = [
    "employee_full_name", "job_title", "start_date", "contracted_hours",
    "pay_type", "hourly_rate", "annual_salary", "pay_frequency",
    "notice_period", "place_of_work", "organisation_name", "manager_name",
    "probation_period", "annual_leave_days", "effective_date", "today_date",
  ];
  fields.forEach(field => {
    const regex = new RegExp(`{{${field}}}`, "g");
    result = result.replace(regex, data[field] || "");
  });
  return result;
}

export default function GenerateContractModal({ member, org, staffProfile, user, onClose, onGenerated }) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [editingHtml, setEditingHtml] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [step, setStep] = useState("select"); // select, edit, confirm
  const [loading, setLoading] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => secureGateway.filter("ContractTemplate", { org_id: ORG_ID, is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const mergeData = {
    employee_full_name: member.full_name,
    job_title: member.job_title || "Support Worker",
    start_date: member.start_date || format(new Date(), "dd MMM yyyy"),
    contracted_hours: member.contracted_weekly_hours || 37.5,
    pay_type: member.pay_type || "hourly",
    hourly_rate: member.hourly_rate || "",
    annual_salary: member.annual_salary || "",
    pay_frequency: member.pay_frequency || "monthly",
    notice_period: (org?.hr_policy?.probation_months || 6) * 4 / 4,
    place_of_work: "", // Will be filled dynamically
    organisation_name: org?.name || "CareCore AI",
    manager_name: "", // Will be filled dynamically
    probation_period: org?.hr_policy?.probation_months || 6,
    annual_leave_days: org?.hr_policy?.annual_leave_days || 28,
    effective_date: effectiveDate,
    today_date: format(new Date(), "dd MMM yyyy"),
  };

  const handleSelectTemplate = () => {
    if (!selectedTemplate) return;
    const filled = mergFields(selectedTemplate.body_html, mergeData);
    setEditingHtml(filled);
    setStep("edit");
  };

  const handleGenerateAndSave = async () => {
    setLoading(true);
    try {
      // Create HTML-to-PDF
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: new Blob([`<html><body>${editingHtml}</body></html>`], { type: "text/html" }),
      });

      const doc = await secureGateway.create("StaffDocument", {
        org_id: ORG_ID,
        staff_id: member.id,
        document_type: "employment_contract",
        title: `${selectedTemplate.name} — ${member.full_name} — ${effectiveDate}`,
        file_url,
        upload_date: new Date().toISOString(),
        status: "valid",
        uploaded_by: user?.id,
      });

      await logAudit({
        entity_name: "StaffDocument",
        entity_id: doc?.id,
        action: "create",
        changed_by: user?.id,
        changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { document_type: "employment_contract", title: doc?.title },
        org_id: ORG_ID,
        description: `Employment contract generated: ${selectedTemplate.name} for ${member.full_name}`,
        retention_category: "employment",
      });

      queryClient.invalidateQueries({ queryKey: ["staff-documents"] });
      toast.success("Contract saved successfully");
      onClose();
      onGenerated?.();
    } catch (err) {
      toast.error("Failed to generate contract: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndEmail = async () => {
    setLoading(true);
    try {
      // Save first
      const { file_url } = await base44.integrations.Core.UploadFile({
        file: new Blob([`<html><body>${editingHtml}</body></html>`], { type: "text/html" }),
      });

      const doc = await secureGateway.create("StaffDocument", {
        org_id: ORG_ID,
        staff_id: member.id,
        document_type: "employment_contract",
        title: `${selectedTemplate.name} — ${member.full_name} — ${effectiveDate}`,
        file_url,
        upload_date: new Date().toISOString(),
        status: "sent",
        uploaded_by: user?.id,
      });

      // Email
      await base44.integrations.Core.SendEmail({
        to: member.email,
        subject: `Your Employment Contract — ${org?.name || "CareCore AI"}`,
        body: `Dear ${member.full_name},\n\nPlease find attached your ${selectedTemplate.name} with ${org?.name || "CareCore AI"}.\n\nPlease review and confirm receipt by replying to this email or speaking to your manager.\n\nBest regards,\n${org?.name || "CareCore AI"}`,
      });

      // Notify
      const notifBody = `Your employment contract has been sent to ${member.email}. Please review and confirm receipt.`;
      await secureGateway.create("Notification", {
        org_id: ORG_ID,
        user_id: member.user_id,
        recipient_staff_id: member.id,
        type: "general",
        related_module: "HR — Contract",
        message: notifBody,
        priority: "normal",
      });

      await logAudit({
        entity_name: "StaffDocument",
        entity_id: doc?.id,
        action: "email",
        changed_by: user?.id,
        changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { emailed_to: member.email, status: "sent" },
        org_id: ORG_ID,
        description: `Employment contract emailed to ${member.full_name} at ${member.email}`,
        retention_category: "employment",
      });

      queryClient.invalidateQueries({ queryKey: ["staff-documents"] });
      toast.success(`Contract saved and emailed to ${member.email}`);
      onClose();
      onGenerated?.();
    } catch (err) {
      toast.error("Failed to email contract: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Generate Employment Contract</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === "select" && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Select Template</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Choose a template…" /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Effective Date</label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                />
              </div>
            </>
          )}

          {step === "edit" && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Preview & Edit</label>
                <ReactQuill
                  value={editingHtml}
                  onChange={setEditingHtml}
                  theme="snow"
                  style={{ height: "300px" }}
                />
              </div>
            </>
          )}

          {step === "confirm" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Ready to generate:</strong> {selectedTemplate?.name} for {member.full_name}
              </p>
              <p className="text-xs text-blue-700 mt-2">Effective date: {effectiveDate}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <div className="flex gap-2">
            {step === "select" && (
              <Button onClick={handleSelectTemplate} disabled={!selectedTemplate || loading}>Next</Button>
            )}
            {step === "edit" && (
              <>
                <Button variant="outline" onClick={() => setStep("select")} disabled={loading}>Back</Button>
                <Button onClick={() => setStep("confirm")} disabled={loading}>Continue</Button>
              </>
            )}
            {step === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setStep("edit")} disabled={loading}>Back</Button>
                <Button onClick={handleGenerateAndSave} className="gap-1.5" disabled={loading}>
                  <Download className="w-4 h-4" /> {loading ? "Saving…" : "Save"}
                </Button>
                <Button onClick={handleGenerateAndEmail} className="gap-1.5" disabled={loading}>
                  <Send className="w-4 h-4" /> {loading ? "Sending…" : "Save & Email"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}