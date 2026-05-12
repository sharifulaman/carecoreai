import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";
import { logAudit } from "@/lib/logAudit";

export default function TrainingRecordModal({ staffMember, course, existingRecord, requirements = [], onClose, staffProfile }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    status: existingRecord?.status || "not_started",
    provider: existingRecord?.provider || "",
    completion_date: existingRecord?.completion_date || existingRecord?.date_completed || "",
    expiry_date: existingRecord?.expiry_date || "",
    notes: existingRecord?.notes || "",
    certificate_url: existingRecord?.certificate_url || "",
    course_name: course?.course_name || existingRecord?.course_name || "",
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auto-calc expiry date
  useEffect(() => {
    if (!form.completion_date) return;
    const req = requirements.find(r => r.course_name === form.course_name) || course;
    const months = req?.expiry_months || req?.expiry_months_count;
    if (months && months > 0) {
      const exp = addMonths(new Date(form.completion_date), months);
      setForm(f => ({ ...f, expiry_date: format(exp, "yyyy-MM-dd") }));
    }
  }, [form.completion_date, form.course_name]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, certificate_url: file_url }));
    setUploading(false);
    toast.success("Certificate uploaded");
  };

  const handleSave = async () => {
    if (!staffMember) return;
    setSaving(true);
    const payload = {
      org_id: staffMember.org_id,
      staff_id: staffMember.id,
      staff_name: staffMember.full_name,
      course_name: form.course_name,
      status: form.status,
      training_status: form.status,
      provider: form.provider,
      completion_date: form.completion_date || null,
      date_completed: form.completion_date || null,
      expiry_date: form.expiry_date || null,
      notes: form.notes,
      certificate_url: form.certificate_url,
      home_id: staffMember.home_ids?.[0] || staffMember.home_id || null,
    };
    if (existingRecord?.id) {
      await secureGateway.update("TrainingRecord", existingRecord.id, payload);
      await logAudit({
        entity_name: "TrainingRecord", entity_id: existingRecord.id, action: "update",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || "",
        old_values: { status: existingRecord.status, completion_date: existingRecord.completion_date, expiry_date: existingRecord.expiry_date },
        new_values: { status: payload.status, completion_date: payload.completion_date, expiry_date: payload.expiry_date, certificate_uploaded: !!payload.certificate_url },
        org_id: payload.org_id,
        description: `Training record updated: ${payload.course_name} for ${payload.staff_name}`,
      });
    } else {
      const created = await secureGateway.create("TrainingRecord", payload);
      await logAudit({
        entity_name: "TrainingRecord", entity_id: created?.id, action: "create",
        changed_by: staffProfile?.id, changed_by_name: staffProfile?.full_name || "",
        old_values: null,
        new_values: { course_name: payload.course_name, completion_date: payload.completion_date, expiry_date: payload.expiry_date, staff_name: payload.staff_name },
        org_id: payload.org_id,
        description: `Training record created: ${payload.course_name} for ${payload.staff_name}`,
      });
    }
    qc.invalidateQueries({ queryKey: ["training-records"] });
    toast.success("Training record saved");
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-sm">{staffMember?.full_name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{form.course_name}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          {!course && (
            <div>
              <label className="text-xs font-medium">Course Name</label>
              <Input value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} className="mt-1" />
            </div>
          )}
          <div>
            <label className="text-xs font-medium">Status *</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium">Provider</label>
            <Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} className="mt-1" placeholder="e.g. Skills for Care" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Completion Date</label>
              <Input type="date" value={form.completion_date} onChange={e => setForm(f => ({ ...f, completion_date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Expiry Date</label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Certificate</label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-primary cursor-pointer border border-dashed border-primary/40 rounded-lg px-3 py-2 hover:bg-primary/5">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? "Uploading…" : "Upload"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUpload} />
              </label>
              {form.certificate_url && <a href={form.certificate_url} target="_blank" className="text-xs text-primary underline">View</a>}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
              placeholder="Optional notes…"
            />
          </div>
        </div>
        <div className="flex gap-2 p-5 pt-0">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Record"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}