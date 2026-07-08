// @ts-nocheck
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { ChevronDown, ChevronUp, Info, Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AddRoleModal from "./AddRoleModal";

const MODULES = [
  { key: "dashboard",   label: "Dashboard" },
  { key: "residents",   label: "Residents" },
  { key: "staff",       label: "Staff & HR" },
  { key: "homes",       label: "My Homes" },
  { key: "finance",     label: "Finance" },
  { key: "compliance",  label: "Compliance" },
  { key: "approvals",   label: "Approvals" },
  { key: "maintenance", label: "Maintenance" },
  { key: "admin_mgmt",  label: "Admin Mgmt" },
  { key: "settings",    label: "Settings" },
];

// Default module access for system roles — used when no RolePermission DB record exists.
const DEFAULT_ACCESS = {
  admin:               { dashboard:"Admin", residents:"Admin",   staff:"Admin",   homes:"Admin",   finance:"Admin",   compliance:"Admin",   approvals:"Admin",   maintenance:"Admin",   admin_mgmt:"Admin",   settings:"Admin" },
  rsm:                 { dashboard:"View",  residents:"Approve",  staff:"Edit",    homes:"Edit",    finance:"View",    compliance:"Approve", approvals:"Approve", maintenance:"Edit",    admin_mgmt:"Admin",   settings:"Admin" },
  regional_manager:    { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"View",    compliance:"Approve", approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View" },
  team_manager:        { dashboard:"View",  residents:"Edit",     staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View" },
  hr_manager:          { dashboard:"View",  residents:"View",     staff:"Admin",   homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View" },
  admin_manager:       { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"Edit",    settings:"View" },
  finance_manager:     { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"Admin",   compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  risk_manager:        { dashboard:"View",  residents:"Edit",     staff:"View",    homes:"View",    finance:"None",    compliance:"Approve", approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  compliance_manager:  { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"None",    compliance:"Admin",   approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  team_leader:         { dashboard:"View",  residents:"Edit",     staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View" },
  finance_officer:     { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"Edit",    compliance:"View",    approvals:"View",    maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  admin_officer:       { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"View",    maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  hr_officer:          { dashboard:"View",  residents:"View",     staff:"Edit",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"None",    admin_mgmt:"None",    settings:"None" },
  risk_officer:        { dashboard:"View",  residents:"Edit",     staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"None",    admin_mgmt:"None",    settings:"None" },
  support_worker:      { dashboard:"View",  residents:"Edit",     staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"Edit",    maintenance:"View",    admin_mgmt:"None",    settings:"None" },
  maintenance_officer: { dashboard:"View",  residents:"View",     staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"Edit",    admin_mgmt:"None",    settings:"None" },
};

const LEVEL_STYLES = {
  Admin:   "bg-purple-100 text-purple-700 font-semibold",
  View:    "bg-blue-50 text-blue-600",
  Edit:    "bg-teal-50 text-teal-700",
  Approve: "bg-amber-50 text-amber-700",
  None:    "bg-slate-100 text-slate-400",
};

const LEGEND = [
  { label: "None",    color: "bg-slate-300" },
  { label: "View",    color: "bg-blue-400" },
  { label: "Edit",    color: "bg-teal-500" },
  { label: "Approve", color: "bg-amber-400" },
  { label: "Admin",   color: "bg-purple-500" },
];

const RANK_BADGE = "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded";

// Fallback rows used before roleDefinitions loads from the API.
const FALLBACK_ROWS = [
  { role_name: "admin",               label: "Admin",                      rank: 99, is_system: true },
  { role_name: "rsm",                 label: "Registered Service Manager", rank: 50, is_system: true },
  { role_name: "regional_manager",    label: "Regional Manager",           rank: 40, is_system: true },
  { role_name: "team_leader",         label: "Team Leader",                rank: 20, is_system: true },
  { role_name: "support_worker",      label: "Support Worker",             rank: 10, is_system: true },
  { role_name: "finance_officer",     label: "Finance Officer",            rank: 15, is_system: true },
  { role_name: "maintenance_officer", label: "Maintenance Officer",        rank: 10, is_system: true },
];

export default function RoleModuleMatrix({ rolePerms, roleDefinitions = [], activeStaffRoles = [], onRolesChange }) {
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState(null);

  // Rows sorted highest rank first. Fall back to hardcoded list until API loads.
  // When activeStaffRoles is provided, system roles are filtered to only those
  // actually assigned to real staff. Custom roles (is_system=false) always appear
  // so the admin can configure them before assigning anyone to that role.
  const source = roleDefinitions.length > 0 ? roleDefinitions : FALLBACK_ROWS;
  const displayRoles = source
    .filter((d) =>
      !d.is_system ||
      activeStaffRoles.length === 0 ||
      activeStaffRoles.includes(d.role_name)
    )
    .sort((a, b) => b.rank - a.rank);

  // Build local permission state from DB records, falling back to DEFAULT_ACCESS.
  // Supports both storage formats:
  //   Legacy:  enabled_modules = ["staff", "finance"]
  //   Current: enabled_modules = [{key: "staff", level: "Edit"}, ...]
  useEffect(() => {
    const map = {};
    displayRoles.forEach(({ role_name: role, base_role }) => {
      const record = rolePerms.find((p) => p.role_name === role);
      if (record?.enabled_modules && Array.isArray(record.enabled_modules)) {
        const mods = record.enabled_modules;
        const modMap = {};
        MODULES.forEach((m) => { modMap[m.key] = "None"; });

        if (typeof mods[0] === "object" && mods[0] !== null) {
          mods.forEach(({ key, level }) => { if (key) modMap[key] = level || "View"; });
        } else {
          mods.forEach((key) => { modMap[key] = DEFAULT_ACCESS[role]?.[key] || "View"; });
        }
        map[role] = modMap;
      } else {
        // No DB record — use DEFAULT_ACCESS for the role itself, or its base_role for custom roles.
        map[role] = DEFAULT_ACCESS[role] || (base_role && DEFAULT_ACCESS[base_role]) || {};
      }
    });
    setPermissions(map);
    setDirty(false);
  }, [rolePerms, roleDefinitions]);

  const cycleLevel = (role, mod) => {
    const levels = ["None", "View", "Edit", "Approve", "Admin"];
    const current = permissions[role]?.[mod] || "None";
    const next = levels[(levels.indexOf(current) + 1) % levels.length];
    setPermissions((prev) => ({ ...prev, [role]: { ...prev[role], [mod]: next } }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const { role_name: role } of displayRoles) {
      const modMap = permissions[role] || {};
      // Persist ALL modules including None so round-trips are lossless.
      const modulePermissions = Object.entries(modMap).map(([key, level]) => ({ key, level }));
      const existing = rolePerms.find((p) => p.role_name === role);
      if (existing) {
        await base44.entities.RolePermission.update(existing.id, { enabled_modules: modulePermissions });
      } else {
        await base44.entities.RolePermission.create({ org_id: ORG_ID, role_name: role, enabled_modules: modulePermissions });
      }
    }
    queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
    queryClient.invalidateQueries({ queryKey: ["role-permissions-nav"] });
    setSaving(false);
    setDirty(false);
    toast.success("Access matrix saved");

    const fullyLocked = displayRoles.filter(({ role_name: role }) => {
      if (role === "admin") return false;
      return Object.values(permissions[role] || {}).every((l) => l === "None");
    });
    if (fullyLocked.length > 0) {
      const names = fullyLocked.map((r) => r.label).join(", ");
      toast.warning(`${names} now have no module access. Users with this role will not be able to use the system.`);
    }
  };

  const handleDeleteRole = async (def) => {
    if (!window.confirm(`Delete custom role "${def.label}"? This cannot be undone.`)) return;
    setDeletingRole(def.role_name);
    try {
      await base44.roleDefinitions.del(def.id);
      toast.success(`Role "${def.label}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["role-definitions"] });
      onRolesChange?.();
    } catch (err) {
      toast.error(err?.message || "Failed to delete role");
    } finally {
      setDeletingRole(null);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Role × Module Access Matrix</h2>
            <button className="text-muted-foreground"><Info className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-medium">Permission Legend:</span>
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setShowAddRole(true)}
            >
              <Plus className="w-3 h-3" /> Add Role
            </Button>
            {dirty && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>
        </div>

        {!collapsed && (
          <div className="overflow-x-auto">
            <table className="text-xs min-w-max w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground sticky left-0 bg-card min-w-[180px]">Role</th>
                  <th className="px-2 py-2.5 font-semibold text-muted-foreground text-center min-w-[60px]">Rank</th>
                  {MODULES.map((m) => (
                    <th key={m.key} className="px-2 py-2.5 font-semibold text-muted-foreground text-center whitespace-nowrap min-w-[90px]">
                      {m.label}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 min-w-[36px]" />
                </tr>
              </thead>
              <tbody>
                {displayRoles.map(({ role_name: role, label, rank, is_system }, i) => (
                  <tr key={role} className={`border-b border-border/30 last:border-0 ${i % 2 !== 0 ? "bg-muted/5" : ""}`}>
                    {/* Role name */}
                    <td className="px-3 py-2 font-semibold text-foreground sticky left-0 bg-card text-xs">{label}</td>

                    {/* Rank badge */}
                    <td className="px-2 py-2 text-center">
                      {is_system ? (
                        <span className={`${RANK_BADGE} bg-slate-100 text-slate-500`}>
                          <Lock className="w-2.5 h-2.5" />
                          {rank}
                        </span>
                      ) : (
                        <span className={`${RANK_BADGE} bg-blue-50 text-blue-600`}>
                          {rank}
                        </span>
                      )}
                    </td>

                    {/* Module access cells */}
                    {MODULES.map((m) => {
                      const level = permissions[role]?.[m.key] ?? DEFAULT_ACCESS[role]?.[m.key] ?? "None";
                      return (
                        <td key={m.key} className="px-2 py-2 text-center">
                          <button
                            onClick={() => cycleLevel(role, m.key)}
                            className={`text-[11px] px-2 py-0.5 rounded font-medium cursor-pointer hover:opacity-80 transition-opacity ${LEVEL_STYLES[level] || LEVEL_STYLES.None}`}
                            title="Click to cycle: None → View → Edit → Approve → Admin"
                          >
                            {level}
                          </button>
                        </td>
                      );
                    })}

                    {/* Delete button — custom roles only */}
                    <td className="px-2 py-2 text-center">
                      {!is_system && (
                        <button
                          onClick={() => handleDeleteRole(displayRoles.find((d) => d.role_name === role))}
                          disabled={deletingRole === role}
                          className="text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mx-auto"
        >
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {collapsed ? "Show Matrix" : "Hide Matrix"}
        </button>
      </div>

      {showAddRole && (
        <AddRoleModal
          onClose={() => setShowAddRole(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["role-definitions"] });
            onRolesChange?.();
          }}
        />
      )}
    </>
  );
}
