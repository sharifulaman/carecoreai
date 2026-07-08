import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { X, Calendar, Home, Clock, ShieldCheck, Upload, Lock, CheckCircle2, Droplets } from "lucide-react";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // For triggering workflows


function SubCheckRow({ item, response, onChange, readOnly }) {
  const [showFail, setShowFail] = useState(response?.response_status === "fail");

  const pick = (status) => {
    setShowFail(status === "fail");
    onChange(item.id, { ...response, response_status: status });
  };

  const btnBase = "flex-1 py-2 text-xs font-bold rounded-lg border transition-all";

  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/40">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
          <Droplets className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{item.item_title}</p>
          {item.item_question && <p className="text-xs text-slate-500 mt-0.5">{item.item_question}</p>}
        </div>
      </div>

      {/* Pass / Fail / N/A */}
      <div className="flex gap-2">
        <button disabled={readOnly} onClick={() => pick("pass")} className={`${btnBase} ${response?.response_status === "pass" ? "bg-green-600 text-white border-green-600" : "bg-white text-green-700 border-green-300 hover:bg-green-50"} disabled:opacity-50 disabled:cursor-not-allowed`}>Pass</button>
        <button disabled={readOnly} onClick={() => pick("fail")} className={`${btnBase} ${response?.response_status === "fail" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-300 hover:bg-red-50"} disabled:opacity-50 disabled:cursor-not-allowed`}>Fail</button>
        {item.allows_na !== false && (
          <button disabled={readOnly} onClick={() => pick("na")} className={`${btnBase} ${response?.response_status === "na" ? "bg-slate-500 text-white border-slate-500" : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"} disabled:opacity-50 disabled:cursor-not-allowed`}>N/A</button>
        )}
      </div>

      {/* Fail capture */}
      {showFail && (
        <div className="space-y-2 border-t border-red-100 pt-3">
          <p className="text-xs font-semibold text-red-600">Issue Details Required</p>
          <textarea
            value={response?.issue_details || ""}
            onChange={e => onChange(item.id, { ...response, issue_details: e.target.value })}
            placeholder="Describe the issue..."
            disabled={readOnly}
            className="w-full px-3 py-2 text-xs border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 resize-none bg-white disabled:opacity-60"
            rows={2}
          />
          <div className="flex gap-1.5">
            {["low", "medium", "high", "critical"].map(s => {
              const active = response?.severity === s;
              const col = s === "critical" ? "border-red-700 bg-red-700 text-white" : s === "high" ? "border-red-500 bg-red-500 text-white" : s === "medium" ? "border-amber-500 bg-amber-500 text-white" : "border-yellow-400 bg-yellow-400 text-yellow-900";
              return (
                <button key={s} disabled={readOnly} onClick={() => onChange(item.id, { ...response, severity: s })}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border capitalize transition-all ${active ? col : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"} disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {s}
                </button>
              );
            })}
          </div>
          <input
            placeholder="Immediate action taken..."
            value={response?.immediate_action || ""}
            onChange={e => onChange(item.id, { ...response, immediate_action: e.target.value })}
            disabled={readOnly}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:opacity-60"
          />
        </div>
      )}

      {/* Optional note for pass/na */}
      {response?.response_status && response.response_status !== "fail" && (
        <input
          placeholder="Add a note (optional)..."
          value={response?.note || ""}
          onChange={e => onChange(item.id, { ...response, note: e.target.value })}
          disabled={readOnly}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white disabled:opacity-60"
        />
      )}
    </div>
  );
}

export default function CheckDetailDrawer({ instance, onClose, staffProfile, home }) {
  const qc = useQueryClient();
  const [responses, setResponses] = useState({});
  const [generalNote, setGeneralNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const { canAdd } = useModuleActions("homes");
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile }); // For triggering workflows

  const { data: templateItems = [] } = useQuery({
    queryKey: ["check-template-items", instance?.template_id],
    queryFn: () => base44.entities.HomeCheckTemplateItem.filter({ template_id: instance.template_id }),
    enabled: !!instance?.template_id,
    select: d => [...d].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
  });

  const { data: completionData } = useQuery({
    queryKey: ["check-completion-data", instance?.id],
    queryFn: async () => {
      const comps = await base44.entities.HomeCheckCompletion.filter({ instance_id: instance.id });
      if (!comps || comps.length === 0) return null;
      const comp = comps[0];
      const resps = await base44.entities.HomeCheckItemResponse.filter({ completion_id: comp.id });
      return { completion: comp, responses: resps };
    },
    enabled: !!instance?.id && instance?.status !== "due",
  });

  useEffect(() => {
    if (completionData) {
      const { completion, responses: savedResponses } = completionData;
      setGeneralNote(completion.general_note || "");
      setPhotoUrls(completion.photo_url ? completion.photo_url.split(',') : []);

      const resMap = {};
      savedResponses.forEach(r => {
        resMap[r.template_item_id] = {
          response_status: r.response_status,
          note: r.note || "",
          issue_details: r.issue_details || "",
        };
      });
      setResponses(resMap);
    }
  }, [completionData]);

  const completedCount = Object.values(responses).filter(r => r.response_status).length;
  const totalCount = templateItems.length;

  const uploadPhoto = async (file) => {
    setIsUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrls(prev => [...prev, file_url]);
      toast.success("Photo uploaded successfully");
    } catch (err) {
      toast.error("Failed to upload photo");
      console.error(err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadPhoto(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadPhoto(file);
  };

  const handleSubmit = async () => {
    const missing = templateItems.filter(i => i.is_required && !responses[i.id]?.response_status);
    if (missing.length > 0) {
      toast.error(`${missing.length} required sub-check(s) still need a response`);
      return;
    }
    const failsWithoutDetails = templateItems.filter(i =>
      responses[i.id]?.response_status === "fail" && !responses[i.id]?.issue_details
    );
    if (failsWithoutDetails.length > 0) {
      toast.error("Please add issue details for all failed items");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const todayStr = now.slice(0, 10);

      // Create completion record
      const completion = await base44.entities.HomeCheckCompletion.create({
        org_id: ORG_ID,
        home_id: instance.home_id,
        instance_id: instance.id,
        template_id: instance.template_id,
        submitted_by_staff_id: staffProfile?.id,
        submitted_by_name: staffProfile?.full_name,
        submitted_at: now,
        completion_date: todayStr,
        overall_status: "submitted_for_review",
        general_note: generalNote,
        photo_url: photoUrls.join(','),
        manager_review_status: "pending",
      });

      // Save responses + create issues for fails
       let hasFailure = false;
      for (const item of templateItems) {
        const resp = responses[item.id];
        if (!resp?.response_status) continue;
        await base44.entities.HomeCheckItemResponse.create({
          org_id: ORG_ID,
          completion_id: completion.id,
          instance_id: instance.id,
          template_item_id: item.id,
          item_title: item.item_title,
          response_status: resp.response_status,
          note: resp.note || "",
          issue_created: resp.response_status === "fail",
          completed_by_staff_id: staffProfile?.id,
          completed_by_name: staffProfile?.full_name,
          completed_at: now,
        });

        if (resp.response_status === "fail") {
          hasFailure = true;
          await base44.entities.HomeCheckIssue.create({
            org_id: ORG_ID,
            home_id: instance.home_id,
            instance_id: instance.id,
            completion_id: completion.id,
            template_id: instance.template_id,
            template_item_id: item.id,
            issue_title: `${item.item_title} — Failed`,
            issue_details: resp.issue_details || "",
            severity: resp.severity || "medium",
            immediate_action_taken: resp.immediate_action || "",
            status: "open",
            reported_by_staff_id: staffProfile?.id,
            reported_by_name: staffProfile?.full_name,
          });
        }
      }

      // Update instance status
      await base44.entities.HomeCheckInstance.update(instance.id, { status: "submitted_for_review" });

      // A failed sub-check needs a maker-checker review, separate from the
      // routine manager review every submission already goes through.
      if (hasFailure) {
        triggerWorkflow({
          workflowType: "home_check",
          entityId:     completion.id,
          entityRef:    `CHK-${completion.id.slice(0, 8)}`,
          title:        `Failed check — ${instance.template_title}`,
          description:  `One or more sub-checks failed during "${instance.template_title}" at ${home?.name || "this home"}.`,
          homeId:       instance.home_id,
          homeName:     home?.name || "",
          priority:     "urgent",
        });
      }

      qc.invalidateQueries({ queryKey: ["check-instances", instance.home_id] });
      qc.invalidateQueries({ queryKey: ["check-completions", instance.home_id] });
      qc.invalidateQueries({ queryKey: ["check-issues", instance.home_id] });

      setDone(true);
      toast.success("Submitted for manager review!");
      setTimeout(() => onClose());
    } catch (err) {
      toast.error("Submit failed: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitted = done || ["submitted_for_review", "completed"].includes(instance?.status);
  const isReadOnlyMode = !canAdd || isSubmitted;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-200 shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="text-base font-bold text-slate-900 leading-snug">{instance?.template_title}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1 capitalize"><Calendar className="w-3 h-3" />{instance?.template_frequency || "Daily"}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1"><Home className="w-3 h-3" />{instance?.template_area || "General"}</span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due today, {instance?.due_at || "10:00 AM"}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Sub-checks ({completedCount} of {totalCount} complete)</h3>

        {templateItems.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">No sub-checks defined for this template</div>
        ) : (
          <div className="space-y-3">
            {templateItems.map(item => (
              <SubCheckRow
                key={item.id}
                item={item}
                response={responses[item.id]}
                readOnly={isReadOnlyMode}
                onChange={(id, val) => setResponses(prev => ({ ...prev, [id]: val }))}
              />
            ))}
          </div>
        )}

        {/* General note */}
        <div>
          <label className="text-sm font-semibold text-slate-700 block mb-2">Add a note (optional)</label>
          <textarea
            value={generalNote}
            onChange={e => setGeneralNote(e.target.value)}
            placeholder="Add any notes or additional information..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            rows={3}
            disabled={isReadOnlyMode}
          />
        </div>

        {/* Photo upload */}
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-bold text-slate-800 mb-3">Add photos (optional)</p>
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {photoUrls.map((url, idx) => (
                <div key={idx} className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 h-32 flex items-center justify-center group">
                  <img src={url} alt={`Uploaded ${idx}`} className="max-w-full max-h-full object-contain cursor-pointer transition-transform group-hover:scale-105" onClick={() => setPreviewPhoto(url)} />
                  {!isSubmitted && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!isSubmitted && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer relative"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isReadOnlyMode || isUploadingPhoto}
              />
              {isUploadingPhoto ? (
                <>
                  <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-slate-500">Uploading...</p>
                </>
              ) : (
                <>
                  <Upload className="w-7 h-7 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">Drag &amp; drop or click to upload</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">JPG, PNG up to 10MB</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit footer */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-200 shrink-0 space-y-2">
        {isSubmitted ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-bold text-green-700">Submitted for Review</span>
          </div>
        ) : !canAdd ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-sm font-bold text-slate-500">View Only</span>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-60 text-sm"
          >
            <ShieldCheck className="w-5 h-5" />
            {submitting ? "Submitting..." : "Submit for Manager Review"}
          </button>
        )}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Lock className="w-3 h-3" />
          <span>Your submission will be reviewed by your manager.</span>
        </div>
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setPreviewPhoto(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors" onClick={() => setPreviewPhoto(null)}>
            <X className="w-8 h-8" />
          </button>
          <img src={previewPhoto} alt="Preview" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}