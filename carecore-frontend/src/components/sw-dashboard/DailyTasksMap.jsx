import { useEffect, useRef, useState } from "react";
import ExpandableTaskCard from "./ExpandableTaskCard";

const leftTasks = [
  { key: "gp", title: "GP Details", icon: "🏥" },
  { key: "dentist", title: "Dentist Registration", icon: "🦷" },
  { key: "optician", title: "Optician Details", icon: "👁️" },
  { key: "allergies", title: "Allergies", icon: "⚠️" },
  { key: "conditions", title: "Medical Conditions", icon: "💊" },
  { key: "bodymap", title: "Body Map", icon: "🏃" },
  { key: "healthnotes", title: "Health Notes", icon: "📝" },
  { key: "appointments", title: "Appointments", icon: "📅" },
  { key: "education", title: "Education Update", icon: "🎓" },
  { key: "neet", title: "Employment / NEET", icon: "💼" },
];

const rightTasks = [
  { key: "pathway", title: "Pathway Plan", icon: "📋" },
  { key: "pa", title: "PA Contact", icon: "💬" },
  { key: "keypeople", title: "Key People", icon: "👥" },
  { key: "missing", title: "Missing Episode Check", icon: "🔍" },
  { key: "risk", title: "Risk Assessment", icon: "🛡️" },
  { key: "cse", title: "CSE / CCE Risk", icon: "🚨" },
  { key: "complaint", title: "Complaint / Concern", icon: "💬" },
  { key: "incident", title: "Incident Form", icon: "📋" },
  { key: "documents", title: "Documents", icon: "📁" },
  { key: "annexa", title: "Annex A Readiness", icon: "✅" },
];

const statusColors = {
  completed: "bg-emerald-500 border-emerald-300",
  progress: "bg-blue-500 border-blue-300",
  due: "bg-amber-500 border-amber-300",
  overdue: "bg-red-500 border-red-300",
};

const dotPositions = {
  // Left tasks
  gp: { left: "47%", top: "24%" },          // Ear
  dentist: { left: "44%", top: "30%" },     // Shoulder
  optician: { left: "41%", top: "35%" },    // Upper Arm
  allergies: { left: "38%", top: "41%" },   // Elbow
  conditions: { left: "42%", top: "46%" },  // Hip
  bodymap: { left: "36%", top: "52%" },     // Hand
  healthnotes: { left: "44%", top: "62%" }, // Thigh
  appointments: { left: "43%", top: "71%" },// Knee
  education: { left: "44%", top: "80%" },   // Calf
  neet: { left: "44%", top: "87%" },        // Ankle

  // Right tasks
  pathway: { left: "53%", top: "24%" },     // Ear
  pa: { left: "56%", top: "30%" },          // Shoulder
  keypeople: { left: "59%", top: "35%" },   // Upper Arm
  missing: { left: "62%", top: "41%" },     // Elbow
  risk: { left: "58%", top: "46%" },        // Hip
  cse: { left: "64%", top: "52%" },         // Hand
  complaint: { left: "56%", top: "62%" },   // Thigh
  incident: { left: "57%", top: "71%" },    // Knee
  documents: { left: "56%", top: "80%" },   // Calf
  annexa: { left: "56%", top: "87%" },      // Ankle
};

function HumanSilhouette() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 rounded-3xl">
      <img
        src="https://media.base44.com/images/public/69e8b95bf83622ae112de61e/1b2531104_generated_image.png"
        alt="Human silhouette"
        className="h-[450px] max-w-none w-auto object-contain opacity-40 mix-blend-multiply grayscale contrast-125 brightness-110"
        style={{ transform: 'scale(1.35) translateY(-2%)' }}
      />
    </div>
  );
}

export default function DailyTasksMap({ onTaskClick, selectedResident, statuses = {} }) {
  const parentRef = useRef(null);
  const [lines, setLines] = useState([]);
  const [expandedTaskKey, setExpandedTaskKey] = useState(null);

  const measureLines = () => {
    if (!parentRef.current) return;
    const parentRect = parentRef.current.getBoundingClientRect();
    const calculatedLines = [];

    const processTask = (task, side) => {
      const cardEl = document.getElementById(`anchor-${task.key}`);
      const dotEl = document.getElementById(`dot-${task.key}`);

      if (cardEl && dotEl) {
        const cardRect = cardEl.getBoundingClientRect();
        const dotRect = dotEl.getBoundingClientRect();

        const x1 = cardRect.left + cardRect.width / 2 - parentRect.left;
        const y1 = cardRect.top + cardRect.height / 2 - parentRect.top;
        const x2 = dotRect.left + dotRect.width / 2 - parentRect.left;
        const y2 = dotRect.top + dotRect.height / 2 - parentRect.top;

        calculatedLines.push({
          key: task.key,
          x1,
          y1,
          x2,
          y2,
          side,
        });
      }
    };

    leftTasks.forEach((t) => processTask(t, "left"));
    rightTasks.forEach((t) => processTask(t, "right"));

    setLines(calculatedLines);
  };

  useEffect(() => {
    if (!parentRef.current) return;

    // Initial measurement delay to let styles/DOM settle
    const timer = setTimeout(measureLines, 100);

    const observer = new ResizeObserver(() => {
      measureLines();
    });
    observer.observe(parentRef.current);

    window.addEventListener("resize", measureLines);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", measureLines);
    };
  }, [statuses, selectedResident]);

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Daily Tasks & Care Checks</h2>
        <p className="text-sm text-slate-400 mt-0.5">Tap a task to view, update or complete</p>
      </div>

      {/* Main Grid Wrapper */}
      <div ref={parentRef} className="relative grid grid-cols-[1fr_240px_1fr] gap-x-4 items-center min-h-[520px] select-none">

        {/* SVG Connector Lines Canvas */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full z-0" aria-hidden="true">
          {lines.map((line) => {
            const dx = line.x2 - line.x1;
            const cp1x = line.x1 + dx * 0.45;
            const cp1y = line.y1;
            const cp2x = line.x1 + dx * 0.55;
            const cp2y = line.y2;
            const d = `M ${line.x1} ${line.y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${line.x2} ${line.y2}`;

            return (
              <g key={line.key}>
                {/* Dotted curved line */}
                <path
                  d={d}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="2 4"
                  opacity="0.6"
                />
              </g>
            );
          })}
        </svg>

        {/* Left Tasks Column */}
        <div className="z-10 flex flex-col gap-3">
          {leftTasks.map((task) => (
            <ExpandableTaskCard
              key={task.key}
              taskKey={task.key}
              selectedResident={selectedResident}
              status={statuses[task.key] || "due"}
              onTaskClick={() => onTaskClick(task.key)}
              side="left"
              isExpanded={expandedTaskKey === task.key}
              onToggle={(expand) => setExpandedTaskKey(expand ? task.key : null)}
            />
          ))}
        </div>

        {/* Center Column: Silhouette & Interactive Dots */}
        <div className="relative flex justify-center items-center h-[520px] w-full z-10">
          <HumanSilhouette />

          {Object.entries(dotPositions).map(([key, pos]) => {
            const status = statuses[key] || "due";
            const colorClass = statusColors[status] || "bg-amber-500 border-amber-300";
            return (
              <button
                key={key}
                id={`dot-${key}`}
                style={{ left: pos.left, top: pos.top }}
                onClick={() => onTaskClick(key)}
                className={`absolute w-2.5 h-2.5 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hover:scale-150 focus:outline-none cursor-pointer ${colorClass}`}
                title={key.toUpperCase().replace(/_/g, " ")}
              />
            );
          })}
        </div>

        {/* Right Tasks Column */}
        <div className="z-10 flex flex-col gap-3">
          {rightTasks.map((task) => (
            <ExpandableTaskCard
              key={task.key}
              taskKey={task.key}
              selectedResident={selectedResident}
              status={statuses[task.key] || "due"}
              onTaskClick={() => onTaskClick(task.key)}
              side="right"
              isExpanded={expandedTaskKey === task.key}
              onToggle={(expand) => setExpandedTaskKey(expand ? task.key : null)}
            />
          ))}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100 pt-4 px-1">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
            <span className="font-semibold text-slate-600">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500 border border-white shadow-sm" />
            <span className="font-semibold text-slate-600">In progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500 border border-white shadow-sm" />
            <span className="font-semibold text-slate-600">Due</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500 border border-white shadow-sm" />
            <span className="font-semibold text-slate-600">Overdue</span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-semibold text-slate-500">
          <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
          </svg>
          Updates auto-save as you complete tasks.
        </div>
      </div>
    </section>
  );
}