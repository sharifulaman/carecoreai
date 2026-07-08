import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "enrolled_college", label: "Enrolled – College" },
  { value: "enrolled_school", label: "Enrolled – School" },
  { value: "training", label: "Training / Apprenticeship" },
  { value: "employed", label: "Employed" },
  { value: "neet", label: "NEET" },
  { value: "unknown", label: "Unknown" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STATUS_COLOURS = {
  enrolled_college: "bg-green-100 text-green-700",
  enrolled_school: "bg-blue-100 text-blue-700",
  training: "bg-purple-100 text-purple-700",
  employed: "bg-teal-100 text-teal-700",
  neet: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-600",
};

export { STATUS_OPTIONS, STATUS_COLOURS };

export default function EducationModal({ resident, onClose }) {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    education_status: resident.education_status || "unknown",
    education_provider: resident.education_provider || "",
    education_course: resident.education_course || "",
    education_enrolment_date: resident.education_enrolment_date || "",
    education_expected_end_date: resident.education_expected_end_date || "",
    education_days_attended: resident.education_days_attended || [],
    education_contact_name: resident.education_contact_name || "",
    education_contact_phone: resident.education_contact_phone || "",
    education_contact_email: resident.education_contact_email || "",
    education_notes: resident.education_notes || "",
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleDay = (day) => {
    set("education_days_attended",
      form.education_days_attended.includes(day)
        ? form.education_days_attended.filter(d => d !== day)
        : [...form.education_days_attended, day]
    );
  };

  const save = useMutation({
    mutationFn: () => secureGateway.update("Resident", resident.id, {
      ...form,
      education_updated_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-residents"] });
      qc.invalidateQueries({ queryKey: ["residents-dashboard"] });
      toast.success("Education record saved");
      onClose();
    },
  });

  const showProviderFields = ["enrolled_college", "enrolled_school", "training", "employed"].includes(form.education_status);
  const isEmployed = form.education_status === "employed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Education Record — {resident.display_name}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status */}
          <div>
            <label className="text-sm font-medium mb-2 block">Education / Employment Status <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("education_status", opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    form.education_status === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider fields — only for education/training */}
          {showProviderFields && (
            <>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{isEmployed ? "Employer / Organisation" : "Provider / Institution"}</label>
                  <Input
                    placeholder={isEmployed ? "e.g. Tesco, NHS, local café" : "e.g. Lambeth College"}
                    value={form.education_provider}
                    onChange={e => set("education_provider", e.target.value)}
                  />
                </div>
                {!isEmployed && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Course / Programme</label>
                    <Input
                      placeholder="e.g. Level 2 Health & Social Care"
                      value={form.education_course}
                      onChange={e => set("education_course", e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{isEmployed ? "Start Date" : "Enrolment Date"}</label>
                  <Input type="date" value={form.education_enrolment_date} onChange={e => set("education_enrolment_date", e.target.value)} />
                </div>
                {!isEmployed && (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Expected End Date</label>
                    <Input type="date" value={form.education_expected_end_date} onChange={e => set("education_expected_end_date", e.target.value)} />
                  </div>
                )}
              </div>

              {/* Days attended */}
              <div>
                <label className="text-sm font-medium mb-2 block">Days Attended</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        form.education_days_attended.includes(day)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div>
                <label className="text-sm font-medium mb-2 block">Provider Contact</label>
                <div className="grid grid-cols-1 gap-3">
                  <Input placeholder="Contact name" value={form.education_contact_name} onChange={e => set("education_contact_name", e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Phone" value={form.education_contact_phone} onChange={e => set("education_contact_phone", e.target.value)} />
                    <Input placeholder="Email" type="email" value={form.education_contact_email} onChange={e => set("education_contact_email", e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Textarea
              rows={3}
              placeholder="Any additional notes..."
              value={form.education_notes}
              onChange={e => set("education_notes", e.target.value)}
              className="resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-primary">
            {save.isPending ? "Saving..." : "Save Education Record"}
          </Button>
        </div>
      </div>
    </div>
  );
}