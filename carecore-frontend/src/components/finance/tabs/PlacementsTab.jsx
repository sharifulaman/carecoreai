import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { secureGateway } from "@/lib/secureGateway";
import { UK_LOCAL_AUTHORITIES } from "@/lib/ukLocalAuthorities";
import { fmtGBP } from "@/lib/ukLocalAuthorities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Edit2, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format, addMonths } from "date-fns";

const SOCIAL_WORKERS_LIST = [
  { name: "Sarah Mitchell",    email: "s.mitchell@croydon.gov.uk",    phone: "020 8726 6000", la: "Croydon" },
  { name: "James Okafor",      email: "j.okafor@lambeth.gov.uk",      phone: "020 7926 1000", la: "Lambeth" },
  { name: "Priya Sharma",      email: "p.sharma@brent.gov.uk",        phone: "020 8937 1200", la: "Brent" },
  { name: "Daniel Thompson",   email: "d.thompson@manchester.gov.uk", phone: "0161 234 5000", la: "Manchester" },
  { name: "Emma Fitzpatrick",  email: "e.fitzpatrick@leeds.gov.uk",   phone: "0113 222 4444", la: "Leeds" },
  { name: "Mohammed Al-Amin",  email: "m.alamin@birmingham.gov.uk",   phone: "0121 303 9944", la: "Birmingham" },
  { name: "Rachel Osei",       email: "r.osei@lewisham.gov.uk",       phone: "020 8314 6000", la: "Lewisham" },
  { name: "Connor Walsh",      email: "c.walsh@liverpool.gov.uk",     phone: "0151 233 3000", la: "Liverpool" },
  { name: "Fatima Hassan",     email: "f.hassan@haringey.gov.uk",     phone: "020 8489 0000", la: "Haringey" },
  { name: "David Nkemdirim",   email: "d.nkemdirim@southwark.gov.uk", phone: "020 7525 5000", la: "Southwark" },
  { name: "Aisha Begum",       email: "a.begum@tower-hamlets.gov.uk", phone: "020 7364 5000", la: "Tower Hamlets" },
  { name: "Tom Griffiths",     email: "t.griffiths@cardiff.gov.uk",   phone: "029 2087 2087", la: "Cardiff" },
  { name: "Naomi Clarke",      email: "n.clarke@bristol.gov.uk",      phone: "0117 922 2000", la: "Bristol" },
  { name: "Yusuf Ibrahim",     email: "y.ibrahim@sheffield.gov.uk",   phone: "0114 273 4567", la: "Sheffield" },
  { name: "Laura Patel",       email: "l.patel@nottingham.gov.uk",    phone: "0115 915 5555", la: "Nottingham" },
  { name: "Kevin Mensah",      email: "k.mensah@ealing.gov.uk",       phone: "020 8825 5000", la: "Ealing" },
  { name: "Siobhan Murphy",    email: "s.murphy@newcastle.gov.uk",    phone: "0191 278 7878", la: "Newcastle upon Tyne" },
  { name: "Omar Abdullahi",    email: "o.abdullahi@hackney.gov.uk",   phone: "020 8356 3000", la: "Hackney" },
  { name: "Grace Okonkwo",     email: "g.okonkwo@wolverhampton.gov.uk", phone: "01902 551155", la: "Wolverhampton" },
  { name: "Ben Ashworth",      email: "b.ashworth@lancashire.gov.uk", phone: "01772 254868", la: "Lancashire" },
];

const STATUS_COLOURS = { active: "bg-green-100 text-green-700", ended: "bg-slate-100 text-slate-600", suspended: "bg-amber-100 text-amber-700", paused: "bg-amber-100 text-amber-700" };

function reviewColour(dateStr) {
  if (!dateStr) return "";
  const days = differenceInDays(new Date(dateStr), new Date());
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 30) return "text-amber-600 font-medium";
  return "text-green-600";
}

export default function PlacementsTab({ placements, homes, residents, visibleHomes, visibleHomeIds, isAdmin, isSW }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterHome, setFilterHome] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [filterLA, setFilterLA] = useState("all");

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  const filtered = useMemo(() => placements.filter(p => {
    const res = residentMap[p.resident_id];
    if (!visibleHomeIds.has(p.home_id)) return false;
    if (filterHome !== "all" && p.home_id !== filterHome) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterLA !== "all" && p.local_authority !== filterLA) return false;
    if (search && !res?.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [placements, filterHome, filterStatus, filterLA, search, visibleHomeIds]);

  const totalWeekly = filtered.filter(p => p.status === "active").reduce((s, p) => s + (p.weekly_rate || 0), 0);
  const allLAs = [...new Set(placements.map(p => p.local_authority).filter(Boolean))].sort();

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search resident…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs w-44" />
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All Homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {visibleHomes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterLA} onValueChange={setFilterLA}>
          <SelectTrigger className="h-8 text-xs w-48"><SelectValue placeholder="All LAs" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Local Authorities</SelectItem>
            {allLAs.map(la => <SelectItem key={la} value={la}>{la}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Weekly total: <strong>{fmtGBP(totalWeekly)}</strong></span>
          {!isSW && (
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Placement Fee
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-xs">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">Local Authority</th>
              <th className="text-left px-4 py-3 font-semibold">Social Worker</th>
              <th className="text-right px-4 py-3 font-semibold">Weekly Rate</th>
              <th className="text-right px-4 py-3 font-semibold">Daily Rate</th>
              <th className="text-left px-4 py-3 font-semibold">Start Date</th>
              <th className="text-left px-4 py-3 font-semibold">Review Date</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No placement fees found</td></tr>
            ) : filtered.map(p => {
              const res = residentMap[p.resident_id];
              const home = homeMap[p.home_id];
              const daily = (p.weekly_rate || 0) / 7;
              return (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/residents?search=${res?.display_name}`)} className="flex items-center gap-2 hover:text-primary">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {res?.initials || res?.display_name?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium">{res?.display_name || "—"}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/homes/${p.home_id}`)} className="hover:text-primary text-left">{home?.name || "—"}</button>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.local_authority || "—"}</td>
                  <td className="px-4 py-3 text-xs">{p.social_worker_name || p.la_contact_name || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium">{fmtGBP(p.weekly_rate || 0)}</td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmtGBP(daily)}/day</td>
                  <td className="px-4 py-3 text-xs">{p.fee_start_date || p.placement_start_date || "—"}</td>
                  <td className={`px-4 py-3 text-xs ${reviewColour(p.review_date)}`}>{p.review_date || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[p.status] || "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Placement Fee Side Panel */}
      {showForm && <PlacementFeeSlideOver homes={visibleHomes} residents={residents} onClose={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["placement-fees"] }); }} />}
    </div>
  );
}

function PlacementFeeSlideOver({ homes, residents, onClose }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const reviewDefault = format(addMonths(new Date(), 3), "yyyy-MM-dd");
  const [laSearch, setLaSearch] = useState("");
  const [swSearch, setSwSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    resident_id: "", home_id: "", local_authority: "", la_reference: "",
    la_address_line1: "", la_city: "", la_postcode: "", la_email: "", la_phone: "",
    social_worker_name: "", social_worker_email: "", social_worker_phone: "",
    weekly_rate: "", rate_basis: "7_day", placement_start_date: today,
    placement_end_date: "", review_date: reviewDefault, invoicing_day: "1", payment_terms: "30", notes: "",
    status: "active",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const weekly = parseFloat(form.weekly_rate) || 0;
  const daily = weekly / (form.rate_basis === "5_day" ? 5 : 7);
  const monthly = (weekly * 52) / 12;

  const filteredLAs = useMemo(() => {
    if (!laSearch) return UK_LOCAL_AUTHORITIES.slice(0, 10);
    return UK_LOCAL_AUTHORITIES.filter(la => la.label.toLowerCase().includes(laSearch.toLowerCase())).slice(0, 20);
  }, [laSearch]);

  const filteredSWs = useMemo(() => {
    if (!swSearch) return SOCIAL_WORKERS_LIST.slice(0, 10);
    return SOCIAL_WORKERS_LIST.filter(sw => sw.name.toLowerCase().includes(swSearch.toLowerCase()));
  }, [swSearch]);

  const homeResidents = residents.filter(r => r.home_id === form.home_id && r.status === "active");

  const handleSave = async () => {
    if (!form.resident_id || !form.home_id || !form.local_authority || !weekly) {
      toast.error("Please fill in all required fields"); return;
    }
    setSaving(true);
    await secureGateway.create("PlacementFee", {
      ...form,
      weekly_rate: weekly,
      monthly_equivalent: monthly,
      invoice_day: parseInt(form.invoicing_day) || 1,
      payment_terms: parseInt(form.payment_terms) || 30,
    });
    qc.invalidateQueries({ queryKey: ["placement-fees"] });
    toast.success("Placement fee saved");
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold">Add Placement Fee</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resident & Home</p>
            <div>
              <label className="text-xs font-medium">Home *</label>
              <Select value={form.home_id} onValueChange={v => { set("home_id", v); set("resident_id", ""); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select home…" /></SelectTrigger>
                <SelectContent>{homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.home_id && (
              <div>
                <label className="text-xs font-medium">Resident *</label>
                <Select value={form.resident_id} onValueChange={v => set("resident_id", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select resident…" /></SelectTrigger>
                  <SelectContent>{homeResidents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Placement Start Date *</label>
                <Input type="date" value={form.placement_start_date} onChange={e => set("placement_start_date", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Placement End Date</label>
                <Input type="date" value={form.placement_end_date} onChange={e => set("placement_end_date", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Local Authority</p>
            <div>
              <label className="text-xs font-medium">Local Authority *</label>
              <Input className="mt-1" placeholder="Search LA…" value={laSearch || form.local_authority}
                onChange={e => { setLaSearch(e.target.value); set("local_authority", ""); }} />
              {laSearch && !form.local_authority && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-popover text-sm mt-1">
                  {filteredLAs.map(la => (
                    <button key={la.value} className="w-full text-left px-3 py-2 hover:bg-muted text-xs"
                      onClick={() => { set("local_authority", la.value); set("la_city", la.group.split("—").pop().trim()); setLaSearch(la.label); }}>
                      {la.label} <span className="text-muted-foreground ml-1">{la.group}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium">LA Reference Number</label>
              <Input className="mt-1" placeholder="e.g. LA-2026-0042" value={form.la_reference} onChange={e => set("la_reference", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">LA Email</label><Input className="mt-1" type="email" value={form.la_email} onChange={e => set("la_email", e.target.value)} /></div>
              <div><label className="text-xs font-medium">LA Phone</label><Input className="mt-1" value={form.la_phone} onChange={e => set("la_phone", e.target.value)} /></div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Social Worker</p>
            <div>
              <label className="text-xs font-medium">Social Worker</label>
              <Input className="mt-1" placeholder="Search or type name…" value={swSearch || form.social_worker_name}
                onChange={e => { setSwSearch(e.target.value); set("social_worker_name", e.target.value); }} />
              {swSearch && (
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-popover text-sm mt-1">
                  {filteredSWs.map(sw => (
                    <button key={sw.name} className="w-full text-left px-3 py-2 hover:bg-muted text-xs"
                      onClick={() => { set("social_worker_name", sw.name); set("social_worker_email", sw.email); set("social_worker_phone", sw.phone); setSwSearch(""); }}>
                      {sw.name} <span className="text-muted-foreground">({sw.la})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">SW Email</label><Input className="mt-1" type="email" value={form.social_worker_email} onChange={e => set("social_worker_email", e.target.value)} /></div>
              <div><label className="text-xs font-medium">SW Phone</label><Input className="mt-1" value={form.social_worker_phone} onChange={e => set("social_worker_phone", e.target.value)} /></div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fee Details</p>
            <div>
              <label className="text-xs font-medium">Weekly Rate (£) *</label>
              <Input className="mt-1" type="number" step="0.01" placeholder="e.g. 3500" value={form.weekly_rate} onChange={e => set("weekly_rate", e.target.value)} />
              {weekly > 0 && (
                <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                  <p>Daily rate: <strong>{fmtGBP(daily)}/day</strong></p>
                  <p>Monthly estimate: <strong>{fmtGBP(monthly)}/month</strong></p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium">Rate Basis</label>
              <div className="flex mt-1 rounded-lg border border-border overflow-hidden w-fit">
                {["7_day", "5_day"].map(v => (
                  <button key={v} onClick={() => set("rate_basis", v)}
                    className={`px-4 py-1.5 text-xs ${form.rate_basis === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}>
                    {v === "7_day" ? "7-day week" : "5-day week"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Review Date</label>
                <Input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Invoice Day (1–28)</label>
                <Input type="number" min="1" max="28" value={form.invoicing_day} onChange={e => set("invoicing_day", e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Payment Terms (days)</label>
              <Input type="number" value={form.payment_terms} onChange={e => set("payment_terms", e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Notes</label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Placement Fee"}</Button>
        </div>
      </div>
    </div>
  );
}