// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import {
  GraduationCap, CheckCircle2, Clock, AlertTriangle,
  XCircle, CalendarDays, ExternalLink, Search, Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: { label: "Completed", icon: CheckCircle2, cls: "bg-green-100 text-green-700",  row: "border-l-green-400" },
  scheduled: { label: "Scheduled", icon: Clock,        cls: "bg-blue-100 text-blue-700",    row: "border-l-blue-400" },
  expired:   { label: "Expired",   icon: XCircle,      cls: "bg-red-100 text-red-700",      row: "border-l-red-400" },
  failed:    { label: "Failed",    icon: XCircle,      cls: "bg-red-100 text-red-700",      row: "border-l-red-400" },
};

const STATUS_FILTERS = [
  { value: "all",            label: "All" },
  { value: "completed",      label: "Completed" },
  { value: "expiring_soon",  label: "Expiring Soon" },
  { value: "expired",        label: "Expired" },
  { value: "scheduled",      label: "Scheduled" },
  { value: "failed",         label: "Failed" },
];

const CATEGORY_COLORS = {
  safeguarding:          "bg-purple-100 text-purple-700",
  fire_safety:           "bg-orange-100 text-orange-700",
  first_aid:             "bg-red-100 text-red-700",
  manual_handling:       "bg-blue-100 text-blue-700",
  infection_control:     "bg-teal-100 text-teal-700",
  medication:            "bg-pink-100 text-pink-700",
  mental_health:         "bg-indigo-100 text-indigo-700",
  food_hygiene:          "bg-amber-100 text-amber-700",
  data_protection:       "bg-slate-100 text-slate-600",
  equality_diversity:    "bg-cyan-100 text-cyan-700",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return null;
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(record) {
  if (record.status !== "completed" || !record.expiry_date) return false;
  const days = daysUntil(record.expiry_date);
  return days !== null && days >= 0 && days <= 30;
}

// ── Compliance gauge (SVG) ──────────────────────────────────────────────────────

function ComplianceGauge({ pct }) {
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="hsl(var(--muted))" strokeWidth="3"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeDasharray={`${pct}, 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{pct}%</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PerformanceTrainingTab({ summary, staffProfile }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");

  const staffId = staffProfile?.id;
  const metrics = summary?.metrics ?? {};
  const compliancePct    = metrics.training_compliance_pct ?? 0;
  const expiringSoonCount = metrics.training_expiring_soon ?? 0;

  // ── Fetch training records ──────────────────────────────────────────────────
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["training-records", staffId],
    queryFn: () => secureGateway.filter(
      "TrainingRecord",
      { staff_id: staffId },
      "-completion_date",
      200,
    ),
    enabled: !!staffId,
    staleTime: 2 * 60 * 1000,
  });

  // ── Derived stats ───────────────────────────────────────────────────────────
  const completedCount = useMemo(() => records.filter(r => r.status === "completed").length, [records]);
  const expiredCount   = useMemo(() => records.filter(r => r.status === "expired").length, [records]);
  const expiringSoon   = useMemo(() => records.filter(isExpiringSoon), [records]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter === "expiring_soon") list = expiringSoon;
    else if (statusFilter !== "all") list = records.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        r.provider?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [records, statusFilter, search, expiringSoon]);

  return (
    <div className="space-y-5">

      {/* Compliance summary card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row gap-6 sm:items-center">
        <ComplianceGauge pct={compliancePct} />

        <div className="flex-1 space-y-1">
          <p className="font-semibold">Training Compliance</p>
          <p className="text-sm text-muted-foreground">
            {compliancePct >= 80
              ? "You are meeting your training requirements."
              : compliancePct >= 60
              ? "Some training needs attention."
              : "Several training items require urgent action."}
          </p>
        </div>

        {/* Quick stat pills */}
        <div className="flex sm:flex-col gap-3 shrink-0 sm:border-l sm:pl-6 border-border">
          <StatPill
            icon={CheckCircle2}
            color="text-green-600"
            label="Completed"
            value={completedCount}
          />
          <StatPill
            icon={AlertTriangle}
            color="text-amber-500"
            label="Expiring Soon"
            value={expiringSoon.length}
          />
          <StatPill
            icon={XCircle}
            color="text-red-500"
            label="Expired"
            value={expiredCount}
          />
        </div>
      </div>

      {/* Expiring soon alert banner */}
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{expiringSoon.length} training certificate{expiringSoon.length !== 1 ? "s" : ""}</span>{" "}
            expiring within 30 days:{" "}
            <span className="font-medium">
              {expiringSoon.map(r => r.title).join(", ")}
            </span>
          </p>
        </div>
      )}

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => {
            const count = f.value === "expiring_soon" ? expiringSoon.length
              : f.value === "all" ? records.length
              : records.filter(r => r.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                {count > 0 && (
                  <span className={cn(
                    "ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    statusFilter === f.value
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search training…"
            className="pl-8 h-8 text-xs w-52"
          />
        </div>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasRecords={records.length > 0} />
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden divide-y divide-border">
          {filtered.map(r => (
            <TrainingRow key={r.id} record={r} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── TrainingRow ─────────────────────────────────────────────────────────────────

function TrainingRow({ record: r }) {
  const cfg      = STATUS_CONFIG[r.status] ?? { label: r.status, icon: GraduationCap, cls: "bg-muted text-muted-foreground", row: "border-l-muted" };
  const StatusIcon = cfg.icon;
  const catCls   = CATEGORY_COLORS[r.category?.toLowerCase().replace(/ /g, "_")] ?? "bg-slate-100 text-slate-600";
  const expiring = isExpiringSoon(r);
  const daysLeft = r.expiry_date ? daysUntil(r.expiry_date) : null;

  return (
    <div className={cn("flex items-start gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors border-l-4", cfg.row)}>
      {/* Status icon */}
      <StatusIcon className={cn(
        "w-4 h-4 shrink-0 mt-0.5",
        r.status === "completed" ? "text-green-500" :
        r.status === "expired" || r.status === "failed" ? "text-red-500" :
        "text-blue-500",
      )} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <p className="text-sm font-medium leading-snug">{r.title}</p>
          {expiring && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              {daysLeft === 0 ? "Expires today" : `${daysLeft}d left`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          {r.category && (
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded", catCls)}>
              <Tag className="w-2.5 h-2.5" />
              {r.category.replace(/_/g, " ")}
            </span>
          )}
          {r.provider && (
            <span className="text-xs text-muted-foreground">{r.provider}</span>
          )}
          {r.score > 0 && (
            <span className="text-xs text-muted-foreground">Score: {r.score}%</span>
          )}
        </div>
      </div>

      {/* Dates + certificate */}
      <div className="text-right shrink-0 space-y-1">
        {r.completion_date && (
          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
            <CalendarDays className="w-3 h-3" />
            {formatDate(r.completion_date)}
          </p>
        )}
        {r.expiry_date && (
          <p className={cn(
            "text-xs flex items-center justify-end gap-1",
            expiring ? "text-amber-600 font-semibold" :
            r.status === "expired" ? "text-red-600 font-semibold" :
            "text-muted-foreground",
          )}>
            <span className="text-[10px]">Exp.</span>
            {formatDate(r.expiry_date)}
          </p>
        )}
        {r.certificate_url && (
          <a
            href={r.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-primary font-medium hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Certificate
          </a>
        )}
      </div>

      {/* Status badge */}
      <span className={cn(
        "shrink-0 self-center px-2 py-0.5 rounded-full text-[10px] font-semibold",
        cfg.cls,
      )}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── StatPill ───────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("w-4 h-4 shrink-0", color)} />
      <div>
        <p className="text-base font-bold leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

function EmptyState({ hasRecords }) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <GraduationCap className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-semibold text-base mb-1">
        {hasRecords ? "No records match your filter" : "No training records yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {hasRecords
          ? "Try a different status filter or clear your search."
          : "Completed training will appear here once recorded by your manager."}
      </p>
    </div>
  );
}
