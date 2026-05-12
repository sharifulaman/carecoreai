import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Clock, Users, Moon } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const SHIFTS = ["morning", "afternoon", "night"];
const SHIFT_COLOR = {
  morning: "bg-amber-500/10 text-amber-600",
  afternoon: "bg-blue-500/10 text-blue-600",
  night: "bg-purple-500/10 text-purple-600",
};

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ShiftsHandoversTab({ homeId, homeName, user }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("shifts");

  // Handover form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    shift: "morning",
    content: "",
    handover_to: "",
  });

  // Fetch shift templates for this home
  const { data: shiftTemplates = [] } = useQuery({
    queryKey: ["shift-templates", homeId],
    queryFn: () => base44.entities.ShiftTemplate.filter({ org_id: ORG_ID, home_id: homeId, active: true }),
  });

  // Fetch handover logs
  const { data: logs = [] } = useQuery({
    queryKey: ["handovers", homeId],
    queryFn: () => base44.entities.HomeLog.filter({ org_id: ORG_ID, home_id: homeId, category: "general" }, "-date", 50),
  });

  const handovers = logs.filter(l => l.shift && l.shift !== "n/a");

  const create = useMutation({
    mutationFn: (data) => base44.entities.HomeLog.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers", homeId] });
      setShowForm(false);
      setForm({ date: new Date().toISOString().split("T")[0], shift: "morning", content: "", handover_to: "" });
      toast.success("Handover recorded");
    },
  });

  const handleSubmit = () => {
    if (!form.content.trim()) { toast.error("Handover notes required"); return; }
    create.mutate({
      org_id: ORG_ID,
      home_id: homeId,
      home_name: homeName,
      author_id: user?.email,
      author_name: user?.full_name,
      date: form.date,
      shift: form.shift,
      category: "general",
      content: `[HANDOVER to ${form.handover_to || "next shift"}]\n\n${form.content}`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("shifts")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "shifts" ? "bg-teal-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}
        >
          Shifts
        </button>
        <button
          onClick={() => setActiveTab("handovers")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "handovers" ? "bg-teal-600 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}
        >
          Handovers
        </button>
      </div>

      {/* SHIFTS TAB */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-center px-6 py-3 text-xs font-semibold text-foreground w-64">Name</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-foreground">Time</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-foreground">Sleeping Time</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-foreground w-48">No. of Staff Required</th>
                </tr>
              </thead>
              <tbody>
                {shiftTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground text-sm">
                      No shifts configured. Set them up in the 24 Hours Housing module.
                    </td>
                  </tr>
                ) : shiftTemplates.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-border/50 last:border-0 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-6 py-4 text-center font-semibold text-sm">{s.name}</td>
                    <td className="px-6 py-4 text-center text-muted-foreground text-sm">
                      {s.time_start && s.time_end
                        ? `${formatTime(s.time_start)} - ${formatTime(s.time_end)}`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-center text-muted-foreground text-sm">
                      {s.sleeping_time || "—"}
                    </td>
                    <td className="px-6 py-4 text-center text-muted-foreground text-sm">
                      {s.staff_required ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Shift templates are managed from the <strong>24 Hours Housing</strong> module.
          </p>
        </div>
      )}

      {/* HANDOVERS TAB */}
      {activeTab === "handovers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-muted-foreground">Shift Handover Notes</h3>
            <Button className="gap-2 rounded-xl text-sm bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Record Handover
            </Button>
          </div>

          {showForm && (
            <div className="bg-card rounded-xl border border-border p-5 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Shift</p>
                  <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHIFTS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Handover To</p>
                  <Input placeholder="Staff name..." value={form.handover_to} onChange={e => setForm(f => ({ ...f, handover_to: e.target.value }))} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Handover Notes *</p>
                <Textarea rows={5} placeholder="Summarise the shift, any incidents, actions required, residents' wellbeing..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit} disabled={create.isPending}>Submit Handover</Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {handovers.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
                No handovers recorded yet.
              </div>
            ) : handovers.map(h => (
              <div key={h.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${SHIFT_COLOR[h.shift]}`}>{h.shift} shift</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{h.date}</p>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{h.content}</p>
                <p className="text-xs text-muted-foreground mt-3">— {h.author_name || "Unknown"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}