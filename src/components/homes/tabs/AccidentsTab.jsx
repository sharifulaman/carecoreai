import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Download, X, ChevronRight, CheckCircle2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

const INCIDENT_TYPES = ["Accident", "Illness", "Near Miss", "Injury"];
const TYPE_MAP = { Accident: "accident", Illness: "illness", "Near Miss": "near_miss", Injury: "injury" };
const TYPE_LABEL = { accident: "Accident", illness: "Illness", near_miss: "Near Miss", injury: "Injury" };
const TYPE_COLOR = {
  accident: "bg-red-500/10 text-red-600",
  illness: "bg-purple-500/10 text-purple-600",
  near_miss: "bg-amber-500/10 text-amber-600",
  injury: "bg-orange-500/10 text-orange-600",
};
const STATUS_COLOR = { open: "bg-red-500/10 text-red-600", reviewed: "bg-amber-500/10 text-amber-600", closed: "bg-green-500/10 text-green-600" };

const EMPTY = {
  // Step 1
  type: "",
  title: "",
  start_date: "",
  end_date: "",
  confidential: false,
  step1_complete: false,
  // Step 2
  staff_involved: "",
  yp_involved: "",
  witness_name: "",
  // Step 3
  location: "",
  description: "",
  injuries: "",
  first_aid_given: false,
  first_aid_details: "",
  hospital_attendance: false,
  follow_up_required: false,
  follow_up_notes: "",
  // Step 4
  sign_off_name: "",
  alert_names: "",
  // meta
  status: "open",
};

const STEPS = [
  { num: 1, label: "Basic Information" },
  { num: 2, label: "People Involved" },
  { num: 3, label: "Accident Details" },
  { num: 4, label: "Signoffs & Alerts" },
];

export default function AccidentsTab({ homeId, homeName, user, residents = [], staff = [] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Filters
  const [dateFrom, setDateFrom] = useState("2025-04-01");
  const [dateTo, setDateTo] = useState("2026-05-31");
  const [showReg27, setShowReg27] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ["accidents", "home", homeId],
    queryFn: () => base44.entities.AccidentReport.filter({ org_id: ORG_ID, home_id: homeId }, "-date", 100),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.AccidentReport.create(data),
    onSuccess: (_, payload) => {
      qc.invalidateQueries({ queryKey: ["accidents"] });
      setShowForm(false);
      setStep(1);
      setForm({ ...EMPTY });
      toast.success("Accident/Illness report submitted");
      // Notify TL or admin about the new incident
      base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }).then(allStaff => {
        const home = { team_leader_id: staff.find(s => s.home_ids?.includes(homeId) && s.role === "team_leader")?.id };
        const tl = home?.team_leader_id ? allStaff.find(s => s.id === home.team_leader_id) : null;
        const admin = allStaff.find(s => s.role === "admin" && s.user_id);
        const recipient = (tl?.user_id ? tl : null) || admin;
        if (recipient?.user_id) {
          createNotification({
            recipient_user_id: recipient.user_id,
            recipient_staff_id: recipient.id,
            org_id: recipient.org_id || ORG_ID,
            title: "New Accident/Incident Report",
            body: `${payload.type?.replace("_", " ")} report "${payload.title}" submitted for ${homeName} by ${payload.reported_by_name} on ${payload.date}. Please review.`,
            type: "alert",
            link: `/homes/${homeId}`,
            priority: payload.hospital_attendance ? "high" : "normal",
          });
        }
      }).catch(() => {});
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AccidentReport.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accidents"] }); toast.success("Updated"); },
  });

  const homeResidents = residents.filter(r => r.home_id === homeId);

  const handleSaveAndContinue = () => {
    if (step === 1) {
      if (!form.type) { toast.error("Please select a type"); return; }
      if (!form.title.trim()) { toast.error("Please enter a title"); return; }
      if (!form.start_date) { toast.error("Please enter a start date"); return; }
    }
    if (step < 4) { setStep(s => s + 1); return; }
    // Final submit
    const payload = {
      org_id: ORG_ID,
      home_id: homeId,
      home_name: homeName,
      reported_by_id: user?.email,
      reported_by_name: user?.full_name,
      type: TYPE_MAP[form.type] || "accident",
      date: form.start_date,
      time: "",
      location: form.location,
      description: form.description,
      injuries: form.injuries,
      first_aid_given: form.first_aid_given,
      first_aid_details: form.first_aid_details,
      hospital_attendance: form.hospital_attendance,
      witness_name: form.witness_name,
      follow_up_required: form.follow_up_required,
      follow_up_notes: form.follow_up_notes,
      status: "open",
      resident_id: (form.yp_involved && form.yp_involved !== "N/A") ? form.yp_involved : null,
      resident_name: form.yp_involved_name || (form.yp_involved !== "N/A" ? form.yp_involved : ""),
      // Extra metadata stored in follow_up_notes as json suffix
      title: form.title,
      staff_involved: form.staff_involved,
      end_date: form.end_date,
      confidential: form.confidential,
      sign_off_name: form.sign_off_name,
      alert_names: form.alert_names,
    };
    create.mutate(payload);
  };

  const filtered = reports.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (!showArchive && r.status === "closed") return false;
    return true;
  });

  const openForm = () => { setForm({ ...EMPTY }); setStep(1); setShowForm(true); };

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date filter */}
        <div className="flex items-center gap-2 text-sm">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="h-8 text-xs px-2 border border-border rounded-md bg-card text-foreground" />
          <span className="text-muted-foreground">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="h-8 text-xs px-2 border border-border rounded-md bg-card text-foreground" />
        </div>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 h-8 hover:bg-muted transition-colors">
          Filter by YPs <span className="text-base">▲</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 h-8 hover:bg-muted transition-colors">
          Filter By Staff <span className="text-base">▲</span>
        </button>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 h-8 hover:bg-muted transition-colors">
          Filter By Reporters <span className="text-base">▲</span>
        </button>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-3 h-8 hover:bg-muted transition-colors">
          <Download className="w-3.5 h-3.5" /> DOWNLOAD
        </button>
        <Button className="gap-2 rounded-lg text-sm bg-teal-600 hover:bg-teal-700 text-white h-9" onClick={openForm}>
          <Plus className="w-4 h-4" /> Add Accident/Illness
        </Button>
      </div>

      {/* Checkboxes */}
      <div className="flex items-center gap-6 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showReg27} onChange={e => setShowReg27(e.target.checked)} className="rounded w-4 h-4" />
          Show Reg 27 Accidents
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showArchive} onChange={e => setShowArchive(e.target.checked)} className="rounded w-4 h-4" />
          Show Archive accident illness
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-36">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-28">Start Date ↕</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-28">End Date ↕</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-28">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-36">Staff Involved</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-36">YP Involved</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">Accident Details</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-28">Location</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground text-sm">No incidents recorded.</td>
              </tr>
            ) : filtered.map((r, idx) => (
              <tr key={r.id} className={`border-b border-border/50 last:border-0 align-top ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                <td className="px-4 py-3 text-sm font-medium">{r.title || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.date || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{r.end_date || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLOR[r.type] || "bg-muted text-muted-foreground"}`}>
                    {TYPE_LABEL[r.type] || r.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{r.staff_involved || "—"}</td>
                <td className="px-4 py-3 text-xs">{r.resident_name || "—"}</td>
                <td className="px-4 py-3 text-xs leading-relaxed max-w-xs">{r.description || "—"}</td>
                <td className="px-4 py-3 text-xs">{r.location || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {r.status !== "closed" && (
                      <button
                        onClick={() => update.mutate({ id: r.id, data: { status: r.status === "open" ? "reviewed" : "closed" } })}
                        className="text-teal-600 hover:text-teal-700 text-xs font-medium flex items-center gap-0.5 whitespace-nowrap"
                      >
                        {r.status === "open" ? "Mark Reviewed" : "Close"} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium w-fit capitalize ${STATUS_COLOR[r.status]}`}>{r.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Multi-step Form Slide-in */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-4xl h-full overflow-hidden shadow-2xl border-l border-border flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-border shrink-0">
              <h2 className="font-bold text-lg">Create Accident/Illness</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left step nav */}
              <div className="w-56 border-r border-border py-8 px-6 space-y-2 shrink-0 bg-muted/20">
                {STEPS.map(s => (
                  <button key={s.num} onClick={() => setStep(s.num)}
                    className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg transition-colors ${step === s.num ? "bg-card shadow text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === s.num ? "bg-amber-400 text-white" : step > s.num ? "bg-teal-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className="text-sm">{s.label}</span>
                    {step === s.num && <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />}
                  </button>
                ))}
              </div>

              {/* Right content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                {/* STEP 1: Basic Information */}
                {step === 1 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-base">Basic Info</h3>

                    <div>
                      <p className="text-sm font-medium mb-2">Accident/Illness Type <span className="text-red-500">*</span></p>
                      <Select value={form.type} onValueChange={v => f("type", v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                          {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Accident/Illness title <span className="text-red-500">*</span></p>
                      <Input placeholder="Enter Title" value={form.title} onChange={e => f("title", e.target.value)} className="text-sm" />
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Start &amp; End Time <span className="text-red-500">*</span></p>
                      <div className="flex items-center gap-2">
                        <input type="date" value={form.start_date} onChange={e => f("start_date", e.target.value)}
                          className="flex-1 h-9 text-sm px-3 border border-border rounded-md bg-card text-foreground placeholder:text-muted-foreground" placeholder="Start date" />
                        <span className="text-muted-foreground">→</span>
                        <input type="date" value={form.end_date} onChange={e => f("end_date", e.target.value)}
                          className="flex-1 h-9 text-sm px-3 border border-border rounded-md bg-card text-foreground" placeholder="End date" />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="checkbox" checked={form.confidential} onChange={e => f("confidential", e.target.checked)} className="rounded w-4 h-4" />
                      Mark as confidential
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-bold cursor-help" title="Confidential reports are only visible to managers">i</span>
                    </label>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Have you completed this section?</p>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <div onClick={() => f("step1_complete", true)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${form.step1_complete ? "border-teal-600" : "border-muted-foreground"}`}>
                          {form.step1_complete && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                        </div>
                        Yes, I have completed this section
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <div onClick={() => f("step1_complete", false)}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${!form.step1_complete ? "border-teal-600" : "border-muted-foreground"}`}>
                          {!form.step1_complete && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                        </div>
                        No, I'll come back to it later
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 2: People Involved */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-base">People Involved</h3>

                    <div>
                      <p className="text-sm font-medium mb-2">Staff Involved</p>
                      <Select value={form.staff_involved} onValueChange={v => f("staff_involved", v)}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/A">N/A</SelectItem>
                          {staff.map(s => <SelectItem key={s.id} value={s.full_name}>{s.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">YP (Young Person) Involved</p>
                      <Select value={form.yp_involved} onValueChange={v => {
                        const resident = homeResidents.find(r => r.id === v);
                        f("yp_involved", resident?.id || v);
                        f("yp_involved_name", resident?.display_name || v);
                      }}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Select YP..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/A">N/A</SelectItem>
                          {homeResidents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Witness Name</p>
                      <Input placeholder="Enter witness name (if any)" value={form.witness_name} onChange={e => f("witness_name", e.target.value)} className="text-sm" />
                    </div>
                  </div>
                )}

                {/* STEP 3: Accident Details */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-base">Accident Details</h3>

                    <div>
                      <p className="text-sm font-medium mb-2">Location</p>
                      <Input placeholder="Where did this occur?" value={form.location} onChange={e => f("location", e.target.value)} className="text-sm" />
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Description <span className="text-red-500">*</span></p>
                      <Textarea rows={5} placeholder="Describe what happened in detail..." value={form.description} onChange={e => f("description", e.target.value)} className="text-sm resize-none" />
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Injuries / Symptoms</p>
                      <Textarea rows={3} placeholder="Describe any injuries or symptoms..." value={form.injuries} onChange={e => f("injuries", e.target.value)} className="text-sm resize-none" />
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={form.first_aid_given} onChange={e => f("first_aid_given", e.target.checked)} className="rounded w-4 h-4" />
                        First Aid Given
                      </label>
                      {form.first_aid_given && (
                        <Input placeholder="First aid details..." value={form.first_aid_details} onChange={e => f("first_aid_details", e.target.value)} className="text-sm ml-6" />
                      )}
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={form.hospital_attendance} onChange={e => f("hospital_attendance", e.target.checked)} className="rounded w-4 h-4" />
                        Hospital Attendance
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={form.follow_up_required} onChange={e => f("follow_up_required", e.target.checked)} className="rounded w-4 h-4" />
                        Follow-up Required
                      </label>
                      {form.follow_up_required && (
                        <Textarea rows={2} placeholder="Follow-up notes..." value={form.follow_up_notes} onChange={e => f("follow_up_notes", e.target.value)} className="text-sm resize-none ml-6" />
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 4: Signoffs & Alerts */}
                {step === 4 && (
                  <div className="space-y-5">
                    <h3 className="font-semibold text-base">Signoffs &amp; Alerts</h3>

                    <div>
                      <p className="text-sm font-medium mb-2">Sign Off By</p>
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {(user?.full_name || "U").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user?.full_name || "You"}</p>
                          <p className="text-xs text-muted-foreground">{user?.email}</p>
                        </div>
                        <UserCheck className="w-4 h-4 text-teal-600 ml-auto" />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Additional Sign Off (optional)</p>
                      <Input placeholder="Enter name to sign off..." value={form.sign_off_name} onChange={e => f("sign_off_name", e.target.value)} className="text-sm" />
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Alert / Notify</p>
                      <p className="text-xs text-muted-foreground mb-2">Enter names or emails to notify about this incident</p>
                      <Textarea rows={3} placeholder="Enter names or emails to alert, one per line..." value={form.alert_names} onChange={e => f("alert_names", e.target.value)} className="text-sm resize-none" />
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 px-4 py-3 text-sm text-muted-foreground">
                      By submitting, you confirm this report is accurate to the best of your knowledge.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-8 py-4 flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                {step > 1 && (
                  <Button variant="outline" className="rounded-xl" onClick={() => setStep(s => s - 1)}>Back</Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={handleSaveAndContinue}
                  disabled={create.isPending}
                >
                  {step < 4 ? "Save & Continue" : (create.isPending ? "Submitting..." : "Submit Report")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}