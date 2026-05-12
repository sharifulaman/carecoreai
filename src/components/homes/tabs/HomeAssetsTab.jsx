import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const CATEGORIES = ["furniture", "appliance", "electronics", "vehicle", "equipment", "other"];
const CONDITIONS = ["excellent", "good", "fair", "poor", "written_off"];
const CONDITION_COLOR = { excellent: "bg-green-500/10 text-green-600", good: "bg-blue-500/10 text-blue-600", fair: "bg-amber-500/10 text-amber-600", poor: "bg-red-500/10 text-red-600", written_off: "bg-muted text-muted-foreground" };

const EMPTY = { name: "", category: "other", serial_number: "", purchase_date: "", purchase_cost: "", condition: "good", location_in_home: "", warranty_expiry: "", notes: "" };

export default function HomeAssetsTab({ homeId, homeName }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: assets = [] } = useQuery({
    queryKey: ["home-assets", homeId],
    queryFn: () => base44.entities.HomeAsset.filter({ org_id: ORG_ID, home_id: homeId }, "name", 100),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.HomeAsset.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-assets", homeId] }); setShowForm(false); setForm(EMPTY); toast.success("Asset added"); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeAsset.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-assets", homeId] }); toast.success("Asset updated"); },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("Asset name required"); return; }
    create.mutate({ org_id: ORG_ID, home_id: homeId, home_name: homeName, ...form, purchase_cost: form.purchase_cost ? parseFloat(form.purchase_cost) : null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assets ({assets.length})</h3>
        <Button className="gap-2 rounded-xl text-sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add Asset
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input placeholder="Asset name *" value={form.name} onChange={e => f("name", e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Condition</p>
              <Select value={form.condition} onValueChange={v => f("condition", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Serial number" value={form.serial_number} onChange={e => f("serial_number", e.target.value)} />
            <Input placeholder="Location in home" value={form.location_in_home} onChange={e => f("location_in_home", e.target.value)} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Purchase Date</p>
              <Input type="date" value={form.purchase_date} onChange={e => f("purchase_date", e.target.value)} />
            </div>
            <Input type="number" placeholder="Purchase cost £" value={form.purchase_cost} onChange={e => f("purchase_cost", e.target.value)} />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Warranty Expiry</p>
              <Input type="date" value={form.warranty_expiry} onChange={e => f("warranty_expiry", e.target.value)} />
            </div>
            <Input placeholder="Notes" value={form.notes} onChange={e => f("notes", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl" onClick={handleSubmit} disabled={create.isPending}>Save Asset</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {assets.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">No assets recorded yet.</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Asset", "Category", "Location", "Condition", "Cost"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.name}</p>
                    {a.serial_number && <p className="text-xs text-muted-foreground">S/N: {a.serial_number}</p>}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{a.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.location_in_home || "—"}</td>
                  <td className="px-4 py-3">
                    <Select value={a.condition} onValueChange={v => update.mutate({ id: a.id, data: { condition: v } })}>
                      <SelectTrigger className={`h-7 text-xs rounded-lg border-0 w-auto px-2 ${CONDITION_COLOR[a.condition]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{CONDITIONS.map(c => <SelectItem key={c} value={c} className="capitalize text-xs">{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.purchase_cost ? `£${a.purchase_cost}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}