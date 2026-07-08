import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Upload, Camera } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

export default function BillForm({ properties, onSubmit, onClose, saving, onSubmitWorkflow, title = "Add Bill", submitLabel = "Submit Bill for Approval", staffList }) {
  const [data, setData] = useState({
    bill_type: "", home_id: "", home_name: "",
    supplier: "", amount: "", due_date: "", status: "",
    is_direct_debit: false, is_recurring: false, notes: "",
    image_url: "", image_file_name: "", image_uploaded_at: "",
  });
  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const set = (k, v) => { setData(d => ({ ...d, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

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
          <h2 className="font-semibold text-base md:text-lg">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Bill Type *</Label>
              <Select value={data.bill_type} onValueChange={v => set("bill_type", v)}>
                <SelectTrigger className={`mt-1.5 ${errors.bill_type ? "border-destructive" : ""}`}><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {["Utilities","Council_tax","Insurance","Cleaning","Maintenance","Rent","Expense","Mileage","Food_&_Subsistence","Accommodation","Equipment","Training_Materials","Uniform_/_Clothing","Other"].map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bill_type && <p className="text-xs text-destructive mt-1">{errors.bill_type}</p>}
            </div>
            <div>
              <Label>Home *</Label>
              <Select value={data.home_id} onValueChange={handlePropertyChange}>
                <SelectTrigger className={`mt-1.5 ${errors.home_id ? "border-destructive" : ""}`}><SelectValue placeholder="Select property" /></SelectTrigger>
                <SelectContent>
                  {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.home_id && <p className="text-xs text-destructive mt-1">{errors.home_id}</p>}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Amount (£) *</Label>
              <Input className={`mt-1.5 ${errors.amount ? "border-destructive" : ""}`} type="number" min="0.01" step="0.01" value={data.amount} onChange={e => set("amount", e.target.value)} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input className={`mt-1.5 ${errors.due_date ? "border-destructive" : ""}`} type="date" value={data.due_date} onChange={e => set("due_date", e.target.value)} />
              {errors.due_date && <p className="text-xs text-destructive mt-1">{errors.due_date}</p>}
            </div>
          </div>
          {staffList && (
            <div>
              <Label>Staff Member *</Label>
              <div className="mt-1.5">
                <AutocompleteInput 
                  value={data.staff_name} 
                  onChange={v => set("staff_name", v)} 
                  options={staffList} 
                  placeholder="Search staff member..." 
                />
              </div>
              {errors.staff_name && <p className="text-xs text-destructive mt-1">{errors.staff_name}</p>}
            </div>
          )}
          <div>
            <Label>Supplier *</Label>
            <Input className={`mt-1.5 ${errors.supplier ? "border-destructive" : ""}`} value={data.supplier} onChange={e => set("supplier", e.target.value)} placeholder="Supplier name" />
            {errors.supplier && <p className="text-xs text-destructive mt-1">{errors.supplier}</p>}
          </div>
          <div>
            <Label>Status *</Label>
            <Select value={data.status} onValueChange={v => set("status", v)}>
              <SelectTrigger className={`mt-1.5 ${errors.status ? "border-destructive" : ""}`}><SelectValue placeholder="Select status..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive mt-1">{errors.status}</p>}
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

          {/* Workflow Info */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900">This bill will be submitted for approval through:</p>
            <p className="text-xs text-blue-800 mt-1">Team Leader → Admin Manager → Finance Officer</p>
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
          <Button onClick={() => {
            const errs = {};
            if (!data.bill_type) errs.bill_type = "Bill type is required";
            if (!data.home_id) errs.home_id = "Please select a home";
            if (!data.amount || Number(data.amount) <= 0) errs.amount = "Please enter a valid amount greater than 0";
            if (!data.due_date) errs.due_date = "Due date is required";
            if (!data.supplier?.trim()) errs.supplier = "Supplier is required";
            if (!data.status) errs.status = "Status is required";
            if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
            const prefixMap = {
              insurance: "INS", council_tax: "CTX", rent: "RNT", utilities: "UTL",
              cleaning: "CLN", maintenance: "MNT", mileage: "MIL", "food_&_subsistence": "FDS",
              accommodation: "ACC", equipment: "EQP", training_materials: "TRN",
              "uniform_/_clothing": "UNI", other: "OTH"
            };
            const prefix = prefixMap[data.bill_type?.toLowerCase()] || "OTH";
            const billTitle = `${prefix}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
            if (onSubmitWorkflow) {
              onSubmitWorkflow({ ...data, title: billTitle, amount: Number(data.amount) });
            } else {
              onSubmit({ ...data, title: billTitle, amount: Number(data.amount) });
            }
          }} disabled={saving || uploading}>
            {saving ? "Submitting…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}