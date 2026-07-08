import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react";
import AgencyForm from "./AgencyForm";

const TYPE_LABELS = {
  staffing: "Staffing",
  specialist_support: "Specialist Support",
  therapeutic: "Therapeutic",
  educational: "Educational",
  health: "Health",
  other: "Other",
};

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  on_hold: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};

export default function AgencyListTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editAgency, setEditAgency] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data: agencies = [], isLoading } = useQuery({
    queryKey: ["agencies"],
    queryFn: () => base44.entities.Agency.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = agencies.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.contact_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (formData) => {
    setSaving(true);
    if (editAgency) {
      await base44.entities.Agency.update(editAgency.id, formData);
    } else {
      await base44.entities.Agency.create({ ...formData, org_id: ORG_ID });
    }
    queryClient.invalidateQueries({ queryKey: ["agencies"] });
    setSaving(false);
    setShowForm(false);
    setEditAgency(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Agency.delete(id);
    queryClient.invalidateQueries({ queryKey: ["agencies"] });
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search agencies..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setEditAgency(null); setShowForm(true); }}>
          <Plus className="w-3.5 h-3.5" /> Add Agency
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading agencies...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border rounded-xl">
          <Building2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No agencies yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first agency to get started</p>
          <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Agency
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Agency Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Lead Worker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Rate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr key={a.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{TYPE_LABELS[a.type] || a.type}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{a.contact_name || "—"}</div>
                    {a.contact_email && <div className="text-xs text-muted-foreground">{a.contact_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm">{a.lead_worker || "—"}</td>
                  <td className="px-4 py-3 text-sm">{a.hourly_rate ? `£${a.hourly_rate}/hr` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[a.status] || "bg-slate-100 text-slate-600"}`}>
                      {a.status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditAgency(a); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(a.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(showForm) && (
        <AgencyForm
          agency={editAgency}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => { setShowForm(false); setEditAgency(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4">
            <h3 className="font-semibold text-base mb-2">Delete Agency?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}