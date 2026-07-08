import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  X, Filter, ChevronLeft, ChevronRight, Pencil, CheckCircle2, Upload, Camera, Trash2, Save, AlertCircle,
  Search, Zap, Home, Shield, Sparkles, Wrench, Banknote, FileText, Eye, Download,
  ChevronDown, ArrowUpDown, Check, XCircle, MessageSquare, Clock, Circle, LayoutList,
  SlidersHorizontal, Paperclip, Info, RotateCcw, RefreshCw, MoreVertical, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";
import BillApprovalBadge from "./BillApprovalBadge";

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
const DUMMY_BILLS = [
  {
    id: "bill-001",
    title: "BILL-2026-00025",
    bill_type: "utilities",
    home_name: "Techbytes CSE",
    supplier: "Techbytes CSE",
    amount: 10000,
    status: "paid",
    due_date: "2026-06-30",
    paid_date: "2026-06-15",
    approval_status: "approved",
    notes: "Monthly utility bill including electricity and gas charges.",
    image_url: "https://example.com/invoice.pdf",
    image_file_name: "invoice_utilities_june.pdf",
    image_uploaded_at: "2026-06-10T09:00:00Z",
    created_date: "2026-06-01T08:00:00Z",
    updated_date: "2026-06-15T12:00:00Z",
  },
  {
    id: "bill-002",
    title: "BILL-2026-00025",
    bill_type: "food_&_subsistence",
    home_name: "Techbytes CSE",
    supplier: "Habib Fahim (dwadaw)",
    amount: 3213,
    status: "submitted",
    due_date: "2026-06-23",
    approval_status: "pending_admin",
    notes: "Monthly food and subsistence expenses for staff and residents.",
    image_url: "https://example.com/invoice_food.pdf",
    image_file_name: "invoice_food_subsistence_june.pdf",
    image_uploaded_at: "2026-06-22T10:15:00Z",
    created_date: "2026-06-22T10:15:00Z",
    updated_date: "2026-06-22T10:15:00Z",
  },
  {
    id: "bill-003",
    title: "BILL-2026-00023",
    bill_type: "food_&_subsistence",
    home_name: "Techbytes CSE",
    supplier: "Techbytes CSE",
    amount: 100,
    status: "paid",
    due_date: "2026-06-21",
    approval_status: "approved",
    notes: "Weekly food supply for residents.",
    image_url: null,
    created_date: "2026-06-05T09:00:00Z",
    updated_date: "2026-06-21T14:00:00Z",
  },
  {
    id: "bill-004",
    title: "BILL-2026-00022",
    bill_type: "insurance",
    home_name: "grdgr",
    supplier: "grdgr",
    amount: 231,
    status: "submitted",
    due_date: "2026-06-08",
    approval_status: "pending_tl",
    notes: "Annual insurance premium renewal.",
    image_url: null,
    created_date: "2026-05-25T11:00:00Z",
    updated_date: "2026-06-01T09:00:00Z",
  },
  {
    id: "bill-005",
    title: "BILL-2026-00021",
    bill_type: "cleaning",
    home_name: "Software Lighthouse",
    supplier: "Software Lighthouse",
    amount: 450,
    status: "pending",
    due_date: "2026-06-05",
    approval_status: "draft",
    notes: "Monthly deep cleaning service.",
    image_url: null,
    created_date: "2026-05-28T10:00:00Z",
    updated_date: "2026-06-01T10:00:00Z",
  },
  {
    id: "bill-006",
    title: "BILL-2026-00020",
    bill_type: "maintenance",
    home_name: "BuildTech Ltd",
    supplier: "BuildTech Ltd",
    amount: 780,
    status: "pending",
    due_date: "2026-06-01",
    approval_status: "draft",
    notes: "Boiler repair and maintenance work.",
    image_url: null,
    created_date: "2026-05-20T09:00:00Z",
    updated_date: "2026-05-22T09:00:00Z",
  },
  {
    id: "bill-007",
    title: "BILL-2026-00019",
    bill_type: "rent",
    home_name: "City Properties",
    supplier: "City Properties Ltd",
    amount: 2500,
    status: "pending",
    due_date: "2026-06-01",
    approval_status: "pending_fm",
    notes: "Monthly property rental payment.",
    image_url: "https://example.com/rent_invoice.pdf",
    image_file_name: "rent_invoice_june.pdf",
    image_uploaded_at: "2026-05-28T14:00:00Z",
    created_date: "2026-05-28T14:00:00Z",
    updated_date: "2026-05-29T09:00:00Z",
  },
];

const DUMMY_WORKFLOWS = {
  "bill-002": {
    id: "wf-001",
    entity_id: "bill-002",
    entity_type: "bill",
    status: "pending_admin",
    priority: "high",
    submitted_at: "2026-06-22T10:15:00Z",
    submitted_by_name: "Habib Fahim",
    tl_approved_by_name: "John Smith",
    tl_approved_at: "2026-06-22T09:05:00Z",
    admin_approved_by_name: "Sanjana",
    description: "Monthly food and subsistence expenses for staff and residents.",
    rejection_reason: null,
    current_step: 2,
  },
  "bill-001": {
    id: "wf-002",
    entity_id: "bill-001",
    entity_type: "bill",
    status: "approved",
    submitted_at: "2026-06-10T09:00:00Z",
    submitted_by_name: "James Wilson",
    tl_approved_by_name: "John Smith",
    tl_approved_at: "2026-06-10T11:00:00Z",
    admin_approved_by_name: "Sanjana",
    admin_approved_at: "2026-06-11T10:00:00Z",
    fm_approved_by_name: "Robert Chen",
    fm_approved_at: "2026-06-12T14:00:00Z",
  },
  "bill-004": {
    id: "wf-003",
    entity_id: "bill-004",
    entity_type: "bill",
    status: "pending_tl",
    submitted_at: "2026-06-01T09:00:00Z",
    submitted_by_name: "Sarah Johnson",
    current_step: 1,
  },
};

const DUMMY_EVENTS = {
  "wf-001": [
    {
      id: "ev-001",
      workflow_id: "wf-001",
      event_type: "approved",
      actor_name: "John Smith",
      role: "Team Leader",
      created_at: "2026-06-22T09:05:00Z",
      comment: "Invoice verified and amount is correct.",
    },
    {
      id: "ev-002",
      workflow_id: "wf-001",
      event_type: "under_review",
      actor_name: "Sanjana",
      role: "Admin Manager",
      created_at: "2026-06-22T10:15:00Z",
      comment: "Please confirm budget allocation before final approval.",
    },
  ],
  "wf-002": [
    {
      id: "ev-003",
      workflow_id: "wf-002",
      event_type: "approved",
      actor_name: "John Smith",
      role: "Team Leader",
      created_at: "2026-06-10T11:00:00Z",
      comment: "Looks good.",
    },
    {
      id: "ev-004",
      workflow_id: "wf-002",
      event_type: "approved",
      actor_name: "Sanjana",
      role: "Admin Manager",
      created_at: "2026-06-11T10:00:00Z",
      comment: "Budget confirmed and approved.",
    },
    {
      id: "ev-005",
      workflow_id: "wf-002",
      event_type: "approved",
      actor_name: "Robert Chen",
      role: "Finance Manager",
      created_at: "2026-06-12T14:00:00Z",
      comment: "Final financial approval granted.",
    },
  ],
};
// ─── END DUMMY DATA ───────────────────────────────────────────────────────────

const TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent", other: "Other",
  expense: "Expense", mileage: "Mileage", "food_&_subsistence": "Food & Subsistence",
  accommodation: "Accommodation", equipment: "Equipment",
  training_materials: "Training Materials", "uniform_/_clothing": "Uniform / Clothing",
};

const STATUS_DOT = {
  pending: "bg-amber-500",
  paid: "bg-green-500",
  overdue: "bg-red-500",
  disputed: "bg-purple-500",
  submitted: "bg-blue-500",
};

const BILL_WORKFLOW_STEPS = [
  { level: 1, role: "Team Leader", stage: "Initial Review", wfFields: { name: "tl_approved_by_name", at: "tl_approved_at" } },
  { level: 2, role: "Admin Manager", stage: "Admin Validation", wfFields: { name: "admin_approved_by_name", at: "admin_approved_at", altName: "tm_approved_by_name", altAt: "tm_approved_at" } },
  { level: 3, role: "Finance Manager", stage: "Financial Approval", wfFields: { name: "fm_approved_by_name", at: "fm_approved_at", altName: "fo_approved_by_name", altAt: "fo_approved_at" } },
];

const LIST_PAGE_SIZE = 8;

function formatBillType(type) {
  if (!type) return "—";
  const key = type.toLowerCase().replace(/\s+/g, "_");
  return TYPE_LABELS[key] || TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getBillTypeIcon(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("utilit")) return Zap;
  if (t.includes("rent") || t.includes("accommod")) return Home;
  if (t.includes("insur")) return Shield;
  if (t.includes("clean")) return Sparkles;
  if (t.includes("maint")) return Wrench;
  if (t.includes("food") || t.includes("subsist")) return ShoppingCart;
  return FileText;
}

function getDaysRemaining(dueDate) {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate) - new Date()) / 86400000);
}

function getPriority(daysLeft, status, workflow) {
  if (workflow?.priority === "high") return { label: "High", cls: "bg-red-100 text-red-700 border-red-200" };
  if (status === "paid") return { label: "Low", cls: "bg-slate-100 text-slate-600 border-slate-200" };
  if (daysLeft === null) return { label: "Normal", cls: "bg-slate-100 text-slate-600 border-slate-200" };
  if (daysLeft < 0 || status === "overdue") return { label: "High", cls: "bg-red-100 text-red-700 border-red-200" };
  if (daysLeft <= 3) return { label: "High", cls: "bg-red-100 text-red-700 border-red-200" };
  if (daysLeft <= 7) return { label: "Medium", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "Low", cls: "bg-slate-100 text-slate-600 border-slate-200" };
}

function getListStatusBadge(bill) {
  if (bill.status === "paid") return { label: "Paid", cls: "bg-green-50 text-green-700 border-green-200" };
  if (bill.status === "overdue") return { label: "Overdue", cls: "bg-red-50 text-red-700 border-red-200" };
  const pendingApproval = bill.approval_status && !["approved", "draft", "rejected", null, undefined, ""].includes(bill.approval_status);
  if (pendingApproval) return { label: "Submitted", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  if (bill.status === "pending") return { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: bill.status || "Pending", cls: "bg-amber-50 text-amber-700 border-amber-200" };
}

function getCurrentApprovalLevel(bill, workflow) {
  const status = workflow?.status || bill.approval_status;
  if (!status || status === "draft" || status === "approved") return null;
  if (status === "pending_tl") return { level: 1, current: "Team Leader", next: "Admin Manager" };
  if (["pending_admin", "pending_tm"].includes(status)) return { level: 2, current: "Admin Manager", next: "Finance Manager" };
  if (["pending_fo", "pending_fm", "pending_finance"].includes(status)) return { level: 3, current: "Finance Manager", next: null };
  if (status === "rejected") return { level: null, current: "—", next: null };
  return { level: 1, current: "Team Leader", next: "Admin Manager" };
}

function buildTimelineSteps(bill, workflow) {
  const wfStatus = workflow?.status || bill.approval_status;
  if (!wfStatus || wfStatus === "draft") return [];

  const currentLevel = (() => {
    if (wfStatus === "approved") return 4;
    if (wfStatus === "rejected") return workflow?.current_step || 2;
    if (wfStatus === "pending_tl") return 1;
    if (["pending_admin", "pending_tm"].includes(wfStatus)) return 2;
    if (["pending_fo", "pending_fm", "pending_finance"].includes(wfStatus)) return 3;
    return 1;
  })();

  return BILL_WORKFLOW_STEPS.map(step => {
    const f = step.wfFields;
    const actorName = workflow?.[f.name] || workflow?.[f.altName] || null;
    const timestamp = workflow?.[f.at] || workflow?.[f.altAt] || null;
    const eventComment = workflow?.rejection_reason && step.level === currentLevel ? workflow.rejection_reason : null;

    let state = "future";
    if (wfStatus === "approved") state = "completed";
    else if (wfStatus === "rejected") {
      if (step.level < currentLevel) state = "completed";
      else if (step.level === currentLevel) state = "rejected";
    } else if (step.level < currentLevel) state = "completed";
    else if (step.level === currentLevel) state = "current";

    return { ...step, state, actorName, timestamp, comment: eventComment };
  });
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "dd MMM yyyy, HH:mm aa");
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
  ];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

// ─── EditBillPanel ────────────────────────────────────────────────────────────
function EditBillPanel({ bill, homes, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...bill });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const newErrors = {};
    if (!form.bill_type) newErrors.bill_type = "Bill type is required";
    if (!form.home_id) newErrors.home_id = "Home is required";
    if (!form.amount || parseFloat(form.amount) <= 0) newErrors.amount = "Amount must be greater than 0";
    if (!form.due_date) newErrors.due_date = "Due date is required";
    if (!form.supplier?.trim()) newErrors.supplier = "Supplier is required";
    if (!form.status) newErrors.status = "Status is required";
    if (form.status === "paid" && !form.paid_date) newErrors.paid_date = "Paid date is required when status is Paid";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePropertyChange = (id) => {
    const h = homes.find(x => x.id === id);
    set("home_id", id);
    set("home_name", h?.name || "");
    if (errors.home_id) setErrors(e => ({ ...e, home_id: "" }));
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

  const handleSave = () => {
    if (validate()) onSave({ ...form, amount: Number(form.amount) });
  };

  const allTypes = [...new Set([...Object.keys(TYPE_LABELS), form.bill_type].filter(Boolean))];

  return (
    <div className="space-y-4 overflow-y-auto flex-1 pr-1 overscroll-contain">
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs font-semibold text-red-700">Please fix the following errors:</p>
          </div>
          <ul className="text-xs text-red-600 ml-6 space-y-0.5">
            {Object.values(errors).map((err, i) => <li key={i}>• {err}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={`text-xs ${errors.bill_type ? "text-red-600" : ""}`}>Bill Type {errors.bill_type && "*"}</Label>
          <Select value={form.bill_type} onValueChange={v => { set("bill_type", v); if (errors.bill_type) setErrors(e => ({ ...e, bill_type: "" })); }}>
            <SelectTrigger className={`mt-1 text-sm ${errors.bill_type ? "border-red-400" : ""}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {allTypes.map(k => <SelectItem key={k} value={k}>{formatBillType(k)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className={`text-xs ${errors.home_id ? "text-red-600" : ""}`}>Home {errors.home_id && "*"}</Label>
          <Select value={form.home_id} onValueChange={handlePropertyChange}>
            <SelectTrigger className={`mt-1 text-sm ${errors.home_id ? "border-red-400" : ""}`}><SelectValue placeholder="Select home" /></SelectTrigger>
            <SelectContent>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={`text-xs ${errors.amount ? "text-red-600" : ""}`}>Amount (£) {errors.amount && "*"}</Label>
          <Input className={`mt-1 text-sm ${errors.amount ? "border-red-400" : ""}`} type="number" value={form.amount} onChange={e => { set("amount", e.target.value); if (errors.amount) setErrors(e => ({ ...e, amount: "" })); }} />
        </div>
        <div>
          <Label className={`text-xs ${errors.due_date ? "text-red-600" : ""}`}>Due Date {errors.due_date && "*"}</Label>
          <Input className={`mt-1 text-sm ${errors.due_date ? "border-red-400" : ""}`} type="date" value={form.due_date} onChange={e => { set("due_date", e.target.value); if (errors.due_date) setErrors(e => ({ ...e, due_date: "" })); }} />
        </div>
      </div>

      <div>
        <Label className={`text-xs ${errors.supplier ? "text-red-600" : ""}`}>Supplier {errors.supplier && "*"}</Label>
        <Input className={`mt-1 text-sm ${errors.supplier ? "border-red-400" : ""}`} value={form.supplier || ""} onChange={e => { set("supplier", e.target.value); if (errors.supplier) setErrors(e => ({ ...e, supplier: "" })); }} />
      </div>

      <div>
        <Label className={`text-xs ${errors.status ? "text-red-600" : ""}`}>Status {errors.status && "*"}</Label>
        <Select value={form.status} onValueChange={v => { set("status", v); if (errors.status) setErrors(e => ({ ...e, status: "" })); }}>
          <SelectTrigger className={`mt-1 text-sm ${errors.status ? "border-red-400" : ""}`}><SelectValue /></SelectTrigger>
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
          <Label className={`text-xs ${errors.paid_date ? "text-red-600" : ""}`}>Paid Date {errors.paid_date && "*"}</Label>
          <Input className={`mt-1 text-sm ${errors.paid_date ? "border-red-400" : ""}`} type="date" value={form.paid_date || ""} onChange={e => { set("paid_date", e.target.value); if (errors.paid_date) setErrors(e => ({ ...e, paid_date: "" })); }} />
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

      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving || uploading} className="flex-1 gap-1.5">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ─── WorkflowTimeline ─────────────────────────────────────────────────────────
function WorkflowTimeline({ bill, workflow, compact, events }) {
  const steps = buildTimelineSteps(bill, workflow);
  if (steps.length === 0) {
    return (
      <div className="py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
          <Shield className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-muted-foreground">This bill has not been submitted for approval.</p>
      </div>
    );
  }

  // Build comment map from events
  const commentByLevel = {};
  if (events) {
    events.forEach(ev => {
      if (ev.comment) {
        if (ev.role === "Team Leader") commentByLevel[1] = ev.comment;
        else if (ev.role === "Admin Manager") commentByLevel[2] = ev.comment;
        else if (ev.role === "Finance Manager") commentByLevel[3] = ev.comment;
      }
    });
  }

  if (compact) {
    return (
      <div className="space-y-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const isCurrent = step.state === "current";
          const comment = commentByLevel[step.level] || step.comment;
          return (
            <div key={step.level} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                  step.state === "completed"
                    ? "bg-green-500 border-green-500"
                    : step.state === "current"
                    ? "bg-blue-500 border-blue-500"
                    : step.state === "rejected"
                    ? "bg-red-50 border-red-300"
                    : "bg-white border-gray-200"
                }`}>
                  {step.state === "completed" && <Check className="w-3.5 h-3.5 text-white" />}
                  {step.state === "current" && <div className="w-2 h-2 rounded-full bg-white" />}
                  {step.state === "rejected" && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                  {step.state === "future" && <Circle className="w-3 h-3 text-gray-300" />}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[36px] mt-0.5 ${
                    step.state === "completed" ? "bg-green-400" : "bg-gray-200"
                  }`} />
                )}
              </div>
              <div className="pb-4 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className={`text-[11px] font-medium ${isCurrent ? "text-blue-600" : "text-muted-foreground"}`}>
                    Level {step.level}{isCurrent ? " (Current)" : ""}
                  </p>
                  {step.state !== "future" && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      step.state === "completed" ? "bg-green-50 text-green-700" :
                      step.state === "current" ? "bg-orange-50 text-orange-600" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {step.state === "completed" ? "Approved" : step.state === "current" ? "Pending" : "Rejected"}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <p className="text-xs font-semibold text-foreground">{step.role}</p>
                  {step.timestamp && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(step.timestamp)}</span>
                  )}
                  {!step.timestamp && step.state === "future" && (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{step.actorName || "—"}</p>
                {comment && (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">"{comment}"</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.level} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${
                step.state === "completed" ? "bg-green-100 border-green-400 text-green-600" :
                step.state === "current" ? "bg-blue-100 border-blue-400 text-blue-600" :
                step.state === "rejected" ? "bg-red-100 border-red-300 text-red-600" :
                "bg-white border-gray-200 text-gray-300"
              }`}>
                {step.state === "completed" ? <Check className="w-3.5 h-3.5" /> :
                 step.state === "rejected" ? <XCircle className="w-3.5 h-3.5" /> :
                 step.state === "current" ? <Clock className="w-3.5 h-3.5" /> :
                 <Circle className="w-3 h-3" />}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 min-h-[28px] ${step.state === "completed" ? "bg-green-300" : "bg-gray-200"}`} />}
            </div>
            <div className="pb-5 min-w-0 flex-1">
              <p className="text-xs font-semibold">{step.role}{step.actorName ? ` · ${step.actorName}` : ""}</p>
              <p className="text-[11px] text-muted-foreground">Level {step.level} — {step.stage}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${
                  step.state === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                  step.state === "current" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  step.state === "rejected" ? "bg-red-50 text-red-700 border-red-200" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {step.state === "completed" ? "Approved" : step.state === "current" ? "Pending" : step.state === "rejected" ? "Rejected" : "Upcoming"}
                </Badge>
                {step.timestamp && (
                  <span className="text-[10px] text-muted-foreground">{formatDateTime(step.timestamp)}</span>
                )}
              </div>
              {step.comment && (
                <p className="text-[11px] text-muted-foreground mt-1.5 italic bg-muted/50 rounded px-2 py-1">"{step.comment}"</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CommentsSection ──────────────────────────────────────────────────────────
function CommentsSection({ events, bill, workflow, onAddNote, saving }) {
  const [note, setNote] = useState("");
  const comments = useMemo(() => {
    const items = [];
    if (workflow?.submitted_by_name) {
      items.push({
        id: "submitted",
        actor_name: workflow.submitted_by_name,
        role: "Submitter",
        created_at: workflow.submitted_at,
        comment: "Bill submitted for approval",
      });
    }
    (events || []).filter(e => e.comment).forEach(e => items.push(e));
    return items.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
  }, [events, workflow]);

  const handleAdd = () => {
    if (!note.trim()) return;
    onAddNote(note.trim());
    setNote("");
  };

  return (
    <div className="bg-white border border-border/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Comments &amp; Notes</span>
      </div>
      <div className="px-4 pb-4 pt-3 space-y-3">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No comments yet.</p>
        ) : (
          <div className="space-y-3 max-h-52 overflow-y-auto">
            {comments.map((c, i) => (
              <div key={c.id || i} className="flex gap-2.5">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className={`text-[10px] font-semibold ${getAvatarColor(c.actor_name)}`}>{initials(c.actor_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-xs font-semibold">
                      {c.actor_name || "Unknown"}{c.role ? ` (${c.role})` : ""}
                    </p>
                    {c.created_at && <p className="text-[10px] text-muted-foreground shrink-0">{formatDateTime(c.created_at)}</p>}
                  </div>
                  <p className="text-xs mt-0.5 text-foreground/80 leading-relaxed">{c.comment}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {bill.notes && !comments.some(c => c.comment === bill.notes) && (
          <div className="text-xs bg-muted/40 rounded-lg p-2.5 border border-border">
            <p className="text-[10px] text-muted-foreground mb-0.5">Bill notes</p>
            <p>{bill.notes}</p>
          </div>
        )}
        <div className="flex gap-2 pt-1 border-t">
          <Input placeholder="Add internal note…" value={note} onChange={e => setNote(e.target.value)}
            className="text-xs h-8" onKeyDown={e => e.key === "Enter" && handleAdd()} />
          <Button size="sm" className="h-8 text-xs shrink-0 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd} disabled={!note.trim() || saving}>
            Add Note
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── BillSummaryCard ──────────────────────────────────────────────────────────
function BillSummaryCard({ bill, workflow }) {
  const daysLeft = getDaysRemaining(bill.due_date);
  const priority = getPriority(daysLeft, bill.status, workflow);
  const amount = Number(bill.amount || 0);
  const paid = bill.status === "paid" ? amount : 0;
  const balance = amount - paid;

  return (
    <div className="bg-white border border-border/60 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Bill Summary</span>
      </div>
      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Total Amount</p>
            <p className="text-sm font-bold text-foreground">£{amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Paid</p>
            <p className="text-sm font-bold text-green-600">£{paid.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Balance Due</p>
            <p className={`text-sm font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>£{balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="border-t pt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Due Date</p>
            <p className="text-xs font-semibold">{formatDate(bill.due_date)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Days Remaining</p>
            {daysLeft !== null && bill.status !== "paid" ? (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                daysLeft < 0 ? "bg-red-100 text-red-700" :
                daysLeft <= 3 ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
              </span>
            ) : <p className="text-xs font-semibold text-muted-foreground">—</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">Priority</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${priority.cls}`}>{priority.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusWithDot({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status] || "bg-muted-foreground"}`} />
      <span className="capitalize text-sm font-medium">{status}</span>
    </span>
  );
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export default function BillManagementModal({ bills: propBills, homes, onClose, canEdit, onMarkPaid, onUpdateBill, saving }) {
  // Merge real data with dummy data — dummy fills the gaps
  const bills = (propBills && propBills.length > 0) ? propBills : DUMMY_BILLS;

  const [selectedHomeId, setSelectedHomeId] = useState("");
  const [selectedBillTypeFilter, setSelectedBillTypeFilter] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hasImageFilter, setHasImageFilter] = useState("");
  const [selectedBillId, setSelectedBillId] = useState(bills[1]?.id || bills[0]?.id || "");
  const [editing, setEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("due_date");
  const [listLimit, setListLimit] = useState(LIST_PAGE_SIZE);
  const [approvalNote, setApprovalNote] = useState("");
  const [activeDetailsTab, setActiveDetailsTab] = useState("details");
  const listRef = useRef(null);

  const { data: liveWorkflows = [] } = useQuery({
    queryKey: ["approval-workflows-bill-modal"],
    queryFn: () => secureGateway.filter("ApprovalWorkflow", {}, "-created_date", 500),
    staleTime: 30_000,
  });

  const { data: liveWorkflowEvents = [] } = useQuery({
    queryKey: ["approval-events-bill-modal"],
    queryFn: () => secureGateway.filter("ApprovalWorkflowEvent", {}, "-created_at", 2000),
    staleTime: 30_000,
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "unset"; };
  }, []);

  // Build workflow map — prefer live data, fall back to dummy
  const workflowByBillId = useMemo(() => {
    const map = { ...DUMMY_WORKFLOWS };
    liveWorkflows.filter(w => w.entity_type === "bill").forEach(w => { map[w.entity_id] = w; });
    return map;
  }, [liveWorkflows]);

  // Build events map — prefer live, fall back to dummy
  const eventsByWorkflowId = useMemo(() => {
    const map = { ...DUMMY_EVENTS };
    liveWorkflowEvents.forEach(ev => {
      if (!map[ev.workflow_id]) map[ev.workflow_id] = [];
      if (!map[ev.workflow_id].find(e => e.id === ev.id)) map[ev.workflow_id].push(ev);
    });
    return map;
  }, [liveWorkflowEvents]);

  const billTypeOptions = useMemo(() => {
    const types = new Set(bills.map(b => b.bill_type).filter(Boolean));
    return [...types].sort((a, b) => formatBillType(a).localeCompare(formatBillType(b)));
  }, [bills]);

  const activeFilterCount = [selectedHomeId, selectedBillTypeFilter, selectedStatusFilter, hasImageFilter].filter(Boolean).length;

  const filteredBills = useMemo(() => {
    const result = bills.filter(b => {
      if (selectedHomeId && b.home_id !== selectedHomeId) return false;
      if (selectedBillTypeFilter && b.bill_type !== selectedBillTypeFilter) return false;
      if (selectedStatusFilter && b.status !== selectedStatusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = b.supplier?.toLowerCase().includes(q) || b.title?.toLowerCase().includes(q)
          || b.home_name?.toLowerCase().includes(q) || formatBillType(b.bill_type).toLowerCase().includes(q);
        if (!match) return false;
      }
      if (hasImageFilter === "yes" && !b.image_url) return false;
      if (hasImageFilter === "no" && b.image_url) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === "amount") return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      if (sortBy === "supplier") return (a.supplier || "").localeCompare(b.supplier || "");
      return (a.due_date || "").localeCompare(b.due_date || "");
    });
  }, [bills, selectedHomeId, selectedBillTypeFilter, selectedStatusFilter, searchTerm, hasImageFilter, sortBy]);

  const visibleBills = filteredBills.slice(0, listLimit);

  useEffect(() => {
    if (!filteredBills.find(b => b.id === selectedBillId)) {
      setSelectedBillId(filteredBills[0]?.id || "");
      setEditing(false);
    }
  }, [filteredBills, selectedBillId]);

  useEffect(() => { setListLimit(LIST_PAGE_SIZE); }, [selectedHomeId, selectedBillTypeFilter, selectedStatusFilter, searchTerm, hasImageFilter, sortBy]);

  const selectedBill = bills.find(b => b.id === selectedBillId) || filteredBills[0] || null;
  const selectedWorkflow = selectedBill ? workflowByBillId[selectedBill.id] : null;
  const selectedEvents = useMemo(
    () => selectedWorkflow ? (eventsByWorkflowId[selectedWorkflow.id] || []) : [],
    [eventsByWorkflowId, selectedWorkflow]
  );
  const approvalInfo = selectedBill ? getCurrentApprovalLevel(selectedBill, selectedWorkflow) : null;
  const currentIndex = filteredBills.findIndex(b => b.id === selectedBillId);

  const goPrev = () => { if (currentIndex > 0) { setSelectedBillId(filteredBills[currentIndex - 1].id); setEditing(false); } };
  const goNext = () => { if (currentIndex < filteredBills.length - 1) { setSelectedBillId(filteredBills[currentIndex + 1].id); setEditing(false); } };

  const clearFilters = () => {
    setSelectedHomeId("");
    setSelectedBillTypeFilter("");
    setSelectedStatusFilter("");
    setHasImageFilter("");
    setSearchTerm("");
  };

  const showAllBills = () => {
    setListLimit(filteredBills.length);
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddNote = (noteText) => {
    if (!selectedBill) return;
    toast.success("Note added");
    if (onUpdateBill) {
      const existing = selectedBill.notes?.trim();
      const updated = existing ? `${existing}\n[${format(new Date(), "dd MMM yyyy HH:mm")}] ${noteText}` : noteText;
      onUpdateBill(selectedBill.id, { notes: updated }, () => {});
    }
  };

  const effectiveApprovalStatus = selectedWorkflow?.status || selectedBill?.approval_status;
  const isPendingApproval = effectiveApprovalStatus
    && !["approved", "draft", "rejected", null, undefined, ""].includes(effectiveApprovalStatus);

  // Approval Details display from selected bill workflow
  const approvalDisplayStatus = (() => {
    const s = selectedWorkflow?.status || selectedBill?.approval_status;
    if (!s || s === "draft") return selectedBill?.status || "pending";
    if (["pending_tl", "pending_admin", "pending_tm", "pending_fo", "pending_fm", "pending_finance"].includes(s)) return "submitted";
    return s || selectedBill?.status || "pending";
  })();

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 md:p-4"
      onClick={onClose}
      style={{ backdropFilter: "blur(2px)" }}
    >
      <div
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-[1100px] overflow-hidden flex flex-col shadow-2xl"
        style={{ height: "calc(100vh - 40px)", maxHeight: "780px" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0 bg-white">
          <h2 className="font-bold text-lg text-gray-900">Manage Bills &amp; Issues</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── TOOLBAR ── */}
        <div className="border-b border-gray-200 shrink-0 bg-white">
          <div className="flex items-center gap-2 px-4 py-2.5">
            {/* Filters button */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 text-xs h-9 border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => setShowFilters(f => !f)}
            >
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white rounded-full min-w-[18px] h-[18px] px-1 text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Search */}
            <div className="relative flex-1 min-w-[140px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Search bills..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 text-sm h-9 bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400"
              />
            </div>

            {/* Right side — navigation + view all */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={goPrev}
                disabled={currentIndex <= 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 h-9 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-500 px-1.5 min-w-[56px] text-center font-medium">
                {filteredBills.length ? `${currentIndex + 1} of ${filteredBills.length}` : "0 of 0"}
              </span>
              <button
                onClick={goNext}
                disabled={currentIndex >= filteredBills.length - 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 h-9 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-5 bg-gray-200 mx-1" />

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9 hidden sm:flex border-gray-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200"
                onClick={showAllBills}
              >
                <FileText className="w-3.5 h-3.5" /> View all bills
              </Button>
              <button
                onClick={() => setShowFilters(f => !f)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 h-9 w-9 flex items-center justify-center transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-100 pt-3 bg-gray-50/50">
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Bill Type</label>
                <Select value={selectedBillTypeFilter} onValueChange={setSelectedBillTypeFilter}>
                  <SelectTrigger className="text-sm h-9 bg-white border-gray-200"><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All types</SelectItem>
                    {billTypeOptions.map(t => <SelectItem key={t} value={t}>{formatBillType(t)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground block mb-1">Status</label>
                <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                  <SelectTrigger className="text-sm h-9 bg-white border-gray-200"><SelectValue placeholder="All statuses" /></SelectTrigger>
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
                <label className="text-[11px] text-muted-foreground block mb-1">Image</label>
                <Select value={hasImageFilter} onValueChange={setHasImageFilter}>
                  <SelectTrigger className="text-sm h-9 bg-white border-gray-200"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All</SelectItem>
                    <SelectItem value="yes">Has Document</SelectItem>
                    <SelectItem value="no">No Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline font-medium">
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── THREE-COLUMN BODY ── */}
        <div className="flex-1 overflow-hidden grid grid-cols-[240px_1fr_264px] min-h-0">

          {/* ── LEFT: Bill List ── */}
          <div className="flex flex-col border-r border-gray-200 min-h-0 bg-white">
            {/* List header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 shrink-0">
              <span className="text-xs font-bold text-gray-700">Bills ({filteredBills.length})</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 w-auto gap-1 text-[11px] border-0 shadow-none px-1 text-gray-500 bg-transparent hover:bg-gray-50">
                  <ArrowUpDown className="w-3 h-3" />
                  <span>Sort: </span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due date</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bill items */}
            <div ref={listRef} className="overflow-y-auto flex-1 min-h-0 overscroll-contain p-2 space-y-1">
              {filteredBills.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">No bills match filters</div>
              ) : visibleBills.map(b => {
                const Icon = getBillTypeIcon(b.bill_type);
                const isSelected = selectedBillId === b.id;
                const statusBadge = getListStatusBadge(b);
                return (
                  <button
                    key={b.id}
                    onClick={() => { setSelectedBillId(b.id); setEditing(false); }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-blue-200 bg-blue-50 border-l-[3px] border-l-blue-500"
                        : "border-gray-100 hover:bg-gray-50 border-l-[3px] border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-gray-900 truncate leading-tight">{formatBillType(b.bill_type)}</p>
                            <p className="text-[11px] text-gray-500 truncate">{b.supplier || b.home_name || "—"}</p>
                          </div>
                          <span className={`text-[9px] font-semibold capitalize shrink-0 px-1.5 py-0.5 rounded-full border ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs font-bold text-gray-900">£{(b.amount || 0).toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Due: {formatDate(b.due_date)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Load more */}
            {filteredBills.length > 0 && (
              <div className="p-2.5 border-t border-gray-100 shrink-0 text-center">
                <p className="text-[11px] text-gray-400 mb-1">Showing {visibleBills.length} of {filteredBills.length} bills</p>
                {listLimit < filteredBills.length && (
                  <button
                    className="text-xs text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
                    onClick={() => setListLimit(l => l + LIST_PAGE_SIZE)}
                  >
                    Load more <ChevronDown className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── MIDDLE: Detail Panel ── */}
          {selectedBill ? (
            <div className="flex flex-col min-h-0 overflow-hidden bg-white">
              {editing ? (
                <div className="flex-1 overflow-hidden flex flex-col p-4">
                  <EditBillPanel
                    bill={selectedBill}
                    homes={homes || []}
                    onSave={data => onUpdateBill && onUpdateBill(selectedBill.id, { ...data, is_staff_expense: selectedBill.is_staff_expense }, () => setEditing(false))}
                    onCancel={() => setEditing(false)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {/* Tab bar */}
                  <div className="px-5 pt-3 border-b border-gray-200 shrink-0 flex items-end justify-between bg-white sticky top-0 z-10">
                    <div className="flex gap-0">
                      {["details", "workflow", "history"].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveDetailsTab(tab)}
                          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors capitalize -mb-px ${
                            activeDetailsTab === tab
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {tab === "workflow" ? "Approval Workflow" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 pb-2">
                      {canEdit && !editing && selectedBill && (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Bill
                        </button>
                      )}
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ── DETAILS TAB ── */}
                  {activeDetailsTab === "details" && (
                    <div className="p-5 space-y-4">
                      {/* Bill Information */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                          <div className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center bg-white">
                            <FileText className="w-3 h-3 text-gray-500" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">Bill Information</span>
                        </div>
                        <div className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Billing ID</p>
                              <p className="text-sm font-semibold text-gray-800">{selectedBill.title || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Amount</p>
                              <p className="text-sm font-bold text-gray-900">£{(selectedBill.amount || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Bill Type</p>
                              <p className="text-sm font-medium text-gray-700">{formatBillType(selectedBill.bill_type)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Due Date</p>
                              <p className="text-sm font-medium text-gray-700">{formatDate(selectedBill.due_date)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Supplier</p>
                              <p className="text-sm font-medium text-gray-700">{selectedBill.supplier || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Status</p>
                              <StatusWithDot status={approvalDisplayStatus} />
                            </div>
                            <div className="col-span-2">
                              <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Submitted On</p>
                              <p className="text-sm font-medium text-gray-700">
                                {formatDateTime(selectedWorkflow?.submitted_at || selectedBill.created_date)}
                              </p>
                            </div>
                          </div>
                          {(selectedBill.notes || selectedWorkflow?.description) && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <p className="text-[11px] font-medium text-gray-400 mb-1.5">Description / Notes</p>
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {selectedBill.notes || selectedWorkflow?.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Documents */}
                      {selectedBill.image_url && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                            <div className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center bg-white">
                              <Paperclip className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">Documents</span>
                          </div>
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center shrink-0 border border-red-100">
                                  <FileText className="w-5 h-5" />
                                  <span className="absolute text-[8px] font-bold text-red-600 mt-5">PDF</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-gray-800 truncate">{selectedBill.image_file_name || "Bill document"}</p>
                                  <p className="text-[10px] text-gray-400">
                                    {selectedBill.image_uploaded_at
                                      ? `Uploaded on ${formatDate(selectedBill.image_uploaded_at)}`
                                      : "Attached document"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => window.open(selectedBill.image_url, "_blank")}
                                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a href={selectedBill.image_url} target="_blank" rel="noopener noreferrer" download>
                                  <button className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors" title="Download">
                                    <Download className="w-4 h-4" />
                                  </button>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Approval Details */}
                      {isPendingApproval && approvalInfo && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                            <div className="w-5 h-5 rounded border border-gray-200 flex items-center justify-center bg-white">
                              <Shield className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">Approval Details</span>
                          </div>
                          <div className="px-4 py-4 space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Current Approver</p>
                                <p className="text-sm font-semibold text-gray-800">{approvalInfo.current}</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Approval Level</p>
                                <p className="text-sm font-semibold text-gray-800">Level {approvalInfo.level} of 3</p>
                              </div>
                              <div>
                                <p className="text-[11px] text-gray-400 mb-0.5 font-medium">Next Approver</p>
                                <p className="text-sm font-semibold text-gray-800">{approvalInfo.next || "—"}</p>
                              </div>
                            </div>
                            {canEdit && (
                              <>
                                <div>
                                  <label className="text-xs text-gray-500 font-medium block mb-1.5">Add a note (required)</label>
                                  <Textarea
                                    placeholder="Enter reason for approval, rejection or changes…"
                                    value={approvalNote}
                                    onChange={e => setApprovalNote(e.target.value)}
                                    className="text-sm min-h-[60px] resize-none border-gray-200 text-gray-700 placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() => {
                                      if (!approvalNote.trim()) { toast.error("Please add a note before approving"); }
                                      else { toast.success("Approval submitted"); }
                                    }}
                                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4" /> Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!approvalNote.trim()) { toast.error("Please add a note before rejecting"); }
                                      else { toast.info("Rejection submitted"); }
                                    }}
                                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" /> Reject
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!approvalNote.trim()) { toast.error("Please add a note before requesting changes"); }
                                      else { toast.info("Change request submitted"); }
                                    }}
                                    className="flex items-center justify-center gap-1.5 h-10 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 text-xs font-semibold transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Request Changes
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mark as Paid */}
                      {canEdit && selectedBill.status !== "paid" && !isPendingApproval && (
                        <button
                          onClick={() => onMarkPaid && onMarkPaid(selectedBill)}
                          className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Mark as Paid
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── WORKFLOW TAB ── */}
                  {activeDetailsTab === "workflow" && (
                    <div className="p-5">
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-800">Approval Workflow</span>
                        </div>
                        <div className="px-4 py-4">
                          <WorkflowTimeline bill={selectedBill} workflow={selectedWorkflow} events={selectedEvents} />
                          {selectedEvents.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                              <p className="text-xs font-semibold text-gray-400">Event log</p>
                              {selectedEvents.map((ev, i) => (
                                <div key={ev.id || i} className="text-xs flex gap-2 text-gray-600">
                                  <span className="capitalize font-medium shrink-0 text-gray-800">{ev.event_type?.replace(/_/g, " ")}</span>
                                  <span className="text-gray-400">— {ev.actor_name} · {formatDateTime(ev.created_at)}</span>
                                  {ev.comment && <span className="italic text-gray-500">"{ev.comment}"</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── HISTORY TAB ── */}
                  {activeDetailsTab === "history" && (
                    <div className="p-5">
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-semibold text-gray-800">History</span>
                        </div>
                        <div className="px-4 py-4 space-y-2">
                          {selectedBill.created_date && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                              <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Created:</span> {formatDateTime(selectedBill.created_date)}</p>
                            </div>
                          )}
                          {selectedBill.updated_date && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                              <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Updated:</span> {formatDateTime(selectedBill.updated_date)}</p>
                            </div>
                          )}
                          {selectedWorkflow?.submitted_at && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <p className="text-xs text-gray-600">
                                <span className="font-medium text-gray-800">Submitted:</span> {formatDateTime(selectedWorkflow.submitted_at)} by {selectedWorkflow.submitted_by_name}
                              </p>
                            </div>
                          )}
                          {selectedBill.image_uploaded_at && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                              <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">Document uploaded:</span> {formatDateTime(selectedBill.image_uploaded_at)}</p>
                            </div>
                          )}
                          {selectedBill.image_file_name && (
                            <div className="flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                              <p className="text-xs text-gray-600"><span className="font-medium text-gray-800">File:</span> {selectedBill.image_file_name}</p>
                            </div>
                          )}
                          {!selectedBill.created_date && !selectedBill.updated_date && !selectedWorkflow && (
                            <p className="text-xs text-gray-400">No history available.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center text-gray-400 text-sm p-8 bg-gray-50">
              {filteredBills.length === 0 ? "No bills match the current filters" : "Select a bill to view details"}
            </div>
          )}

          {/* ── RIGHT: Workflow + Comments + Summary ── */}
          {selectedBill && !editing ? (
            <div className="overflow-y-auto overscroll-contain flex flex-col gap-0 bg-gray-50/80 border-l border-gray-200 min-h-0">
              {/* Approval Workflow compact */}
              <div className="bg-white border-b border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">Approval Workflow</span>
                </div>
                <div className="px-4 py-3">
                  <WorkflowTimeline bill={selectedBill} workflow={selectedWorkflow} compact events={selectedEvents} />
                </div>
              </div>

              {/* Comments & Notes */}
              <div className="bg-white border-b border-gray-200">
                <CommentsSection
                  events={selectedEvents}
                  bill={selectedBill}
                  workflow={selectedWorkflow}
                  onAddNote={handleAddNote}
                  saving={saving}
                />
              </div>

              {/* Bill Summary */}
              <div className="bg-white">
                <BillSummaryCard bill={selectedBill} workflow={selectedWorkflow} />
              </div>
            </div>
          ) : (
            <div className="hidden xl:flex items-center justify-center text-gray-400 text-xs p-4 bg-gray-50/50 border-l border-gray-200">
              {editing ? "Editing bill…" : "Select a bill"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
