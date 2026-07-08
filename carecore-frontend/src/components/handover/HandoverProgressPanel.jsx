import { CheckCircle2, AlertCircle, ChevronRight, Plus, FileText, Pill, ClipboardList, Users, Home, Paperclip } from "lucide-react";

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function CircularProgress({ pct }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black text-slate-800">{pct}%</span>
      </div>
    </div>
  );
}

export default function HandoverProgressPanel({ 
  handover, updates, ypSummaries, tasks, documents, 
  onAddIncident, onAddMedNote, onAddTask, onUploadDoc, onViewRota, onViewActions 
}) {
  const sections = [
    { key: "daily_overview", label: "Daily Overview", done: !!handover?.daily_overview || updates?.some(u => u.update_type === "daily_overview") },
    { key: "yp_summary", label: "Young People", done: ypSummaries?.length > 0 },
    { key: "tasks", label: "Tasks & Reminders", done: tasks?.length > 0 },
    { key: "incidents", label: "Incidents & Concerns", done: handover?.no_incidents_confirmed || updates?.some(u => u.update_type === "incident" || u.update_type === "concern") },
    { key: "medication", label: "Health & Medication", done: handover?.no_medication_issues_confirmed || updates?.some(u => u.update_type === "medication") },
    { key: "environment", label: "Environment", done: handover?.no_environment_concerns_confirmed || updates?.some(u => u.update_type === "environment") },
    { key: "documents", label: "Documents", done: documents?.length > 0 },
  ];

  const completed = sections.filter(s => s.done).length;
  const pct = Math.round((completed / sections.length) * 100);

  const statusText = pct >= 100 ? "Ready to complete handover" : pct >= 60 ? "Almost ready to hand over" : "Handover in progress";

  // Required actions from data
  const requiredActions = [];
  const concernUpdates = updates?.filter(u => u.update_type === "concern" || u.severity === "high" || u.severity === "critical") || [];
  concernUpdates.slice(0, 3).forEach(u => {
    requiredActions.push({ 
      icon: AlertCircle, 
      title: u.title || "Concern noted", 
      note: u.summary || "", 
      severity: u.severity || "medium",
      type: "concern"
    });
  });
  if (!handover?.no_medication_issues_confirmed && !updates?.some(u => u.update_type === "medication")) {
    requiredActions.push({ 
      icon: Pill, 
      title: "Medication section", 
      note: "Complete or confirm no issues", 
      severity: "medium",
      type: "medication"
    });
  }

  const severityStyle = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  const handleViewAllActions = () => {
    if (requiredActions.length === 0) return;
    const firstAction = requiredActions[0];
    if (firstAction.type === "medication") {
      onAddMedNote?.();
    } else {
      onAddIncident?.();
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Handover Progress</h3>
        <CircularProgress pct={pct} />
        <p className="text-center text-sm font-bold text-slate-700 mt-3">{statusText}</p>
        <p className="text-center text-xs text-slate-400 mt-1">{completed} of {sections.length} sections completed</p>
        <div className="mt-4 space-y-1.5">
          {sections.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              {s.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 shrink-0" />
              }
              <span className={`text-xs ${s.done ? "text-slate-600" : "text-slate-400"}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Required Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">Required Actions</h3>
          {requiredActions.length > 0 && (
            <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{requiredActions.length}</span>
          )}
        </div>
        {requiredActions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">No required actions</p>
        ) : (
          <div className="space-y-2">
            {requiredActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <a.icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 leading-tight">{a.title}</p>
                  <p className="text-[10px] text-slate-400">{a.note}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 ${severityStyle[a.severity] || severityStyle.medium}`}>{a.severity}</span>
              </div>
            ))}
          </div>
        )}
        {requiredActions.length > 0 && (
          <button 
            onClick={onViewActions}
            className="w-full mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1 cursor-pointer"
          >
            View all actions <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Shift Team */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Shift Team</h3>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Current Shift</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                {initials(handover?.outgoing_staff_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 leading-tight">{handover?.outgoing_staff_name || "Not assigned"}</p>
                <p className="text-[10px] text-slate-400">
                  {handover?.outgoing_shift_start} - {handover?.outgoing_shift_end}
                </p>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">Ending</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Next Shift</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">
                {initials(handover?.incoming_staff_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 leading-tight">{handover?.incoming_staff_name || "Not assigned"}</p>
                <p className="text-[10px] text-slate-400">
                  {handover?.incoming_shift_start} - {handover?.incoming_shift_end}
                </p>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">Starting</span>
            </div>
          </div>
        </div>
        <button 
          onClick={onViewRota}
          className="w-full mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1 cursor-pointer"
        >
          View full rota <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          {[
            { label: "Add Incident", icon: AlertCircle, color: "text-red-500", onClick: onAddIncident },
            { label: "Add Medication Note", icon: Pill, color: "text-blue-500", onClick: onAddMedNote },
            { label: "Add Task / Reminder", icon: ClipboardList, color: "text-teal-500", onClick: onAddTask },
            { label: "Upload Document", icon: Paperclip, color: "text-slate-500", onClick: onUploadDoc },
          ].map(a => (
            <button
              key={a.label}
              onClick={a.onClick}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <a.icon className={`w-4 h-4 ${a.color} shrink-0`} />
              <span className="text-xs font-semibold text-slate-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}