import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, Clock, FileText } from "lucide-react";
import { format } from "date-fns";

const OUTCOME_LABELS = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  below_expectations: "Below Expectations",
  improvement_plan: "Improvement Plan Required",
};

function SelfAssessmentModal({ appraisal, competencies, myProfile, onClose, onSave }) {
  const [responses, setResponses] = useState(appraisal.self_assessment?.responses || {});
  const [reflection, setReflection] = useState(appraisal.self_assessment?.responses?.__reflection || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const allResponses = { ...responses, __reflection: reflection };
    await onSave(allResponses);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-xl rounded-xl shadow-xl max-h-[88vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-semibold text-sm">Self-Assessment</h3>
            <p className="text-xs text-muted-foreground">Appraisal: {appraisal.appraisal_date} · {appraisal.appraiser_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded px-3 py-2">
            Rate yourself on each competency and add a short reflection. Your manager will see this alongside their own scores — your honest self-assessment is valuable input.
          </p>

          {competencies.map(comp => (
            <div key={comp.key} className="space-y-1.5">
              <p className="text-sm font-semibold">{comp.label}</p>
              {comp.description && <p className="text-xs text-muted-foreground">{comp.description}</p>}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResponses(prev => ({ ...prev, [comp.key]: r }))}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                      (responses[comp.key] || 0) >= r ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Optional comment…"
                value={responses[`${comp.key}__comment`] || ""}
                onChange={e => setResponses(prev => ({ ...prev, [`${comp.key}__comment`]: e.target.value }))}
                className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reflective statement</label>
            <textarea
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              placeholder="Reflect on the period: what went well, what you'd do differently, what support you need…"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[100px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border bg-card">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={handleSave}>
            {saving ? "Submitting…" : "Submit Self-Assessment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyAppraisalsSection({ myProfile }) {
  const queryClient = useQueryClient();
  const [selfAssessModal, setSelfAssessModal] = useState(null);

  const { data: appraisals = [] } = useQuery({
    queryKey: ["my-appraisals", myProfile?.id],
    queryFn: () => secureGateway.filter("AppraisalRecord", { staff_id: myProfile.id }),
    enabled: !!myProfile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: competencies = [] } = useQuery({
    queryKey: ["appraisal-competencies"],
    queryFn: () => secureGateway.filter("AppraisalCompetency"),
    staleTime: 10 * 60 * 1000,
  });
  const activeCompetencies = competencies.filter(c => c.active !== false).sort((a, b) => (a.order || 99) - (b.order || 99));

  const submitSelfAssessment = useMutation({
    mutationFn: async ({ appraisalId, responses }) => {
      await secureGateway.update("AppraisalRecord", appraisalId, {
        self_assessment: {
          requested: true,
          submitted: true,
          submitted_at: new Date().toISOString(),
          responses,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appraisals", myProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ["appraisal-records"] });
    },
  });

  const signAsAppraisee = useMutation({
    mutationFn: async (appraisal) => {
      const now = new Date().toISOString();
      const newStatus = appraisal.appraiser_signed ? "completed" : appraisal.status;
      await secureGateway.update("AppraisalRecord", appraisal.id, {
        appraisee_signed: true,
        appraisee_signed_at: now,
        status: newStatus,
        employee_comments: appraisal.employee_comments,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appraisals", myProfile?.id] });
      queryClient.invalidateQueries({ queryKey: ["appraisal-records"] });
    },
  });

  const pending = appraisals.filter(a =>
    a.self_assessment?.requested && !a.self_assessment?.submitted
  );
  const toSign = appraisals.filter(a =>
    !a.appraisee_signed && a.status !== "draft" && a.appraiser_signed
  );
  const recent = [...appraisals].sort((a, b) => (b.appraisal_date || "").localeCompare(a.appraisal_date || "")).slice(0, 5);

  const [commentDraft, setCommentDraft] = useState({});

  return (
    <div className="space-y-6">
      {/* Pending self-assessments */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Self-assessment requested ({pending.length})
          </p>
          {pending.map(a => (
            <div key={a.id} className="flex items-center justify-between flex-wrap gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{a.appraisal_date} · {a.appraiser_name}</p>
                <p className="text-xs text-muted-foreground">{a.appraisal_type?.replace(/_/g, " ")}</p>
              </div>
              <Button size="sm" onClick={() => setSelfAssessModal(a)}>Complete self-assessment</Button>
            </div>
          ))}
        </div>
      )}

      {/* Pending appraisee sign-off */}
      {toSign.map(a => (
        <div key={a.id} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Appraisal awaiting your signature
          </p>
          <p className="text-sm font-medium">{a.appraisal_date} · Appraiser: {a.appraiser_name}</p>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Your comments (optional)</label>
            <textarea
              value={commentDraft[a.id] ?? (a.employee_comments || "")}
              onChange={e => setCommentDraft(p => ({ ...p, [a.id]: e.target.value }))}
              placeholder="Any comments on this appraisal…"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Button
            size="sm"
            onClick={() => signAsAppraisee.mutate({ ...a, employee_comments: commentDraft[a.id] ?? a.employee_comments })}
            disabled={signAsAppraisee.isPending}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Sign as appraisee
          </Button>
        </div>
      ))}

      {/* All appraisals */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">My Appraisals</h3>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-10">No appraisals found.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Outcome</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Rating</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Self-assess</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-2.5">{a.appraisal_date}</td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{(a.appraisal_type || "annual").replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5">{OUTCOME_LABELS[a.outcome] || a.outcome || "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(r => (
                        <Star key={r} className={`w-3 h-3 ${r <= (a.overall_rating||0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      a.status === "signed_off" ? "bg-green-100 text-green-700" :
                      a.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                    }`}>{a.status || "draft"}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {a.self_assessment?.submitted
                      ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Submitted</span>
                      : a.self_assessment?.requested
                      ? <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => setSelfAssessModal(a)}>Complete</Button>
                      : <span className="text-muted-foreground">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selfAssessModal && (
        <SelfAssessmentModal
          appraisal={selfAssessModal}
          competencies={activeCompetencies}
          myProfile={myProfile}
          onClose={() => setSelfAssessModal(null)}
          onSave={async (responses) => {
            await submitSelfAssessment.mutateAsync({ appraisalId: selfAssessModal.id, responses });
          }}
        />
      )}
    </div>
  );
}