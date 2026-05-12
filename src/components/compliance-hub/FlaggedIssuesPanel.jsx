import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function buildFlags(data, homes, residents, periodStart, periodEnd) {
  const flags = [];
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000);
  const seventyTwoHours = 72 * 60 * 60 * 1000;

  const homeName = (id) => homes.find(h => h.id === id)?.name || "Unknown";

  // CRITICAL
  (data.safeguardingRecords || []).forEach(s => {
    if (!s.resolution_date && new Date(s.created_date) < thirtyDaysAgo) {
      const days = Math.round((now - new Date(s.created_date)) / 86400000);
      flags.push({
        id: `sg-${s.id}`,
        severity: "critical",
        text: `Open safeguarding record with no review date set. This record has been open for ${days} days. Ofsted expects evidence of active review for all open safeguarding records within the report period.`,
        tags: [homeName(s.home_id), s.id?.slice(0, 8) || "SF-???", s.created_date?.slice(0, 10), "Safeguarding"],
        home_id: s.home_id,
        category: "safeguarding",
        fixPath: "/risk",
      });
    }
  });

  (data.staffProfiles || []).forEach(s => {
    if (s.dbs_expiry && new Date(s.dbs_expiry) < now) {
      const assignedHomes = homes.filter(h => (s.home_ids || []).includes(h.id));
      const hasActiveResidents = assignedHomes.some(h => residents.some(r => r.home_id === h.id && r.status === "active"));
      if (hasActiveResidents) {
        flags.push({
          id: `dbs-${s.id}`,
          severity: "critical",
          text: `Staff DBS expired — ${s.full_name} is still allocated to homes with active residents. This is a critical safeguarding risk and must be resolved immediately before the report is submitted.`,
          tags: [assignedHomes.map(h => h.name).join(", "), s.employee_id || s.id?.slice(0, 8), `DBS expired ${s.dbs_expiry}`, "Staffing"],
          home_id: assignedHomes[0]?.id,
          category: "staffing",
          fixPath: "/staff",
        });
      }
    }
  });

  (data.mfhRecords || []).forEach(m => {
    if (!m.return_interview_completed && m.return_datetime) {
      const elapsed = now - new Date(m.return_datetime);
      if (elapsed > seventyTwoHours) {
        const resident = residents.find(r => r.id === m.resident_id);
        flags.push({
          id: `mfh-${m.id}`,
          severity: "attention",
          text: `Missing from home return interview not recorded for ${resident?.display_name || "YP"} following the episode on ${m.reported_missing_datetime?.slice(0, 10)}. Return interviews are expected within 72 hours of a young person returning.`,
          tags: [homeName(m.home_id), m.id?.slice(0, 8) || "MFH-???", m.reported_missing_datetime?.slice(0, 10), "YP"],
          home_id: m.home_id,
          category: "missing",
          fixPath: "/24hours",
        });
      }
    }
  });

  // ATTENTION
  const activeResidents = residents.filter(r => r.status === "active");
  const homesWithNoYPViews = homes.filter(h => {
    const homeResidents = activeResidents.filter(r => r.home_id === h.id);
    if (homeResidents.length === 0) return false;
    return !homeResidents.every(r =>
      (data.ypViews || []).some(y => y.resident_id === r.id)
    );
  });
  if (homesWithNoYPViews.length > 0) {
    flags.push({
      id: "ypviews-missing",
      severity: "attention",
      text: `No YP views survey completed at ${homesWithNoYPViews.map(h => h.name).join(" or ")} during this review period. Reg 32 requires documented evidence of young people's feedback on their experience of the service.`,
      tags: [homesWithNoYPViews.map(h => h.name).join(", "), "YPViewsRecord — none found", `${periodStart?.slice(0, 7)} – ${periodEnd?.slice(0, 7)}`, "YP"],
      home_id: null,
      category: "yp_views",
      fixPath: "/residents",
    });
  }

  const homesWithNoLA = homes.filter(h => !(data.laReviews || []).some(r => r.home_id === h.id && r.feedback_received));
  if (homesWithNoLA.length > 0) {
    flags.push({
      id: "la-feedback-missing",
      severity: "attention",
      text: `LA feedback not received from placing authorities for this review period. Feedback from each young person's accommodating authority is a required input for Reg 32.`,
      tags: [homesWithNoLA.map(h => h.name).join(", "), "Bolton Council", "LAReview — no response", "Compliance"],
      home_id: null,
      category: "la_feedback",
      fixPath: "/residents",
    });
  }

  const totalStaff = (data.staffProfiles || []).length;
  const trained = (data.staffProfiles || []).filter(s =>
    (data.trainingRecords || []).some(t => t.staff_id === s.id && new Date(t.expiry_date) > now)
  ).length;
  if (totalStaff > 0 && trained / totalStaff < 0.8) {
    const pct = Math.round(trained / totalStaff * 100);
    flags.push({
      id: "training-compliance",
      severity: "attention",
      text: `Training compliance stands at ${pct}% with ${totalStaff - trained} records expired. Ofsted expects a minimum of 80% compliance for mandatory training.`,
      tags: ["All homes", "Training", `${pct}% compliant`],
      home_id: null,
      category: "training",
      fixPath: "/staff",
    });
  }

  // CONFIRMED CLEAR
  const allVisited = activeResidents.every(r => (data.visitReports || []).some(v => v.resident_id === r.id));
  if (allVisited && activeResidents.length > 0) {
    flags.push({
      id: "visit-reports-clear",
      severity: "clear",
      text: `All ${activeResidents.length} visit reports completed on time across all homes this period.`,
      tags: ["All homes", "VisitReport"],
      home_id: null,
      category: "visits",
      fixPath: "/visit-reports",
    });
  }

  const allComplaintsOnTime = (data.complaints || []).every(c => {
    if (!c.resolution_date || !c.received_datetime) return true;
    return (new Date(c.resolution_date) - new Date(c.received_datetime)) / 86400000 <= 28;
  });
  if (allComplaintsOnTime && (data.complaints || []).length > 0) {
    flags.push({
      id: "complaints-clear",
      severity: "clear",
      text: `${(data.complaints || []).length} complaints received — all resolved within the 28-day statutory deadline.`,
      tags: ["All homes", "Complaint"],
      home_id: null,
      category: "complaints",
      fixPath: "/residents",
    });
  }

  const allSupervised = (data.staffProfiles || []).filter(s => s.role === "support_worker").every(s =>
    (data.supervisionRecords || []).some(sv => sv.supervisee_id === s.id && sv.status === "completed")
  );
  if (allSupervised) {
    flags.push({
      id: "supervision-clear",
      severity: "clear",
      text: `All support workers received monthly supervision throughout the period.`,
      tags: ["All homes", "AppraisalRecord"],
      home_id: null,
      category: "supervision",
      fixPath: "/staff",
    });
  }

  return flags;
}

const SEVERITY_CONFIG = {
  critical: { label: "⚑ CRITICAL — RESOLVE OR ADD A NOTE BEFORE GENERATING REPORT", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-500", headerBg: "bg-red-50" },
  attention: { label: "◐ ATTENTION — MUST BE REFERENCED IN THE REPORT NARRATIVE", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500", headerBg: "bg-amber-50" },
  clear: { label: "✓ CONFIRMED CLEAR — WILL BE USED AS STRENGTHS EVIDENCE", color: "text-green-600", bg: "bg-green-50 border-green-200", dot: "bg-green-500", headerBg: "bg-green-50" },
};

function FlagRow({ flag, note, resolved, onToggleResolve, onNoteChange, navigate }) {
  const [showNote, setShowNote] = useState(false);
  const cfg = SEVERITY_CONFIG[flag.severity];

  return (
    <div className={`border rounded-lg p-3 mb-2 ${resolved ? "opacity-60" : ""} bg-card border-border`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={resolved}
          onChange={() => onToggleResolve(flag.id)}
          className="mt-0.5 shrink-0 w-4 h-4 accent-green-600"
        />
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-foreground leading-snug">{flag.text}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {flag.tags.map((t, i) => (
              <span key={i} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{t}</span>
            ))}
          </div>
          {showNote && (
            <textarea
              className="mt-2 w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              placeholder="Add manager note..."
              value={note || ""}
              onChange={e => onNoteChange(flag.id, e.target.value)}
            />
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => setShowNote(v => !v)}
            className="text-[11px] text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/5"
          >
            + Note
          </button>
          {flag.fixPath && (
            <button
              onClick={() => navigate(flag.fixPath)}
              className="text-[11px] text-muted-foreground border border-border rounded px-2 py-0.5 hover:bg-muted"
            >
              Fix ↗
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlaggedIssuesPanel({ data, homes, residents, periodStart, periodEnd, filterHomeId, managerNotes, setManagerNotes }) {
  const navigate = useNavigate();
  const [homeFilter, setHomeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const allFlags = useMemo(
    () => buildFlags(data, homes, residents, periodStart, periodEnd),
    [data, homes, residents, periodStart, periodEnd]
  );

  const activeHomeId = filterHomeId || (homeFilter !== "all" ? homeFilter : null);

  const filteredFlags = allFlags.filter(f => {
    if (activeHomeId && f.home_id && f.home_id !== activeHomeId) return false;
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    const noteObj = managerNotes.find(n => n.issue_id === f.id);
    const resolved = noteObj?.resolved || false;
    if (!showResolved && resolved) return false;
    if (showResolved && !resolved) return false;
    return true;
  });

  const critical = filteredFlags.filter(f => f.severity === "critical");
  const attention = filteredFlags.filter(f => f.severity === "attention");
  const clear = filteredFlags.filter(f => f.severity === "clear");

  const openCount = allFlags.filter(f => {
    const n = managerNotes.find(n => n.issue_id === f.id);
    return !n?.resolved;
  }).length;

  const handleToggleResolve = (id) => {
    setManagerNotes(prev => {
      const existing = prev.find(n => n.issue_id === id);
      if (existing) return prev.map(n => n.issue_id === id ? { ...n, resolved: !n.resolved } : n);
      return [...prev, { issue_id: id, note: "", resolved: true, category: "" }];
    });
  };

  const handleNoteChange = (id, note) => {
    setManagerNotes(prev => {
      const existing = prev.find(n => n.issue_id === id);
      if (existing) return prev.map(n => n.issue_id === id ? { ...n, note } : n);
      return [...prev, { issue_id: id, note, resolved: false, category: "" }];
    });
  };

  const categories = [...new Set(allFlags.map(f => f.category))];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold">⚑ Flagged issues — all homes</span>
        {openCount > 0 && <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">{openCount} open</span>}
        <div className="ml-auto flex gap-2">
          <select
            value={homeFilter}
            onChange={e => setHomeFilter(e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none"
          >
            <option value="all">All homes</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none"
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => setShowResolved(v => !v)}
            className={`text-xs px-3 py-1 rounded-md border font-medium transition-colors ${showResolved ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Critical */}
      {critical.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide">⚑ Critical — resolve or add a note before generating report</p>
            <span className="text-xs text-red-600 font-bold">{critical.length} items</span>
          </div>
          {critical.map(f => (
            <FlagRow
              key={f.id} flag={f}
              note={managerNotes.find(n => n.issue_id === f.id)?.note}
              resolved={managerNotes.find(n => n.issue_id === f.id)?.resolved || false}
              onToggleResolve={handleToggleResolve}
              onNoteChange={handleNoteChange}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Attention */}
      {attention.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">◐ Attention — must be referenced in the report narrative</p>
            <span className="text-xs text-amber-600 font-bold">{attention.length} items</span>
          </div>
          {attention.map(f => (
            <FlagRow
              key={f.id} flag={f}
              note={managerNotes.find(n => n.issue_id === f.id)?.note}
              resolved={managerNotes.find(n => n.issue_id === f.id)?.resolved || false}
              onToggleResolve={handleToggleResolve}
              onNoteChange={handleNoteChange}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* Clear */}
      {clear.length > 0 && (
        <div>
          <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-2">✓ Confirmed clear — will be used as strengths evidence</p>
          {clear.map(f => (
            <FlagRow
              key={f.id} flag={f}
              note={managerNotes.find(n => n.issue_id === f.id)?.note}
              resolved={managerNotes.find(n => n.issue_id === f.id)?.resolved || false}
              onToggleResolve={handleToggleResolve}
              onNoteChange={handleNoteChange}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {filteredFlags.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">No flags found for current filters.</div>
      )}
    </div>
  );
}