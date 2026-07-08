import React, { useState } from "react";
import { MessageSquare, ChevronRight, Plus, Calendar, AlertTriangle, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

const getSortTime = (date, timeStr, datetimeFull, createdAt) => {
  if (datetimeFull) {
    const d = new Date(datetimeFull);
    if (!isNaN(d)) return d.getTime();
  }
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d)) return d.getTime();
  }
  if (!date) return 0;
  try {
    if (timeStr && timeStr.includes(':')) {
      const paddedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      return new Date(`${date}T${paddedTime}`).getTime();
    }
    return new Date(date).getTime();
  } catch {
    return 0;
  }
};

export default function RecentNotes({ assignedResidents = [], recentNotes = [], appointments = [], mfhRecords = [], visitReports = [] }) {
  const [showAllModal, setShowAllModal] = useState(false);
  const assignedIds = assignedResidents.map(r => r.id);
  const allActivities = [];

  // Notes
  recentNotes.forEach(note => {
    if (assignedIds.includes(note.resident_id)) {
      allActivities.push({
        id: `note-${note.id}`,
        type: 'note',
        dateStr: note.date,
        timeStr: note.log_time || "",
        summary: note.summary || note.details || note.title || note.log_type || "Daily Log",
        workerName: note.worker_name,
        residentId: note.resident_id,
        sortTime: getSortTime(note.date, note.log_time, null, note.created_at),
        originalId: note.id
      });
    }
  });

  // Appointments
  appointments.forEach(apt => {
    if (assignedIds.includes(apt.resident_id) && apt.start_datetime) {
      const d = new Date(apt.start_datetime);
      allActivities.push({
        id: `apt-${apt.id}`,
        type: 'appointment',
        dateStr: d.toISOString().split('T')[0],
        timeStr: format(d, 'HH:mm'),
        summary: apt.title || "Appointment",
        workerName: apt.organiser_name || "System",
        residentId: apt.resident_id,
        sortTime: d.getTime(),
        originalId: apt.id
      });
    }
  });

  // Missing From Home
  mfhRecords.forEach(mfh => {
    if (assignedIds.includes(mfh.resident_id) && mfh.reported_missing_datetime) {
      const d = new Date(mfh.reported_missing_datetime);
      allActivities.push({
        id: `mfh-${mfh.id}`,
        type: 'missing',
        dateStr: d.toISOString().split('T')[0],
        timeStr: format(d, 'HH:mm'),
        summary: `Missing Episode Reported`,
        workerName: mfh.reported_by_name || "System",
        residentId: mfh.resident_id,
        sortTime: d.getTime(),
        originalId: mfh.id
      });
    }
  });

  // Visit Reports
  visitReports.forEach(vr => {
    if (assignedIds.includes(vr.resident_id)) {
      allActivities.push({
        id: `vr-${vr.id}`,
        type: 'visit',
        dateStr: vr.date,
        timeStr: vr.time_start || "",
        summary: vr.action_text || "Visit Report",
        workerName: vr.worker_name,
        residentId: vr.resident_id,
        sortTime: getSortTime(vr.date, vr.time_start, null, vr.created_at),
        originalId: vr.id
      });
    }
  });

  allActivities.sort((a, b) => b.sortTime - a.sortTime);
  const displayActivities = allActivities.slice(0, 10);

  const getIcon = (type) => {
    switch (type) {
      case 'appointment': return <Calendar size={18} className="text-purple-600" />;
      case 'missing': return <AlertTriangle size={18} className="text-red-600" />;
      case 'visit': return <ClipboardList size={18} className="text-emerald-600" />;
      case 'note':
      default: return <MessageSquare size={18} className="text-blue-600" />;
    }
  };

  const getIconBg = (type, index) => {
    switch (type) {
      case 'appointment': return 'bg-purple-100 text-purple-700';
      case 'missing': return 'bg-red-100 text-red-700';
      case 'visit': return 'bg-emerald-100 text-emerald-700';
      case 'note':
      default: return avatarColors[index % avatarColors.length];
    }
  };

  const ActivityItem = ({ activity, index }) => {
    const authorInitials = (activity.workerName || "?")
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const resident = assignedResidents.find(r => r.id === activity.residentId);
    let dateStr = "Unknown Date";
    try {
      if (activity.dateStr) dateStr = format(new Date(activity.dateStr), "dd MMM yyyy");
    } catch (e) { }

    const timeStr = activity.timeStr || "";
    const displayTime = timeStr ? `${dateStr} • ${timeStr}` : dateStr;

    return (
      <button
        key={activity.id}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${getIconBg(activity.type, index)}`}
        >
          {activity.type === 'note' ? authorInitials : getIcon(activity.type)}
        </div>
        <div className="w-28 shrink-0">
          <div className="font-bold text-slate-900 truncate" title={activity.workerName || "System"}>
            {activity.workerName || "System"}
          </div>
          <div className="text-[10px] text-slate-500">{displayTime}</div>
        </div>
        <div className="line-clamp-2 flex-1 text-sm text-slate-700" title={activity.summary}>
          {activity.summary}
        </div>
        <span className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
          {resident?.display_name || "—"}
        </span>
        <ChevronRight size={16} className="text-slate-400 shrink-0" />
      </button>
    );
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2 font-black text-slate-900">
            <MessageSquare size={18} className="text-blue-600" /> Recent Activity / Handover
          </div>
          {allActivities.length > 10 && (
            <button onClick={() => setShowAllModal(true)} className="text-sm font-bold text-blue-600 hover:underline">
              View all
            </button>
          )}
        </div>
        <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[500px]">
          {displayActivities.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No recent activity for assigned young people.
            </div>
          ) : (
            displayActivities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            ))
          )}
        </div>
      </section>

      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="flex flex-row items-center gap-3 border-b border-slate-100 px-6 py-4 m-0 space-y-0">
            <MessageSquare size={20} className="text-blue-600" />
            <DialogTitle className="text-xl font-bold text-slate-900">All Recent Activity</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {allActivities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}