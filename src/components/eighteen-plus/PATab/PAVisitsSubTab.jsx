import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import PAVisitLogModal from "./PAVisitLogModal";
import PADetailsModal from "./PADetailsModal";
import PAVisitDetail from "./PAVisitDetail";

export default function PAVisitsSubTab({ residents, homes, staff }) {
  const qc = useQueryClient();
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);
  const [expandedResident, setExpandedResident] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);

  // Fetch PA details and visits
  const { data: paDetails = [] } = useQuery({
    queryKey: ["pa-details"],
    queryFn: () => secureGateway.filter("PADetails", {}),
  });

  const { data: paVisits = [] } = useQuery({
    queryKey: ["pa-visits"],
    queryFn: () => base44.entities.PAVisit.filter({}, "-visit_date", 500),
  });

  // Create visit mutation
  const createVisitMutation = useMutation({
    mutationFn: (data) => base44.entities.PAVisit.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pa-visits"] });
      setShowVisitModal(false);
      setSelectedResident(null);
    },
  });

  // Create/update PA details
  const savePADetailsMutation = useMutation({
    mutationFn: (data) => {
      const existing = paDetails.find(p => p.resident_id === data.resident_id);
      if (existing) {
        return base44.entities.PADetails.update(existing.id, data);
      }
      return base44.entities.PADetails.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pa-details"] });
      setShowDetailsModal(false);
      setSelectedResident(null);
    },
  });

  // Calculate stats
  const allocatedCount = residents.filter(r => paDetails.find(p => p.resident_id === r.id)).length;
  const thisMonthVisits = paVisits.filter(v => {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const vDate = new Date(v.visit_date);
    return vDate.getMonth() === month && vDate.getFullYear() === year;
  }).length;

  const overdueCount = residents.filter(r => {
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
  const residentRows = residents.map(r => {
    const paDetail = paDetails.find(p => p.resident_id === r.id);
    const lastVisit = paVisits
      .filter(v => v.resident_id === r.id)
      .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
    const nextVisit = paDetail?.pa_review_date;
    const daysSinceLast = lastVisit
      ? Math.floor((Date.now() - new Date(lastVisit.visit_date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status = "no_pa";
    let statusColor = "red";
    if (paDetail) {
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
      paName: paDetail?.pa_name || "—",
      lastVisit: lastVisit ? new Date(lastVisit.visit_date).toLocaleDateString() : "Never",
      daysSince: daysSinceLast,
      nextVisit: nextVisit ? new Date(nextVisit).toLocaleDateString() : "—",
      status,
      statusColor,
      paDetail,
      lastVisitRecord: lastVisit,
    };
  }).sort((a, b) => {
    const priorityOrder = { overdue: 0, due_soon: 1, no_visit: 2, no_pa: 3, up_to_date: 4 };
    return priorityOrder[a.status] - priorityOrder[b.status];
  });

  if (selectedVisit) {
    return (
      <div>
        <button
          onClick={() => setSelectedVisit(null)}
          className="text-sm text-primary hover:opacity-70 mb-4"
        >
          ← Back to Visits
        </button>
        <PAVisitDetail visit={selectedVisit} paDetails={paDetails} residents={residents} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard title="PAs Allocated" value={allocatedCount} color="blue" />
        <StatCard title="Visits This Month" value={thisMonthVisits} color="green" />
        <StatCard
          title="Overdue Visits"
          value={overdueCount}
          color={overdueCount > 0 ? "red" : "green"}
        />
        <StatCard title="Next 7 Days" value={next7Days} color="amber" />
      </div>

      {/* Alert for unallocated */}
      {allocatedCount < residents.length && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-700">
              {residents.length - allocatedCount} resident{residents.length - allocatedCount !== 1 ? "s" : ""} without PA allocated
            </p>
            <p className="text-xs text-red-600 mt-1">All 16+ care leavers must have a Personal Adviser.</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={() => setShowVisitModal(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Log PA Visit
        </Button>
      </div>

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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedResident(row);
                        setShowDetailsModal(true);
                      }}
                      className="h-7 text-xs"
                    >
                      Edit
                    </Button>
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
            {residentRows.find(r => r.id === expandedResident)?.resident} — PA Details & History
          </h3>
          {residentRows.find(r => r.id === expandedResident)?.paDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-white rounded p-3">
                <div>
                  <p className="text-xs text-muted-foreground">PA Name</p>
                  <p className="font-medium">{residentRows.find(r => r.id === expandedResident)?.paDetail?.pa_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Organisation</p>
                  <p className="font-medium">{residentRows.find(r => r.id === expandedResident)?.paDetail?.pa_organisation || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Local Authority</p>
                  <p className="font-medium">{residentRows.find(r => r.id === expandedResident)?.paDetail?.local_authority || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">LA Social Worker</p>
                  <p className="font-medium">{residentRows.find(r => r.id === expandedResident)?.paDetail?.la_social_worker_name || "—"}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm mb-2">Visit History</p>
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
                        <p className="text-xs font-medium">{new Date(v.visit_date).toLocaleDateString()} • {v.visit_type}</p>
                        <p className="text-xs text-muted-foreground">{v.duration_minutes}min • {v.pa_name}</p>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No PA allocated. Click "Edit" to add.</p>
          )}
        </div>
      )}

      {/* Modals */}
      {showVisitModal && (
        <PAVisitLogModal
          resident={selectedResident}
          residents={residents}
          paDetails={paDetails}
          onClose={() => {
            setShowVisitModal(false);
            setSelectedResident(null);
          }}
          onSave={(data) => createVisitMutation.mutate(data)}
        />
      )}

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