import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import PAVisitLogModal from "./PAVisitLogModal";
import PAVisitDetail from "./PAVisitDetail";
import { useModuleActions } from "@/lib/PermissionContext";
import { toast } from "sonner";

export default function PAVisitsSubTab({ residents, homes, staff }) {
  const qc = useQueryClient();
  const { canAdd, canEdit: permCanEdit } = useModuleActions("residents");
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [expandedResident, setExpandedResident] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

  // Fetch PA details and visits
  const { data: paDetails = [] } = useQuery({
    queryKey: ["pa-details"],
    queryFn: () => secureGateway.filter("PADetails", {}),
  });

  const { data: paVisits = [] } = useQuery({
    queryKey: ["pa-visits"],
    queryFn: () => secureGateway.filter("PAVisit", {}, "-visit_date", 500),
  });

  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["pathway-plans"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}, "-created_date", 500),
  });

  // Create visit mutation
  const createVisitMutation = useMutation({
    mutationFn: (data) => secureGateway.create("PAVisit", data),
    onSuccess: () => {
      toast.success("PA Visit logged successfully");
      qc.invalidateQueries({ queryKey: ["pa-visits"] });
      setShowVisitModal(false);
      setSelectedResident(null);
    },
    onError: (error) => {
      console.error("Failed to save PA Visit:", error);
      toast.error(`Failed to save to database: ${error.message || "Unknown error"}`);
    }
  });

  const updateVisitMutation = useMutation({
    mutationFn: (data) => secureGateway.update("PAVisit", data.id, data),
    onSuccess: () => {
      toast.success("PA Visit updated successfully");
      qc.invalidateQueries({ queryKey: ["pa-visits"] });
      setShowVisitModal(false);
      setSelectedResident(null);
      setEditingVisit(null);
      setSelectedVisit(null);
    },
    onError: (error) => {
      console.error("Failed to update PA Visit:", error);
      toast.error(`Failed to update in database: ${error.message || "Unknown error"}`);
    }
  });



  // Since PATab is only rendered for the 18+ group, just show the globally filtered residents
  const careLeavers = residents;

  // Calculate stats
  const allocatedCount = careLeavers.filter(r => paDetails.find(p => p.resident_id === r.id)).length;
  const thisMonthVisits = paVisits.filter(v => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const vDate = new Date(v.visit_date);
    return vDate.getMonth() === month && vDate.getFullYear() === year;
  }).length;

  const overdueCount = careLeavers.filter(r => {
    const lastVisit = paVisits
      .filter(v => v.resident_id === r.id)
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
    if (!lastVisit) return false;
    const daysSince = Math.floor((Date.now() - new Date(lastVisit.visit_date).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 56;
  }).length;

  const next7Days = paDetails.filter(pd => {
    if (!pd.pa_review_date) return false;
    const daysUntil = Math.ceil((new Date(pd.pa_review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  // Prepare resident table data
  const residentRows = careLeavers.map(r => {
    const paDetail = paDetails.find(p => p.resident_id === r.id);
    const activePathwayPlan = pathwayPlans.find(p => p.resident_id === r.id && p.status === "active");
    const lastVisit = paVisits
      .filter(v => v.resident_id === r.id)
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
    const nextVisit = lastVisit?.next_visit_date;
    const daysSinceLast = (lastVisit && nextVisit)
      ? Math.floor((new Date(nextVisit).getTime() - new Date(lastVisit.visit_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status = "no_pa";
    let statusColor = "red";
    const actualPaName = activePathwayPlan?.personal_adviser_name || paDetail?.pa_name;

    if (actualPaName) {
      if (daysSinceLast === null) {
        status = "no_visit";
        statusColor = "amber";
      } else if (daysSinceLast > 56) {
        status = "overdue";
        statusColor = "red";
      } else if (daysSinceLast > 49) {
        status = "due_soon";
        statusColor = "amber";
      } else {
        status = "up_to_date";
        statusColor = "green";
      }
    }

    return {
      id: r.id,
      resident: r.display_name || r.initials,
      paName: actualPaName || "—",
      lastVisit: lastVisit ? new Date(lastVisit.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Never",
      daysSince: daysSinceLast,
      nextVisit: nextVisit ? new Date(nextVisit).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—",
      status,
      statusColor,
      paDetail,
      lastVisitRecord: lastVisit,
    };
  }).sort((a, b) => {
    const priorityOrder = { overdue: 0, due_soon: 1, no_visit: 2, no_pa: 3, up_to_date: 4 };
    return priorityOrder[a.status] - priorityOrder[b.status];
  });

  if (selectedVisit && !showVisitModal) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedVisit(null)}
            className="text-sm text-primary hover:opacity-70"
          >
            ← Back to Visits
          </button>
          <Button variant="outline" size="sm" onClick={() => {
            setEditingVisit(selectedVisit);
            setShowVisitModal(true);
          }}>
            Edit Visit
          </Button>
        </div>
        <PAVisitDetail visit={selectedVisit} paDetails={paDetails} residents={residents} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Visits This Month" value={thisMonthVisits} color="green" />
        <StatCard
          title="Overdue Visits"
          value={overdueCount}
          color={overdueCount > 0 ? "red" : "green"}
        />
        <StatCard title="Next 7 Days" value={next7Days} color="amber" />
      </div>



      {/* Actions */}
      {canAdd && (
        <div className="flex gap-2">
          <Button onClick={() => setShowVisitModal(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Log PA Visit
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">PA Name</th>
              <th className="text-left px-4 py-3 font-semibold">Last Visit</th>
              <th className="text-left px-4 py-3 font-semibold">Days Since</th>
              <th className="text-left px-4 py-3 font-semibold">Next Visit</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {residentRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                onClick={() => setExpandedResident(expandedResident === row.id ? null : row.id)}
              >
                <td className="px-4 py-3 font-medium">{row.resident}</td>
                <td className="px-4 py-3">{row.paName}</td>
                <td className="px-4 py-3 text-xs">{row.lastVisit}</td>
                <td className="px-4 py-3 text-xs">{row.daysSince !== null ? `${row.daysSince}d` : "—"}</td>
                <td className="px-4 py-3 text-xs">{row.nextVisit}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    row.statusColor === "red" ? "bg-red-500/10 text-red-600" :
                    row.statusColor === "amber" ? "bg-amber-500/10 text-amber-600" :
                    "bg-green-500/10 text-green-600"
                  }`}>
                    {row.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    {canAdd && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedResident(row);
                          setShowVisitModal(true);
                        }}
                        className="h-7 text-xs"
                      >
                        Log
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expanded detail */}
      {expandedResident && (
        <div className="bg-muted/20 rounded-lg p-4 border border-border">
          <h3 className="font-semibold mb-4">
            {residentRows.find(r => r.id === expandedResident)?.resident} — PA Visit History
          </h3>
          <div className="space-y-4">
            <div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {paVisits
                    .filter(v => v.resident_id === expandedResident)
                    .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))
                    .slice(0, 5)
                    .map(v => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVisit(v)}
                        className="w-full text-left bg-white rounded p-2 border border-border/50 hover:border-primary/50 transition-colors"
                      >
                        <p className="text-xs font-medium">{new Date(v.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {v.visit_type}</p>
                        <p className="text-xs text-muted-foreground">{v.duration_minutes}min • {v.pa_name}</p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Modals */}
      {showVisitModal && (
        <PAVisitLogModal
          resident={selectedResident || (editingVisit ? residents.find(r => r.id === editingVisit.resident_id) : null)}
          residents={residents}
          paDetails={paDetails}
          pathwayPlans={pathwayPlans}
          existingVisit={editingVisit}
          onClose={() => {
            setShowVisitModal(false);
            setSelectedResident(null);
            setEditingVisit(null);
          }}
          onSave={(data) => {
            if (data.id) {
              updateVisitMutation.mutate(data);
            } else {
              createVisitMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}