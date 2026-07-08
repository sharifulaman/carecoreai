import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Eye,
  FileText,
  GraduationCap,
  HeartPulse,
  MessageSquare,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
  Activity,
  Siren,
  ClipboardList,
  ClipboardPlus,
  FolderOpen,
  BriefcaseBusiness,
} from "lucide-react";
import HumanSilhouette from "./HumanSilhouette";

const STATUS_CONFIG = {
  completed: { label: "Completed", dot: "bg-emerald-500" },
  progress: { label: "In progress", dot: "bg-blue-500" },
  due: { label: "Due", dot: "bg-amber-500" },
  overdue: { label: "Overdue", dot: "bg-red-500" },
};

const leftTaskTemplates = [
  { key: "gp", title: "GP Details", icon: Stethoscope, status: "completed" },
  { key: "dentist", title: "Dentist Registration", icon: HeartPulse, status: "due" },
  { key: "optician", title: "Optician Details", icon: Eye, status: "completed" },
  { key: "allergies", title: "Allergies", icon: AlertTriangle, status: "completed" },
  { key: "conditions", title: "Medical Conditions", icon: HeartPulse, status: "due" },
  { key: "bodymap", title: "Body Map", icon: Activity, status: "completed" },
  { key: "notes", title: "Health Notes", icon: FileText, status: "due" },
  { key: "appointments", title: "Appointments", icon: CalendarDays, status: "progress" },
  { key: "education", title: "Education Update", icon: GraduationCap, status: "progress" },
  { key: "neet", title: "Employment / NEET", icon: BriefcaseBusiness, status: "due" },
];

const rightTaskTemplates = [
  { key: "pathway", title: "Pathway Plan", icon: ClipboardList, status: "progress" },
  { key: "pa", title: "PA Contact", icon: MessageSquare, status: "completed" },
  { key: "keypeople", title: "Key People", icon: Users, status: "completed" },
  { key: "missing", title: "Missing Episode Check", icon: Search, status: "progress" },
  { key: "risk", title: "Risk Assessment", icon: ShieldCheck, status: "due" },
  { key: "cse", title: "CSE / CCE Risk", icon: Siren, status: "overdue" },
  { key: "complaint", title: "Complaint / Concern", icon: MessageSquare, status: "progress" },
  { key: "incident", title: "Incident Form", icon: ClipboardPlus, status: "overdue" },
  { key: "documents", title: "Documents", icon: FolderOpen, status: "due" },
  { key: "annexa", title: "Annex A Readiness", icon: ShieldCheck, status: "overdue" },
];

function TaskCard({ task }) {
  const navigate = useNavigate();
  const Icon = task.icon;
  const config = STATUS_CONFIG[task.status];

  return (
    <button
      onClick={() => navigate("/residents?tab=health")}
      className="flex h-[40px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={17} className="shrink-0 text-teal-600" />
        <span className="truncate text-sm font-semibold text-slate-800">{task.title}</span>
      </span>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
    </button>
  );
}

function ConnectorLines({ side }) {
  const ys = [28, 72, 116, 160, 204, 248, 292, 336, 380, 424];
  return (
    <svg
      className={`pointer-events-none absolute top-[74px] h-[460px] w-[190px] ${
        side === "left" ? "left-[310px]" : "right-[310px]"
      }`}
      viewBox="0 0 190 460"
      preserveAspectRatio="none"
    >
      {ys.map((y, i) => {
        const d =
          side === "left"
            ? `M0 ${y} C95 ${y} 95 ${230} 190 ${230}`
            : `M190 ${y} C95 ${y} 95 ${230} 0 ${230}`;
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="#b8c7d9"
            strokeWidth="1.3"
            strokeDasharray="4 5"
            opacity="0.75"
          />
        );
      })}
    </svg>
  );
}

export default function SWTaskMap({ residents }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-slate-900">Daily Tasks & Care Checks</h2>
        <p className="text-sm text-slate-500">Tap a task to view, update or complete</p>
      </div>

      <div className="relative grid min-h-[650px] grid-cols-[240px_1fr_240px] items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-50 px-3 py-2">
        <ConnectorLines side="left" />
        <ConnectorLines side="right" />

        {/* Left Tasks */}
        <div className="z-10 flex flex-col gap-3">
          {leftTaskTemplates.map((task) => (
            <TaskCard key={task.key} task={task} />
          ))}
        </div>

        {/* Center Silhouette */}
        <div className="z-0 flex justify-center">
          <HumanSilhouette />
        </div>

        {/* Right Tasks */}
        <div className="z-10 flex flex-col gap-3">
          {rightTaskTemplates.map((task) => (
            <TaskCard key={task.key} task={task} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          {Object.entries(STATUS_CONFIG).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${value.dot}`} />
              <span>{value.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}