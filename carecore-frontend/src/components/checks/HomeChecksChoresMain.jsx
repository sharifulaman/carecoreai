import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { useModuleActions } from "@/lib/PermissionContext";
import { format } from "date-fns";
import { ChevronDown, Building2, Loader2, Settings2, DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import ManageChecksModal from "./ManageChecksModal";

import ChecksCalendarStrip from "./ChecksCalendarStrip";
import ChecksKPICards from "./ChecksKPICards";
import ChecksTodayTab from "./ChecksTodayTab";
import ChecksWeekTab from "./ChecksWeekTab";
import ChecksIssuesTab from "./ChecksIssuesTab";
import ChecksHistoryTab from "./ChecksHistoryTab";
import CheckDetailDrawer from "./CheckDetailDrawer";

const TABS = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This Week" },
  { key: "issues", label: "Issues" },
  { key: "history", label: "History" },
];

export default function HomeChecksChoresMain({ home, user, staff, staffProfile }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedInstance, setSelectedInstance] = useState(null);
  const [showManage, setShowManage] = useState(false);

  const isAdminRole = user?.role === "admin" || user?.role === "super_admin";
  const { data: roleDefinitions = [] } = useQuery({ queryKey: ["role-definitions"], queryFn: () => base44.roles.fetchDefinitions() });
  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
  const isHighRank = roleRank > 10;
  const { canEdit } = useModuleActions("homes", { canEdit: isAdminRole });
  const isAdmin = canEdit && isHighRank;
  const [seeding, setSeeding] = useState(false);

  const seedHistory = async () => {
    setSeeding(true);
    try {
      const res = await base44.functions.invoke("seedHomeChecksHistory", { home_id: home?.id });
      toast.success(`Seeded ${res.data?.instances ?? 0} instances & ${res.data?.completions ?? 0} completions`);
      refresh();
    } catch (e) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };



  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["check-templates", ORG_ID],
    queryFn: () => base44.entities.HomeCheckTemplate.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: templateItems = [] } = useQuery({
    queryKey: ["check-template-items", ORG_ID],
    queryFn: () => base44.entities.HomeCheckTemplateItem.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allInstances = [], isLoading: loadingInstances } = useQuery({
    queryKey: ["check-instances", home?.id],
    queryFn: () => base44.entities.HomeCheckInstance.filter({ home_id: home?.id }),
    enabled: !!home?.id,
    staleTime: 60 * 1000,
    select: d => d.filter(i => !["cancelled", "archived"].includes(i.status)),
  });

  const { data: completions = [] } = useQuery({
    queryKey: ["check-completions", home?.id],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ home_id: home?.id }),
    enabled: !!home?.id,
    staleTime: 60 * 1000,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["check-issues", home?.id],
    queryFn: () => base44.entities.HomeCheckIssue.filter({ home_id: home?.id }),
    enabled: !!home?.id,
    staleTime: 60 * 1000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["check-instances", home?.id] });
    qc.invalidateQueries({ queryKey: ["check-completions", home?.id] });
    qc.invalidateQueries({ queryKey: ["check-issues", home?.id] });
  };

  const todayInstances = useMemo(() =>
    allInstances.filter(i => i.scheduled_date === selectedDate),
    [allInstances, selectedDate]
  );

  const weekInstances = useMemo(() => {
    const base = new Date(selectedDate + "T12:00:00");
    const mon = new Date(base);
    mon.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return format(d, "yyyy-MM-dd");
    });
    return allInstances.filter(i => dates.includes(i.scheduled_date));
  }, [allInstances, selectedDate]);

  const isLoading = loadingTemplates || loadingInstances;
  const showDrawer = !!selectedInstance;
  const activeTemplates = templates.filter(t => t.is_active !== false);
  const todayHasInstances = allInstances.some(i => i.scheduled_date === selectedDate);

  // Auto-seed all data when no templates exist yet (silent, fires once)
  const autoSeedRef = useRef(false);
  useEffect(() => {
    if (!isLoading && templates.length === 0 && home?.id && !autoSeedRef.current) {
      autoSeedRef.current = true;
      base44.functions.invoke("seedChecksData", {}).then(() => {
        qc.invalidateQueries({ queryKey: ["check-templates", ORG_ID] });
        qc.invalidateQueries({ queryKey: ["check-template-items", ORG_ID] });
        refresh();
      });
    }
  }, [isLoading, templates.length, home?.id]);

  // Auto-generate instances for today when templates exist but today has none
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (!isLoading && activeTemplates.length > 0 && !todayHasInstances && home?.id && !autoGenRef.current) {
      autoGenRef.current = true;
      generateInstancesForDate(selectedDate);
    }
  }, [isLoading, activeTemplates.length, todayHasInstances, home?.id]);

  const generateInstancesForDate = async (date) => {
    const toCreate = activeTemplates.filter(t =>
      !allInstances.some(i => i.template_id === t.id && i.scheduled_date === date)
    );
    for (const t of toCreate) {
      await base44.entities.HomeCheckInstance.create({
        org_id: ORG_ID,
        home_id: home.id,
        template_id: t.id,
        template_title: t.title,
        template_area: t.area || t.category || "General",
        template_frequency: t.frequency,
        scheduled_date: date,
        due_at: t.default_due_time || "09:00 AM",
        status: "due",
      });
    }
    refresh();
  };

  return (
    <div className="relative">
      <div className={`transition-all duration-300 space-y-5 pb-10 ${showDrawer ? "lg:mr-[400px]" : ""}`}>

        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900 flex-1">Today's Checks &amp; Chores</h1>
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm text-sm font-semibold text-slate-700">
            <Building2 className="w-4 h-4 text-slate-400" />
            {home?.name}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-center border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-sm font-semibold text-slate-700 px-3 py-2 focus:outline-none bg-transparent cursor-pointer"
            />
          </div>
          {isAdmin && (
            <>
              {/* <button
                onClick={seedHistory}
                disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-violet-300 hover:text-violet-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseZap className="w-3.5 h-3.5" />}
                Seed 30d History
              </button> */}
              <button
                onClick={() => setShowManage(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-teal-300 hover:text-teal-700 transition-colors shadow-sm"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Manage Checks
              </button>
            </>
          )}
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
            <ChecksCalendarStrip
              selectedDate={selectedDate}
              instances={allInstances}
              completions={completions}
              onSelectDate={setSelectedDate}
            />

            <ChecksKPICards
              instances={allInstances}
              completions={completions}
              issues={issues}
              selectedDate={selectedDate}
            />

            <div className="border-b border-slate-200">
              <div className="flex gap-0">
                {TABS.map(tab => {
                  const openIssues = issues.filter(i => ["open", "in_progress", "awaiting_manager_review", "escalated"].includes(i.status)).length;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key
                          ? "border-teal-500 text-teal-600"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                        }`}
                    >
                      {tab.label}
                      {tab.key === "issues" && openIssues > 0 && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                          {openIssues}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === "today" && (
              <ChecksTodayTab
                instances={todayInstances}
                templateItems={templateItems}
                completions={completions}
                onStart={inst => setSelectedInstance(inst)}
                onViewDetails={inst => setSelectedInstance(inst)}
              />
            )}
            {activeTab === "this_week" && (
              <ChecksWeekTab
                instances={weekInstances}
                templateItems={templateItems}
                completions={completions}
                selectedDate={selectedDate}
                onStart={inst => setSelectedInstance(inst)}
                onViewDetails={inst => setSelectedInstance(inst)}
              />
            )}
            {activeTab === "issues" && (
              <ChecksIssuesTab homeId={home?.id} staffProfile={staffProfile} />
            )}
            {activeTab === "history" && (
              <ChecksHistoryTab
                homeId={home?.id}
                instances={allInstances}
                onViewDetails={inst => setSelectedInstance(inst)}
              />
            )}
          </>
        )}
      </div>

      {showManage && isAdmin && (
        <ManageChecksModal
          home={home}
          staffProfile={staffProfile}
          onClose={() => { setShowManage(false); refresh(); }}
        />
      )}

      {showDrawer && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setSelectedInstance(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm lg:w-[400px] z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">
            <CheckDetailDrawer
              key={selectedInstance?.id}
              instance={selectedInstance}
              onClose={() => { setSelectedInstance(null); refresh(); }}
              staffProfile={staffProfile}
              home={home}
            />
          </div>
        </>
      )}
    </div>
  );
}