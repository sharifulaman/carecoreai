import { ArrowRight, Clock } from "lucide-react";

function calcDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + "m" : "00m"}`;
}

function fmt12(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function initials(name) {
  if (!name) return "??";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function StaffBlock({ label, badge, badgeColor, staffName, role, start, end, avatarColor, template }) {
  const dur = calcDuration(start, end);
  return (
    <div className="flex items-center gap-4 flex-1">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${avatarColor}`}>
        {initials(staffName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        </div>
        <p className="font-bold text-slate-800 text-sm leading-tight">{staffName || "Not assigned"}</p>
        <p className="text-xs text-slate-500">{template?.name || role || "Support Worker"}</p>
        {template && template.staff_required && (
          <p className="text-xs text-slate-400 mt-0.5">
            Staff Required: <span className="font-semibold text-slate-600">{template.staff_required}</span>
          </p>
        )}
      </div>
      <div className="flex gap-4 ml-auto text-center shrink-0">
        <div>
          <p className="text-[10px] text-slate-400">Started</p>
          <p className="text-xs font-bold text-slate-700">{fmt12(start)}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Ending</p>
          <p className="text-xs font-bold text-slate-700">{fmt12(end)}</p>
        </div>
        {dur && (
          <div className="bg-slate-100 rounded-lg px-3 py-1 text-center">
            <p className="text-sm font-black text-slate-700">{dur}</p>
            <p className="text-[9px] text-slate-400">Shift duration</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HandoverShiftSummary({ handover, currentShiftTemplate, nextShiftTemplate }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 flex-wrap">
      {/* Current shift */}
      <div className="flex-1 min-w-[280px]">
        <StaffBlock
          label="Current Shift (Ending)"
          badge="Ending"
          badgeColor="bg-amber-100 text-amber-700"
          staffName={handover?.outgoing_staff_name}
          role="Support Worker"
          start={handover?.outgoing_shift_start}
          end={handover?.outgoing_shift_end}
          avatarColor="bg-slate-600"
          template={currentShiftTemplate}
        />
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center shrink-0">
        <div className="w-10 h-10 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-teal-600" />
        </div>
      </div>

      {/* Next shift */}
      <div className="flex-1 min-w-[280px]">
        <StaffBlock
          label="Next Shift (Starting)"
          badge="Starting"
          badgeColor="bg-emerald-100 text-emerald-700"
          staffName={handover?.incoming_staff_name}
          role="Support Worker"
          start={handover?.incoming_shift_start}
          end={handover?.incoming_shift_end}
          avatarColor="bg-teal-600"
          template={nextShiftTemplate}
        />
      </div>
    </div>
  );
}