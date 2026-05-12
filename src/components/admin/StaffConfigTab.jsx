import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, UserCheck, UserX, Mail } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const STATUS_COLORS = {
  active: "bg-green-500/10 text-green-600",
  inactive: "bg-muted text-muted-foreground",
  suspended: "bg-red-500/10 text-red-600",
};

export default function StaffConfigTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-all"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StaffProfile.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["staff-all"] }); toast.success("Staff updated"); },
  });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email required"); return; }
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      toast.error("Failed to invite: " + err.message);
    }
  };

  const filtered = staff.filter(s => {
    const matchSearch = !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || s.role === filterRole;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB") : "—";

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Invite New User</h3>
        <div className="flex flex-wrap gap-3">
          <Input className="flex-1 min-w-[220px] text-sm" placeholder="user@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" />
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleInvite}>
            <Mail className="w-4 h-4" /> Invite
          </Button>
        </div>
      </div>

      {/* Staff list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 text-sm" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="team_leader">Team Leader</SelectItem>
              <SelectItem value="support_worker">Support Worker</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">DBS Expiry</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No staff found.</td></tr>
                ) : filtered.map((s, i) => (
                  <tr key={s.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3 font-medium text-sm">{s.full_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{s.email || "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize">{s.role?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs">
                      {s.dbs_expiry ? (
                        <span className={new Date(s.dbs_expiry) < new Date() ? "text-red-500 font-medium" : "text-foreground"}>
                          {fmtDate(s.dbs_expiry)}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[s.status] || "bg-muted"}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {s.status !== "active" && (
                        <button className="text-green-600 hover:opacity-70" title="Activate" onClick={() => updateMutation.mutate({ id: s.id, data: { status: "active" } })}>
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      {s.status !== "suspended" && (
                        <button className="text-red-500 hover:opacity-70" title="Suspend" onClick={() => updateMutation.mutate({ id: s.id, data: { status: "suspended" } })}>
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}