import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ORG_ID } from "@/lib/roleConfig";

const STATUS_OPTIONS = [
  { id: "employed_full_time", label: "Employed (Full-Time)" },
  { id: "employed_part_time", label: "Employed (Part-Time)" },
  { id: "self_employed", label: "Self-Employed" },
  { id: "education_full_time", label: "Education (Full-Time)" },
  { id: "education_part_time", label: "Education (Part-Time)" },
  { id: "apprenticeship", label: "Apprenticeship" },
  { id: "traineeship", label: "Traineeship" },
  { id: "volunteering", label: "Volunteering" },
  { id: "caring_responsibilities", label: "Caring Responsibilities" },
  { id: "neet", label: "NEET" },
  { id: "unknown", label: "Unknown" },
];

const BARRIERS = [
  { id: "mental_health", label: "Mental Health" },
  { id: "no_qualifications", label: "No Qualifications" },
  { id: "caring_responsibilities", label: "Caring Responsibilities" },
  { id: "housing_instability", label: "Housing Instability" },
  { id: "substance_use", label: "Substance Use" },
  { id: "offending_history", label: "Offending History" },
  { id: "lack_of_confidence", label: "Lack of Confidence" },
  { id: "transport", label: "Transport" },
  { id: "other", label: "Other" },
];

export default function EETUpdateModal({ resident, residents, currentRecords, onClose, onSave }) {
  const [residentId, setResidentId] = useState(resident?.id || "");
  const [status, setStatus] = useState("");
  const [employer, setEmployer] = useState("");
  const [role, setRole] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [hoursPerWeek, setHoursPerWeek] = useState("");
  const [salary, setSalary] = useState("");
  const [supportNeeded, setSupportNeeded] = useState("");
  const [notes, setNotes] = useState("");

  // NEET-specific
  const [barriers, setBarriers] = useState([]);
  const [barrierNotes, setBarrierNotes] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [targetStatus, setTargetStatus] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [laNotified, setLaNotified] = useState(false);

  const selectedResident = residents.find(r => r.id === residentId);

  const handleSave = () => {
    if (!residentId || !status) {
      alert("Please select resident and status");
      return;
    }

    const data = {
      org_id: ORG_ID,
      resident_id: residentId,
      resident_name: selectedResident?.display_name,
      home_id: selectedResident?.home_id,
      recorded_date: new Date().toISOString().split("T")[0],
      recorded_by_name: "Current User",
      status,
      employer_or_institution: employer,
      course_or_role: role,
      start_date: startDate,
      hours_per_week: hoursPerWeek ? parseInt(hoursPerWeek) : null,
      salary_or_bursary: salary,
      support_needed: supportNeeded,
      support_notes: notes,
      la_notified: laNotified,
      is_current: true,
    };

    if (status === "neet") {
      data.barriers = barriers;
      data.barrier_notes = barrierNotes;
      data.action_plan = actionPlan;
      data.target_status = targetStatus;
      data.target_date = targetDate;
      data.review_date = reviewDate;
    }

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Update EET Status</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium">Resident *</label>
            <Select value={residentId} onValueChange={setResidentId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select resident" />
              </SelectTrigger>
              <SelectContent>
                {residents.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name || r.initials}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium">Status *</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!status?.includes("neet") && !status?.includes("unknown") && !status?.includes("caring") && (
            <>
              <div>
                <label className="text-xs font-medium">Employer / Institution</label>
                <Input
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="Where are they employed or studying"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Role / Course Name</label>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Job title or course name"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium">Hours Per Week</label>
                  <Input type="number" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Salary / Bursary</label>
                <Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. £20,000 per annum" className="mt-1" />
              </div>
            </>
          )}

          {/* NEET-specific fields */}
          {status === "neet" && (
            <>
              <h4 className="font-semibold text-sm mt-6">NEET Support Plan</h4>

              <div>
                <label className="text-xs font-medium mb-2 block">Barriers to EET</label>
                <div className="grid grid-cols-2 gap-3">
                  {BARRIERS.map(barrier => (
                    <label key={barrier.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barriers.includes(barrier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBarriers([...barriers, barrier.id]);
                          } else {
                            setBarriers(barriers.filter(b => b !== barrier.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-input"
                      />
                      <span className="text-xs">{barrier.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Barrier Notes</label>
                <textarea
                  value={barrierNotes}
                  onChange={(e) => setBarrierNotes(e.target.value)}
                  className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Action Plan</label>
                <textarea
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  placeholder="What is the plan to move towards EET?"
                  className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Target Status</label>
                  <Input
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    placeholder="e.g. Part-time employment"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Target Date</label>
                  <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Review Date</label>
                <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="mt-1" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={laNotified}
                  onChange={(e) => setLaNotified(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-xs font-medium">LA notified of NEET status</span>
              </label>
            </>
          )}

          <div>
            <label className="text-xs font-medium">Support Needed</label>
            <Input value={supportNeeded} onChange={(e) => setSupportNeeded(e.target.value)} placeholder="Any support needed?" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-12 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}