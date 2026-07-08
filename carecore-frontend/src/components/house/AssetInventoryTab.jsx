import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import {
  Package, TrendingUp, AlertTriangle, ChevronRight, Eye, Pencil, QrCode,
  Upload, Save, Send, Download, List, Plus, X, CheckCircle,
  Wrench, FileText, MapPin, DollarSign, Shield, Printer, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_TYPES = {
  "Medical Equipment": ["Wheelchair", "Hoist", "Walking Aid", "Bed Rail", "Medication Fridge", "First Aid Kit"],
  "Fire Safety": ["Fire Extinguisher", "Fire Blanket", "Smoke Alarm", "Fire Door Equipment", "Emergency Light"],
  "IT Equipment": ["Laptop", "Desktop", "Tablet", "Mobile Phone", "Router", "Printer", "Monitor"],
  "Furniture": ["Bed", "Wardrobe", "Desk", "Chair", "Sofa", "Mattress"],
  "White Goods": ["Washing Machine", "Dryer", "Fridge", "Freezer", "Cooker", "Microwave"],
  "Office Equipment": ["Shredder", "Scanner", "Photocopier", "Safe", "Projector", "Whiteboard"],
  "Health & Safety": ["First Aid Kit", "PPE Locker", "AED Defibrillator", "Eye Wash Station", "Safety Sign", "Spill Kit"],
  "Security": ["CCTV Camera", "Door Lock", "Key Safe", "Alarm Panel", "Fob Reader", "Intercom"],
  "Cleaning Equipment": ["Industrial Vacuum", "Mop & Bucket", "Pressure Washer", "Steam Cleaner", "Carpet Cleaner"],
  "Kitchen Equipment": ["Dishwasher", "Kettle", "Toaster", "Oven", "Microwave", "Food Processor"],
  "Vehicle": ["Car", "Van", "Minibus", "Mobility Vehicle"],
  "PPE": ["Gloves", "Apron", "Mask", "Face Shield", "Hi-Vis Vest", "Safety Boots"],
  "Stock / Consumables": ["Cleaning Supplies", "Paper Products", "Medical Consumables", "Stationery", "Food Supplies"],
  "Other": ["Other"],
};

const STATUS_COLORS = {
  "Draft": "bg-slate-100 text-slate-600",
  "In Stock": "bg-green-100 text-green-700",
  "Assigned": "bg-blue-100 text-blue-700",
  "In Use": "bg-indigo-100 text-indigo-700",
  "In Repair": "bg-orange-100 text-orange-700",
  "Low Stock": "bg-amber-100 text-amber-700",
  "Reserved": "bg-purple-100 text-purple-700",
  "Retired": "bg-slate-100 text-slate-500",
  "Lost": "bg-red-100 text-red-700",
  "Disposed": "bg-red-100 text-red-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  "Approved": "bg-green-100 text-green-700",
  "Rejected": "bg-red-100 text-red-700",
};

const CONDITION_COLORS = {
  "New": "bg-emerald-100 text-emerald-700",
  "Good": "bg-green-100 text-green-700",
  "Fair": "bg-amber-100 text-amber-700",
  "Poor": "bg-orange-100 text-orange-700",
  "Damaged": "bg-red-100 text-red-700",
  "In Repair": "bg-orange-100 text-orange-700",
  "Retired": "bg-slate-100 text-slate-500",
  "Lost": "bg-red-100 text-red-700",
  "Disposed": "bg-red-100 text-red-700",
};

function generateAssetRef() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `AST-${year}-${rand}`;
}

const EMPTY_FORM = {
  org_id: ORG_ID,
  asset_ref: generateAssetRef(),
  asset_name: "",
  asset_category: "",
  asset_type: "",
  brand_model: "",
  serial_number: "",
  barcode: "",
  description: "",
  quantity: 1,
  unit_of_measure: "Each",
  condition: "Good",
  status: "Draft",
  purchase_date: "",
  supplier_name: "",
  purchase_cost: "",
  depreciation_type: "None",
  warranty_expiry: "",
  invoice_reference: "",
  invoice_url: "",
  funding_source: "",
  budget_code: "",
  linked_bill_id: "",
  finance_link_status: "Unlinked",
  assigned_home_id: "",
  assigned_home_name: "",
  assigned_staff_id: "",
  assigned_staff_name: "",
  room_location: "",
  department_team: "",
  custodian_owner: "",
  issue_date: "",
  return_due_date: "",
  next_service_date: "",
  last_inspection_date: "",
  pat_test_due: "",
  risk_level: "Low",
  replacement_due_date: "",
  maintenance_notes: "",
  pat_required: false,
  fire_safety_critical: false,
  manual_handling: false,
  data_protection: false,
  coshh_related: false,
  infection_control: false,
  health_safety_critical: false,
  requires_annual_inspection: false,
  requires_staff_training: false,
  warranty_monitored: false,
  internal_notes: "",
  handover_notes: "",
  approval_status: "Draft",
  created_by_name: "",
};

// ── Root Component ─────────────────────────────────────────────────────────────

export default function AssetInventoryTab({ user, staffProfile, homes = [], staff = [], homeId, homeName }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || staffProfile?.role === "admin" || staffProfile?.role === "admin_officer";
  const hasFinancePermission = isAdmin;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);

  // ✅ FIXED: Use HomeAsset entity, not Asset
  const { data: assets = [] } = useQuery({
    queryKey: ["home-assets", ORG_ID, homeId],
    queryFn: () => {
      const filters = { org_id: ORG_ID };
      if (homeId) filters.home_id = homeId;
      return base44.entities.HomeAsset.filter(filters, "-created_date", 500);
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["bills-asset"],
    queryFn: () => base44.entities.Bill.filter({ org_id: ORG_ID }),
    enabled: hasFinancePermission,
  });

  const handleOpenModal = (asset = null, viewMode = false) => {
    if (!asset && homeId) {
      asset = { assigned_home_id: homeId, assigned_home_name: homeName };
    }
    setEditingAsset(asset);
    setIsViewMode(viewMode);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAsset(null);
    setIsViewMode(false);
  };

  return (
    <div className="space-y-5">
      <InventoryRegister
        assets={assets}
        homes={homes}
        staff={staff}
        hasFinancePermission={hasFinancePermission}
        onNew={() => handleOpenModal()}
        onEdit={handleOpenModal}
      />
      {isModalOpen && (
        <AssetModal
          user={user}
          homes={homes}
          staff={staff}
          bills={bills}
          hasFinancePermission={hasFinancePermission}
          initialAsset={editingAsset}
          isViewMode={isViewMode}
          onClose={handleCloseModal}
          queryClient={queryClient}
          fixedHomeId={homeId}
        />
      )}
    </div>
  );
}

// ── Step Wizard Modal ──────────────────────────────────────────────────────────

function AssetModal({ user, homes, staff, bills, hasFinancePermission, initialAsset, isViewMode, onClose, queryClient, fixedHomeId }) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  const [step, setStep] = useState(isViewMode ? 5 : 1);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [form, setForm] = useState(() => {
    if (initialAsset) {
      return {
        ...EMPTY_FORM,
        ...initialAsset,
        asset_name: initialAsset.asset_name || initialAsset.name || "",
        asset_category: initialAsset.asset_category || initialAsset.category || "",
        assigned_home_id: initialAsset.assigned_home_id || initialAsset.home_id || "",
        assigned_home_name: initialAsset.assigned_home_name || initialAsset.home_name || "",
        assigned_staff_id: initialAsset.assigned_staff_id || initialAsset.staff_id || "",
        supplier_name: initialAsset.supplier_name || initialAsset.supplier || "",
      };
    }
    return { ...EMPTY_FORM, asset_ref: generateAssetRef(), created_by_name: user?.full_name || user?.email || "" };
  });

  // ✅ FIXED: Use HomeAsset entity
  const createAsset = useMutation({
    mutationFn: (data) => base44.entities.HomeAsset.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-assets"] });
      toast.success("Asset saved successfully.");
      onClose();
    },
    onError: (err) => toast.error(`Failed to save: ${err?.message || "Unknown error"}`),
  });

  const updateAsset = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeAsset.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-assets"] });
      toast.success("Asset updated.");
      onClose();
    },
    onError: (err) => toast.error(`Failed to update: ${err?.message || "Unknown error"}`),
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleCategoryChange = (cat) => {
    set("asset_category", cat);
    set("asset_type", "");
    if (cat === "Fire Safety") set("risk_level", "High");
  };

  const validateStep = (s) => {
    const errors = [];
    if (s === 1) {
      if (!form.asset_name) errors.push("Asset Name");
      if (!form.asset_category) errors.push("Asset Category");
      if (!form.asset_type) errors.push("Asset Type");
    }
    if (s === 3) {
      if (!form.assigned_home_id) errors.push("Assigned Home");
    }
    if (errors.length) { toast.error(`Required: ${errors.join(", ")}`); return false; }
    return true;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(5, s + 1)); };
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const buildPayload = (extra = {}) => {
    // Strip UI aliases out of the payload to prevent database column errors
    const {
      asset_name,
      asset_category,
      assigned_home_id,
      assigned_home_name,
      supplier_name,
      ...backendData
    } = form;

    // Convert empty strings to null for dates and numbers
    const parseNull = (val) => val === "" ? null : val;

    return {
      ...backendData,
      home_id: assigned_home_id || form.home_id || "",
      home_name: assigned_home_name || form.home_name || "",
      name: asset_name || form.name || "",
      category: asset_category || form.category || "",
      supplier: supplier_name || form.supplier || "",

      purchase_date: parseNull(backendData.purchase_date),
      issue_date: parseNull(backendData.issue_date),
      return_due_date: parseNull(backendData.return_due_date),
      next_service_date: parseNull(backendData.next_service_date),
      last_inspection_date: parseNull(backendData.last_inspection_date),
      pat_test_due: parseNull(backendData.pat_test_due),
      replacement_due_date: parseNull(backendData.replacement_due_date),

      purchase_cost: backendData.purchase_cost === "" ? null : Number(backendData.purchase_cost),
      quantity: backendData.quantity === "" ? 1 : Number(backendData.quantity),

      ...extra,
    };
  };

  const handleSaveDraft = () => {
    if (!form.asset_name) { toast.error("Please enter an asset name."); return; }
    const data = buildPayload({ status: "Draft", approval_status: "Draft" });
    if (initialAsset?.id) updateAsset.mutate({ id: initialAsset.id, data });
    else createAsset.mutate(data);
  };

  const handleSubmitApproval = () => {
    if (!validateStep(1) || !validateStep(3)) return;
    const data = buildPayload({
      approval_status: "Submitted",
      status: "Pending Approval",
      submitted_by: user?.full_name || user?.email || "",
      submitted_at: new Date().toISOString(),
    });
    if (initialAsset?.id) updateAsset.mutate({ id: initialAsset.id, data });
    else createAsset.mutate(data);
  };

  // Build QR data string from all filled form fields
  const qrData = [
    `ID:${form.asset_ref}`,
    form.asset_name && `Name:${form.asset_name}`,
    form.asset_category && `Cat:${form.asset_category}`,
    form.asset_type && `Type:${form.asset_type}`,
    form.serial_number && `SN:${form.serial_number}`,
    form.assigned_home_name && `Home:${form.assigned_home_name}`,
    form.room_location && `Loc:${form.room_location}`,
    form.condition && `Cond:${form.condition}`,
    form.status && `Status:${form.status}`,
    form.purchase_cost && `Cost:£${form.purchase_cost}`,
    form.warranty_expiry && `Warranty:${form.warranty_expiry}`,
  ].filter(Boolean).join(" | ");

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}&margin=4&color=1e293b&bgcolor=ffffff`;

  const steps = [
    { id: 1, title: "Asset Details", icon: Package },
    { id: 2, title: "Procurement & Financials", icon: DollarSign },
    { id: 3, title: "Location & Assignment", icon: MapPin },
    { id: 4, title: "Maintenance & Compliance", icon: Wrench },
    { id: 5, title: "Asset Summary & QR", icon: QrCode },
  ];

  const isPending = createAsset.isPending || updateAsset.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isViewMode ? "View Asset" : initialAsset ? "Edit Asset" : "Add New Asset"}
            </h2>
            <p className="text-xs text-slate-400 font-mono">{form.asset_ref}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step tabs */}
        {!isViewMode && (
          <div className="flex border-b border-slate-100 shrink-0 bg-slate-50 overflow-x-auto">
            {steps.map((s) => (
              <button
                key={s.id}
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${step === s.id
                    ? "border-blue-600 text-blue-700 bg-white"
                    : step > s.id
                      ? "border-green-500 text-green-600 cursor-pointer hover:bg-white"
                      : "border-transparent text-slate-400 cursor-default"
                  }`}
              >
                <s.icon className="w-3.5 h-3.5 shrink-0" />
                {s.title}
                {step > s.id && <CheckCircle className="w-3 h-3 text-green-500 ml-0.5" />}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Step 1: Asset Details ── */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset Name *">
                <Input value={form.asset_name} onChange={e => set("asset_name", e.target.value)} disabled={isViewMode} placeholder="Enter asset name" className="h-9" />
              </Field>
              <Field label="Asset Category *">
                <NativeSelect value={form.asset_category} onChange={e => handleCategoryChange(e.target.value)} disabled={isViewMode}>
                  <option value="">Select category</option>
                  {Object.keys(CATEGORY_TYPES).map(c => <option key={c}>{c}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Asset Type *">
                <NativeSelect value={form.asset_type} onChange={e => set("asset_type", e.target.value)} disabled={isViewMode}>
                  <option value="">Select type</option>
                  {(CATEGORY_TYPES[form.asset_category] || []).map(t => <option key={t}>{t}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Brand / Model">
                <Input value={form.brand_model} onChange={e => set("brand_model", e.target.value)} disabled={isViewMode} placeholder="e.g. Samsung S23" className="h-9" />
              </Field>
              <Field label="Serial Number">
                <Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} disabled={isViewMode} placeholder="e.g. SN-001234" className="h-9" />
              </Field>
              <Field label="Barcode / Scan Code">
                <BarcodeField value={form.barcode} onChange={v => set("barcode", v)} disabled={isViewMode} />
              </Field>
              <Field label="Quantity *">
                <Input type="number" min={1} value={form.quantity} onChange={e => set("quantity", Number(e.target.value))} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Unit of Measure">
                <NativeSelect value={form.unit_of_measure} onChange={e => set("unit_of_measure", e.target.value)} disabled={isViewMode}>
                  {["Each", "Box", "Pack", "Pair", "Set", "Unit", "Litre", "Kilogram", "Roll", "Other"].map(u => <option key={u}>{u}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Condition *">
                <NativeSelect value={form.condition} onChange={e => set("condition", e.target.value)} disabled={isViewMode}>
                  {["New", "Good", "Fair", "Poor", "Damaged", "In Repair", "Retired", "Lost", "Disposed"].map(c => <option key={c}>{c}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Status">
                <NativeSelect value={form.status} onChange={e => set("status", e.target.value)} disabled={isViewMode}>
                  {["Draft", "In Stock", "Assigned", "In Use", "In Repair", "Low Stock", "Reserved", "Retired", "Lost", "Disposed"].map(s => <option key={s}>{s}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Description" className="col-span-2">
                <textarea value={form.description} onChange={e => set("description", e.target.value)} disabled={isViewMode} placeholder="Short description of the asset..." rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
              </Field>
              <div className="col-span-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Asset Photo (optional)</p>
                <UploadBox accept="JPG, PNG, WebP up to 5MB" icon={Upload} onUpload={url => set("photo_url", url)} currentUrl={form.photo_url} disabled={isViewMode} />
              </div>
            </div>
          )}

          {/* ── Step 2: Procurement & Financials ── */}
          {step === 2 && (
            <>
              {!hasFinancePermission ? (
                <div className="flex flex-col items-center justify-center gap-3 p-10 bg-slate-50 rounded-xl border border-slate-200 text-slate-400">
                  <Shield className="w-10 h-10 text-slate-300" />
                  <p className="text-sm">Finance fields are restricted to admin users.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Purchase Date">
                    <Input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} disabled={isViewMode} className="h-9" />
                  </Field>
                  <Field label="Supplier / Vendor">
                    <Input value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} disabled={isViewMode} placeholder="e.g. NHS Supply Chain" className="h-9" />
                  </Field>
                  <Field label="Purchase Cost (£)">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-slate-500">£</span>
                      <Input type="number" min={0} step={0.01} value={form.purchase_cost} disabled={isViewMode}
                        onChange={e => set("purchase_cost", e.target.value)} className="h-9 pl-7" placeholder="0.00" />
                    </div>
                  </Field>
                  <Field label="Depreciation Type">
                    <NativeSelect value={form.depreciation_type} onChange={e => set("depreciation_type", e.target.value)} disabled={isViewMode}>
                      {["None", "Straight Line", "Reducing Balance", "Manual", "Expensed Immediately"].map(d => <option key={d}>{d}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Warranty Expiry">
                    <Input type="date" value={form.warranty_expiry} onChange={e => set("warranty_expiry", e.target.value)} disabled={isViewMode} className="h-9" />
                  </Field>
                  <Field label="Invoice / Reference Number">
                    <Input value={form.invoice_reference} onChange={e => set("invoice_reference", e.target.value)} disabled={isViewMode} placeholder="e.g. INV-2026-001" className="h-9" />
                  </Field>
                  <Field label="Funding Source" className="col-span-2">
                    <NativeSelect value={form.funding_source} onChange={e => set("funding_source", e.target.value)} disabled={isViewMode}>
                      <option value="">Select funding source</option>
                      {["Home Budget", "Central Budget", "Local Authority Funded", "Grant Funded", "Replacement Budget", "Emergency Purchase", "Other"].map(f => <option key={f}>{f}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Linked Bill">
                    <NativeSelect value={form.linked_bill_id} disabled={isViewMode} onChange={e => {
                      set("linked_bill_id", e.target.value);
                      set("finance_link_status", e.target.value ? "Linked" : "Unlinked");
                    }}>
                      <option value="">Select linked bill</option>
                      {bills.map(b => <option key={b.id} value={b.id}>{b.description || b.id} — £{b.amount}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="Finance Link Status">
                    <NativeSelect value={form.finance_link_status} onChange={e => set("finance_link_status", e.target.value)} disabled={isViewMode}>
                      {["Linked", "Not Required", "Pending Link", "Unlinked"].map(s => <option key={s}>{s}</option>)}
                    </NativeSelect>
                  </Field>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Upload Invoice / Documents</p>
                    <UploadBox
                      accept="PDF, JPG, PNG, DOCX up to 10MB"
                      icon={FileText}
                      onUpload={(url) => set("invoice_url", url)}
                      currentUrl={form.invoice_url}
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Step 3: Location & Assignment ── */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assigned Home *" className="col-span-2">
                <NativeSelect value={form.assigned_home_id} disabled={isViewMode || !!fixedHomeId} onChange={e => {
                  const home = homes.find(h => h.id === e.target.value);
                  set("assigned_home_id", e.target.value);
                  set("assigned_home_name", home?.name || "");
                }}>
                  <option value="">Select home</option>
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Room / Location">
                <Input value={form.room_location} onChange={e => set("room_location", e.target.value)} disabled={isViewMode} placeholder="e.g. Kitchen, Room 2" className="h-9" />
              </Field>
              <Field label="Assigned To Staff">
                <NativeSelect value={form.assigned_staff_id} disabled={isViewMode} onChange={e => {
                  const s = staff.find(x => x.id === e.target.value);
                  set("assigned_staff_id", e.target.value);
                  set("assigned_staff_name", s?.full_name || "");
                }}>
                  <option value="">Select staff member</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Department / Team">
                <NativeSelect value={form.department_team} onChange={e => set("department_team", e.target.value)} disabled={isViewMode}>
                  <option value="">Select department</option>
                  {["Maintenance", "Admin", "Care Team", "Outreach Team", "Finance", "Compliance", "Management", "House Team"].map(d => <option key={d}>{d}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Custodian / Owner">
                <Input value={form.custodian_owner} onChange={e => set("custodian_owner", e.target.value)} disabled={isViewMode} placeholder="Person responsible" className="h-9" />
              </Field>
              <Field label="Issue Date">
                <Input type="date" value={form.issue_date} onChange={e => set("issue_date", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Return Due Date">
                <Input type="date" value={form.return_due_date} onChange={e => set("return_due_date", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Handover / Assignment Notes" className="col-span-2">
                <textarea value={form.handover_notes} onChange={e => set("handover_notes", e.target.value)} disabled={isViewMode} placeholder="Handover instructions or notes..." rows={3}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
              </Field>
            </div>
          )}

          {/* ── Step 4: Maintenance & Compliance ── */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Next Service Date">
                <Input type="date" value={form.next_service_date} onChange={e => set("next_service_date", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Last Inspection Date">
                <Input type="date" value={form.last_inspection_date} onChange={e => set("last_inspection_date", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="PAT Test Due Date">
                <Input type="date" value={form.pat_test_due} onChange={e => set("pat_test_due", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Replacement Due Date">
                <Input type="date" value={form.replacement_due_date} onChange={e => set("replacement_due_date", e.target.value)} disabled={isViewMode} className="h-9" />
              </Field>
              <Field label="Risk Level">
                <NativeSelect value={form.risk_level} onChange={e => set("risk_level", e.target.value)} disabled={isViewMode}>
                  {["Low", "Medium", "High", "Critical"].map(r => <option key={r}>{r}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Internal Notes">
                <Input value={form.internal_notes} onChange={e => set("internal_notes", e.target.value)} disabled={isViewMode} placeholder="Internal-only notes" className="h-9" />
              </Field>
              <Field label="Maintenance Notes" className="col-span-2">
                <textarea value={form.maintenance_notes} onChange={e => set("maintenance_notes", e.target.value)} disabled={isViewMode}
                  placeholder="Details on maintenance schedule, history..." rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" />
              </Field>
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-blue-600" /> Compliance Flags
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ["pat_required", "PAT Required"],
                    ["fire_safety_critical", "Fire Safety Critical"],
                    ["manual_handling", "Manual Handling"],
                    ["data_protection", "Data Protection"],
                    ["coshh_related", "COSHH Related"],
                    ["infection_control", "Infection Control"],
                    ["health_safety_critical", "H&S Critical"],
                    ["requires_annual_inspection", "Annual Inspection"],
                    ["requires_staff_training", "Staff Training"],
                    ["warranty_monitored", "Warranty Monitored"],
                  ].map(([key, label]) => (
                    <label key={key} className={`flex items-center gap-2 text-sm text-slate-700 px-2 py-1.5 rounded-lg transition-all border border-transparent ${isViewMode ? 'opacity-70 cursor-default' : 'cursor-pointer hover:bg-white hover:shadow-sm hover:border-slate-200'}`}>
                      <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} disabled={isViewMode} className="w-4 h-4 accent-blue-600 disabled:cursor-not-allowed" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Asset Summary & QR Code ── */}
          {step === 5 && (
            <div className="space-y-5">
              {/* Top summary */}
              <div className="flex gap-4 items-start bg-slate-50 border border-slate-200 rounded-xl p-4">
                {/* Photo */}
                <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {form.photo_url
                    ? <img src={form.photo_url} alt="asset" className="w-full h-full object-cover" />
                    : <Package className="w-8 h-8 text-slate-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{form.asset_name || "Unnamed Asset"}</h3>
                  <p className="text-xs font-mono text-slate-500 mb-2">{form.asset_ref}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge color={STATUS_COLORS[form.status]}>{form.status}</Badge>
                    <Badge color={CONDITION_COLORS[form.condition]}>{form.condition}</Badge>
                    <Badge color="bg-slate-100 text-slate-600">Qty: {form.quantity} {form.unit_of_measure}</Badge>
                    {form.risk_level && form.risk_level !== "Low" && (
                      <Badge color={form.risk_level === "Critical" ? "bg-red-100 text-red-700" : form.risk_level === "High" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}>
                        {form.risk_level} Risk
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Details + QR side by side */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Details grid */}
                <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">All Asset Details</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                    <SummaryRow label="Category" value={form.asset_category || "—"} />
                    <SummaryRow label="Asset Type" value={form.asset_type || "—"} />
                    <SummaryRow label="Brand / Model" value={form.brand_model || "—"} />
                    <SummaryRow label="Serial Number" value={form.serial_number || "—"} />
                    <SummaryRow label="Barcode" value={form.barcode || "—"} />
                    <SummaryRow label="Description" value={form.description || "—"} />
                    <div className="col-span-2 border-t border-slate-100 my-1" />
                    <SummaryRow label="Assigned Home" value={form.assigned_home_name || "—"} />
                    <SummaryRow label="Location" value={form.room_location || "—"} />
                    <SummaryRow label="Assigned Staff" value={form.assigned_staff_name || "Unassigned"} />
                    <SummaryRow label="Department" value={form.department_team || "—"} />
                    <SummaryRow label="Issue Date" value={form.issue_date || "—"} />
                    <SummaryRow label="Return Due" value={form.return_due_date || "—"} />
                    <div className="col-span-2 border-t border-slate-100 my-1" />
                    <SummaryRow label="Next Service" value={form.next_service_date || "—"} />
                    <SummaryRow label="PAT Test Due" value={form.pat_test_due || "—"} />
                    <SummaryRow label="Last Inspection" value={form.last_inspection_date || "—"} />
                    <SummaryRow label="Replacement Due" value={form.replacement_due_date || "—"} />
                    {hasFinancePermission && (
                      <>
                        <div className="col-span-2 border-t border-slate-100 my-1" />
                        <SummaryRow label="Purchase Date" value={form.purchase_date || "—"} />
                        <SummaryRow label="Cost" value={form.purchase_cost ? `£${Number(form.purchase_cost).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—"} highlight />
                        <SummaryRow label="Supplier" value={form.supplier_name || "—"} />
                        <SummaryRow label="Warranty Expiry" value={form.warranty_expiry || "—"} />
                        <SummaryRow label="Finance Link" value={form.finance_link_status} />
                        {form.invoice_url && (
                          <div className="col-span-2 flex justify-end mt-2">
                            <button
                              onClick={() => setViewingDocument(form.invoice_url)}
                              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1.5"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Invoice Document
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* QR Code panel */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Asset QR Code</p>
                  <div className="p-2 border border-slate-200 rounded-xl bg-white shadow-sm">
                    <img
                      src={qrUrl}
                      alt="Asset QR Code"
                      className="w-44 h-44 object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-mono text-slate-600 font-semibold">{form.asset_ref}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Scan to view asset info</p>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed px-1">
                    Encodes: ID, name, category, location, condition, status{hasFinancePermission ? ", cost" : ""}, warranty.
                  </p>
                  <button
                    onClick={() => window.open(qrUrl, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Download QR
                  </button>
                </div>
              </div>

              {/* Compliance flags summary */}
              {["pat_required", "fire_safety_critical", "manual_handling", "data_protection", "coshh_related", "infection_control", "health_safety_critical", "requires_annual_inspection", "requires_staff_training", "warranty_monitored"].some(k => form[k]) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Active Compliance Flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["pat_required", "PAT Required"], ["fire_safety_critical", "Fire Safety Critical"],
                      ["manual_handling", "Manual Handling"], ["data_protection", "Data Protection"],
                      ["coshh_related", "COSHH Related"], ["infection_control", "Infection Control"],
                      ["health_safety_critical", "H&S Critical"], ["requires_annual_inspection", "Annual Inspection"],
                      ["requires_staff_training", "Staff Training"], ["warranty_monitored", "Warranty Monitored"],
                    ].filter(([k]) => form[k]).map(([k, label]) => (
                      <span key={k} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">✓ {label}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center shrink-0 ${isViewMode ? 'justify-end' : 'justify-between'}`}>
          {!isViewMode && (
            <div className="flex gap-2">
              <button onClick={prevStep} disabled={step === 1}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                ← Back
              </button>
              <button onClick={handleSaveDraft} disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <Save className="w-3.5 h-3.5" /> Save Draft
              </button>
            </div>
          )}
          <div className="flex gap-2">
            {isViewMode && (
              <button onClick={onClose}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                Close
              </button>
            )}
            {step < 5 ? (
              <button onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : !isViewMode && (
              <button onClick={handleSubmitApproval} disabled={isPending}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4" /> {isPending ? "Saving…" : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Document Viewer Popup ── */}
      {viewingDocument && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-xl overflow-hidden flex flex-col shadow-2xl" style={{ height: "85vh" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Document Viewer
              </h3>
              <div className="flex items-center gap-2">
                <a href={viewingDocument} target="_blank" rel="noopener noreferrer" download className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => setViewingDocument(null)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
              {viewingDocument.toLowerCase().endsWith(".pdf") ? (
                <iframe src={viewingDocument} className="w-full h-full rounded border border-slate-200 bg-white" title="Document" />
              ) : (
                <img src={viewingDocument} alt="Document" className="max-w-full max-h-full object-contain rounded shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QRModal({ asset, onClose }) {
  if (!asset) return null;
  const assetRef = asset.asset_ref || "—";
  const assetName = asset.asset_name || asset.name || "Unnamed Asset";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(assetRef)}&margin=2&color=1e293b&bgcolor=ffffff`;

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-${assetRef}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code", err);
      window.open(qrUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Asset QR Code</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 flex flex-col items-center">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl mb-4 shadow-sm">
            <img src={qrUrl} alt="Asset QR Code" className="w-48 h-48" />
          </div>
          <h4 className="font-bold text-slate-800 text-lg mb-1 text-center">{assetName}</h4>
          <p className="text-slate-500 font-mono text-sm mb-6">{assetRef}</p>
          <div className="flex gap-3 w-full">
            <button onClick={handleDownloadQR} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={() => window.open(qrUrl, "_blank")} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inventory Register ─────────────────────────────────────────────────────────

function InventoryRegister({ assets, homes, staff, hasFinancePermission, onNew, onEdit }) {
  const [search, setSearch] = useState("");
  const [qrAsset, setQrAsset] = useState(null);
  const [filterHome, setFilterHome] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeKpiFilter, setActiveKpiFilter] = useState("all"); // 'all' | 'warranty' | 'attention' | 'highValue'

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const name = (a.asset_name || a.name || "").toLowerCase();
    const ref = (a.asset_ref || "").toLowerCase();
    if (q && !name.includes(q) && !ref.includes(q)) return false;
    if (filterHome !== "all" && (a.assigned_home_id || a.home_id) !== filterHome) return false;
    if (filterCat !== "all" && (a.asset_category || a.category) !== filterCat) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;

    // KPI filters
    if (activeKpiFilter === "warranty") {
      const hasWarranty = a.warranty_expiry && new Date(a.warranty_expiry) > new Date();
      if (!hasWarranty) return false;
    }
    if (activeKpiFilter === "attention") {
      const needsAttention =
        a.condition === "Poor" ||
        a.condition === "Damaged" ||
        a.condition === "In Repair" ||
        a.condition === "Lost" ||
        a.status === "In Repair" ||
        a.status === "Low Stock" ||
        a.status === "Lost";
      if (!needsAttention) return false;
    }
    if (activeKpiFilter === "highValue") {
      const isHighValue = Number(a.purchase_cost || 0) >= 1000;
      if (!isHighValue) return false;
    }

    return true;
  });

  const CATEGORIES = [...new Set(assets.map(a => a.asset_category || a.category).filter(Boolean))];
  const STATUSES = [...new Set(assets.map(a => a.status).filter(Boolean))];

  const totalAssets = assets.length;
  const underWarranty = assets.filter(a => a.warranty_expiry && new Date(a.warranty_expiry) > new Date()).length;
  const attentionCount = assets.filter(a =>
    a.condition === "Poor" ||
    a.condition === "Damaged" ||
    a.condition === "In Repair" ||
    a.condition === "Lost" ||
    a.status === "In Repair" ||
    a.status === "Low Stock" ||
    a.status === "Lost"
  ).length;
  const highValue = assets.filter(a => Number(a.purchase_cost || 0) >= 1000).length;

  const handleExport = () => {
    const rows = [["Asset Ref", "Name", "Category", "Home", "Location", "Condition", "Status", "Cost", "Warranty", "Updated"]];
    assets.forEach(a => rows.push([
      a.asset_ref || "", a.asset_name || a.name || "", a.asset_category || a.category || "",
      a.assigned_home_name || a.home_name || "", a.room_location || "",
      a.condition, a.status,
      a.purchase_cost ? `£${a.purchase_cost}` : "", a.warranty_expiry || "", a.updated_date || "",
    ]));
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `carecore-assets-${new Date().toISOString().split("T")[0]}.csv`;
    el.click(); URL.revokeObjectURL(url);
    toast.success("Export generated.");
  };

  const handleDownloadQR = async (assetRef) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(assetRef)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QR-${assetRef}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download QR code", err);
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(assetRef)}`, "_blank");
    }
  };

  const handleBulkPrint = () => {
    if (filtered.length === 0) {
      toast.error("No assets to print.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print QR labels.");
      return;
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulk Print QR Labels - CareCore AI</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
            color: #333333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eaeaea;
            padding-bottom: 10px;
          }
          .header h1 {
            font-size: 20px;
            margin: 0 0 5px 0;
            color: #1e293b;
          }
          .header p {
            font-size: 12px;
            margin: 0;
            color: #64748b;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 15px;
          }
          .label-card {
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
            background: #ffffff;
          }
          .asset-name {
            font-size: 12px;
            font-weight: 700;
            margin: 0 0 4px 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            color: #0f172a;
          }
          .asset-cat {
            font-size: 9px;
            color: #64748b;
            margin: 0 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .qr-img {
            width: 120px;
            height: 120px;
            object-fit: contain;
            margin-bottom: 8px;
          }
          .asset-ref {
            font-family: monospace;
            font-size: 10px;
            font-weight: 600;
            color: #334155;
            background-color: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            margin: 0;
          }
          @media print {
            body {
              padding: 0;
            }
            .header {
              display: none;
            }
            .grid {
              gap: 10px;
            }
            .label-card {
              border: 1px solid #e2e8f0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CareCore AI - Asset QR Labels</h1>
          <p>Generated on ${new Date().toLocaleDateString()} for ${filtered.length} asset(s)</p>
        </div>
        <div class="grid">
    `;

    filtered.forEach(a => {
      const assetName = a.asset_name || a.name || "Unnamed Asset";
      const assetRef = a.asset_ref || "—";
      const cat = a.asset_category || a.category || "—";

      const qrData = [
        `ID:${assetRef}`,
        `Name:${assetName}`,
        cat !== "—" && `Cat:${cat}`,
        a.serial_number && `SN:${a.serial_number}`,
        a.condition && `Cond:${a.condition}`,
        a.status && `Status:${a.status}`,
      ].filter(Boolean).join(" | ");

      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&margin=2&color=1e293b&bgcolor=ffffff`;

      htmlContent += `
        <div class="label-card">
          <div class="asset-name" title="${assetName}">${assetName}</div>
          <div class="asset-cat">${cat}</div>
          <img class="qr-img" src="${qrUrl}" alt="QR" />
          <div class="asset-ref">${assetRef}</div>
        </div>
      `;
    });

    htmlContent += `
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs text-slate-400">My Homes &rsaquo; Assets</p>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">Assets</h2>
          <p className="text-sm text-slate-500">Track home equipment, furniture and operational assets</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleBulkPrint} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
            <QrCode className="w-4 h-4" /> Bulk Print QR Labels
          </button>
          <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> + Add Asset
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={Package}
          color="blue"
          label="Total Assets"
          value={totalAssets}
          sub="All assets in this home"
          active={activeKpiFilter === "all"}
          onClick={() => setActiveKpiFilter("all")}
        />
        <KPICard
          icon={CheckCircle}
          color="green"
          label="Under Warranty"
          value={underWarranty}
          sub="With active warranty"
          active={activeKpiFilter === "warranty"}
          onClick={() => setActiveKpiFilter(prev => prev === "warranty" ? "all" : "warranty")}
        />
        <KPICard
          icon={AlertTriangle}
          color="amber"
          label="Needs Attention"
          value={attentionCount}
          sub="Repair or review required"
          active={activeKpiFilter === "attention"}
          onClick={() => setActiveKpiFilter(prev => prev === "attention" ? "all" : "attention")}
        />
        <KPICard
          icon={DollarSign}
          color="purple"
          label="High Value Assets"
          value={highValue}
          sub="Value above £1,000"
          active={activeKpiFilter === "highValue"}
          onClick={() => setActiveKpiFilter(prev => prev === "highValue" ? "all" : "highValue")}
        />
      </div>

      {/* Filters + Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            Existing Assets <span className="font-normal text-slate-400 ml-1">{filtered.length}</span>
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets" className="h-8 w-44 text-sm pr-2" />
            </div>
            <NativeSelect value={filterHome} onChange={e => setFilterHome(e.target.value)} className="h-8 text-xs w-32">
              <option value="all">All Homes</option>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </NativeSelect>
            <NativeSelect value={filterCat} onChange={e => setFilterCat(e.target.value)} className="h-8 text-xs w-36">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </NativeSelect>
            <NativeSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-8 text-xs w-32">
              <option value="all">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </NativeSelect>
            <button onClick={handleExport} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Asset ID", "Asset Name", "Serial ID", "Category", "Condition", "Location", "Value £", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => {
                const assetName = a.asset_name || a.name || "—";
                const assetRef = a.asset_ref || "—";
                const cat = a.asset_category || a.category || "—";
                const homeId = a.assigned_home_id || a.home_id || "";
                const miniQr = `https://api.qrserver.com/v1/create-qr-code/?size=40x40&data=${encodeURIComponent(assetRef)}&margin=2`;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-4 py-3 font-mono text-blue-600 text-xs whitespace-nowrap">{a.id?.slice(0, 36)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{assetName}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{a.serial_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{cat}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${CONDITION_COLORS[a.condition] || "bg-slate-100 text-slate-600"}`}>{a.condition || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{a.room_location || a.location_in_home || "—"}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {a.purchase_cost ? `£${Number(a.purchase_cost).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[a.status] || "bg-slate-100 text-slate-600"}`}>{a.status || "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(a, true)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onEdit(a, false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setQrAsset(a)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors" title="View QR">
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Package className="w-10 h-10 text-slate-200" />
                      <p className="font-medium text-slate-500">No assets found</p>

                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {qrAsset && <QRModal asset={qrAsset} onClose={() => setQrAsset(null)} />}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, color, label, value, sub, active, onClick }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  const borderColors = {
    blue: "border-blue-200 ring-blue-400",
    green: "border-green-200 ring-green-400",
    amber: "border-amber-200 ring-amber-400",
    purple: "border-purple-200 ring-purple-400",
  };

  const activeClass = active && label !== "Total Assets"
    ? `ring-2 ${borderColors[color] || "ring-blue-400"} ring-offset-1 shadow-md scale-[1.02]`
    : "hover:shadow hover:border-slate-300 hover:scale-[1.01]";

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all duration-200 flex items-start gap-3 cursor-pointer select-none ${activeClass}`}
    >
      <div className={`p-2.5 rounded-lg border shrink-0 ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 mb-0.5">{label}</p>
          {active && label !== "Total Assets" && (
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
              Active
            </span>
          )}
        </div>
        <p className="text-2xl font-black text-slate-900 leading-none">{value.toLocaleString()}</p>
        <p className="text-xs text-slate-400 mt-1 truncate">{sub}</p>
      </div>
    </div>
  );
}

function Badge({ color, children }) {
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function Field({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function NativeSelect({ value, onChange, disabled, children, className = "" }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}
      className={`w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 transition-colors disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${className}`}>
      {children}
    </select>
  );
}

function UploadBox({ accept, icon: Icon, onUpload, currentUrl, disabled }) {
  const handleFile = async (e) => {
    if (disabled) return;
    const file = e.target.files[0];
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (onUpload) onUpload(file_url);
      toast.success("File uploaded.");
    } catch { toast.error("Upload failed."); }
  };
  return (
    <label className={`flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-xl p-4 transition-colors ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
      <div className="p-2 bg-slate-100 rounded-lg">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div>
        <span className="text-sm font-medium text-slate-700 block">
          {disabled ? (currentUrl ? 'File uploaded' : 'Upload disabled') : 'Click to upload'}
        </span>
        <span className="text-xs text-slate-400">{accept}</span>
      </div>
      {currentUrl && <span className="ml-auto text-xs text-green-600 font-semibold">✓ Uploaded</span>}
      <input type="file" className="hidden" disabled={disabled} onChange={handleFile} />
    </label>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className={`text-xs text-right truncate max-w-[60%] ${highlight ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{value || "—"}</span>
    </div>
  );
}

// ── Barcode Field + Camera Scanner ─────────────────────────────────────────────

function BarcodeField({ value, onChange, disabled }) {
  const [scannerOpen, setScannerOpen] = useState(false);
  return (
    <>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Enter or scan barcode / QR code"
          className="h-9 flex-1 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-1.5 px-3 h-9 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shrink-0 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          title="Open camera to scan barcode or QR code"
        >
          <Camera className="w-3.5 h-3.5" /> Scan
        </button>
      </div>
      {scannerOpen && (
        <BarcodeScannerModal
          onDetected={code => { onChange(code); setScannerOpen(false); toast.success(`Barcode scanned: ${code}`); }}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}

function BarcodeScannerModal({ onDetected, onClose }) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalStyle; };
  }, []);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("Starting camera…");
  const [hasError, setHasError] = useState(false);
  const [detected, setDetected] = useState(null);

  const stopStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  useEffect(() => {
    let detector;
    let cancelled = false;

    const start = async () => {
      if (!("BarcodeDetector" in window)) {
        setStatus("Your browser does not support camera scanning. Please type the code manually or use Chrome/Edge.");
        setHasError(true);
        return;
      }
      try {
        // @ts-ignore
        detector = new window.BarcodeDetector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "data_matrix", "upc_a", "upc_e", "pdf417", "aztec", "itf"],
        });
      } catch {
        setStatus("BarcodeDetector failed to initialise.");
        setHasError(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setStatus("Point camera at a barcode or QR code…");
      } catch (err) {
        setStatus(`Camera access denied: ${err.message}`);
        setHasError(true);
        return;
      }
      const scan = async () => {
        if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(scan); return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && !cancelled) {
            stopStream();
            setDetected(codes[0].rawValue);
            return;
          }
        } catch { /* keep scanning */ }
        rafRef.current = requestAnimationFrame(scan);
      };
      rafRef.current = requestAnimationFrame(scan);
    };

    start();
    return () => { cancelled = true; stopStream(); };
  }, [stopStream]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Scan Barcode / QR Code</h3>
          </div>
          <button onClick={() => { stopStream(); onClose(); }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ aspectRatio: "4/3" }}>
          <video ref={videoRef} muted playsInline className={`w-full h-full object-cover ${detected ? "opacity-30" : ""}`} />
          {/* Scan overlay */}
          {!hasError && !detected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-52">
                {[["top-0 left-0", "border-t-[3px] border-l-[3px]"], ["top-0 right-0", "border-t-[3px] border-r-[3px]"], ["bottom-0 left-0", "border-b-[3px] border-l-[3px]"], ["bottom-0 right-0", "border-b-[3px] border-r-[3px]"]].map(([pos, border], i) => (
                  <div key={i} className={`absolute ${pos} w-7 h-7 border-blue-400 rounded-sm ${border}`} />
                ))}
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-blue-400/70 animate-pulse rounded" />
              </div>
            </div>
          )}
          {/* Detected */}
          {detected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
              <div className="p-3 bg-green-500 rounded-full shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <div className="bg-white/90 rounded-xl px-4 py-2 max-w-[90%]">
                <p className="text-slate-800 font-bold text-sm text-center break-all">{detected}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
          {!detected ? (
            <p className={`text-xs text-center leading-relaxed ${hasError ? "text-red-500 font-medium" : "text-slate-500"}`}>{status}</p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => { setDetected(null); /* re-open stream by re-mounting effect */ }}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Re-scan
              </button>
              <button
                onClick={() => onDetected(detected)}
                className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                ✓ Use This Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}