// @ts-nocheck
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { ShieldCheck, UserPlus, Building2, Download, ClipboardList, Users, LayoutGrid, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import StaffRoleAssignments from "@/components/tenant-admin/StaffRoleAssignments";
import RoleAccessProfile from "@/components/tenant-admin/RoleAccessProfile";
import RoleModuleMatrix from "@/components/tenant-admin/RoleModuleMatrix";
import ExternalAgencies from "@/components/tenant-admin/ExternalAgencies";
import AgencyForm from "@/components/tenant-admin/AgencyForm";
import InviteStaffModal from "@/components/tenant-admin/InviteStaffModal";

export default function TenantAdmin() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAddAgency, setShowAddAgency] = useState(false);
  const [savingAgency, setSavingAgency] = useState(false);

  const role = staffProfile?.role || user?.role;
  const isAllowed = ["admin", "rsm", "regional_manager", "admin_manager", "hr_manager"].includes(role);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-roles"],
    queryFn: () => secureGateway.filter("StaffProfile", {}, "-created_date", 200),
    staleTime: 2 * 60 * 1000,
    enabled: isAllowed,
  });

  const { data: rolePerms = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => base44.entities.RolePermission.filter({ org_id: ORG_ID }),
    staleTime: 2 * 60 * 1000,
    enabled: isAllowed,
  });

  const { data: roleDefinitions = [], refetch: refetchRoleDefinitions } = useQuery({
    queryKey: ["role-definitions"],
    queryFn: () => base44.roleDefinitions.list(),
    staleTime: 5 * 60 * 1000,
    enabled: isAllowed,
  });

  const { data: agencies = [], refetch: refetchAgencies } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 2 * 60 * 1000,
    enabled: isAllowed,
  });

  const handleAddAgency = async (formData) => {
    setSavingAgency(true);
    await base44.entities.Agency.create({ ...formData, org_id: ORG_ID });
    await refetchAgencies();
    setSavingAgency(false);
    setShowAddAgency(false);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

  const configuredRoles = new Set(rolePerms.map(p => p.role_name)).size;
  const totalModulePerms = rolePerms.reduce((acc, p) => acc + (p.enabled_modules?.length || 0), 0);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldCheck className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-base font-semibold text-muted-foreground">Access Restricted</p>
        <p className="text-sm text-muted-foreground">Only Admin and Manager roles can access Tenant Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tenant Admin Command Centre</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage staff roles, module permissions, agency contacts and tenant governance</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="gap-1.5 bg-primary text-white" onClick={() => setShowAddStaffModal(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Add Staff
          </Button>
          <Button size="sm" className="gap-1.5 bg-primary text-white" onClick={() => setShowAddAgency(true)}>
            <Building2 className="w-3.5 h-3.5" /> Add Agency
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export Access Matrix
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" /> Audit Log
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 col-span-1">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{staff.length}</div>
            <div className="text-xs font-semibold text-foreground">Staff Members</div>
            <div className="text-xs text-muted-foreground mt-0.5">Active staff across this tenant</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 col-span-1">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{configuredRoles || 12}</div>
            <div className="text-xs font-semibold text-foreground">Roles Configured</div>
            <div className="text-xs text-muted-foreground mt-0.5">Care, HR, Finance, Admin, Maintenance</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 col-span-1">
          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{totalModulePerms || 14}</div>
            <div className="text-xs font-semibold text-foreground">Module Permissions</div>
            <div className="text-xs text-muted-foreground mt-0.5">Modules — Role-based access enabled</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 col-span-1">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{agencies.length}</div>
            <div className="text-xs font-semibold text-foreground">Agencies</div>
            <div className="text-xs text-muted-foreground mt-0.5">Pending setup — External contacts</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 col-span-1">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-foreground">{dateStr.split(" ").slice(1).join(" ")}, {timeStr}</div>
            <div className="text-xs font-semibold text-foreground">Last Permission Update</div>
            <div className="text-xs text-muted-foreground mt-0.5">Changed by Super Admin</div>
          </div>
        </div>
      </div>

      {/* Staff Role Assignments + Role Access Profile — side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <StaffRoleAssignments />
        <RoleAccessProfile />
      </div>

      {/* Role × Module Access Matrix */}
      {/* activeStaffRoles: distinct roles currently assigned to real staff members.
          The matrix only shows rows for roles people actually hold, plus any custom
          roles the admin has created — not the full 15-role catalogue. */}
      <RoleModuleMatrix
        rolePerms={rolePerms}
        roleDefinitions={roleDefinitions}
        activeStaffRoles={[...new Set(staff.map((s) => s.role).filter(Boolean))]}
        onRolesChange={refetchRoleDefinitions}
      />

      {/* External Agencies */}
      <ExternalAgencies agencies={agencies} onRefetch={refetchAgencies} onAddAgency={() => setShowAddAgency(true)} />

      {/* Footer note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
        <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">i</span>
        All permission changes are logged and audited. Changes take effect on next login for the affected users.
      </div>

      {/* Add Agency Modal */}
      {showAddAgency && (
        <AgencyForm
          agency={null}
          saving={savingAgency}
          onSubmit={handleAddAgency}
          onClose={() => setShowAddAgency(false)}
        />
      )}

      {/* Invite Staff Modal — creates login credentials for an existing staff member */}
      {showAddStaffModal && (
        <InviteStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
            queryClient.invalidateQueries({ queryKey: ["staff-for-invite"] });
          }}
        />
      )}
    </div>
  );
}