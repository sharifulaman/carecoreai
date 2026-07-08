import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Settings2, Plus, Edit, Trash2, Archive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_COLORS = {
  active:   "bg-green-100 text-green-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-muted text-muted-foreground",
};

export default function YPVoiceTemplateManager({ templates, staffProfile, canManage, onRefresh }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", category: "voice_feedback", description: "", frequency: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const handleEdit = (tmpl) => {
    setEditId(tmpl.id);
    setForm({ name: tmpl.name, description: tmpl.description || "", frequency: tmpl.frequency || "", status: tmpl.status });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.YPFeedbackTemplate.update(editId, {
        ...form,
        updated_by_id: staffProfile?.id,
        updated_by_name: staffProfile?.full_name,
      });
      toast.success("Template updated");
      setEditId(null);
      onRefresh();
    } catch { toast.error("Update failed"); }
    setSaving(false);
  };

  const handleArchive = async (tmpl) => {
    await base44.entities.YPFeedbackTemplate.update(tmpl.id, { status: "archived" });
    toast.success("Template archived");
    onRefresh();
  };

  const handleCreate = async () => {
    if (!newForm.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      await base44.entities.YPFeedbackTemplate.create({
        ...newForm,
        org_id: ORG_ID,
        active_version_number: "1.0",
        created_by_id: staffProfile?.id,
        created_by_name: staffProfile?.full_name,
      });
      toast.success("Template created");
      setShowCreate(false);
      setNewForm({ name: "", category: "voice_feedback", description: "", frequency: "", status: "active" });
      onRefresh();
    } catch { toast.error("Create failed"); }
    setSaving(false);
  };

  if (!canManage) {
    return (
      <div className="bg-muted/30 border border-border rounded-xl p-8 text-center">
        <Settings2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">You do not have permission to manage templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Settings2 className="w-4 h-4" /> Template Manager</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1 text-xs" onClick={() => setShowCreate(v => !v)}>
            <Plus className="w-3.5 h-3.5" /> New Template
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold">Create New Template</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Name *</label>
              <Input className="text-sm h-9" value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <Select value={newForm.category} onValueChange={v => setNewForm(p => ({ ...p, category: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="voice_feedback">Voice Feedback</SelectItem>
                  <SelectItem value="meeting_record">Meeting Record</SelectItem>
                  <SelectItem value="questionnaire">Questionnaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Frequency</label>
              <Input className="text-sm h-9" placeholder="e.g. Monthly, Quarterly" value={newForm.frequency} onChange={e => setNewForm(p => ({ ...p, frequency: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Status</label>
              <Select value={newForm.status} onValueChange={v => setNewForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea rows={2} className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" className="text-xs" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Template"}</Button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-2.5 font-semibold">Name</th>
              <th className="text-left px-4 py-2.5 font-semibold">Category</th>
              <th className="text-left px-4 py-2.5 font-semibold">Frequency</th>
              <th className="text-left px-4 py-2.5 font-semibold">Version</th>
              <th className="text-left px-4 py-2.5 font-semibold">Status</th>
              <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No templates yet. Create a new template.</td></tr>
            ) : templates.map(tmpl => (
              <tr key={tmpl.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                <td className="px-4 py-3">
                  {editId === tmpl.id ? (
                    <Input className="h-7 text-xs" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                  ) : <span className="font-medium">{tmpl.name}</span>}
                </td>
                <td className="px-4 py-3 capitalize">{tmpl.category?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  {editId === tmpl.id ? (
                    <Input className="h-7 text-xs w-24" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} />
                  ) : tmpl.frequency || "—"}
                </td>
                <td className="px-4 py-3">v{tmpl.active_version_number || "1.0"}</td>
                <td className="px-4 py-3">
                  {editId === tmpl.id ? (
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[tmpl.status] || "bg-muted text-muted-foreground"}`}>
                      {tmpl.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {editId === tmpl.id ? (
                      <>
                        <button onClick={handleSaveEdit} disabled={saving} className="text-green-600 hover:text-green-700 text-[11px] font-medium">{saving ? "Saving..." : "Save"}</button>
                        <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-foreground text-[11px]">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(tmpl)} title="Edit" className="text-muted-foreground hover:text-primary"><Edit className="w-3.5 h-3.5" /></button>
                        {tmpl.status !== "archived" && (
                          <button onClick={() => handleArchive(tmpl)} title="Archive" className="text-muted-foreground hover:text-orange-500"><Archive className="w-3.5 h-3.5" /></button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">Template changes apply to future submissions only. Historical submissions remain tied to the original template version.</p>
    </div>
  );
}