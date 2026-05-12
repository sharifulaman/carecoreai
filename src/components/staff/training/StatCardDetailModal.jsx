import { X } from "lucide-react";
import { calcTrainingStatus } from "./TrainingStatusBadge";
import { differenceInDays, parseISO } from "date-fns";

const STATUS_COLORS = {
  "Compliant": "bg-green-100 text-green-700",
  "At Risk": "bg-amber-100 text-amber-700",
  "Non-Compliant": "bg-red-100 text-red-700",
  "expired": "bg-red-100 text-red-700",
  "expiring_soon": "bg-orange-100 text-orange-700",
  "completed": "bg-green-100 text-green-700",
  "in_progress": "bg-blue-100 text-blue-700",
  "not_started": "bg-gray-100 text-gray-600",
};

export default function StatCardDetailModal({ type, stats, staffWithStatus, allTrainingForScope, activeCourses, recordMap, homes, onClose }) {
  const homeMap = Object.fromEntries((homes || []).map(h => [h.id, h.name]));

  // Build the list to show based on card type
  let title = "";
  let rows = [];

  if (type === "total") {
    title = "All Active Staff";
    rows = staffWithStatus.map(s => ({
      name: s.full_name,
      sub: s.role?.replace(/_/g, " "),
      badge: s.overallStatus,
      badgeClass: STATUS_COLORS[s.overallStatus],
    }));
  } else if (type === "compliant") {
    title = "Compliant Staff";
    rows = staffWithStatus.filter(s => s.overallStatus === "Compliant").map(s => ({
      name: s.full_name,
      sub: s.homeName || "No Home",
      badge: "Compliant",
      badgeClass: STATUS_COLORS["Compliant"],
    }));
  } else if (type === "overdue") {
    title = "Overdue Training Records";
    rows = allTrainingForScope
      .filter(r => calcTrainingStatus(r) === "expired")
      .map(r => {
        const daysAgo = r.expiry_date ? differenceInDays(new Date(), parseISO(r.expiry_date)) : null;
        return {
          name: r.staff_name || r.staff_id,
          sub: r.course_name,
          badge: daysAgo != null ? `${daysAgo}d overdue` : "Expired",
          badgeClass: STATUS_COLORS["expired"],
        };
      });
  } else if (type === "expiring") {
    title = "Expiring Soon (within 60 days)";
    rows = allTrainingForScope
      .filter(r => calcTrainingStatus(r) === "expiring_soon")
      .map(r => {
        const daysLeft = r.expiry_date ? differenceInDays(parseISO(r.expiry_date), new Date()) : null;
        return {
          name: r.staff_name || r.staff_id,
          sub: r.course_name,
          badge: daysLeft != null ? `${daysLeft}d left` : "Expiring",
          badgeClass: STATUS_COLORS["expiring_soon"],
        };
      });
  } else if (type === "avgCompliance") {
    title = "Staff Compliance Breakdown";
    rows = staffWithStatus.map(s => ({
      name: s.full_name,
      sub: s.homeName || "No Home",
      badge: s.overallStatus,
      badgeClass: STATUS_COLORS[s.overallStatus],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-sm">{title}</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{rows.length} records</span>
            <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No records found.</p>
          ) : (
            rows.map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                <div>
                  <p className="text-sm font-medium">{row.name}</p>
                  {row.sub && <p className="text-xs text-muted-foreground capitalize">{row.sub}</p>}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.badgeClass}`}>{row.badge}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}