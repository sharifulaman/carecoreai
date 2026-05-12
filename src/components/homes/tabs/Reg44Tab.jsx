import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Plus, Download } from "lucide-react";
import { toast } from "sonner";
import Reg44Form from "./Reg44Form";
import Reg44ReportDetail from "./Reg44ReportDetail";
import Reg45Summary from "./Reg45Summary";

const RATING_COLORS = {
  outstanding: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  requires_improvement: "bg-amber-100 text-amber-700",
  inadequate: "bg-red-100 text-red-700",
};

export default function Reg44Tab({ home, staff, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReg45, setShowReg45] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["reg44-reports", home?.id],
    queryFn: () => secureGateway.filter("Reg44Report", { home_id: home?.id }, "-visit_date", 500),
  });

  const lastVisitDate = useMemo(() => {
    const submitted = reports.find(r => r.status !== "draft");
    return submitted ? new Date(submitted.visit_date) : null;
  }, [reports]);

  const isOverdue = useMemo(() => {
    if (!lastVisitDate) return true;
    const daysAgo = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 35;
  }, [lastVisitDate]);

  const daysAgoLabel = useMemo(() => {
    if (!lastVisitDate) return null;
    const days = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }, [lastVisitDate]);

  const nextVisitDue = useMemo(() => {
    if (!lastVisitDate) return null;
    const next = new Date(lastVisitDate);
    next.setMonth(next.getMonth() + 1);
    return next.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }, [lastVisitDate]);

  // Compliance calendar
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const report = reports.find(r => r.visit_month === monthStr && r.status !== "draft");
      result.push({ monthStr, monthKey, hasReport: !!report, report });
    }
    return result;
  }, [reports]);

  return (
    <div className="space-y-4">
      {/* Overdue Alert */}
      {isOverdue && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">Regulation 44 visit is overdue</p>
            <p className="text-sm text-red-700 mt-1">
              Last visit was {daysAgoLabel}. Regulation 44 requires monthly visits.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} size="sm" className="bg-red-600 hover:bg-red-700 shrink-0">
            <Plus className="w-4 h-4 mr-1" /> New Visit
          </Button>
        </div>
      )}

      {/* Status & Controls */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Last visit</p>
            {lastVisitDate ? (
              <p className="font-medium">{lastVisitDate.toLocaleDateString("en-GB")} ({daysAgoLabel})</p>
            ) : (
              <p className="font-medium text-amber-600">No visit recorded</p>
            )}
          </div>
          {nextVisitDue && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Next due</p>
              <p className="font-medium">{nextVisitDue}</p>
            </div>
          )}
          <Button onClick={() => setShowForm(true)} className="gap-1 shrink-0">
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </div>
      </div>

      {/* Compliance Calendar */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-3">12-Month Compliance Calendar</h3>
        <div className="grid grid-cols-12 gap-1">
          {months.map(m => (
            <div
              key={m.monthKey}
              className={`aspect-square rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-colors ${
                m.hasReport ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              } hover:opacity-80`}
              title={m.monthStr}
            >
              {m.hasReport ? "✓" : "✗"}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Green = visit completed · Red = no visit</p>
      </div>

      {/* Reports List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Regulation 44 Reports</h3>
        {reports.filter(r => r.status !== "draft").length === 0 ? (
          <div className="bg-muted/30 rounded-lg p-6 text-center text-muted-foreground text-sm">No reports submitted yet.</div>
        ) : (
          reports
            .filter(r => r.status !== "draft")
            .sort((a, b) => (b.visit_date || "").localeCompare(a.visit_date || ""))
            .map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="border border-border rounded-lg p-3 hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{r.visit_month}</p>
                    <p className="text-xs text-muted-foreground">{r.inspector_name} · {r.inspector_organisation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${RATING_COLORS[r.overall_rating]}`}>
                      {r.overall_rating}
                    </span>
                    {r.status === "submitted" && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending response</span>}
                    {r.status === "manager_responded" && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">✓ Responded</span>}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Reg45 Section */}
      <div className="border-t border-border pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">Annual Review (Regulation 45)</p>
          <p className="text-xs text-blue-800 mb-3">
            The 12 Regulation 44 reports form the basis of your annual Regulation 45 review.
          </p>
          <Button onClick={() => setShowReg45(true)} variant="outline" size="sm" className="gap-1">
            <Download className="w-4 h-4" /> Generate Reg45 Summary
          </Button>
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <Reg44Form
          home={home}
          staff={staff}
          user={user}
          lastReport={reports.find(r => r.status !== "draft")}
          onClose={() => setShowForm(false)}
          onSave={() => qc.invalidateQueries({ queryKey: ["reg44-reports"] })}
        />
      )}
      {selectedReport && <Reg44ReportDetail report={selectedReport} staff={staff} user={user} onClose={() => setSelectedReport(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["reg44-reports"] })} />}
      {showReg45 && <Reg45Summary reports={reports.filter(r => r.status !== "draft")} home={home} onClose={() => setShowReg45(false)} />}
    </div>
  );
}