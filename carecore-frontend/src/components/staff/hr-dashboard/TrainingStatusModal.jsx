import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Upload } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function TrainingStatusModal({
  open,
  onOpenChange,
  staff,
  course,
  currentRecord,
}) {
  const [status, setStatus] = useState("not_started");
  const [provider, setProvider] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [certificateUrl, setCertificateUrl] = useState("");
  const [policyAcknowledged, setPolicyAcknowledged] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizScore, setQuizScore] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (currentRecord) {
      setStatus(currentRecord.status || "not_started");
      setProvider(currentRecord.provider || "");
      setCompletionDate(currentRecord.completion_date || "");
      setExpiryDate(currentRecord.expiry_date || "");
      setCertificateUrl(currentRecord.certificate_url || "");
      setPolicyAcknowledged(currentRecord.policy_acknowledged || false);
      setQuizPassed(currentRecord.quiz_passed || false);
      setQuizScore(currentRecord.quiz_score || "");
      setNotes(currentRecord.notes || "");
    } else {
      setStatus("not_started");
      setProvider("");
      setCompletionDate("");
      setExpiryDate("");
      setCertificateUrl("");
      setPolicyAcknowledged(false);
      setQuizPassed(false);
      setQuizScore("");
      setNotes("");
    }
  }, [currentRecord, open]);

  useEffect(() => {
    if (!completionDate || !course?.expiry_months) return;
    const months = parseInt(course.expiry_months);
    if (months > 0) {
      const exp = new Date(completionDate);
      exp.setMonth(exp.getMonth() + months);
      setExpiryDate(exp.toISOString().split("T")[0]);
    }
  }, [completionDate, course]);

  const handleSubmit = async () => {
    try {
      setError(null);
      setSaving(true);

      const orgId = staff?.org_id || "default_org";

      const payload = {
        org_id: orgId,
        staff_id: staff.id,
        staff_name: staff.full_name,
        course_id: course.id,
        course_name: course.course_name || course.name,
        requirement_id: course.id,
        title: course.course_name || course.name,
        status,
        provider: provider || null,
        completion_date: completionDate || null,
        expiry_date: expiryDate || null,
        certificate_url: certificateUrl || null,
        policy_acknowledged: policyAcknowledged,
        policy_acknowledged_date: policyAcknowledged ? new Date().toISOString() : null,
        quiz_passed: quizPassed,
        quiz_score: quizPassed && quizScore ? parseInt(quizScore) : null,
        quiz_passed_date: quizPassed ? new Date().toISOString() : null,
        notes: notes || null,
      };

      if (currentRecord?.id) {
        await secureGateway.update("TrainingRecord", currentRecord.id, payload);
      } else {
        await secureGateway.create("TrainingRecord", payload);
      }

      // Invalidate queries BEFORE closing modal
      await queryClient.invalidateQueries({ queryKey: ["training-records"] });
      await queryClient.invalidateQueries({ queryKey: ["staff"] });
      
      onOpenChange(false);
    } catch (err) {
      setError(err.message || "Failed to save training record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
         <DialogHeader>
           <div>
             <DialogTitle className="text-base">{staff?.full_name}</DialogTitle>
             <p className="text-xs text-muted-foreground mt-1">{course?.course_name || course?.name}</p>
           </div>
         </DialogHeader>

         <div className="space-y-4">
           {/* Status */}
           <div>
             <Label className="text-xs font-semibold mb-2 block">Status <span className="text-red-500">*</span></Label>
             <Select value={status} onValueChange={setStatus}>
               <SelectTrigger className="h-10">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="not_started">Not Started</SelectItem>
                 <SelectItem value="in_progress">In Progress</SelectItem>
                 <SelectItem value="completed">Completed</SelectItem>
                 <SelectItem value="overdue">Overdue</SelectItem>
               </SelectContent>
             </Select>
           </div>

           {/* Provider */}
           <div>
             <Label className="text-xs font-semibold mb-2 block">Provider</Label>
             <Input
               placeholder="e.g. Skills for Care"
               value={provider}
               onChange={(e) => setProvider(e.target.value)}
               className="h-10"
             />
           </div>

           {/* Completion & Expiry Date - Side by side */}
           <div className="grid grid-cols-2 gap-4">
             <div>
               <Label className="text-xs font-semibold mb-2 block">Completion Date</Label>
               <Input
                 type="date"
                 value={completionDate}
                 onChange={(e) => setCompletionDate(e.target.value)}
                 className="h-10"
               />
             </div>
             <div>
               <Label className="text-xs font-semibold mb-2 block">Expiry Date</Label>
               <Input
                 type="date"
                 value={expiryDate}
                 onChange={(e) => setExpiryDate(e.target.value)}
                 className="h-10"
               />
               {completionDate && course?.expiry_months && parseInt(course.expiry_months) > 0 && (
                 <p className="text-xs text-blue-600 mt-1">Auto-calculated from completion date + {course?.expiry_months} months</p>
               )}
             </div>
           </div>

           {/* Certificate Upload */}
           <div>
             <Label className="text-xs font-semibold mb-2 block">Certificate</Label>
             <label className="flex items-center gap-2 w-full justify-center border border-dashed border-primary/40 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-primary/5">
               <Upload className="w-4 h-4" />
               {uploading ? "Uploading..." : certificateUrl ? "Replace Certificate" : "Upload Certificate"}
               <input
                 type="file"
                 accept=".pdf,.jpg,.jpeg,.png"
                 className="hidden"
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (!file) return;
                   setUploading(true);
                   try {
                     const { file_url } = await base44.integrations.Core.UploadFile({ file });
                     setCertificateUrl(file_url);
                     toast.success("Certificate uploaded");
                   } catch (err) {
                     toast.error("Upload failed");
                   } finally {
                     setUploading(false);
                   }
                 }}
               />
             </label>
             {certificateUrl && (
               <a href={certificateUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline mt-1 block">
                 View current certificate
               </a>
             )}
           </div>

           {/* Linked Policy & Quiz */}
           {status === 'completed' && (
             <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
               <p className="text-xs font-semibold text-blue-900">Linked Policy & Quiz</p>
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   checked={policyAcknowledged}
                   onChange={(e) => setPolicyAcknowledged(e.target.checked)}
                   id="policy-ack"
                 />
                 <label htmlFor="policy-ack" className="text-xs text-blue-800">
                   Staff member has read and acknowledged the related policy
                 </label>
               </div>
               <div className="flex items-center gap-2">
                 <input
                   type="checkbox"
                   checked={quizPassed}
                   onChange={(e) => setQuizPassed(e.target.checked)}
                   id="quiz-passed"
                 />
                 <label htmlFor="quiz-passed" className="text-xs text-blue-800">
                   Quiz passed
                 </label>
               </div>
               {quizPassed && (
                 <div>
                   <label className="text-xs font-medium">Quiz Score (%)</label>
                   <input
                     type="number"
                     value={quizScore}
                     onChange={(e) => setQuizScore(e.target.value)}
                     min="0"
                     max="100"
                     className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
                   />
                 </div>
               )}
             </div>
           )}

           {/* Notes */}
           <div>
             <Label className="text-xs font-semibold mb-2 block">Notes</Label>
             <textarea
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               placeholder="Optional notes..."
               className="w-full border border-input rounded-md px-3 py-2 text-xs h-20 resize-none"
             />
           </div>

           {/* Error */}
           {error && (
             <div className="bg-red-50 border border-red-200 rounded text-red-700 text-xs p-2">
               {error}
             </div>
           )}

           {/* Actions */}
           <div className="flex gap-3 justify-center pt-4">
             <Button
               className="flex-1 h-10"
               onClick={handleSubmit}
               disabled={saving}
             >
               {saving ? "Saving..." : "Save Record"}
             </Button>
             <Button 
               variant="outline" 
               className="flex-1 h-10"
               onClick={() => onOpenChange(false)} 
               disabled={saving}
             >
               Cancel
             </Button>
           </div>
         </div>
       </DialogContent>
    </Dialog>
  );
}