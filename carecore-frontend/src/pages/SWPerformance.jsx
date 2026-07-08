// @ts-nocheck
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { generatePerformancePDF } from "@/lib/generatePerformancePDF";
import {
  TrendingUp, BarChart2, Target, CalendarCheck, ClipboardList,
  GraduationCap, Building2, Briefcase, CalendarDays, UserCircle, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import PerformanceOverviewTab from "@/components/my-performance/PerformanceOverviewTab";
import PerformanceActivitiesTab from "@/components/my-performance/PerformanceActivitiesTab";
import PerformanceGoalsTab from "@/components/my-performance/PerformanceGoalsTab";
import PerformanceSupervisionTab from "@/components/my-performance/PerformanceSupervisionTab";
import PerformanceAppraisalsTab from "@/components/my-performance/PerformanceAppraisalsTab";
import PerformanceTrainingTab from "@/components/my-performance/PerformanceTrainingTab";

const TABS = [
  { key: "overview",    label: "Overview",    icon: TrendingUp },
  { key: "activities",  label: "Activities",  icon: BarChart2 },
  { key: "goals",       label: "Goals",       icon: Target },
  { key: "supervision", label: "Supervision", icon: CalendarCheck },
  { key: "appraisals",  label: "Appraisals",  icon: ClipboardList },
  { key: "training",    label: "Training",    icon: GraduationCap },
];

const PERIOD_OPTIONS = [
  { value: "this_month",   label: "This Month" },
  { value: "last_month",   label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year",    label: "This Year" },
];

function fetchPerformanceSummary(period) {
  const token = sessionStorage.getItem("access_token") || sessionStorage.getItem("token");
  const base = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");
  return fetch(`${base}/business/my-performance/summary?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => {
    if (!r.ok) throw new Error("Failed to load performance summary");
    return r.json();
  }).then(r => r.data);
}

export default function SWPerformance() {
  const { user, staffProfile } = useOutletContext();
  const [activeTab, setActiveTab]   = useState("overview");
  const [period, setPeriod]         = useState("this_month");
  const [isExporting, setIsExporting] = useState(false);

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ["my-performance-summary", period],
    queryFn: () => fetchPerformanceSummary(period),
    staleTime: 2 * 60 * 1000,
  });

  const displayName = summary?.staff_name ?? staffProfile?.full_name ?? user?.full_name ?? "Staff Member";
  const initials = displayName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Performance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your personal performance overview, goals, supervision and training.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isExporting || !summary}
            onClick={() => {
              if (!summary) return;
              setIsExporting(true);
              try {
                generatePerformancePDF(summary, staffProfile);
              } finally {
                setIsExporting(false);
              }
            }}
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting…" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-card rounded-xl border border-border p-6 flex flex-col lg:flex-row gap-6 lg:items-center justify-between shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-semibold">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {isLoading ? "Loading…" : displayName}
            </h2>
            <p className="text-muted-foreground text-sm capitalize">
              {staffProfile?.job_title ?? staffProfile?.role?.replace(/_/g, " ") ?? ""}
            </p>
            {staffProfile?.home_names?.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                <Building2 className="w-3.5 h-3.5" />
                {staffProfile.home_names[0]}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-8 lg:pl-10 lg:border-l border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              <UserCircle className="w-3.5 h-3.5" /> Employee ID
            </p>
            <p className="font-semibold">{staffProfile?.employee_id ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> Role
            </p>
            <p className="font-semibold capitalize">
              {staffProfile?.role?.replace(/_/g, " ") ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Period
            </p>
            <p className="font-semibold">
              {summary?.period?.label ?? PERIOD_OPTIONS.find(o => o.value === period)?.label}
            </p>
          </div>
        </div>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Could not load performance data. Please try refreshing the page.
        </div>
      )}

      {/* Tab navigation */}
      <div className="overflow-x-auto">
        <div className="flex gap-0 border-b border-border min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="pb-8">
        {activeTab === "overview" && (
          <PerformanceOverviewTab summary={summary} isLoading={isLoading} />
        )}
        {activeTab === "activities" && (
          <PerformanceActivitiesTab period={period} />
        )}
        {activeTab === "goals" && (
          <PerformanceGoalsTab summary={summary} staffProfile={staffProfile} />
        )}
        {activeTab === "supervision" && (
          <PerformanceSupervisionTab summary={summary} staffProfile={staffProfile} />
        )}
        {activeTab === "appraisals" && (
          <PerformanceAppraisalsTab summary={summary} staffProfile={staffProfile} />
        )}
        {activeTab === "training" && (
          <PerformanceTrainingTab summary={summary} isLoading={isLoading} staffProfile={staffProfile} />
        )}
      </div>
    </div>
  );
}
