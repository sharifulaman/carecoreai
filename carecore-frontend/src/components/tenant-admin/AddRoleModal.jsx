// @ts-nocheck
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// System roles available as base for inheriting default module permissions.
const SYSTEM_ROLES = [
  { value: "support_worker",      label: "Support Worker" },
  { value: "maintenance_officer", label: "Maintenance Officer" },
  { value: "finance_officer",     label: "Finance Officer" },
  { value: "admin_officer",       label: "Admin Officer" },
  { value: "hr_officer",          label: "HR Officer" },
  { value: "risk_officer",        label: "Risk Officer" },
  { value: "team_leader",         label: "Team Leader" },
  { value: "team_manager",        label: "Team Manager" },
  { value: "hr_manager",          label: "HR Manager" },
  { value: "admin_manager",       label: "Admin Manager" },
  { value: "finance_manager",     label: "Finance Manager" },
  { value: "risk_manager",        label: "Risk Manager" },
  { value: "compliance_manager",  label: "Compliance Manager" },
  { value: "rsm",                 label: "Registered Service Manager" },
  { value: "regional_manager",    label: "Regional Manager" },
];

// Derives a safe machine-readable role_name from a display label.
const toRoleName = (label) =>
  label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

export default function AddRoleModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ label: "", rank: "10", base_role: "", description: "" });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const role_name = toRoleName(form.label);
    if (!role_name) {
      toast.error("Please enter a valid role label");
      return;
    }
    setSaving(true);
    try {
      await base44.roleDefinitions.create({
        role_name,
        label: form.label.trim(),
        rank: Math.max(1, Math.min(98, Number(form.rank) || 10)),
        base_role: form.base_role || undefined,
        description: form.description.trim(),
      });
      toast.success(`Role "${form.label.trim()}" created`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const previewName = toRoleName(form.label);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Add Custom Role</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Display label */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Display Label *</label>
            <input
              required
              autoFocus
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Senior Support Worker"
              value={form.label}
              onChange={set("label")}
            />
            {previewName && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Role ID: <code className="font-mono">{previewName}</code>
              </p>
            )}
          </div>

          {/* Escalation rank */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Escalation Rank</label>
            <input
              type="number"
              min="1"
              max="98"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.rank}
              onChange={set("rank")}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Higher = more authority in approval chains. Range 1–98 (99 is reserved for Admin).
            </p>
          </div>

          {/* Base role for inheriting default permissions */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Inherit module permissions from</label>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={form.base_role}
              onChange={set("base_role")}
            >
              <option value="">— Start from scratch (all None) —</option>
              {SYSTEM_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="What is this role responsible for?"
              value={form.description}
              onChange={set("description")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Creating…" : "Create Role"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
