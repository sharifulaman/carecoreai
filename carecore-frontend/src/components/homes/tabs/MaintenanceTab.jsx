import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { useModuleActions } from "@/lib/PermissionContext";
import AddMaintenanceModal from "@/components/maintenance/AddMaintenanceModal";

const PRIORITY_COLOR = { low: "bg-green-500/10 text-green-600", medium: "bg-amber-500/10 text-amber-600", high: "bg-red-500/10 text-red-600", urgent: "bg-red-700/10 text-red-700" };
const STATUS_COLOR = { open: "bg-blue-500/10 text-blue-600", in_progress: "bg-amber-500/10 text-amber-600", completed: "bg-green-500/10 text-green-600", cancelled: "bg-muted text-muted-foreground" };

export default function MaintenanceTab({ homeId, homeName, user, staffProfile }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  
  const { data: roleDefinitions = [] } = useQuery({ queryKey: ["role-definitions"], queryFn: () => base44.roles.fetchDefinitions() });
  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
  const isHighRank = roleRank > 10;
  
  const { canAdd } = useModuleActions("homes");

  const { data: home } = useQuery({
    queryKey: ["home-single", homeId],
    queryFn: () => base44.entities.Home.filter({ id: homeId }),
    select: (data) => data[0],
    staleTime: 5 * 60 * 1000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance", homeId],
    queryFn: () => base44.entities.MaintenanceLog.filter({ org_id: ORG_ID, home_id: homeId }, "-date_reported", 50),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceLog.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance", homeId] }); toast.success("Status updated"); },
  });

  const homes = home ? [home] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Maintnance Logs</h3>
        {canAdd && (
          <Button 
            className="gap-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setShowModal(true)}
          >
            <Plus className="w-4 h-4" /> Add Maintenance
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">No maintenance logs yet.</div>
        ) : logs.map(log => (
          <div key={log.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{log.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{log.category?.replace(/_/g, " ")} · Reported {log.date_reported}</p>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${PRIORITY_COLOR[log.priority]}`}>{log.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLOR[log.status]}`}>{log.status?.replace(/_/g, " ")}</span>
              </div>
            </div>
            {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {log.contractor && <span>Contractor: {log.contractor}</span>}
              {log.cost && <span>£{log.cost}</span>}
              {log.reported_by_name && <span>By: {log.reported_by_name}</span>}
              {log.status !== "completed" && canAdd && isHighRank && (
                <button
                  onClick={() => update.mutate({ id: log.id, data: { status: "completed", date_resolved: new Date().toISOString().split("T")[0] } })}
                  className="ml-auto text-green-600 hover:underline flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddMaintenanceModal
          homes={homes}
          onClose={() => setShowModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ["maintenance", homeId] }); setShowModal(false); toast.success("Maintenance issue added"); }}
          staffProfile={null}
          user={user}
        />
      )}
    </div>
  );
}