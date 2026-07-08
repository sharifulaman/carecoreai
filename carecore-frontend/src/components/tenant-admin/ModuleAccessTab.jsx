import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLE_LABELS, ROLE_LINE, ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Save, Info } from "lucide-react";
import { toast } from "sonner";

const MODULES = [
  { key: "dashboard",       label: "Dashboard" },
  { key: "residents",       label: "Resident Services" },
  { key: "staff",           label: "Staff & HR" },
  { key: "homes",           label: "My Homes" },
  { key: "finance",         label: "Finance" },
  { key: "compliance",      label: "Compliance & Governance" },
  { key: "performance",     label: "Performance" },
  { key: "approvals",       label: "Approvals / Workflow" },
  { key: "maintenance",     label: "Maintenance" },
  { key: "admin_mgmt",      label: "Admin Management" },
  { key: "my_hr",           label: "My HR (Self-Service)" },
  { key: "analytics",       label: "Analytics & AI" },
  { key: "messages",        label: "Messages" },
  { key: "settings",        label: "Settings" },
];

const STAFF_ROLES = Object.keys(ROLE_LABELS).filter(r => !["resident", "external", "guest"].includes(r));

const LINE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700",
  care: "bg-blue-100 text-blue-700",
  finance: "bg-green-100 text-green-700",
  admin: "bg-amber-100 text-amber-700",
  hr: "bg-pink-100 text-pink-700",
  risk: "bg-red-100 text-red-700",
};

export default function ModuleAccessTab() {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: existingPerms = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => base44.entities.RolePermission.filter({ org_id: ORG_ID }),
    staleTime: 2 * 60 * 1000,
  });

  // Build local state from DB records
  useEffect(() => {
    const map = {};
    STAFF_ROLES.forEach(role => {
      const record = existingPerms.find(p => p.role_name === role);
      map[role] = record?.enabled_modules || MODULES.map(m => m.key); // default all enabled
    });
    setPermissions(map);
    setDirty(false);
  }, [existingPerms]);

  const toggle = (role, moduleKey) => {
    setPermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(moduleKey)
        ? current.filter(m => m !== moduleKey)
        : [...current, moduleKey];
      return { ...prev, [role]: updated };
    });
    setDirty(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    for (const role of STAFF_ROLES) {
      const existing = existingPerms.find(p => p.role_name === role);
      const enabled = permissions[role] || [];
      if (existing) {
        await base44.entities.RolePermission.update(existing.id, { enabled_modules: enabled });
      } else {
        await base44.entities.RolePermission.create({ org_id: ORG_ID, role_name: role, enabled_modules: enabled });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    setSaving(false);
    setDirty(false);
    toast.success("Module permissions saved");
  };

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Toggle which modules each role can access. Changes take effect on next login.</span>
        </div>
        {dirty && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSaveAll} disabled={saving}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="text-xs min-w-max w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground sticky left-0 bg-muted/30 min-w-[180px]">Role</th>
              {MODULES.map(m => (
                <th key={m.key} className="px-3 py-3 font-semibold text-muted-foreground text-center whitespace-nowrap min-w-[100px]">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF_ROLES.map((role, i) => {
              const line = ROLE_LINE[role] || "care";
              const enabled = permissions[role] || [];
              return (
                <tr key={role} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 sticky left-0 bg-card/95 min-w-[180px]">
                    <div className="font-medium text-foreground">{ROLE_LABELS[role]}</div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium ${LINE_COLORS[line] || "bg-slate-100 text-slate-600"}`}>
                      {line?.replace(/_/g, " ")}
                    </span>
                  </td>
                  {MODULES.map(m => (
                    <td key={m.key} className="px-3 py-3 text-center">
                      <button
                        onClick={() => toggle(role, m.key)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                          enabled.includes(m.key)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {enabled.includes(m.key) && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={handleSaveAll} disabled={saving} className="gap-1.5">
            <Save className="w-4 h-4" /> Save All Changes
          </Button>
        </div>
      )}
    </div>
  );
}