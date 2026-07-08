import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // For triggering workflows
import {
  X, Plus, Trash2, GripVertical, ChevronRight, Settings2,
  CheckCircle2, ToggleLeft, ToggleRight, Copy, Archive,
  Loader2, Save, Eye, AlertCircle
} from "lucide-react";

const FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "yearly", "as_needed", "archived"];
const FREQ_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly", as_needed: "Ad-hoc", archived: "Archived" };
const AREAS = ["Daily", "Weekly", "Monthly", "Safety", "Kitchen", "Garden", "Communal Area", "Bathroom", "General", "Compliance"];

const EMPTY_TEMPLATE = {
  title: "", description: "", frequency: "daily", area: "Daily",
  default_due_time: "09:00 AM", is_active: true, requires_manager_review: true,
  display_order: 0,
};
const EMPTY_ITEM = {
  item_title: "", item_question: "", is_required: true,
  allows_na: true, requires_note_on_fail: false, requires_photo_on_fail: false,
  is_active: true, display_order: 0,
};

function SubCheckRow({ item, onUpdate, onRemove, index }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
        <span className="text-xs font-bold text-slate-400 w-5">{index + 1}.</span>
        <input
          value={item.item_title}
          onChange={e => onUpdate({ ...item, item_title: e.target.value })}
          placeholder="Sub-check title *"
          className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
        <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="pl-11">
        <input
          value={item.item_question}
          onChange={e => onUpdate({ ...item, item_question: e.target.value })}
          placeholder="Worker prompt/question (optional)"
          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400"
        />
      </div>
      <div className="pl-11 flex flex-wrap gap-3">
        {[
          ["is_required", "Required"],
          ["allows_na", "Allow N/A"],
          ["requires_note_on_fail", "Note if Fail"],
          ["requires_photo_on_fail", "Photo if Fail"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!item[key]}
              onChange={e => onUpdate({ ...item, [key]: e.target.checked })}
              className="rounded accent-teal-600"
            />
            <span className="text-xs text-slate-600">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TemplateEditor({ template, items, onSave, onClose, saving }) {
  const [form, setForm] = useState({ ...EMPTY_TEMPLATE, ...template });
  const [subItems, setSubItems] = useState(
    items.length > 0
      ? [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      : []
  );

  const addItem = () => setSubItems(prev => [...prev, { ...EMPTY_ITEM, display_order: prev.length, _new: true, _id: Date.now() }]);
  const updateItem = (idx, val) => setSubItems(prev => prev.map((it, i) => i === idx ? val : it));
  const removeItem = (idx) => setSubItems(prev => prev.filter((_, i) => i !== idx));

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.frequency) { toast.error("Frequency is required"); return; }
    if (!form.area.trim()) { toast.error("Area is required"); return; }
    const activeItems = subItems.filter(i => i.item_title?.trim());
    if (activeItems.length === 0) { toast.error("At least one sub-check is required"); return; }
    onSave(form, subItems.map((it, idx) => ({ ...it, display_order: idx })));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <div>
          <h3 className="text-base font-bold text-slate-900">{template?.id ? "Edit Check Template" : "New Check Template"}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Changes apply to future scheduled instances</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Core fields */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/30" placeholder="e.g. Kitchen daily check" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
            <textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400/30 resize-none" rows={2} placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Frequency *</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white">
                {["daily", "weekly", "monthly", "quarterly", "yearly", "as_needed"].map(f => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Due Time *</label>
              <input value={form.default_due_time || ""} onChange={e => setForm(f => ({ ...f, default_due_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none" placeholder="09:00 AM" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Area / Category *</label>
            <div className="flex gap-2">
              <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none bg-white">
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none" placeholder="Or type custom area" />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {[
            ["is_active", "Active"],
            ["requires_manager_review", "Manager Review"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 p-2.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={!!form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                className="rounded accent-teal-600" />
              <span className="text-xs font-semibold text-slate-700">{label}</span>
            </label>
          ))}
        </div>

        {/* Sub-checks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-800">Sub-Checks ({subItems.filter(i => i.item_title?.trim()).length})</h4>
            <button onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Sub-Check
            </button>
          </div>
          <div className="space-y-2">
            {subItems.map((item, idx) => (
              <SubCheckRow key={item.id || item._id || idx} item={item} index={idx}
                onUpdate={val => updateItem(idx, val)}
                onRemove={() => removeItem(idx)} />
            ))}
            {subItems.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No sub-checks yet. Click "Add Sub-Check" to get started.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-slate-200 shrink-0 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function TemplateRow({ template, itemCount, onEdit, onDuplicate, onToggleActive, onArchive }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group ${!template.is_active ? "opacity-50" : ""}`}>
      <GripVertical className="w-4 h-4 text-slate-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{template.title}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
          <span className="capitalize">{template.frequency}</span>
          <span>·</span>
          <span>{template.area || "General"}</span>
          <span>·</span>
          <span>{template.default_due_time || "—"}</span>
          <span>·</span>
          <span>{itemCount} sub-check{itemCount !== 1 ? "s" : ""}</span>
          {template.requires_manager_review && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Review req.</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onToggleActive(template)}
          title={template.is_active ? "Deactivate" : "Activate"}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors">
          {template.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </button>
        <button onClick={() => onDuplicate(template)}
          title="Duplicate"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
          <Copy className="w-4 h-4" />
        </button>
        <button onClick={() => onArchive(template)}
          title="Archive"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors">
          <Archive className="w-4 h-4" />
        </button>
        <button onClick={() => onEdit(template)}
          className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-white hover:border-teal-300 hover:text-teal-700 transition-colors">
          Edit
        </button>
      </div>
    </div>
  );
}

export default function ManageChecksModal({ onClose, home, staffProfile }) {
  const qc = useQueryClient();
  const [activeFreq, setActiveFreq] = useState("daily");
  const [editing, setEditing] = useState(null); // null = list, {template, items} = editor
  const [saving, setSaving] = useState(false);
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });


  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["check-templates-admin", ORG_ID],
    queryFn: () => base44.entities.HomeCheckTemplate.filter({ org_id: ORG_ID }),
    staleTime: 30 * 1000,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["check-template-items-admin", ORG_ID],
    queryFn: () => base44.entities.HomeCheckTemplateItem.filter({ org_id: ORG_ID }),
    staleTime: 30 * 1000,
  });

  const getItemsForTemplate = (templateId) =>
    allItems.filter(i => i.template_id === templateId).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const filtered = useMemo(() => {
    if (activeFreq === "archived") {
      return templates.filter(t => !t.is_active).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
    return templates
      .filter(t => t.frequency === activeFreq && t.is_active !== false)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }, [templates, activeFreq]);

  const handleEdit = (template) => {
    setEditing({ template, items: getItemsForTemplate(template.id) });
  };

  const handleNew = () => {
    setEditing({ template: { ...EMPTY_TEMPLATE, frequency: activeFreq === "archived" ? "daily" : activeFreq }, items: [] });
  };

  const handleSave = async (form, subItems) => {
    setSaving(true);
    try {
      let templateId;
      if (form.id) {
        await base44.entities.HomeCheckTemplate.update(form.id, {
          title: form.title, description: form.description, frequency: form.frequency,
          area: form.area, default_due_time: form.default_due_time, is_active: form.is_active,
          requires_manager_review: form.requires_manager_review, display_order: form.display_order || 0,
        });
        templateId = form.id;
      } else {
        const created = await base44.entities.HomeCheckTemplate.create({
          org_id: ORG_ID, title: form.title, description: form.description,
          frequency: form.frequency, area: form.area, default_due_time: form.default_due_time,
          is_active: form.is_active !== false, requires_manager_review: form.requires_manager_review !== false,
          display_order: form.display_order || 0,
        });
        templateId = created.id;

        // New check templates go through maker-checker review before going
        // live across homes, separate from the per-completion failure flow.
        if (home?.id) {
          triggerWorkflow({
            workflowType: "home_check",
            entityId:     templateId,
            entityRef:    `CHKT-${templateId.slice(0, 8)}`,
            title:        `New check template — ${form.title}`,
            description:  `New "${form.frequency}" check template added under ${form.area}, pending review.`,
            homeId:       home.id,
            homeName:     home.name,
            priority:     "routine",
          });
        }

        // Create today's instance for this home
        const today = new Date().toISOString().slice(0, 10);
        if (home?.id && form.is_active !== false) {
          await base44.entities.HomeCheckInstance.create({
            org_id: ORG_ID, home_id: home.id, template_id: templateId,
            template_title: form.title, template_area: form.area, template_frequency: form.frequency,
            scheduled_date: today, due_at: form.default_due_time, status: "due",
          });
        }
      }

      // Handle sub-check items
      const existingItems = getItemsForTemplate(templateId);
      const existingIds = new Set(existingItems.map(i => i.id));

      for (const item of subItems) {
        if (!item.item_title?.trim()) continue;
        if (item.id && existingIds.has(item.id)) {
          await base44.entities.HomeCheckTemplateItem.update(item.id, {
            item_title: item.item_title, item_question: item.item_question || "",
            display_order: item.display_order, is_required: item.is_required !== false,
            allows_na: item.allows_na !== false, requires_note_on_fail: !!item.requires_note_on_fail,
            requires_photo_on_fail: !!item.requires_photo_on_fail, is_active: item.is_active !== false,
          });
        } else if (!item.id) {
          await base44.entities.HomeCheckTemplateItem.create({
            org_id: ORG_ID, template_id: templateId, item_title: item.item_title,
            item_question: item.item_question || "", display_order: item.display_order,
            is_required: item.is_required !== false, allows_na: item.allows_na !== false,
            requires_note_on_fail: !!item.requires_note_on_fail,
            requires_photo_on_fail: !!item.requires_photo_on_fail, is_active: true,
          });
        }
      }

      // Delete removed items (items with ids no longer in list)
      const savedIds = new Set(subItems.filter(i => i.id).map(i => i.id));
      for (const existing of existingItems) {
        if (!savedIds.has(existing.id)) {
          await base44.entities.HomeCheckTemplateItem.delete(existing.id);
        }
      }

      qc.invalidateQueries({ queryKey: ["check-templates-admin"] });
      qc.invalidateQueries({ queryKey: ["check-template-items-admin"] });
      qc.invalidateQueries({ queryKey: ["check-templates", ORG_ID] });
      qc.invalidateQueries({ queryKey: ["check-template-items", ORG_ID] });
      qc.invalidateQueries({ queryKey: ["check-instances", home?.id] });

      toast.success("Check templates updated successfully.");
      setEditing(null);
    } catch (err) {
      toast.error("Save failed: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await base44.entities.HomeCheckTemplate.update(template.id, { is_active: !template.is_active });
      qc.invalidateQueries({ queryKey: ["check-templates-admin"] });
      qc.invalidateQueries({ queryKey: ["check-templates", ORG_ID] });
      qc.invalidateQueries({ queryKey: ["check-instances", home?.id] });
      toast.success(template.is_active ? "Check deactivated." : "Check activated.");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleArchive = async (template) => {
    try {
      await base44.entities.HomeCheckTemplate.update(template.id, { is_active: false });
      qc.invalidateQueries({ queryKey: ["check-templates-admin"] });
      qc.invalidateQueries({ queryKey: ["check-templates", ORG_ID] });
      toast.success("Check archived.");
    } catch {
      toast.error("Failed to archive.");
    }
  };

  const handleDuplicate = async (template) => {
    setSaving(true);
    try {
      const items = getItemsForTemplate(template.id);
      const copy = await base44.entities.HomeCheckTemplate.create({
        org_id: ORG_ID, title: `${template.title} (Copy)`, description: template.description,
        frequency: template.frequency, area: template.area, default_due_time: template.default_due_time,
        is_active: false, requires_manager_review: template.requires_manager_review, display_order: 999,
      });
      for (const item of items) {
        await base44.entities.HomeCheckTemplateItem.create({
          org_id: ORG_ID, template_id: copy.id, item_title: item.item_title,
          item_question: item.item_question, display_order: item.display_order,
          is_required: item.is_required, allows_na: item.allows_na,
          requires_note_on_fail: item.requires_note_on_fail,
          requires_photo_on_fail: item.requires_photo_on_fail, is_active: true,
        });
      }
      qc.invalidateQueries({ queryKey: ["check-templates-admin"] });
      toast.success("Check duplicated (inactive). Edit to activate.");
    } catch {
      toast.error("Duplicate failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {editing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              <TemplateEditor
                template={editing.template}
                items={editing.items}
                onSave={handleSave}
                onClose={() => setEditing(null)}
                saving={saving}
              />
            </div>
          </div>
        )}
        <>
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-bold text-slate-900">Manage Checks, Chores & Audits</h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">Configure check templates shown to staff. Changes affect future scheduled checks.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleNew}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                  <Plus className="w-4 h-4" /> Add Check
                </button>
                <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left sidebar — frequency tabs */}
              <div className="w-44 border-r border-slate-200 bg-slate-50 py-3 shrink-0">
                {FREQUENCIES.map(freq => {
                  const count = freq === "archived"
                    ? templates.filter(t => !t.is_active).length
                    : templates.filter(t => t.frequency === freq && t.is_active !== false).length;
                  return (
                    <button
                      key={freq}
                      onClick={() => setActiveFreq(freq)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-between ${activeFreq === freq ? "bg-teal-50 text-teal-700 font-semibold border-r-2 border-teal-500" : "text-slate-600 hover:bg-slate-100"}`}
                    >
                      <span>{FREQ_LABELS[freq]}</span>
                      {count > 0 && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeFreq === freq ? "bg-teal-100 text-teal-700" : "bg-slate-200 text-slate-500"}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Main template list */}
              <div className="flex-1 overflow-y-auto">
                {loadingTemplates ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                    <CheckCircle2 className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-bold text-slate-500">No {FREQ_LABELS[activeFreq]?.toLowerCase()} checks</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Add a new check template for this frequency.</p>
                    <button onClick={handleNew}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                      <Plus className="w-4 h-4" /> Add Check
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {FREQ_LABELS[activeFreq]} — {filtered.length} check{filtered.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    {filtered.map(template => (
                      <TemplateRow
                        key={template.id}
                        template={template}
                        itemCount={allItems.filter(i => i.template_id === template.id).length}
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onToggleActive={handleToggleActive}
                        onArchive={handleArchive}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 shrink-0 flex items-center justify-between">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                Changes affect future scheduled instances. Historical records are preserved.
              </p>
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Close
              </button>
            </div>
          </>
      </div>
    </div>
  );
}