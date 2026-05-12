import { useState, useMemo, useEffect, useRef } from "react";
import { X, Filter, ChevronLeft, ChevronRight, Pencil, CheckCircle2, Upload, Camera, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent", other: "Other",
};

const STATUS_COLORS = {
  pending: "bg-amber-500/10 text-amber-600",
  paid: "bg-green-500/10 text-green-600",
  overdue: "bg-red-500/10 text-red-600",
  disputed: "bg-purple-500/10 text-purple-600",
};

function EditBillPanel({ bill, homes, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...bill });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePropertyChange = (id) => {
    const h = homes.find(x => x.id === id);
    set("home_id", id);
    set("home_name", h?.name || "");
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("image_url", file_url);
      set("image_file_name", file.name);
      set("image_uploaded_at", new Date().toISOString());
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    }
    setUploading(false);
  };

  return (
    <div className="space-y-4 overflow-y-auto flex-1 pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Bill Type</Label>
          <Select value={form.bill_type} onValueChange={v => set("bill_type", v)}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Home</Label>
          <Select value={form.home_id} onValueChange={handlePropertyChange}>
            <SelectTrigger className="mt-1 text-sm"><SelectValue placeholder="Select home" /></SelectTrigger>
            <SelectContent>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Amount (£)</Label>
          <Input className="mt-1 text-sm" type="number" value={form.amount} onChange={e => set("amount", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Due Date</Label>
          <Input className="mt-1 text-sm" type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Supplier</Label>
        <Input className="mt-1 text-sm" value={form.supplier || ""} onChange={e => set("supplier", e.target.value)} />
      </div>

      <div>
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={v => set("status", v)}>
          <SelectTrigger className="mt-1 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.status === "paid" && (
        <div>
          <Label className="text-xs">Paid Date</Label>
          <Input className="mt-1 text-sm" type="date" value={form.paid_date || ""} onChange={e => set("paid_date", e.target.value)} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label className="text-xs">Direct Debit</Label>
        <Switch checked={!!form.is_direct_debit} onCheckedChange={v => set("is_direct_debit", v)} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Recurring</Label>
        <Switch checked={!!form.is_recurring} onCheckedChange={v => set("is_recurring", v)} />
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Input className="mt-1 text-sm" value={form.notes || ""} onChange={e => set("notes", e.target.value)} />
      </div>

      {/* Image */}
      <div className="border-t pt-3">
        <Label className="text-xs block mb-2">Bill Photo / Document</Label>
        {form.image_url ? (
          <div className="space-y-2">
            <div className="w-full h-28 bg-muted rounded-lg overflow-hidden">
              <img src={form.image_url} alt="Bill" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-muted-foreground truncate">{form.image_file_name}</p>
            <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => { set("image_url", ""); set("image_file_name", ""); set("image_uploaded_at", ""); }}>
              <Trash2 className="w-3 h-3" /> Remove Image
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs"
              onClick={() => cameraInputRef.current?.click()} disabled={uploading}>
              <Camera className="w-3.5 h-3.5" /> Capture
            </Button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => handleImageUpload(e.target.files?.[0])} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => handleImageUpload(e.target.files?.[0])} />
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={() => onSave({ ...form, amount: Number(form.amount) })}
          disabled={saving || uploading} className="flex-1 gap-1.5">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

export default function BillManagementModal({ bills, homes, onClose, canEdit, onMarkPaid, onUpdateBill, saving }) {
  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [selectedBillTypeFilter, setSelectedBillTypeFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasImageFilter, setHasImageFilter] = useState("");
  const [selectedBillId, setSelectedBillId] = useState(bills[0]?.id || "");
  const [editing, setEditing] = useState(false);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (selectedHomeId && b.home_id !== selectedHomeId) return false;
      if (selectedBillTypeFilter && b.bill_type !== selectedBillTypeFilter) return false;
      if (selectedStatusFilter && b.status !== selectedStatusFilter) return false;
      if (searchTerm && !b.supplier?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (hasImageFilter === "yes" && !b.image_url) return false;
      if (hasImageFilter === "no" && b.image_url) return false;
      return true;
    });
  }, [bills, selectedHomeId, selectedBillTypeFilter, selectedStatusFilter, searchTerm, hasImageFilter]);

  // Keep selection in sync with filtered list
  useEffect(() => {
    if (!filteredBills.find(b => b.id === selectedBillId)) {
      setSelectedBillId(filteredBills[0]?.id || "");
      setEditing(false);
    }
  }, [filteredBills]);

  // When bills prop updates (after save/mark paid), refresh selected bill data
  const selectedBill = bills.find(b => b.id === selectedBillId) || filteredBills[0] || null;
  const currentIndex = filteredBills.findIndex(b => b.id === selectedBillId);

  const goPrev = () => { if (currentIndex > 0) { setSelectedBillId(filteredBills[currentIndex - 1].id); setEditing(false); } };
  const goNext = () => { if (currentIndex < filteredBills.length - 1) { setSelectedBillId(filteredBills[currentIndex + 1].id); setEditing(false); } };

  const handleMarkPaid = () => {
    onMarkPaid(selectedBill.id);
  };

  const handleSaveEdit = (data) => {
    onUpdateBill(selectedBill.id, data, () => setEditing(false));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg md:text-xl">Manage Bills & Issues</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4 md:p-6">
          {/* Left — Filters + Bill List */}
          <div className="w-full lg:w-80 flex flex-col gap-3 overflow-y-auto shrink-0">
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="w-4 h-4" /> Filters
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Home</label>
                <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="All homes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All homes</SelectItem>
                    {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Bill Type</label>
                <Select value={selectedBillTypeFilter} onValueChange={setSelectedBillTypeFilter}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All types</SelectItem>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Status</label>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Search Supplier</label>
                <Input placeholder="Search…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Image Uploaded</label>
                <Select value={hasImageFilter} onValueChange={setHasImageFilter}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bill List */}
            <div className="border border-border rounded-lg overflow-y-auto flex-1 min-h-0">
              <div className="text-xs font-medium text-muted-foreground p-3 bg-muted/20 sticky top-0 border-b border-border">
                Bills ({filteredBills.length})
              </div>
              <div className="divide-y divide-border">
                {filteredBills.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">No bills match filters</div>
                ) : filteredBills.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBillId(b.id); setEditing(false); }}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-muted/50 transition-colors border-l-2 ${selectedBillId === b.id ? "border-l-primary bg-muted/30" : "border-l-transparent"}`}>
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-medium truncate">{TYPE_LABELS[b.bill_type] || b.bill_type}</p>
                      <Badge className={`text-[10px] shrink-0 ${STATUS_COLORS[b.status]}`}>{b.status}</Badge>
                    </div>
                    <p className="text-muted-foreground truncate">{b.home_name}</p>
                    <p className="font-semibold mt-0.5">£{(b.amount || 0).toLocaleString()}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">Due: {b.due_date}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Detail / Edit */}
          {selectedBill ? (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
              {/* Navigation bar */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <button onClick={goPrev} disabled={currentIndex <= 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs text-muted-foreground">{currentIndex + 1} of {filteredBills.length}</span>
                <button onClick={goNext} disabled={currentIndex >= filteredBills.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {editing ? (
                /* ── EDIT MODE ── */
                <EditBillPanel
                  bill={selectedBill}
                  homes={homes}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditing(false)}
                  saving={saving}
                />
              ) : (
                /* ── VIEW MODE ── */
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                  {/* Image — fixed small thumbnail, doesn't push details out */}
                  {selectedBill.image_url && (
                    <div className="w-full bg-muted rounded-lg overflow-hidden shrink-0" style={{ height: "140px" }}>
                      <img src={selectedBill.image_url} alt="Bill" className="w-full h-full object-contain cursor-pointer"
                        onClick={() => window.open(selectedBill.image_url, "_blank")} title="Click to open full size" />
                    </div>
                  )}

                  {/* Details + History tabs */}
                  <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="bg-muted rounded-lg w-full shrink-0">
                      <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                      <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-3 overflow-y-auto flex-1">
                      <div className="space-y-2">
                        {[
                          { label: "Bill Type", value: TYPE_LABELS[selectedBill.bill_type] || selectedBill.bill_type },
                          { label: "Home", value: selectedBill.home_name },
                          { label: "Supplier", value: selectedBill.supplier || "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{label}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                        <div className="border-t pt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-semibold">£{(selectedBill.amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Due Date:</span>
                            <span className="font-medium">{selectedBill.due_date}</span>
                          </div>
                          {selectedBill.paid_date && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Paid Date:</span>
                              <span className="font-medium">{selectedBill.paid_date}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm items-center">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge className={STATUS_COLORS[selectedBill.status]}>{selectedBill.status}</Badge>
                          </div>
                          {selectedBill.is_direct_debit && (
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-muted-foreground">Direct Debit:</span>
                              <Badge className="bg-blue-500/10 text-blue-600">Yes</Badge>
                            </div>
                          )}
                          {selectedBill.is_recurring && (
                            <div className="flex justify-between text-sm items-center">
                              <span className="text-muted-foreground">Recurring:</span>
                              <Badge className="bg-muted text-muted-foreground">Yes</Badge>
                            </div>
                          )}
                        </div>
                        {selectedBill.notes && (
                          <div className="text-sm pt-2 border-t">
                            <p className="text-muted-foreground mb-1">Notes:</p>
                            <p>{selectedBill.notes}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-3 overflow-y-auto flex-1">
                      <div className="text-sm text-muted-foreground space-y-1.5">
                        <p>Created: {new Date(selectedBill.created_date).toLocaleString("en-GB")}</p>
                        <p>Updated: {new Date(selectedBill.updated_date).toLocaleString("en-GB")}</p>
                        {selectedBill.image_uploaded_at && <p>Image uploaded: {new Date(selectedBill.image_uploaded_at).toLocaleString("en-GB")}</p>}
                        {selectedBill.image_file_name && <p>File: {selectedBill.image_file_name}</p>}
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action buttons */}
                  {canEdit && (
                    <div className="flex gap-2 shrink-0 pt-1">
                      {selectedBill.status !== "paid" && (
                        <Button onClick={handleMarkPaid} className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                          <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => setEditing(true)} className="flex-1 gap-1.5">
                        <Pencil className="w-4 h-4" /> Edit Bill
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {filteredBills.length === 0 ? "No bills match the current filters" : "Select a bill to view details"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}