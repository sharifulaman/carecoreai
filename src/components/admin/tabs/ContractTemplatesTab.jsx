import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, X, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const TEMPLATE_TYPES = {
  full_time: "Full-Time Employment Contract",
  part_time: "Part-Time Employment Contract",
  zero_hours: "Zero Hours Contract",
  variation: "Contract Variation Letter",
  probation_extension: "Probation Extension Letter",
  probation_confirmation: "Probation Confirmation Letter",
};

const MERGE_FIELDS = [
  "{{employee_full_name}}",
  "{{job_title}}",
  "{{start_date}}",
  "{{contracted_hours}}",
  "{{pay_type}}",
  "{{hourly_rate}}",
  "{{annual_salary}}",
  "{{pay_frequency}}",
  "{{notice_period}}",
  "{{place_of_work}}",
  "{{organisation_name}}",
  "{{manager_name}}",
  "{{probation_period}}",
  "{{annual_leave_days}}",
  "{{effective_date}}",
  "{{today_date}}",
];

const DEFAULT_TEMPLATES = [
  {
    name: "Full-Time Employment Contract",
    contract_type: "full_time",
    body_html: `<p>This Employment Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role and Responsibilities</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}<br>Reporting to: {{manager_name}}</p>
<h3>2. Employment Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Full-Time<br>Contracted Hours: {{contracted_hours}} hours per week<br>Notice Period: {{notice_period}} weeks</p>
<h3>3. Remuneration</h3>
<p>Pay Type: {{pay_type}}<br>{{#if hourly_rate}}Hourly Rate: £{{hourly_rate}} per hour{{else}}Annual Salary: £{{annual_salary}} per year{{/if}}<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Annual Leave</h3>
<p>You are entitled to {{annual_leave_days}} days paid annual leave per year (pro-rata for part years).</p>
<h3>5. Probation</h3>
<p>Your employment is subject to a {{probation_period}} month probation period. During this time, your performance will be reviewed.</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Part-Time Employment Contract",
    contract_type: "part_time",
    body_html: `<p>This Employment Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role and Responsibilities</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}<br>Reporting to: {{manager_name}}</p>
<h3>2. Employment Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Part-Time<br>Contracted Hours: {{contracted_hours}} hours per week<br>Notice Period: {{notice_period}} weeks</p>
<h3>3. Remuneration</h3>
<p>Hourly Rate: £{{hourly_rate}} per hour<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Annual Leave</h3>
<p>You are entitled to {{annual_leave_days}} days paid annual leave per year (pro-rata).</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Zero Hours Contract",
    contract_type: "zero_hours",
    body_html: `<p>This Zero Hours Agreement is made between <strong>{{organisation_name}}</strong> and <strong>{{employee_full_name}}</strong>.</p>
<h3>1. Role</h3>
<p>Job Title: {{job_title}}<br>Place of Work: {{place_of_work}}</p>
<h3>2. Terms</h3>
<p>Start Date: {{start_date}}<br>Contract Type: Zero Hours (flexible, hours offered as needed)<br>You are not guaranteed any minimum hours.</p>
<h3>3. Remuneration</h3>
<p>Hourly Rate: £{{hourly_rate}} per hour<br>Pay Frequency: {{pay_frequency}}</p>
<h3>4. Notice Period</h3>
<p>Either party may terminate this agreement with {{notice_period}} weeks notice.</p>
<p><strong>Signed by {{organisation_name}} on {{today_date}}</strong></p>`,
  },
  {
    name: "Contract Variation Letter",
    contract_type: "variation",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>We are writing to confirm a variation to your employment contract with {{organisation_name}}, effective from {{effective_date}}.</p>
<h3>Changes to Your Contract</h3>
<p>[Details of change: e.g., Pay rise from £X to £Y, Hours changed from X to Y, Role changed to {{job_title}}]</p>
<p>All other terms of your employment remain unchanged.</p>
<p>Please confirm your acceptance of this variation by signing below or replying to this letter.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
  {
    name: "Probation Extension Letter",
    contract_type: "probation_extension",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>Following your probation review on {{today_date}}, we have decided to extend your probation period for a further period.</p>
<p>Your extended probation will end on {{effective_date}}, after which your performance will be reviewed again.</p>
<p>During this time, you will continue to receive support and guidance from {{manager_name}}.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
  {
    name: "Probation Confirmation Letter",
    contract_type: "probation_confirmation",
    body_html: `<p>Dear {{employee_full_name}},</p>
<p>Congratulations! Following your successful completion of your {{probation_period}} month probation period, we are pleased to confirm your permanent employment with {{organisation_name}}.</p>
<p>Your probation ended on {{today_date}}, and you are now a permanent member of staff.</p>
<p>We look forward to your continued contribution to the team.</p>
<p>Yours sincerely,<br>{{organisation_name}}</p>`,
  },
];

function TemplateEditor({ template, onSave, onCancel }) {
  const [form, setForm] = useState(template || { name: "", contract_type: "", body_html: "" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">{template ? "Edit Template" : "New Template"}</h3>
          <button onClick={onCancel}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Template Name</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Full-Time Employment Contract"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Contract Type</label>
            <select
              value={form.contract_type}
              onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md text-sm"
            >
              <option value="">Select type…</option>
              {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Merge Fields Available</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {MERGE_FIELDS.map(field => (
                <button
                  key={field}
                  onClick={() => setForm(f => ({ ...f, body_html: f.body_html + " " + field }))}
                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                >
                  {field}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-medium">Contract Body (HTML)</label>
            <ReactQuill
              value={form.body_html}
              onChange={html => setForm(f => ({ ...f, body_html: html }))}
              theme="snow"
              style={{ height: "200px" }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name || !form.contract_type}>Save</Button>
        </div>
      </div>
    </div>
  );
}

export default function ContractTemplatesTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ["contract-templates"],
    queryFn: () => secureGateway.filter("ContractTemplate", { org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingId) {
        await secureGateway.update("ContractTemplate", editingId, data);
      } else {
        await secureGateway.create("ContractTemplate", {
          ...data,
          org_id: ORG_ID,
          created_by: "system",
          created_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      setEditingId(null);
      setShowEditor(false);
      toast.success(editingId ? "Template updated" : "Template created");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.update("ContractTemplate", id, { is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contract-templates"] }); toast.success("Template archived"); },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      for (const tpl of DEFAULT_TEMPLATES) {
        const existing = templates.find(t => t.contract_type === tpl.contract_type);
        if (!existing) {
          await secureGateway.create("ContractTemplate", {
            ...tpl,
            org_id: ORG_ID,
            version: 1,
            is_active: true,
            created_by: "system",
            created_at: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["contract-templates"] }); toast.success("Default templates created"); },
  });

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Contract Templates</h2>
        <div className="flex gap-2">
          {activeTemplates.length === 0 && (
            <Button size="sm" variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              Load Default Templates
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={() => { setEditingId(null); setShowEditor(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Template
          </Button>
        </div>
      </div>

      {activeTemplates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No templates created. Click "Load Default Templates" to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activeTemplates.map(tpl => (
            <div key={tpl.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{TEMPLATE_TYPES[tpl.contract_type]}</p>
                  <p className="text-xs text-muted-foreground mt-1">v{tpl.version}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => { setEditingId(tpl.id); setShowEditor(true); }}
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 gap-1"
                    onClick={() => {
                      if (confirm("Archive this template?")) {
                        deleteMutation.mutate(tpl.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Archive
                  </Button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground line-clamp-2" dangerouslySetInnerHTML={{ __html: tpl.body_html }} />
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <TemplateEditor
          template={editingId ? templates.find(t => t.id === editingId) : null}
          onSave={(data) => saveMutation.mutate(data)}
          onCancel={() => { setShowEditor(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}