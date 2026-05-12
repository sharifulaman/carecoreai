import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import LAReviewLogModal from "./LAReviewLogModal";

export default function LAReviewsSubTab({ residents, homes }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  const { data: reviews = [] } = useQuery({
    queryKey: ["la-reviews"],
    queryFn: () => base44.entities.LAReview.filter({}, "-review_date", 500),
  });

  const createReviewMutation = useMutation({
    mutationFn: (data) => base44.entities.LAReview.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["la-reviews"] });
      setShowModal(false);
      setSelectedResident(null);
    },
  });

  // Stats
  const totalReviews = reviews.length;
  const overdueCount = residents.filter(r => {
    const lastReview = reviews
      .filter(rv => rv.resident_id === r.id)
      .sort((a, b) => new Date(b.review_date) - new Date(a.review_date))[0];
    if (!lastReview) return true;
    const nextDate = new Date(lastReview.next_review_date);
    return nextDate < new Date();
  }).length;

  const dueIn30Days = residents.filter(r => {
    const lastReview = reviews
      .filter(rv => rv.resident_id === r.id)
      .sort((a, b) => new Date(b.review_date) - new Date(a.review_date))[0];
    if (!lastReview) return false;
    const nextDate = new Date(lastReview.next_review_date);
    const daysUntil = (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 30;
  }).length;

  // Resident rows
  const residentRows = residents.map(r => {
    const lastReview = reviews
      .filter(rv => rv.resident_id === r.id)
      .sort((a, b) => new Date(b.review_date) - new Date(a.review_date))[0];
    const nextDate = lastReview?.next_review_date;

    let status = "no_review";
    let statusColor = "red";
    if (lastReview) {
      const nextDateObj = new Date(nextDate);
      const daysUntil = (nextDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntil < 0) {
        status = "overdue";
        statusColor = "red";
      } else if (daysUntil <= 30) {
        status = "due_soon";
        statusColor = "amber";
      } else {
        status = "on_track";
        statusColor = "green";
      }
    }

    return {
      id: r.id,
      resident: r.display_name || r.initials,
      reviewDate: lastReview ? new Date(lastReview.review_date).toLocaleDateString() : "—",
      reviewType: lastReview?.review_type?.replace(/_/g, " ") || "—",
      chair: lastReview?.chair_name || "—",
      decisions: lastReview?.key_decisions?.substring(0, 50) + (lastReview?.key_decisions?.length > 50 ? "..." : "") || "—",
      nextReview: nextDate ? new Date(nextDate).toLocaleDateString() : "—",
      status,
      statusColor,
      lastReview,
    };
  }).sort((a, b) => {
    const priorityOrder = { overdue: 0, due_soon: 1, no_review: 2, on_track: 3 };
    return priorityOrder[a.status] - priorityOrder[b.status];
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Reviews" value={totalReviews} color="blue" />
        <StatCard title="Overdue" value={overdueCount} color={overdueCount > 0 ? "red" : "green"} />
        <StatCard title="Due in 30 Days" value={dueIn30Days} color="amber" />
      </div>

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-red-700">{overdueCount} review(s) overdue</p>
            <p className="text-xs text-red-600 mt-1">LA reviews must be completed at regular intervals (typically 6-monthly).</p>
          </div>
        </div>
      )}

      {/* Action */}
      <Button onClick={() => setShowModal(true)} className="gap-1">
        <Plus className="w-4 h-4" /> Log Review
      </Button>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">Review Date</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Chair</th>
              <th className="text-left px-4 py-3 font-semibold">Key Decisions</th>
              <th className="text-left px-4 py-3 font-semibold">Next Review</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {residentRows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3 font-medium">{row.resident}</td>
                <td className="px-4 py-3 text-xs">{row.reviewDate}</td>
                <td className="px-4 py-3 text-xs capitalize">{row.reviewType}</td>
                <td className="px-4 py-3 text-xs">{row.chair}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.decisions}</td>
                <td className="px-4 py-3 text-xs">{row.nextReview}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    row.statusColor === "red" ? "bg-red-500/10 text-red-600" :
                    row.statusColor === "amber" ? "bg-amber-500/10 text-amber-600" :
                    "bg-green-500/10 text-green-600"
                  }`}>
                    {row.status.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <LAReviewLogModal
          resident={selectedResident}
          residents={residents}
          onClose={() => {
            setShowModal(false);
            setSelectedResident(null);
          }}
          onSave={(data) => createReviewMutation.mutate(data)}
        />
      )}
    </div>
  );
}