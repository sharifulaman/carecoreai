import { useState } from "react";
import { Search, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TrainingStatusBadge, { calcTrainingStatus } from "./TrainingStatusBadge";
import TrainingRecordModal from "./TrainingRecordModal";

const ROLE_COLORS = {
  admin: "bg-red-500",
  admin_officer: "bg-orange-500",
  team_leader: "bg-purple-500",
  support_worker: "bg-blue-500",
};

const OVERALL_CONFIG = {
  "Compliant":     { bg: "bg-green-100",  text: "text-green-700",  icon: "✓" },
  "At Risk":       { bg: "bg-amber-100",  text: "text-amber-700",  icon: "⚠" },
  "Non-Compliant": { bg: "bg-red-100",    text: "text-red-700",    icon: "✕" },
};

const PAGE_SIZE = 20;

function abbrev(name) {
  if (!name) return "";
  return name.length > 15 ? name.slice(0, 14) + "…" : name;
}

export default function TrainingMatrix({ filteredStaff, activeCourses, recordMap, requirements, staffProfile, homes = [], panelFilters = {} }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editCell, setEditCell] = useState(null);

  const isReadOnly = staffProfile?.role === "support_worker";

  const searched = filteredStaff.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(searched.length / PAGE_SIZE);
  const paged = searched.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const exportCSV = () => {
    const headers = ["Staff Name", "Home", "Role", "Overall Status", ...activeCourses.map(c => c.course_name)];
    const rows = filteredStaff.map(s => {
      const homeId = s.home_ids?.[0] || s.home_id;
      const homeName = homeMap[homeId]?.name || s.homeName || "No Home Assigned";
      const cells = activeCourses.map(c => {
        const rec = recordMap[`${s.id}__${c.course_name}`];
        return calcTrainingStatus(rec).replace(/_/g, " ");
      });
      return [s.full_name, homeName, s.role, s.overallStatus, ...cells];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "training-matrix.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-base font-semibold">Training Matrix</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search staff…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-8 h-8 text-xs w-44"
            />
          </div>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5 h-8 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* No courses message */}
      {activeCourses.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-center">
          No training courses found. Courses are being seeded automatically — please wait a moment and refresh.
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-auto max-h-[600px]">
        <table className="text-xs min-w-max w-full">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-3 py-2.5 font-semibold sticky left-0 bg-muted/50 z-30 min-w-[180px]">Staff Member</th>
              <th className="text-left px-3 py-2.5 font-semibold min-w-[110px]">Home</th>
              <th className="text-left px-3 py-2.5 font-semibold min-w-[100px]">Role</th>
              {activeCourses.length > 0 && (
                <th colSpan={activeCourses.length} className="text-center px-3 py-1.5 font-semibold border-b border-border/50 bg-blue-50/50 text-blue-700">
                  Training Modules
                </th>
              )}
              <th className="text-center px-3 py-2.5 font-semibold sticky right-0 bg-muted/50 z-30 min-w-[120px]">Overall Status</th>
            </tr>
            {activeCourses.length > 0 && (
              <tr className="border-b border-border bg-muted/30">
                <th className="sticky left-0 bg-muted/30 z-30" />
                <th />
                <th />
                {activeCourses.map(c => (
                  <th key={c.id} className="text-center px-2 py-2 font-medium max-w-[90px] min-w-[80px] bg-muted/30">
                    <div className="truncate text-[10px]" title={c.course_name}>{abbrev(c.course_name)}</div>
                  </th>
                ))}
                <th className="sticky right-0 bg-muted/30 z-30" />
              </tr>
            )}
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={activeCourses.length + 4} className="py-12 text-center text-muted-foreground">
                  No staff found
                </td>
              </tr>
            ) : paged.map(s => {
              const initials = s.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
              const avatarColor = ROLE_COLORS[s.role] || "bg-slate-400";
              const overall = OVERALL_CONFIG[s.overallStatus] || OVERALL_CONFIG["Compliant"];
              // Resolve home name — prefer pre-computed from useTrainingData, fallback to homeMap
              const homeId = s.home_ids?.[0] || s.home_id;
              const homeName = s.homeName || homeMap[homeId]?.name || (homeId ? homeId.slice(0, 8) + "…" : "—");

              return (
                <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                  <td className="px-3 py-2 sticky left-0 bg-card hover:bg-muted/10 z-10">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full ${avatarColor} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                        {initials}
                      </div>
                      <span className="font-medium truncate max-w-[130px]" title={s.full_name}>{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    <span title={homeName}>{homeName.length > 18 ? homeName.slice(0, 17) + "…" : homeName}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground capitalize text-xs">
                    {s.role?.replace(/_/g, " ")}
                  </td>
                  {activeCourses.map(c => {
                    const rec = recordMap[`${s.id}__${c.course_name}`];
                    const status = calcTrainingStatus(rec);
                    return (
                      <td
                        key={c.id}
                        className={`px-2 py-2 text-center ${!isReadOnly ? "cursor-pointer hover:bg-primary/5" : ""}`}
                        onClick={() => !isReadOnly && setEditCell({ staffMember: s, course: c, existingRecord: rec || null })}
                        title={!isReadOnly ? `${s.full_name} — ${c.course_name}` : ""}
                      >
                        <TrainingStatusBadge status={status} small />
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center sticky right-0 bg-card hover:bg-muted/10 z-10">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${overall.bg} ${overall.text}`}>
                      {overall.icon} {s.overallStatus}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, searched.length)} of {searched.length}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 text-xs px-2">← Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 text-xs px-2">Next →</Button>
          </div>
        </div>
      )}

      {/* Summary counts */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{filteredStaff.filter(s => s.overallStatus === "Compliant").length} Compliant</span>
        <span className="text-amber-600">{filteredStaff.filter(s => s.overallStatus === "At Risk").length} At Risk</span>
        <span className="text-red-600">{filteredStaff.filter(s => s.overallStatus === "Non-Compliant").length} Non-Compliant</span>
        <span className="ml-auto">{activeCourses.length} courses tracked</span>
      </div>

      {editCell && (
        <TrainingRecordModal
          staffMember={editCell.staffMember}
          course={editCell.course}
          existingRecord={editCell.existingRecord}
          requirements={requirements}
          onClose={() => setEditCell(null)}
          staffProfile={staffProfile}
        />
      )}
    </div>
  );
}