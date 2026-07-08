// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Info } from "lucide-react";

const LEVEL_RANK = { None: 0, View: 1, Edit: 2, Approve: 3, Admin: 4 };

const MODULES = [
  { key: "dashboard",   label: "Dashboard" },
  { key: "residents",   label: "Resident Services" },
  { key: "staff",       label: "Staff & HR" },
  { key: "homes",       label: "My Homes" },
  { key: "finance",     label: "Finance" },
  { key: "compliance",  label: "Compliance" },
  { key: "approvals",   label: "Approvals" },
  { key: "maintenance", label: "Maintenance" },
  { key: "admin_mgmt",  label: "Admin Management" },
  { key: "settings",    label: "Settings" },
];

// Mirrors DEFAULT_ACCESS in RoleModuleMatrix — used when no DB record exists for a role.
const DEFAULT_ACCESS = {
  admin:               { dashboard:"Admin", residents:"Admin",   staff:"Admin",   homes:"Admin",   finance:"Admin",   compliance:"Admin",   approvals:"Admin",   maintenance:"Admin",   admin_mgmt:"Admin",   settings:"Admin"  },
  rsm:                 { dashboard:"View",  residents:"Approve", staff:"Edit",    homes:"Edit",    finance:"View",    compliance:"Approve", approvals:"Approve", maintenance:"Edit",    admin_mgmt:"Admin",   settings:"Admin"  },
  regional_manager:    { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"View",    compliance:"Approve", approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View"   },
  team_manager:        { dashboard:"View",  residents:"Edit",    staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View"   },
  hr_manager:          { dashboard:"View",  residents:"View",    staff:"Admin",   homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View"   },
  admin_manager:       { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"Edit",    settings:"View"   },
  finance_manager:     { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"Admin",   compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  risk_manager:        { dashboard:"View",  residents:"Edit",    staff:"View",    homes:"View",    finance:"None",    compliance:"Approve", approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  compliance_manager:  { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"None",    compliance:"Admin",   approvals:"Approve", maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  team_leader:         { dashboard:"View",  residents:"Edit",    staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"Approve", maintenance:"View",    admin_mgmt:"View",    settings:"View"   },
  finance_officer:     { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"Edit",    compliance:"View",    approvals:"View",    maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  admin_officer:       { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"View",    compliance:"View",    approvals:"View",    maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  hr_officer:          { dashboard:"View",  residents:"View",    staff:"Edit",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"None",    admin_mgmt:"None",    settings:"None"   },
  risk_officer:        { dashboard:"View",  residents:"Edit",    staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"None",    admin_mgmt:"None",    settings:"None"   },
  support_worker:      { dashboard:"View",  residents:"Edit",    staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"Edit",    maintenance:"View",    admin_mgmt:"None",    settings:"None"   },
  maintenance_officer: { dashboard:"View",  residents:"View",    staff:"View",    homes:"View",    finance:"None",    compliance:"View",    approvals:"View",    maintenance:"Edit",    admin_mgmt:"None",    settings:"None"   },
};

// Map a level string → action booleans using the same rules as useModuleActions.
function levelToActions(level) {
  const rank = LEVEL_RANK[level] ?? 0;
  return {
    view:    rank >= LEVEL_RANK.View,
    add:     rank >= LEVEL_RANK.Edit,
    edit:    rank >= LEVEL_RANK.Edit,
    approve: rank >= LEVEL_RANK.Approve,
    delete:  rank >= LEVEL_RANK.Admin,
  };
}

// Derive workflow capabilities from module levels.
function deriveWorkflow(modMap) {
  const rank = (key) => LEVEL_RANK[modMap?.[key] ?? "None"] ?? 0;
  return {
    can_create_incident:    rank("residents") >= LEVEL_RANK.Edit,
    can_sign_handover:      rank("homes")     >= LEVEL_RANK.Approve,
    can_submit_daily_log:   rank("residents") >= LEVEL_RANK.Edit,
    can_close_safeguarding: rank("residents") >= LEVEL_RANK.Approve,
    can_approve_records:    rank("approvals") >= LEVEL_RANK.Approve,
  };
}

// Parse a RolePermission DB record's enabled_modules into a { moduleKey → level } map.
function parseRecord(record, role) {
  if (!record?.enabled_modules || !Array.isArray(record.enabled_modules)) {
    return DEFAULT_ACCESS[role] || {};
  }
  const mods = record.enabled_modules;
  const modMap = {};
  MODULES.forEach((m) => { modMap[m.key] = "None"; });

  if (mods.length > 0 && typeof mods[0] === "object" && mods[0] !== null) {
    mods.forEach(({ key, level }) => { if (key) modMap[key] = level || "View"; });
  } else {
    // Legacy string-array format
    mods.forEach((key) => { modMap[key] = DEFAULT_ACCESS[role]?.[key] || "View"; });
  }
  return modMap;
}

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(
  (r) => !["resident", "external", "guest"].includes(r)
);

const COLS     = ["View", "Add", "Edit", "Approve", "Delete"];
const COL_KEYS = ["view", "add",  "edit", "approve", "delete"];

const LEVEL_BADGE = {
  Admin:   "bg-purple-100 text-purple-700",
  Approve: "bg-amber-100 text-amber-700",
  Edit:    "bg-teal-100 text-teal-700",
  View:    "bg-blue-100 text-blue-600",
  None:    "bg-slate-100 text-slate-400",
};

function PermIcon({ val }) {
  if (val) return <span className="text-green-500 text-sm font-bold">✓</span>;
  return <span className="text-red-400 text-sm">✗</span>;
}

function YesNo({ val }) {
  return val
    ? <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-semibold">Yes</span>
    : <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600 font-semibold">No</span>;
}

export default function RoleAccessProfile() {
  const [selectedRole, setSelectedRole] = useState("support_worker");

  // Shares the same cache key as TenantAdmin — no extra network request.
  const { data: rolePerms = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => base44.entities.RolePermission.filter({ org_id: ORG_ID }),
    staleTime: 2 * 60 * 1000,
  });

  const modMap = useMemo(() => {
    const record = rolePerms.find((p) => p.role_name === selectedRole);
    return parseRecord(record, selectedRole);
  }, [rolePerms, selectedRole]);

  const workflow = useMemo(() => deriveWorkflow(modMap), [modMap]);

  const configuredFromDB = rolePerms.some((p) => p.role_name === selectedRole);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Role Access Profile</h2>
        <button className="text-muted-foreground hover:text-foreground">
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Role picker */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Select Role</span>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSIGNABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!configuredFromDB && (
          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ml-auto">
            Default access
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Loading permissions…</p>
      ) : (
        <>
          {/* Permission table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[400px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-semibold text-muted-foreground w-36">Module</th>
                  <th className="text-center py-2 font-semibold text-muted-foreground px-1 w-16">Level</th>
                  {COLS.map((c) => (
                    <th key={c} className="text-center py-2 font-semibold text-muted-foreground px-1">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod, i) => {
                  const level = modMap[mod.key] ?? "None";
                  const actions = levelToActions(level);
                  return (
                    <tr key={mod.key} className={`border-b border-border/30 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-1.5 font-medium text-foreground text-xs">{mod.label}</td>
                      <td className="py-1.5 text-center px-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${LEVEL_BADGE[level]}`}>
                          {level}
                        </span>
                      </td>
                      {COL_KEYS.map((key) => (
                        <td key={key} className="py-1.5 text-center px-1">
                          <PermIcon val={actions[key]} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Workflow Permissions */}
          <div>
            <div className="text-xs font-bold text-foreground mb-2">Workflow Permissions</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Can create incident</span>
                <YesNo val={workflow.can_create_incident} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Can sign handover</span>
                <YesNo val={workflow.can_sign_handover} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Can submit daily log</span>
                <YesNo val={workflow.can_submit_daily_log} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Can close safeguarding</span>
                <YesNo val={workflow.can_close_safeguarding} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Can approve records</span>
                <YesNo val={workflow.can_approve_records} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
