import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Flag, ExternalLink, Pencil, Check, X, Circle } from "lucide-react";
import YPCardExpanded from "./YPCardExpanded";

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const RISK_BORDER = { critical: "#E24B4A", high: "#EF9F27", medium: "#378ADD", low: "#1D9E75" };
const RISK_AVATAR_BG = { critical: "#FAECE7", high: "#FAEEDA", medium: "#E6F1FB", low: "#E1F5EE" };
const RISK_AVATAR_TEXT = { critical: "#993C1D", high: "#854F0B", medium: "#185FA5", low: "#0F6E56" };
const RISK_BADGE_BG = { critical: "#FCEBEB", high: "#FAEEDA", medium: "#E6F1FB", low: "#E1F5EE" };
const RISK_BADGE_TEXT = { critical: "#A32D2D", high: "#854F0B", medium: "#185FA5", low: "#0F6E56" };

const todayStr = new Date().toISOString().split("T")[0];

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function StatusBadge({ color, children }) {
  const styles = {
    red: { bg: "#FCEBEB", text: "#A32D2D" },
    amber: { bg: "#FAEEDA", text: "#854F0B" },
    green: { bg: "#EAF3DE", text: "#3B6D11" },
    purple: { bg: "#F0EFFE", text: "#534AB7" },
  };
  const s = styles[color] || styles.amber;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {children}
    </span>
  );
}

function generateBadges(resident, todayLogs, todayVisitReports, supportPlans, ilsPlans, transitions) {
  const badges = [];
  const todayLog = todayLogs.find(l => l.resident_id === resident.id);
  const todayVisit = todayVisitReports.find(v => v.resident_id === resident.id);
  const activeSP = supportPlans.find(p => p.resident_id === resident.id && p.status === "active");
  const activeILS = ilsPlans.find(p => p.resident_id === resident.id && p.status === "active");
  const activeTransition = transitions.find(t => t.resident_id === resident.id && t.status === "active");

  if (!todayLog) badges.push({ color: "amber", label: "No log today" });
  if (todayLog?.flagged && !todayLog?.acknowledged_by) badges.push({ color: "red", label: "Flagged log" });
  if (todayVisit) badges.push({ color: "green", label: "Face-to-face done" });
  if ((resident.allergies || []).some(a => a.severity === "anaphylactic" || a.severity === "severe")) {
    badges.push({ color: "red", label: "⚠ Severe allergy" });
  }
  if (activeSP) {
    const due = activeSP.review_due_date;
    if (due && due < todayStr) badges.push({ color: "amber", label: "Support plan due" });
  }
  if (activeILS) {
    const due = activeILS.review_due_date;
    if (due && due < todayStr) badges.push({ color: "amber", label: "ILS plan due" });
  }
  if (activeTransition) badges.push({ color: "purple", label: "Transition active" });
  if (badges.length === 0) badges.push({ color: "green", label: "All clear today" });
  return badges.slice(0, 5);
}

function ShortNotesField({ resident }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(resident.short_notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Resident.update(resident.id, { short_notes: value });
    queryClient.invalidateQueries({ queryKey: ["all-residents"] });
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => {
    setValue(resident.short_notes || "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          className="flex-1 min-w-0 text-xs border border-primary/40 rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          placeholder="Add short details…"
          maxLength={120}
        />
        <button onClick={handleSave} disabled={saving} className="text-green-600 hover:text-green-700 p-0.5 shrink-0">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground p-0.5 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1 group/notes cursor-pointer min-w-0 flex-1"
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      title="Click to edit short details"
    >
      <span className={`text-xs truncate max-w-[200px] ${value ? "text-muted-foreground" : "text-muted-foreground/50 italic"}`}>
        {value || "Add details…"}
      </span>
      <Pencil className="w-3 h-3 text-muted-foreground/40 group-hover/notes:text-primary shrink-0 transition-colors" />
    </div>
  );
}

export function YPCard({ resident, home, keyWorker, dailyLogs, visitReports, supportPlans, ilsPlans, transitions, onNavigateSP, onNavigateILS, myStaffProfile, isAdminOrTL, onAddDailyLog, onViewSupportPlan, onViewILSPlan, staff, appointments }) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showStatusModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showStatusModal]);
  const [statusNotes, setStatusNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [outAuthorization, setOutAuthorization] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const risk = resident.risk_level || "low";
  const age = calcAge(resident.dob);
  const todayLogs = dailyLogs.filter(l => l.date === todayStr);
  const todayVisits = visitReports.filter(v => v.date === todayStr);
  const badges = generateBadges(resident, todayLogs, todayVisits, supportPlans, ilsPlans, transitions);

  // Check if 24-hour home and get current status
  const is24HourHome = home?.type === "24_hours" || home?.care_model === "residential";
  // Current status is stored as a DailyLog with flags: ["current_status"] and the
  // category inside the JSONB content field — top-level status_category doesn't
  // exist on the DailyLog model and is silently dropped by the backend.
  const currentStatusLog = todayLogs.find(l => l.resident_id === resident.id && Array.isArray(l.flags) && l.flags.includes("current_status"));
  const statusCategory = currentStatusLog?.content?.status_category || null;

  // Status color mapping
  const getStatusColors = (status) => {
    const colorMap = {
      in: { bg: "#D1FAE5", text: "#065F46", icon: "#10B981" },
      out: { bg: "#FEE2E2", text: "#7F1D1D", icon: "#EF4444" },
      sleeping: { bg: "#DBEAFE", text: "#1E40AF", icon: "#3B82F6" },
      education: { bg: "#FEF3C7", text: "#78350F", icon: "#F59E0B" },
      unknown: { bg: "#F3F4F6", text: "#374151", icon: "#9CA3AF" },
    };
    return colorMap[status] || colorMap.unknown;
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    if (selectedStatus === "out" && !outAuthorization) return;

    const logPayload = {
      org_id: ORG_ID,
      resident_id: resident.id,
      resident_name: resident.display_name,
      home_id: resident.home_id,
      worker_id: myStaffProfile?.id,
      worker_name: myStaffProfile?.full_name || "Staff",
      date: todayStr,
      shift: "morning",
      log_type: "general",
      flags: ["current_status"],
      content: {
        status_category: selectedStatus,
        status_notes: statusNotes,
        out_authorization: outAuthorization || null,
        log_time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      },
    };

    try {
      if (currentStatusLog?.id) {
        await secureGateway.update("DailyLog", currentStatusLog.id, logPayload);
      } else {
        await secureGateway.create("DailyLog", logPayload);
      }

      // If "out" and "unauthorized", create missing entry and send notifications
      if (selectedStatus === "out" && outAuthorization === "unauthorized") {
        const missingPayload = {
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          home_name: home?.name || "",
          reported_missing_datetime: new Date().toISOString(),
          reported_by_id: myStaffProfile?.id,
          reported_by_name: myStaffProfile?.full_name || "Staff",
          status: "active",
          notes: `Unauthorized absence. ${statusNotes || ""}`.trim(),
        };

        await secureGateway.create("MissingFromHome", missingPayload);

        // Get TL/RSM for notification
        const homeStaff = staff.filter(s =>
          (s.role === "team_leader" || s.role === "registered_manager" || s.role === "admin_manager") &&
          (s.home_ids?.includes(resident.home_id) || s.primary_home_id === resident.home_id)
        );

        for (const s of homeStaff) {
          if (s.user_id) {
            try {
              await base44.functions.invoke("createNotification", {
                recipient_user_id: s.user_id,
                org_id: ORG_ID,
                title: `Unauthorized Absence — ${resident.display_name}`,
                body: `${resident.display_name} has been marked as OUT (unauthorized) at ${home?.name || "unknown home"}. Reported by ${myStaffProfile?.full_name || "staff"}. Approval and missing person review required.`,
                type: "approval_request",
                link: `/residents?yp=${resident.id}`,
                priority: "high",
              });
            } catch (e) {}
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["all-daily-logs"] });
      toast.success("Status updated");
      setShowStatusModal(false);
      setStatusNotes("");
      setSelectedStatus(null);
      setOutAuthorization(null);
    } catch (err) {
      toast.error("Failed to save status: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  const handleCloseModal = () => {
    setShowStatusModal(false);
    setStatusNotes("");
    setSelectedStatus(null);
    setOutAuthorization(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden mb-2 shadow-sm"
      style={{ borderLeft: `3px solid ${RISK_BORDER[risk]}` }}>
      {/* Collapsed header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: RISK_AVATAR_BG[risk], color: RISK_AVATAR_TEXT[risk] }}>
          {resident.initials || resident.display_name?.charAt(0)}
        </div>

        {/* Name + home + short notes */}
        <div className="min-w-0 shrink-0 w-52">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium leading-tight">{resident.display_name}</span>
            {age && <span className="text-xs text-muted-foreground font-normal">({age}y)</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{home?.name || "—"}</p>
        </div>
        {/* Status badge — 24-hour homes only */}
        {is24HourHome && (
          <button
            onClick={e => {
              e.stopPropagation();
              setSelectedStatus(currentStatusLog?.content?.status_category || null);
              setStatusNotes(currentStatusLog?.content?.status_notes || "");
              setOutAuthorization(currentStatusLog?.content?.out_authorization || null);
              setShowStatusModal(true);
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap transition-opacity hover:opacity-80 cursor-pointer"
            style={{ 
              background: getStatusColors(statusCategory).bg, 
              color: getStatusColors(statusCategory).text 
            }}
          >
            <Circle className="w-2 h-2 fill-current" style={{ color: getStatusColors(statusCategory).icon }} />
            {statusCategory || "—"}
          </button>
        )}

        {/* Inline short notes */}
        <ShortNotesField resident={resident} />

        {/* Risk badge */}
        <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0"
          style={{ background: RISK_BADGE_BG[risk], color: RISK_BADGE_TEXT[risk] }}>
          {risk}
        </span>

        {/* Status badges */}
        <div className="flex-1 flex flex-wrap gap-1 min-w-0">
          {badges.map((b, i) => <StatusBadge key={i} color={b.color}>{b.label}</StatusBadge>)}
        </div>

        {/* Key worker + expand + View Details */}
        <div className="shrink-0 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">Key worker</p>
            <p className="text-xs font-medium">{keyWorker?.full_name || "—"}</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); navigate(`/young-people/${resident.id}/workspace`); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50 transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" /> View Details
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Status modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={handleCloseModal}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onWheel={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Update Status</h3>
            <div className="space-y-3">
              {/* Status buttons */}
              <div className="space-y-2">
                {["in", "out", "sleeping", "education", "unknown"].map(status => (
                  <button
                    key={status}
                    onClick={() => { setSelectedStatus(status); if (status !== "out") setOutAuthorization(null); }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors capitalize font-medium text-sm ${
                      selectedStatus === status
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              {/* Out authorization sub-options */}
              {selectedStatus === "out" && (
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Authorization:</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setOutAuthorization("authorized")}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                        outAuthorization === "authorized"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      ✓ Authorized
                    </button>
                    <button
                      onClick={() => setOutAuthorization("unauthorized")}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                        outAuthorization === "unauthorized"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      ✗ Unauthorized (Missing)
                    </button>
                  </div>
                </div>
              )}
              
              {/* Notes input */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
                <textarea
                  value={statusNotes}
                  onChange={e => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={!selectedStatus || (selectedStatus === "out" && !outAuthorization)}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <YPCardExpanded
          resident={resident}
          home={home}
          keyWorker={keyWorker}
          dailyLogs={dailyLogs}
          visitReports={visitReports}
          supportPlans={supportPlans}
          ilsPlans={ilsPlans}
          transitions={transitions}
          onNavigateSP={onNavigateSP}
          onNavigateILS={onNavigateILS}
          isAdminOrTL={isAdminOrTL}
          staff={staff}
          myStaffProfile={myStaffProfile}
          onAddDailyLog={onAddDailyLog}
          onViewSupportPlan={onViewSupportPlan}
          onViewILSPlan={onViewILSPlan}
          appointments={appointments}
        />
      )}
    </div>
  );
}

export default function YPCardView({
  residents, homes, staff, dailyLogs, visitReports, accidents, homeTasks, transitions,
  supportPlans, ilsPlans, filterHomeId, filterFlagged, onNavigateSP, onNavigateILS,
  isAdminOrTL, myStaffProfile, onAddDailyLog, onViewSupportPlan, onViewILSPlan, appointments = [],
}) {
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const todayLogs = useMemo(() => dailyLogs.filter(l => l.date === todayStr), [dailyLogs]);

  const sorted = useMemo(() => {
    const filtered = residents.filter(r => {
      if (filterHomeId && filterHomeId !== "all" && r.home_id !== filterHomeId) return false;
      if (filterFlagged) {
        const hasFlag = todayLogs.some(l => l.resident_id === r.id && l.flagged && !l.acknowledged_by);
        if (!hasFlag) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const rd = (RISK_ORDER[a.risk_level] ?? 4) - (RISK_ORDER[b.risk_level] ?? 4);
      if (rd !== 0) return rd;
      return (a.display_name || "").localeCompare(b.display_name || "");
    });
  }, [residents, filterHomeId, filterFlagged, todayLogs]);

  if (sorted.length === 0) {
    return (
      <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground text-sm">No young people found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1">
      {sorted.map(r => (
        <YPCard
           key={r.id}
           resident={r}
           home={homeMap[r.home_id]}
           keyWorker={r.key_worker_id ? staffMap[r.key_worker_id] : null}
           dailyLogs={dailyLogs.filter(l => l.resident_id === r.id)}
           visitReports={visitReports.filter(v => v.resident_id === r.id)}
           supportPlans={supportPlans.filter(p => p.resident_id === r.id)}
           ilsPlans={ilsPlans.filter(p => p.resident_id === r.id)}
           transitions={transitions.filter(t => t.resident_id === r.id)}
           onNavigateSP={onNavigateSP}
           onNavigateILS={onNavigateILS}
           isAdminOrTL={isAdminOrTL}
           myStaffProfile={myStaffProfile}
           staff={staff}
           onAddDailyLog={onAddDailyLog}
           onViewSupportPlan={onViewSupportPlan}
           onViewILSPlan={onViewILSPlan}
           appointments={appointments}
         />
      ))}
    </div>
  );
}