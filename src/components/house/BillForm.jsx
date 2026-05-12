import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Upload, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BillForm({ properties, onSubmit, onClose, saving }) {
  const [data, setData] = useState({
    bill_type: "utilities", home_id: "", home_name: "",
    supplier: "", amount: "", due_date: "", status: "pending",
    is_direct_debit: false, is_recurring: false, notes: "",
    image_url: "", image_file_name: "", image_uploaded_at: "",
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));

  const handlePropertyChange = (id) => {
    const p = properties.find(x => x.id === id);
    set("home_id", id);
    set("home_name", p?.name || "");
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("image_url", file_url);
      set("image_file_name", file.name);
      set("image_uploaded_at", new Date().toISOString());
      toast.success("Bill image uploaded");
    } catch (err) {
      toast.error("Failed to upload image");
      console.error(err);
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
          <h2 className="font-semibold text-base md:text-lg">Add Bill</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Bill Type *</Label>
              <Select value={data.bill_type} onValueChange={v => set("bill_type", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["utilities","council_tax","insurance","cleaning","maintenance","rent","other"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Home</Label>
              <Select value={data.home_id} onValueChange={handlePropertyChange}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Amount (£) *</Label><Input className="mt-1.5" type="number" value={data.amount} onChange={e => set("amount", e.target.value)} /></div>
            <div><Label>Due Date *</Label><Input className="mt-1.5" type="date" value={data.due_date} onChange={e => set("due_date", e.target.value)} /></div>
          </div>
          <div><Label>Supplier</Label><Input className="mt-1.5" value={data.supplier} onChange={e => set("supplier", e.target.value)} /></div>
          <div>
            <Label>Status</Label>
            <Select value={data.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Direct Debit</Label>
            <Switch checked={data.is_direct_debit} onCheckedChange={v => set("is_direct_debit", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Recurring</Label>
            <Switch checked={data.is_recurring} onCheckedChange={v => set("is_recurring", v)} />
          </div>
          <div>
            <Label>Notes</Label>
            <Input className="mt-1.5" placeholder="Optional notes…" value={data.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          {/* Image Upload Section */}
          <div className="border-t pt-4">
            <Label className="block mb-3">Bill Photo / Document</Label>
            {data.image_url ? (
              <div className="space-y-2">
                <div className="w-full h-32 bg-muted rounded-lg overflow-hidden">
                  <img src={data.image_url} alt="Bill" className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-muted-foreground">{data.image_file_name}</p>
                <Button size="sm" variant="outline" onClick={() => { set("image_url", ""); set("image_file_name", ""); set("image_uploaded_at", ""); }}>
                  Remove Image
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4" /> Upload File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => handleImageUpload(e.target.files?.[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleImageUpload(e.target.files?.[0])}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 md:gap-3 p-4 md:p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ ...data, amount: Number(data.amount) })} disabled={!data.amount || !data.due_date || saving || uploading}>
            {saving ? "Saving…" : "Add Bill"}
          </Button>
        </div>
      </div>
    </div>
  );
}