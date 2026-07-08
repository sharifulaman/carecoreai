import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { UserPlus, AlertTriangle } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import PADetailsModal from "./PADetailsModal";
import { useModuleActions } from "@/lib/PermissionContext";
import { toast } from "sonner";

export default function PADetailsSubTab({ residents, homes, staff }) {
  const qc = useQueryClient();
  const { canAdd, canEdit: permCanEdit } = useModuleActions("residents");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  // Fetch PA details
  const { data: paDetails = [] } = useQuery({
    queryKey: ["pa-details"],
    queryFn: () => secureGateway.filter("PADetails", {}),
  });

  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway-plans"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 500),
  });

  // Create/update PA details
  const savePADetailsMutation = useMutation({
    mutationFn: (data) => {
      const existing = paDetails.find(p => p.resident_id === data.resident_id);
      if (existing) {
        return secureGateway.update("PADetails", existing.id, data);
      }
      return secureGateway.create("PADetails", data);
    },
    onSuccess: () => {
      toast.success("PA Details updated successfully");
      qc.invalidateQueries({ queryKey: ["pa-details"] });
      setShowDetailsModal(false);
      setSelectedResident(null);
    },
    onError: (error) => {
      console.error("Failed to save PA Details:", error);
      toast.error(`Failed to save to database: ${error.message || "Unknown error"}`);
    }
  });

  // Since PATab is only rendered for the 18+ group, just show the globally filtered residents
  const careLeavers = residents;

  // Calculate stats
  const allocatedCount = careLeavers.filter(r => paDetails.find(p => p.resident_id === r.id)).length;
  const unallocatedCount = careLeavers.length - allocatedCount;

  // Prepare resident table data
  const residentRows = careLeavers.map(r => {
    const paDetail = paDetails.find(p => p.resident_id === r.id);
    const activePathwayPlan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
    const actualPaName = activePathwayPlan?.personal_adviser_name || paDetail?.pa_name;

    return {
      id: r.id,
      resident: r.display_name || r.initials,
      paName: actualPaName || "—",
      organisation: paDetail?.organisation || "—",
      email: paDetail?.email || "—",
      phone: paDetail?.phone || "—",
      laSocialWorker: paDetail?.social_worker_name || "—",
      paDetail,
    };
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 md:gap-4">
        <StatCard title="PAs Allocated" value={allocatedCount} color="green" />
        <StatCard 
          title="Care Leavers Without PA" 
          value={unallocatedCount} 
          color={unallocatedCount > 0 ? "red" : "blue"} 
        />
      </div>

      {/* Alert for unallocated */}
      {unallocatedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-700">
              {unallocatedCount} care leaver{unallocatedCount !== 1 ? "s" : ""} without PA allocated
            </p>
            <p className="text-xs text-red-600 mt-1">All 16+ care leavers must have a Personal Adviser.</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">PA Name</th>
              <th className="text-left px-4 py-3 font-semibold">Organisation</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Phone</th>
              <th className="text-left px-4 py-3 font-semibold">LA Social Worker</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residentRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
              >
                <td className="px-4 py-3 font-medium">{row.resident}</td>
                <td className="px-4 py-3">
                  <span className={row.paName === "—" ? "text-muted-foreground italic" : ""}>
                    {row.paName}
                  </span>
                </td>
                <td className="px-4 py-3">{row.organisation}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.phone}</td>
                <td className="px-4 py-3">{row.laSocialWorker}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {permCanEdit && (
                      <Button
                        size="sm"
                        variant={row.paName === "—" ? "default" : "ghost"}
                        onClick={() => {
                          setSelectedResident(row);
                          setShowDetailsModal(true);
                        }}
                        className="h-8 text-xs"
                      >
                        {row.paName === "—" ? (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3" /> Add PA
                          </span>
                        ) : "Edit"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showDetailsModal && (
        <PADetailsModal
          resident={selectedResident}
          residents={residents}
          paDetail={selectedResident?.paDetail}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedResident(null);
          }}
          onSave={(data) => savePADetailsMutation.mutate(data)}
        />
      )}
    </div>
  );
}
