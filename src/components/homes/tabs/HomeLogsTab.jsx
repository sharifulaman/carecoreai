import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronRight, X, Paperclip, Flag } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const LOG_TYPES = ["General", "Visit", "Feedback", "Complaint", "Mileage"];
const PEOPLE_OPTIONS = ["Staff", "YP", "YP Contacts", "Other"];
const TAG_OPTIONS = ["Check/Chore", "Safeguarding", "Health", "Behaviour", "Family", "Finance", "Other"];

const TYPE_COLOR = {
  General: "bg-blue-500/10 text-blue-600",
  Visit: "bg-green-500/10 text-green-600",
  Feedback: "bg-purple-500/10 text-purple-600",
  Complaint: "bg-red-500/10 text-red-600",
  Mileage: "bg-amber-500/10 text-amber-600",
};

const TAG_COLOR = {
  "Check/Chore": "bg-teal-500/10 text-teal-700 border border-teal-200",
  Safeguarding: "bg-red-500/10 text-red-600 border border-red-200",
  Health: "bg-green-500/10 text-green-600 border border-green-200",
  Behaviour: "bg-amber-500/10 text-amber-600 border border-amber-200",
  Family: "bg-purple-500/10 text-purple-600 border border-purple-200",
  Finance: "bg-blue-500/10 text-blue-600 border border-blue-200",
  Other: "bg-muted text-muted-foreground border border-border",
};

const EMPTY_FORM = {
  log_type: "General",
  people_type: "Staff",
  people_name: "",
  note: "",
  date: "",
  tags: [],
  flagged: false,
  flag_reason: "",
  category: "general",
  shift: "n/a",
  content: "",
};

export default function HomeLogsTab({ homeId, homeName, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterType, setFilterType] = useState("All");
  const [filterTag, setFilterTag] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["home-logs", homeId],
    queryFn: () => base44.entities.HomeLog.filter({ org_id: ORG_ID, home_id: homeId }, "-date", 200),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.HomeLog.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["home-logs", homeId] });
      setShowForm(false);
      setForm({ ...EMPTY_FORM });
      toast.success("Log entry added");
    },
  });

  const handleSubmit = () => {
    if (!form.note.trim()) { toast.error("Please enter a note"); return; }
    if (!form.date) { toast.error("Please select a date"); return; }
    // Encode extra metadata into flag_reason as JSON so it persists in the HomeLog entity
    const meta = JSON.stringify({
      flag_reason: form.flag_reason,
      log_type: form.log_type,
      people_type: form.people_type,
      people_name: form.people_name,
      tags: form.tags,
    });
    create.mutate({
      org_id: ORG_ID,
      home_id: homeId,
      home_name: homeName,
      author_id: user?.email,
      author_name: user?.full_name,
      date: form.date,
      shift: form.shift,
      category: form.log_type.toLowerCase(),
      content: form.note,
      flagged: form.flagged,
      flag_reason: meta,
    });
  };

  const toggleTag = (tag) => setForm(f => ({
    ...f,
    tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
  }));

  // Filter logs
  const filtered = logs.filter(log => {
    let meta = {};
    try { meta = log.flag_reason ? JSON.parse(log.flag_reason) : {}; } catch { meta = {}; }
    if (filterType !== "All" && log.category !== filterType.toLowerCase()) return false;
    if (filterTag !== "All" && !(meta.tags || []).includes(filterTag)) return false;
    if (dateFrom && log.date < dateFrom) return false;
    if (dateTo && log.date > dateTo) return false;
    return true;
  });

  const formatCreated = (log) => {
    if (!log.created_date) return null;
    const d = new Date(log.created_date);
    return `Created at ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}, at ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="space-y-4 relative">
      {/* Header & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-bold text-lg">Home Logs</h3>
        <div className="flex-1" />
        <Button className="gap-2 rounded-xl text-sm bg-teal-600 hover:bg-teal-700 text-white" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> ADD HOME LOG
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">Type:</span>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {LOG_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">Tags:</span>
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {TAG_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">Date &amp; Time:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs px-2 border border-border rounded-md bg-card text-foreground" />
          <span className="text-muted-foreground">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs px-2 border border-border rounded-md bg-card text-foreground" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-28">Date ↕</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-44">Created/Updated</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground">Log</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-32">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">No log entries found.</td>
              </tr>
            ) : filtered.map((log, idx) => {
              const logDate = log.date ? new Date(log.date + "T00:00") : null;
              const createdStr = formatCreated(log);
              // Decode metadata stored in flag_reason
              let meta = {};
              try { meta = log.flag_reason ? JSON.parse(log.flag_reason) : {}; } catch { meta = {}; }
              const displayType = meta.log_type || (log.category ? log.category.charAt(0).toUpperCase() + log.category.slice(1) : "General");
              const tags = meta.tags || [];
              const peopleName = meta.people_name || "";
              const freq = log.frequency || null;

              return (
                <tr key={log.id} className={`border-b border-border/50 last:border-0 align-top ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  {/* Date */}
                  <td className="px-4 py-4 text-sm font-medium whitespace-nowrap">
                    {logDate ? (
                      <>
                        <span className="font-semibold">{logDate.getDate()} {logDate.toLocaleDateString("en-GB", { month: "short" })}</span>
                        <br />
                        <span className="text-muted-foreground text-xs">{logDate.getFullYear()}</span>
                      </>
                    ) : "—"}
                  </td>

                  {/* Created/Updated */}
                  <td className="px-4 py-4 text-xs text-muted-foreground leading-relaxed">
                    {createdStr ? (
                      <>
                        <span className="italic">{createdStr.replace("Created at ", "Created at\n")}</span>
                        <br />
                        by <strong className="text-foreground">{log.author_name || "Unknown"}</strong>
                      </>
                    ) : (
                      <span className="italic">by <strong className="text-foreground">{log.author_name || "Unknown"}</strong></span>
                    )}
                  </td>

                  {/* Log details */}
                  <td className="px-4 py-4">
                    <p className="font-semibold text-sm mb-1.5">{log.content?.slice(0, 80) || "—"}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map(tag => (
                        <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLOR[tag] || TAG_COLOR.Other}`}>{tag}</span>
                      ))}
                      {log.flagged && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center gap-1">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {freq && <span>Frequency: <strong className="text-foreground">{freq}</strong></span>}
                      {log.shift && log.shift !== "n/a" && <span>Shift: <strong className="text-foreground capitalize">{log.shift}</strong></span>}
                      {peopleName && (
                        <span className="flex items-center gap-1">
                          Completed by:
                          <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[9px] font-bold ml-1">
                            {peopleName.charAt(0)}
                          </span>
                          <strong className="text-foreground">{peopleName}</strong>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-4 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[displayType] || TYPE_COLOR.General}`}>
                      {displayType === "General" ? "Check, Chore & Audit" : displayType}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <button className="text-teal-600 hover:text-teal-700 text-xs font-medium flex items-center gap-0.5">
                      View Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Log Slide-in Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-card w-full max-w-xl h-full overflow-y-auto shadow-2xl border-l border-border flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <h2 className="font-bold text-base">Add New Home Log</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
              {/* Type tabs */}
              <div>
                <p className="text-sm font-medium mb-2">Type <span className="text-red-500">*</span></p>
                <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
                  {LOG_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, log_type: t }))}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${form.log_type === t ? "bg-teal-600 text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* People Involved */}
              <div>
                <p className="text-sm font-medium mb-2">People Involved</p>
                <div className="flex flex-wrap gap-4 mb-3">
                  {PEOPLE_OPTIONS.map(p => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <div
                        onClick={() => setForm(f => ({ ...f, people_type: p }))}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${form.people_type === p ? "border-teal-600" : "border-muted-foreground"}`}
                      >
                        {form.people_type === p && <div className="w-2 h-2 rounded-full bg-teal-600" />}
                      </div>
                      {p}
                    </label>
                  ))}
                </div>
                <Input
                  placeholder={`Select ${form.people_type}...`}
                  value={form.people_name}
                  onChange={e => setForm(f => ({ ...f, people_name: e.target.value }))}
                  className="text-sm"
                />
              </div>

              {/* Note */}
              <div>
                <p className="text-sm font-medium mb-2">Note <span className="text-red-500">*</span></p>
                <Textarea
                  rows={5}
                  placeholder="Enter note..."
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="text-sm resize-none"
                />
              </div>

              {/* Date */}
              <div>
                <p className="text-sm font-medium mb-2">Date <span className="text-red-500">*</span></p>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm w-48" />
              </div>

              {/* Homes (pre-filled, read-only) */}
              <div>
                <p className="text-sm font-medium mb-2">Homes <span className="text-red-500">*</span></p>
                <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted/20 text-sm">
                  <span className="text-muted-foreground text-xs">Homes</span>
                  <span className="flex-1 font-medium">{homeName}</span>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-sm font-medium mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {TAG_OPTIONS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        form.tags.includes(tag)
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-card text-muted-foreground border-border hover:border-teal-400"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flag */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="flag-log"
                  checked={form.flagged}
                  onChange={e => setForm(f => ({ ...f, flagged: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="flag-log" className="text-sm text-muted-foreground cursor-pointer">Flag this entry</label>
              </div>
              {form.flagged && (
                <Input placeholder="Reason for flagging..." value={form.flag_reason} onChange={e => setForm(f => ({ ...f, flag_reason: e.target.value }))} className="text-sm" />
              )}

              {/* Attachments */}
              <div>
                <p className="text-sm font-medium mb-2">Attachments</p>
                <div className="border-2 border-dashed border-border rounded-xl px-6 py-8 flex items-start gap-3 text-muted-foreground">
                  <Paperclip className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Select or drop a file</p>
                    <p className="text-xs mt-1">Allowed: .pdf, .doc, .docx, .odt, .ppt, .pptx, .xls, .xlsx, jpeg, .png, .webp, .txt, .csv, .zip, .7z (Max size: 50MB)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 flex justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSubmit} disabled={create.isPending}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}