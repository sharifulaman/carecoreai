import React, { useState } from "react";
import { X, Calendar, ClipboardCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";

export default function ChecklistHistoryModal({ resident, onClose }) {
  const [dateFilter, setDateFilter] = useState("");

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['daily-checklists-history', resident?.id],
    queryFn: () => secureGateway.filter('DailyChecklist', { resident_id: resident?.id }, '-date'),
    enabled: !!resident?.id,
  });

  const filteredHistory = dateFilter 
    ? history.filter(record => record.date === dateFilter)
    : history;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="text-blue-600" size={20} />
              Checklist History
            </h2>
            <p className="text-sm font-medium text-slate-500">
              For {resident?.display_name || "Unknown"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter("")} className="text-slate-400 hover:text-slate-600 transition-colors ml-1" title="Clear filter">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500">Loading history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-slate-600 font-medium">No previous checklists found.</p>
              <p className="text-slate-400 text-sm mt-1">
                {dateFilter ? "Try selecting a different date or clear the filter." : "They will appear here once saved."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredHistory.map((record) => {
                const completedCount = record.items?.filter(i => i.completed).length || 0;
                const totalCount = record.items?.length || 9;
                
                return (
                  <div key={record.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <Calendar size={16} className="text-slate-400" />
                        {new Date(record.date).toLocaleDateString('en-GB', { 
                          weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' 
                        })}
                      </div>
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                        {completedCount} / {totalCount} completed
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {record.items?.map((item) => (
                        <div key={item.id} className="flex items-start gap-2">
                          <div className={`mt-0.5 h-4 w-4 rounded flex-shrink-0 flex items-center justify-center border ${item.completed ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-100 border-slate-300'}`}>
                            {item.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <span className={`text-sm ${item.completed ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                            {item.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
