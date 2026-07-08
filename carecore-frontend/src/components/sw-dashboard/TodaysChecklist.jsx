import { ClipboardCheck, ChevronRight, User } from "lucide-react";

export default function TodaysChecklist({ checklist, setChecklist, ypName, disabled, onViewHistory }) {
  const completed = disabled ? 0 : checklist.filter((item) => item.completed).length;
  const pct = disabled ? 0 : Math.round((completed / checklist.length) * 100) || 0;

  function toggle(id) {
    if (disabled) return;
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm relative">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-slate-900">
          <ClipboardCheck size={18} className="text-blue-600" /> Today's Checklist
        </div>
        <span className="text-sm font-bold text-slate-500">
          {completed} / {checklist.length} completed
        </span>
      </div>

      {/* YP badge */}
      {ypName && !disabled && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 w-fit">
          <User size={12} />
          {ypName}
        </div>
      )}

      <div className="mb-4 h-2 rounded-full bg-slate-100 relative">
        <div className="h-2 rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      
      <div className="relative min-h-[200px]">
        {disabled && (
          <div className="absolute inset-[-10px] z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-lg">
            <span className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
              Please select a specific YP
            </span>
          </div>
        )}
        
        <div className={`space-y-2 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {checklist.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={disabled ? false : item.completed}
                onChange={() => toggle(item.id)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
              />
              <span className={(disabled ? false : item.completed) ? "line-through text-slate-400" : ""}>{item.title}</span>
            </label>
          ))}
        </div>
      </div>
      
      <button 
        disabled={disabled}
        onClick={onViewHistory}
        className={`mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-blue-600 ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-100' : 'hover:bg-blue-50'
        }`}
      >
        View full checklist <ChevronRight size={18} />
      </button>
    </section>
  );
}