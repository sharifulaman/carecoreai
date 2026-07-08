// @ts-nocheck
import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmployeeRowDetail from "./EmployeeRowDetail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function scoreBadgeCls(score) {
  if (score < 0)  return "bg-slate-100 text-slate-500";
  if (score >= 90) return "bg-green-500/10 text-green-700";
  if (score >= 75) return "bg-blue-500/10 text-blue-700";
  if (score >= 60) return "bg-amber-500/10 text-amber-700";
  return "bg-red-500/10 text-red-700";
}

function SupervisionBadge({ status }) {
  const cfg = {
    on_track:  { cls: "bg-green-100 text-green-700",  label: "On Track" },
    due_soon:  { cls: "bg-amber-100 text-amber-700",  label: "Due Soon" },
    overdue:   { cls: "bg-red-100 text-red-700",      label: "Overdue" },
    no_record: { cls: "bg-slate-100 text-slate-500",  label: "No Record" },
  }[status] ?? { cls: "bg-slate-100 text-slate-500", label: status };

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const SORT_COLS = [
  { key: "name",       label: "Name" },
  { key: "score",      label: "Score" },
  { key: "training",   label: "Training" },
  { key: "supervision",label: "Supervision" },
];

export default function EmployeePerformanceTable({
  data,
  isLoading,
  page,
  onPageChange,
  sortBy,
  onSortChange,
  user,
}) {
  const navigate    = useNavigate();
  const [expandedId, setExpandedId] = useState(null);

  const rows      = data?.data ?? [];
  const total     = data?.total ?? 0;
  const pageSize  = data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <MoreHorizontal className="w-3 h-3 opacity-30" />;
    return sortBy === col
      ? <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3" />;
  };

  if (isLoading && rows.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="h-4 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                <div className="h-2.5 w-20 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-7 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm">Employee Performance Rankings</h2>
        <span className="text-xs text-muted-foreground">
          {total} employee{total !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-8">#</th>
              {SORT_COLS.map(({ key, label }) => (
                <th key={key} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => onSortChange(key)}
                  >
                    {label}
                    <SortIcon col={key} />
                  </button>
                </th>
              ))}
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Home</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Activities</th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Attendance</th>
              <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-sm text-muted-foreground">
                  No staff match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const rank      = (page - 1) * pageSize + idx + 1;
                const expanded  = expandedId === row.staff_id;
                const scoreDisplay = row.score >= 0 ? `${row.score}%` : "N/A";

                return (
                  <Fragment key={row.staff_id}>
                    <tr
                      className={`hover:bg-muted/20 transition-colors cursor-pointer ${expanded ? "bg-muted/10" : ""}`}
                      onClick={() => setExpandedId(expanded ? null : row.staff_id)}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">{rank}</td>

                      {/* Name + role */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                            {row.staff_name?.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{row.staff_name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {row.role?.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-3 py-3">
                        <Badge className={`text-xs font-semibold ${scoreBadgeCls(row.score)}`}>
                          {scoreDisplay}
                        </Badge>
                      </td>

                      {/* Training */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 min-w-[80px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${row.training_compliance_pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium shrink-0">{row.training_compliance_pct}%</span>
                        </div>
                      </td>

                      {/* Supervision */}
                      <td className="px-3 py-3">
                        <SupervisionBadge status={row.supervision_status} />
                      </td>

                      {/* Home */}
                      <td className="px-3 py-3 text-xs text-muted-foreground truncate max-w-[120px]">
                        {row.home_name || "—"}
                      </td>

                      {/* Activities */}
                      <td className="px-3 py-3 text-xs text-center">{row.activities_count}</td>

                      {/* Attendance */}
                      <td className="px-3 py-3 text-xs text-center">
                        {row.attendance_pct > 0 ? `${row.attendance_pct}%` : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/staff?employee=${row.staff_id}`)}>
                              View Full Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/staff?employee=${row.staff_id}&ptab=performance`)}>
                              View Performance Tab
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded && (
                      <tr>
                        <td colSpan={9} className="bg-muted/10 px-6 py-4 border-b border-border">
                          <EmployeeRowDetail row={row} user={user} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs px-2">{page} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
