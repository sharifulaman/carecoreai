import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ROLE_LABELS, ROLE_LINE, ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, UserCog, Check } from "lucide-react";

const LINE_COLORS = {
  super_admin: "bg-purple-100 text-purple-700",
  care: "bg-blue-100 text-blue-700",
  finance: "bg-green-100 text-green-700",
  admin: "bg-amber-100 text-amber-700",
  hr: "bg-pink-100 text-pink-700",
  risk: "bg-red-100 text-red-700",
  portal: "bg-slate-100 text-slate-600",
};

const ASSIGNABLE_ROLES = Object.keys(ROLE_LABELS).filter(r => !["resident", "external", "guest"].includes(r));

export default function RolesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-roles"],
    queryFn: () => secureGateway.filter("StaffProfile", {}, "-created_date", 200),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = staff.filter(s =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (staffId) => {
    setSaving(true);
    await base44.entities.StaffProfile.update(staffId, { role: editRole });
    queryClient.invalidateQueries({ queryKey: ["staff-roles"] });
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    setSaving(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} staff members</span>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Current Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Line</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">No staff found.</td></tr>
            ) : filtered.map((s, i) => {
              const isEditing = editingId === s.id;
              const line = ROLE_LINE[s.role] || "care";
              return (
                <tr key={s.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{s.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{s.email || "—"}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <Select value={editRole} onValueChange={setEditRole}>
                        <SelectTrigger className="h-8 text-xs w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSIGNABLE_ROLES.map(r => (
                            <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm">{ROLE_LABELS[s.role] || s.role || "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${LINE_COLORS[line] || "bg-slate-100 text-slate-600"}`}>
                      {line?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSave(s.id)} disabled={saving}>
                          <Check className="w-3 h-3" /> Save
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button
                        size="sm" variant="ghost" className="h-7 text-xs gap-1"
                        onClick={() => { setEditingId(s.id); setEditRole(s.role || "support_worker"); }}
                      >
                        <UserCog className="w-3 h-3" /> Change Role
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}