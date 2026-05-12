import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Download } from "lucide-react";
import { toast } from "sonner";
import { generateReg45PDF } from "@/lib/generateReg45PDF";

export default function Reg45GeneratorTab({ home, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    quality_of_care_assessment: "",
    children_outcomes_assessment: "",
    safeguarding_effectiveness: "",
    leadership_assessment: "",
    improvements_made_this_year: "",
    areas_for_development: "",
    priorities_for_next_year: "",
  });

  const { data: reg44Reports = [] } = useQuery({
    queryKey: ["reg44-reports", home.id, year],
    queryFn: () => secureGateway.filter("Reg44Report", { home_id: home.id }, "-visit_date", 12),
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints", home.id, year],
    queryFn: () => secureGateway.filter("Complaint", { home_id: home.id }, "-received_datetime", 100),
  });

  const { data: accidents = [] } = useQuery({
    queryKey: ["accidents", home.id, year],
    queryFn: () => secureGateway.filter("AccidentReport", { home_id: home.id }, "-date", 100),
  });

  const { data: mfhRecords = [] } = useQuery({
    queryKey: ["mfh", home.id, year],
    queryFn: () => secureGateway.filter("MissingFromHome", { home_id: home.id }, "-created_date", 100),
  });

  const { data: ofstedNotifications = [] } = useQuery({
    queryKey: ["ofsted-notifications", home.id, year],
    queryFn: () => secureGateway.filter("OfstedNotification", { home_id: home.id }, "-event_date", 100),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reg45-reviews", home.id],
    queryFn: () => secureGateway.filter("Reg45Review", { home_id: home.id }, "-created_date", 20),
  });

  const { data: editingReview } = useQuery({
    queryKey: ["reg45-review", editingId],
    queryFn: () => editingId ? secureGateway.filter("Reg45Review", { id: editingId }) : null,
    enabled: !!editingId,
  });

  const compiled = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year + 1, 0, 0);

    const inRange = (d) => {
      if (!d) return false;
      const date = new Date(d);
      return date >= startDate && date <= endDate;
    };

    const reports = reg44Reports.filter(r => inRange(r.visit_date));
    const ratingBreakdown = {
      outstanding: reports.filter(r => r.overall_rating === "outstanding").length,
      good: reports.filter(r => r.overall_rating === "good").length,
      requires_improvement: reports.filter(r => r.overall_rating === "requires_improvement").length,
      inadequate: reports.filter(r => r.overall_rating === "inadequate").length,
    };

    const totalRecs = reports.reduce((sum, r) => sum + (r.new_recommendations?.length || 0), 0);
    const actioned = reports.reduce((sum, r) => sum + (r.previous_recommendations_actioned?.filter(p => p.status === "actioned").length || 0), 0);

    const complaintsList = complaints.filter(c => inRange(c.received_datetime));
    const upheld = complaintsList.filter(c => c.outcome_category === "upheld").length;
    const resolved = complaintsList.filter(c => c.status === "closed" && c.resolution_date).length;
    const escalated = complaintsList.filter(c => c.escalated_to_ofsted).length;

    const accidentsList = accidents.filter(a => inRange(a.date));
    const mfhList = mfhRecords.filter(m => inRange(m.reported_missing_datetime));
    const notifList = ofstedNotifications.filter(n => inRange(n.event_date));

    return {
      period_start: startDate.toISOString().split("T")[0],
      period_end: endDate.toISOString().split("T")[0],
      reg44_reports_completed: reports.length,
      overall_ratings_breakdown: ratingBreakdown,
      total_recommendations_made: totalRecs,
      recommendations_actioned: actioned,
      recommendations_outstanding: totalRecs - actioned,
      total_complaints: complaintsList.length,
      upheld_complaints: upheld,
      resolved_within_timescale: resolved,
      escalated_to_ofsted: escalated,
      total_incidents: accidentsList.length,
      missing_from_home_episodes: mfhList.length,
      ofsted_notifications_made: notifList.length,
    };
  }, [reg44Reports, complaints, accidents, mfhRecords, ofstedNotifications, year]);

  useEffect(() => {
    if (editingReview?.[0]) {
      const r = editingReview[0];
      setYear(parseInt(r.review_year.split("-")[0]));
      setForm({
        quality_of_care_assessment: r.quality_of_care_assessment || "",
        children_outcomes_assessment: r.children_outcomes_assessment || "",
        safeguarding_effectiveness: r.safeguarding_effectiveness || "",
        leadership_assessment: r.leadership_assessment || "",
        improvements_made_this_year: r.improvements_made_this_year || "",
        areas_for_development: r.areas_for_development || "",
        priorities_for_next_year: r.priorities_for_next_year || "",
      });
    }
  }, [editingReview]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        review_year: `${year}-${year + 1}`,
        period_start: compiled.period_start,
        period_end: compiled.period_end,
        prepared_by_id: user?.id,
        prepared_by_name: user?.full_name,
        ...compiled,
        ...form,
        status: editingId ? "approved" : "draft",
      };

      if (editingId) {
        await secureGateway.update("Reg45Review", editingId, data);
      } else {
        await secureGateway.create("Reg45Review", data);
      }
    },
    onSuccess: async () => {
      toast.success("Review saved");
      qc.invalidateQueries({ queryKey: ["reg45-reviews"] });
      setShowForm(false);
      setForm({
        quality_of_care_assessment: "",
        children_outcomes_assessment: "",
        safeguarding_effectiveness: "",
        leadership_assessment: "",
        improvements_made_this_year: "",
        areas_for_development: "",
        priorities_for_next_year: "",
      });
      setEditingId(null);
    },
    onError: () => toast.error("Error saving review"),
  });

  const handleExport = (reviewId) => {
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      generateReg45PDF(review, home);
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900 font-medium">
          Regulation 45 requires an annual review of the home's compliance, quality of care, and safeguarding effectiveness.
        </p>
      </div>

      {/* Auto-compiled stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Reg44 Reports</p>
          <p className="text-2xl font-bold">{compiled.reg44_reports_completed}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Recommendations</p>
          <p className="text-2xl font-bold">{compiled.total_recommendations_made}</p>
          <p className="text-xs text-green-700">✓ {compiled.recommendations_actioned} done</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Complaints</p>
          <p className="text-2xl font-bold">{compiled.total_complaints}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground">MFH Episodes</p>
          <p className="text-2xl font-bold">{compiled.missing_from_home_episodes}</p>
        </div>
      </div>

      {/* Generate button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-1">
          Generate Annual Review for {year}-{year + 1}
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Annual Review for {year}-{year + 1}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}><X className="w-4 h-4" /></button>
          </div>

          <div className="text-xs text-muted-foreground p-2 bg-white rounded border border-border">
            <p className="font-medium mb-1">Auto-compiled from system data:</p>
            <p>Reg44 Reports: {compiled.reg44_reports_completed} | Recommendations: {compiled.total_recommendations_made} | Complaints: {compiled.total_complaints} | MFH: {compiled.missing_from_home_episodes}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Quality of Care Assessment</label>
            <Textarea value={form.quality_of_care_assessment} onChange={e => setForm(p => ({ ...p, quality_of_care_assessment: e.target.value }))} rows={3} placeholder="Assess overall quality of care provided..." />
          </div>

          <div>
            <label className="text-sm font-medium">Children's Outcomes & Development</label>
            <Textarea value={form.children_outcomes_assessment} onChange={e => setForm(p => ({ ...p, children_outcomes_assessment: e.target.value }))} rows={3} placeholder="Assess progress and outcomes for children..." />
          </div>

          <div>
            <label className="text-sm font-medium">Safeguarding Effectiveness</label>
            <Textarea value={form.safeguarding_effectiveness} onChange={e => setForm(p => ({ ...p, safeguarding_effectiveness: e.target.value }))} rows={3} placeholder="Assess safeguarding systems and effectiveness..." />
          </div>

          <div>
            <label className="text-sm font-medium">Leadership & Management</label>
            <Textarea value={form.leadership_assessment} onChange={e => setForm(p => ({ ...p, leadership_assessment: e.target.value }))} rows={3} placeholder="Assess leadership quality and management..." />
          </div>

          <div>
            <label className="text-sm font-medium">Improvements Made This Year</label>
            <Textarea value={form.improvements_made_this_year} onChange={e => setForm(p => ({ ...p, improvements_made_this_year: e.target.value }))} rows={2} placeholder="What has been improved..." />
          </div>

          <div>
            <label className="text-sm font-medium">Areas for Development</label>
            <Textarea value={form.areas_for_development} onChange={e => setForm(p => ({ ...p, areas_for_development: e.target.value }))} rows={2} placeholder="Areas needing further work..." />
          </div>

          <div>
            <label className="text-sm font-medium">Priorities for Next Year</label>
            <Textarea value={form.priorities_for_next_year} onChange={e => setForm(p => ({ ...p, priorities_for_next_year: e.target.value }))} rows={2} placeholder="Goals and priorities for next year..." />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save & Generate"}
            </Button>
          </div>
        </div>
      )}

      {/* Past reviews */}
      {reviews.length > 0 && (
        <div className="border border-border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold">Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Reports</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r, i) => (
                <tr key={r.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 text-sm">{r.review_year}</td>
                  <td className="px-4 py-3 text-xs">{r.reg44_reports_completed} visits</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded capitalize font-medium ${r.status === "draft" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>{r.status}</span></td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingId(r.id); setShowForm(true); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => handleExport(r.id)} className="gap-1"><Download className="w-3 h-3" /> PDF</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}