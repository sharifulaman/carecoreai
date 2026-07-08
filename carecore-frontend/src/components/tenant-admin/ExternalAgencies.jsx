import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Eye, MoreVertical, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import AgencyForm from "./AgencyForm";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPE_LABELS = {
  staffing: "Staffing",
  specialist_support: "Specialist Support",
  therapeutic: "Therapeutic",
  educational: "Educational",
  health: "Health Service",
  other: "Other",
  commissioner: "Commissioner",
  statutory: "Statutory",
  supplier: "Supplier",
};

const STATUS_STYLES = {
  active:     "bg-green-100 text-green-700",
  on_hold:    "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
  pending:    "bg-blue-100 text-blue-700",
};

const PAGE_SIZE = 5;

export default function ExternalAgencies({ agencies, onRefetch, onAddAgency }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editAgency, setEditAgency] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = agencies.filter(a =>
    !search ||
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSubmit = async (formData) => {
    setSaving(true);
    if (editAgency) {
      await base44.entities.Agency.update(editAgency.id, formData);
      toast.success("Agency updated");
    } else {
      await base44.entities.Agency.create({ ...formData, org_id: ORG_ID });
      toast.success("Agency added");
    }
    queryClient.invalidateQueries({ queryKey: ["agencies"] });
    onRefetch();
    setSaving(false);
    setEditAgency(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Agency.delete(id);
    queryClient.invalidateQueries({ queryKey: ["agencies"] });
    onRefetch();
    setConfirmDelete(null);
    toast.success("Agency deleted");
  };

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
        <Building2 className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">No agencies configured</p>
      <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
        Add external agencies such as local authorities, safeguarding contacts, NHS services, maintenance contractors and training providers.
      </p>
      <Button size="sm" className="gap-1.5" onClick={onAddAgency}>
        <Plus className="w-3.5 h-3.5" /> Add First Agency
      </Button>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground">External Agencies & Contacts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage external organisations, contacts and contract status</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              placeholder="Search agencies..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring w-44"
            />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 h-8">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <Button size="sm" className="gap-1.5 h-8" onClick={onAddAgency}>
            <Plus className="w-3.5 h-3.5" /> Add Agency
          </Button>
        </div>
      </div>

      {filtered.length === 0 && !search ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div />
          <EmptyState />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No agencies match your search.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Agency</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Primary Contact</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Email</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Contract Status</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Last Review</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((a, i) => {
                  const lastReview = a.contract_end
                    ? format(new Date(a.contract_end), "dd MMM yyyy")
                    : a.updated_date
                    ? format(new Date(a.updated_date), "dd MMM yyyy")
                    : "Not reviewed";
                  return (
                    <tr key={a.id} className={`border-b border-border/30 last:border-0 hover:bg-muted/10 ${i % 2 !== 0 ? "bg-muted/5" : ""}`}>
                      <td className="py-2.5 px-3 font-medium text-sm">{a.name}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{TYPE_LABELS[a.type] || a.type || "—"}</td>
                      <td className="py-2.5 px-3 text-sm">{a.contact_name || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{a.contact_email || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[a.status] || "bg-slate-100 text-slate-600"}`}>
                          {a.status?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-muted-foreground">{lastReview}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setEditAgency(a)}>
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="text-muted-foreground hover:text-foreground p-1" onClick={() => setConfirmDelete(a.id)}>
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} agencies
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="w-3 h-3" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-6 h-6 rounded border text-xs font-medium ${page === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-6 h-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Agency Form */}
      {editAgency && (
        <AgencyForm
          agency={editAgency}
          saving={saving}
          onSubmit={handleSubmit}
          onClose={() => setEditAgency(null)}
        />
      )}

      {/* Confirm Delete */}
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