import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MODULES = [
  { key: "dashboard", label: "Admin Dashboard", roles: ["admin"] },
  { key: "tl-dashboard", label: "Team Leader Dashboard", roles: ["team_leader"] },
  { key: "sw-dashboard", label: "Support Worker Dashboard", roles: ["support_worker"] },
  { key: "young-people", label: "Young People (Residents)", roles: ["admin", "team_leader", "support_worker"] },
  { key: "homes", label: "Homes", roles: ["admin", "team_leader", "support_worker"] },
  { key: "visit-reports", label: "SW/TL Reporting", roles: ["admin", "team_leader", "support_worker"] },
  { key: "activities", label: "Activities", roles: ["admin", "team_leader", "support_worker"] },
  { key: "risk", label: "Risk & Behaviour", roles: ["admin", "team_leader", "support_worker"] },
  { key: "health", label: "Health", roles: ["admin", "team_leader", "support_worker"] },
  { key: "education", label: "Education", roles: ["admin", "team_leader", "support_worker"] },
  { key: "transitions", label: "Housing & Transitions", roles: ["admin", "admin_officer"] },
  { key: "24-hours-housing", label: "24 Hours Housing", roles: ["admin", "admin_officer"] },
  { key: "care-services", label: "Care Services", roles: ["admin", "admin_officer"] },
  { key: "house", label: "Admin Management", roles: ["admin", "admin_officer"] },
  { key: "finance", label: "Finance", roles: ["admin"] },
  { key: "analytics", label: "Analytics & AI", roles: ["admin", "team_leader"] },
  { key: "messages", label: "Messages", roles: ["admin", "team_leader", "support_worker"] },
  { key: "staff", label: "Staff & HR", roles: ["admin", "team_leader"] },
  { key: "settings", label: "Settings", roles: ["admin", "team_leader", "support_worker"] },
];

const ROLES = ["admin", "admin_officer", "team_leader", "support_worker"];

const STORAGE_KEY = "module_visibility_overrides";

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function ModuleVisibilityTab() {
  const [overrides, setOverrides] = useState(loadOverrides);

  const isEnabled = (moduleKey, role) => {
    const key = `${moduleKey}:${role}`;
    if (key in overrides) return overrides[key];
    return MODULES.find(m => m.key === moduleKey)?.roles.includes(role) ?? false;
  };

  const toggle = (moduleKey, role) => {
    const key = `${moduleKey}:${role}`;
    setOverrides(prev => ({ ...prev, [key]: !isEnabled(moduleKey, role) }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    toast.success("Module visibility saved — changes take effect on next page load");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">Control which modules are visible to each role. Toggle off to hide from that role's navigation.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left px-6 py-3 font-semibold text-xs">Module</th>
                {ROLES.map(r => (
                  <th key={r} className="text-center px-4 py-3 font-semibold text-xs capitalize">{r.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, i) => (
                <tr key={mod.key} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-6 py-3 font-medium text-sm">{mod.label}</td>
                  {ROLES.map(role => (
                    <td key={role} className="px-4 py-3 text-center">
                      <Switch
                        checked={isEnabled(mod.key, role)}
                        onCheckedChange={() => toggle(mod.key, role)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave}>
        Save Visibility Settings
      </Button>
    </div>
  );
}