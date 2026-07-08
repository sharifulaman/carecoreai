import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/lib/createNotification";
import { ORG_ID } from "@/lib/roleConfig";

const WARNING_LEVEL_LABELS = {
  verbal_warning: "Verbal Warning",
  first_written_warning: "1st Written Warning",
  final_written_warning: "Final Written Warning",
  notice_to_quit: "Notice to Quit",
};

const REASON_LABELS = {
  behaviour: "Behaviour",
  property_damage: "Property Damage",
  abusive_language: "Abusive Language",
  non_compliance_house_rules: "Non-Compliance with House Rules",
  threatening_behaviour: "Threatening Behaviour",
  other: "Other",
};

export default function WarningLettersAcknowledgementPanel({ resident, staff = [] }) {
  const qc = useQueryClient();

  const { data: warningLetters = [] } = useQuery({
    queryKey: ["warning-letters-yp", resident?.id],
    queryFn: () => base44.entities.WarningLetter.filter({}, "-issued_date", 100),
    select: (d) => d.filter(w => w.resident_id === resident?.id),
    staleTime: 60 * 1000,
    enabled: !!resident?.id,
  });

  const pendingAck = warningLetters.filter(
    w => w.workflow_status === "sent_to_yp" && !w.yp_acknowledged
  );
  const acknowledged = warningLetters.filter(w => w.yp_acknowledged);
  const active = warningLetters.filter(w => w.workflow_status === "posted" || w.workflow_status === "manager_approved" || w.workflow_status === "yp_acknowledged");

  const acknowledgeMutation = useMutation({
    mutationFn: async (warning) => {
      await base44.entities.WarningLetter.update(warning.id, {
        yp_acknowledged: true,
        yp_acknowledged_date: new Date().toISOString(),
        workflow_status: "yp_acknowledged",
        status: "active",
      });
      // Notify the issuing staff member
      const issuingStaff = staff.find(s => s.full_name === warning.issued_by_name);
      if (issuingStaff?.user_id) {
        await createNotification({
          recipient_user_id: issuingStaff.user_id,
          org_id: warning.org_id || ORG_ID,
          title: "Warning Letter Acknowledged by YP",
          body: `${resident.display_name} has acknowledged the warning letter (${WARNING_LEVEL_LABELS[warning.warning_level] || warning.warning_level}).`,
          type: "incident_review",
          priority: "normal",
        });
      }
    },
    onSuccess: () => {
      toast.success("Warning letter acknowledged");
      qc.invalidateQueries({ queryKey: ["warning-letters-yp", resident?.id] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (warningLetters.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Pending acknowledgements */}
      {pendingAck.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-800">Pending Your Acknowledgement</h4>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">{pendingAck.length}</span>
          </div>
          <div className="space-y-3">
            {pendingAck.map(w => (
              <div key={w.id} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {WARNING_LEVEL_LABELS[w.warning_level] || w.warning_level}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {REASON_LABELS[w.reason] || w.reason} · {w.issued_date ? new Date(w.issued_date).toLocaleDateString("en-GB") : "—"}
                      </p>
                      {w.reason_detail && (
                        <p className="text-xs text-slate-600 mt-2 leading-relaxed border-l-2 border-amber-300 pl-2">
                          {w.reason_detail}
                        </p>
                      )}
                      {w.issued_by_name && (
                        <p className="text-xs text-slate-400 mt-1.5">Issued by: {w.issued_by_name}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    onClick={() => acknowledgeMutation.mutate(w)}
                    disabled={acknowledgeMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active / historical letters */}
      {active.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2">Warning Letters on Record</h4>
          <div className="space-y-2">
            {active.map(w => (
              <div key={w.id} className="flex items-center justify-between border border-slate-200 bg-white rounded-lg px-4 py-2.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">{WARNING_LEVEL_LABELS[w.warning_level] || w.warning_level}</span>
                  <span className="text-slate-400 ml-2">· {REASON_LABELS[w.reason] || w.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{w.issued_date ? new Date(w.issued_date).toLocaleDateString("en-GB") : "—"}</span>
                  {w.yp_acknowledged
                    ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged</span>
                    : <span className="flex items-center gap-1 text-slate-400"><Clock className="w-3.5 h-3.5" /> Active</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}