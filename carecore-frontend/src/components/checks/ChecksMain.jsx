import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Home, ChevronDown, Loader2 } from "lucide-react";

import ChecksKPICards from "./ChecksKPICards";
import ChecksTodayTab from "./ChecksTodayTab";
import ChecksWeekTab from "./ChecksWeekTab";
import ChecksIssuesTab from "./ChecksIssuesTab";
import ChecksHistoryTab from "./ChecksHistoryTab";
import CheckDetailDrawer from "./CheckDetailDrawer";

const TABS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "issues", label: "Issues" },
  { key: "history", label: "History" },
];

export default function ChecksMain({ home, staffProfile, user }) {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedInstance, setSelectedInstance] = useState(null);

  // Load all instances for this home
  const { data: instances = [], isLoading: loadingInstances } = useQuery({
    queryKey: ["check-instances", home?.id, selectedDate],
    queryFn: () => base44.entities.HomeCheckInstance.filter({ home_id: home?.id }, "-scheduled_date", 500),
    enabled: !!home?.id,
    select: d => d.filter(i => !["cancelled", "archived"].includes(i.status)),
  });

  const { data: templateItems = [] } = useQuery({
    queryKey: ["check-template-items-all"],
    queryFn: () => base44.entities.HomeCheckTemplateItem.filter({}),
    staleTime: 5 * 60 * 1000,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["check-completions", home?.id],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ home_id: home?.id }, "-submitted_at", 500),
    enabled: !!home?.id,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["check-issues", home?.id],
    queryFn: () => base44.entities.HomeCheckIssue.filter({ home_id: home?.id }, "-created_date", 200),
    enabled: !!home?.id,
  });

  // Instances for selected date (Today tab)
  const todayInstances = useMemo(() =>
    instances.filter(i => i.scheduled_date === selectedDate),
    [instances, selectedDate]
  );

  // Week instances — load 7 days from selected date start of week
  const weekInstances = useMemo(() => {
    const base = new Date(selectedDate);
    const mon = new Date(base);
    mon.setDate(base.getDate() - ((base.getDay() + 6) % 7)); // Monday
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return format(d, "yyyy-MM-dd");
    });
    return instances.filter(i => dates.includes(i.scheduled_date));
  }, [instances, selectedDate]);

  const handleStart = (instance) => setSelectedInstance(instance);
  const handleViewDetails = (instance) => setSelectedInstance(instance);

  const showDrawer = !!selectedInstance;

  if (loadingInstances && instances.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex gap-0 min-h-0 relative">
      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ${showDrawer ? "lg:mr-96" : ""}`}>
        <div className="space-y-5 pb-10">
          {/* ── Header ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">Today's Checks &amp; Chores</h1>
              {/* Home badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                {home?.name || "Home"}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              {/* Date picker */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 shadow-sm">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-sm font-medium text-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <ChecksKPICards
            instances={todayInstances}
            completions={completions}
            issues={issues}
            selectedDate={selectedDate}
          />

          {/* ── Main tabs ── */}
          <div className="flex gap-0 border-b border-slate-200 -mx-1 px-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
              >
                {tab.label}
                {tab.key === "issues" && issues.filter(i => !["resolved", "closed"].includes(i.status)).length > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">
                    {issues.filter(i => !["resolved", "closed"].includes(i.status)).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          {activeTab === "today" && (
            <ChecksTodayTab
              instances={todayInstances}
              templateItems={templateItems}
              completions={completions}
              onStart={handleStart}
              onViewDetails={handleViewDetails}
            />
          )}
          {activeTab === "week" && (
            <ChecksWeekTab
              instances={weekInstances}
              templateItems={templateItems}
              completions={completions}
              selectedDate={selectedDate}
              onStart={handleStart}
              onViewDetails={handleViewDetails}
            />
          )}
          {activeTab === "issues" && (
            <ChecksIssuesTab homeId={home?.id} staffProfile={staffProfile} />
          )}
          {activeTab === "history" && (
            <ChecksHistoryTab homeId={home?.id} instances={instances} />
          )}
        </div>
      </div>

      {/* ── Right drawer — desktop fixed panel ── */}
      {showDrawer && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSelectedInstance(null)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm lg:max-w-[384px] z-50 shadow-2xl border-l border-slate-200 bg-white flex flex-col">
            <CheckDetailDrawer
              key={selectedInstance?.id}
              instance={selectedInstance}
              onClose={() => setSelectedInstance(null)}
              staffProfile={staffProfile}
              home={home}
            />
          </div>
        </>
      )}
    </div>
  );
}