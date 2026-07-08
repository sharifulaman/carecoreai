import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ROLE_LABELS, ROLE_LINE } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, UserCog, MoreVertical, ExternalLink, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const LINE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700",
  care:        "bg-blue-100 text-blue-700",
  finance:     "bg-green-100 text-green-700",
  admin:       "bg-amber-100 text-amber-700",
  hr:          "bg-pink-100 text-pink-700",
  risk:        "bg-red-100 text-red-700",
  portal:      "bg-slate-100 text-slate-600",
};

const ROLE_BADGE_COLORS = {
  admin:                "bg-purple-100 text-purple-700",
  support_worker:       "bg-blue-100 text-blue-700",
  team_leader:          "bg-teal-100 text-teal-700",
  finance_officer:      "bg-green-100 text-green-700",
  finance_manager:      "bg-green-100 text-green-700",
  hr_officer:           "bg-pink-100 text-pink-700",
  hr_manager:           "bg-pink-100 text-pink-700",
  maintenance_officer:  "bg-orange-100 text-orange-700",
  rsm:                  "bg-purple-100 text-purple-700",
  regional_manager:     "bg-indigo-100 text-indigo-700",
};

const STATUS_DOT = { active: "bg-green-500", inactive: "bg-slate-300", suspended: "bg-red-500" };

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(r => !["resident", "external", "guest"].includes(r));
const ALL_LINES = [...new Set(Object.values(ROLE_LINE))].filter(Boolean);
const PAGE_SIZE = 5;

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = [
    "bg-blue-200 text-blue-700",
    "bg-purple-200 text-purple-700",
    "bg-teal-200 text-teal-700",
    "bg-amber-200 text-amber-700",
    "bg-pink-200 text-pink-700",
    "bg-green-200 text-green-700",
    "bg-red-200 text-red-700",
  ];
  const idx = name ? name.charCodeAt(0) % palette.length : 0;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${palette[idx]}`}>
      {initials}
    </div>
  );
}

function DropdownMenu({ staffId, staffName, onEdit, onNavigate, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 bg-white border border-border rounded-lg shadow-lg w-44 py-1 text-sm">
      <button onClick={() => { onEdit(); onClose(); }} className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2">
        <UserCog className="w-3.5 h-3.5 text-muted-foreground" /> Change Role
      </button>
      <button onClick={() => { onNavigate(); onClose(); }} className="w-full text-left px-4 py-2 hover:bg-muted flex items-center gap-2">
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> View Profile
      </button>
    </div>
  );
}

export default function StaffRoleAssignments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterLine, setFilterLine] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-roles"],
    queryFn: () => secureGateway.filter("StaffProfile", {}, "-created_date", 300),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = staff.filter(s => {
    const matchSearch = !search ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    const matchLine = filterLine === "all" || ROLE_LINE[s.role] === filterLine;
    return matchSearch && matchRole && matchLine;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build smart page range: always show first, last, current ±1, with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = new Set([1, totalPages, page, page - 1, page + 1].filter(p => p >= 1 && p <= totalPages));
    const sorted = [...pages].sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push("...");
      result.push(p);
    });
    return result;
  };

  const handleSave = async (staffId) => {
    setSaving(true);
    await base44.entities.StaffProfile.update(staffId, { role: editRole });
    queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    setSaving(false);
    setEditingId(null);
    toast.success("Role updated successfully");
  };

  const handleCancel = () => { setEditingId(null); setEditRole(""); };

  const startEdit = (s) => { setEditingId(s.id); setEditRole(s.role || "support_worker"); setOpenMenuId(null); };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h2 className="text-base font-bold text-foreground">Staff Role Assignments</h2>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            placeholder="Search staff..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={filterRole} onValueChange={v => { setFilterRole(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterLine} onValueChange={v => { setFilterLine(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-32">
            <SelectValue placeholder="All Lines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lines</SelectItem>
            {ALL_LINES.map(l => <SelectItem key={l} value={l}>{l.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          onClick={() => { setSearch(""); setFilterRole("all"); setFilterLine("all"); setPage(1); }}
          className="h-9 w-9 border border-border rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          title="Reset filters"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Staff</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Email</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Current Role</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Line</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading staff...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No staff found.</td></tr>
            ) : paginated.map(s => {
              const isEditing = editingId === s.id;
              const line = ROLE_LINE[s.role] || "care";
              const status = s.status || "active";
              return (
                <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.full_name} />
                      <span className="font-medium text-sm text-foreground">{s.full_name || "—"}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{s.email || "—"}</td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map(r => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_BADGE_COLORS[s.role] || "bg-slate-100 text-slate-600"}`}>
                        {ROLE_LABELS[s.role] || s.role || "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${LINE_COLORS[line] || "bg-slate-100 text-slate-600"}`}>
                      {line?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status] || STATUS_DOT.active}`} />
                      <span className="text-xs capitalize text-foreground font-medium">{status}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSave(s.id)}
                          disabled={saving}
                          className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 relative">
                        {/* Change Role */}
                        <button
                          onClick={() => startEdit(s)}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Change role"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                        {/* View Profile */}
                        <button
                          onClick={() => navigate("/staff")}
                          className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View staff profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {/* More options */}
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title="More options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                          {openMenuId === s.id && (
                            <DropdownMenu
                              staffId={s.id}
                              staffName={s.full_name}
                              onEdit={() => startEdit(s)}
                              onNavigate={() => navigate("/staff")}
                              onClose={() => setOpenMenuId(null)}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {filtered.length === 0
            ? "No staff members"
            : `Showing ${(page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} staff members`
          }
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {getPageNumbers().map((n, i) =>
            n === "..." ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-muted-foreground">…</span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-7 h-7 rounded border text-xs font-medium transition-colors ${
                  page === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}