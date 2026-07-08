import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

const WARNING_LEVEL_LABELS = {
  verbal_warning: "Verbal Warning",
  first_written_warning: "1st Written Warning",
  final_written_warning: "Final Written Warning",
  notice_to_quit: "Notice to Quit",
};

const REASON_LABELS = {
  behaviour: "Behaviour",
  property_damage: "Property Damage",
  abusive_language: "Abusive Language",
  non_compliance_house_rules: "Non-Compliance with House Rules",
  threatening_behaviour: "Threatening Behaviour",
  other: "Other",
};


export default function LegalRestrictionsTab({ residents, homes, staff = [], isAdminOrTL, staffProfile, user, defaultSection = "legal", hideTabs = false }) {
  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || null);
  const [activeSection, setActiveSection] = useState(defaultSection); // "legal" | "warnings"
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [editingWarningId, setEditingWarningId] = useState(null);

  const selectedResident = residents.find(r => r.id === selectedResidentId) || residents[0];
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  // ── Orders ──────────────────────────────────────────────────────────────────
  const { data: orders = [] } = useQuery({
    queryKey: ["deprivation-of-liberty-orders"],
    queryFn: () => secureGateway.filter("DeprivationOfLiberty", {}),
    staleTime: 5 * 60 * 1000,
  });

  const residentOrders = useMemo(() =>
    orders.filter(o => o.resident_id === selectedResident?.id),
    [orders, selectedResident]);

  const defaultOrder = {
    subject_to_order: false, order_start_date: "", order_end_date: "",
    court_order_reference: "", responsible_local_authority: "",
    address_where_order_applies: "", order_type: "mental_capacity_act",
    document_urls: [], review_date: "", next_review_due: "", status: "active", notes: "",
  };
  const [orderForm, setOrderForm] = useState(defaultOrder);
  const [orderErrors, setOrderErrors] = useState({});

  const validateOrderForm = () => {
    const errs = {};
    if (!orderForm.order_type) errs.order_type = "Required";
    if (!orderForm.status) errs.status = "Required";
    if (!orderForm.court_order_reference?.trim()) errs.court_order_reference = "Required";
    if (!orderForm.order_start_date) errs.order_start_date = "Required";
    if (!orderForm.order_end_date) errs.order_end_date = "Required";
    if (!orderForm.responsible_local_authority?.trim()) errs.responsible_local_authority = "Required";
    if (!orderForm.review_date) errs.review_date = "Required";
    if (!orderForm.next_review_due) errs.next_review_due = "Required";
    setOrderErrors(errs);
    if (Object.keys(errs).length > 0) toast.error("Please fill in all required fields before saving.");
    return Object.keys(errs).length === 0;
  };

  const orderMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        org_id: selectedResident.org_id || ORG_ID,
        resident_id: selectedResident.id,
        resident_name: selectedResident.display_name,
        home_id: selectedResident.home_id,
        home_name: homeMap[selectedResident.home_id]?.name || "",
        accommodation_category: selectedResident.accommodation_category,
        ...orderForm,
      };
      if (editingOrderId) await secureGateway.update("DeprivationOfLiberty", editingOrderId, payload);
      else await secureGateway.create("DeprivationOfLiberty", payload);
    },
    onSuccess: () => {
      toast.success(editingOrderId ? "Order updated" : "Order created");
      qc.invalidateQueries({ queryKey: ["deprivation-of-liberty-orders"] });
      setShowOrderForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("DeprivationOfLiberty", id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["deprivation-of-liberty-orders"] }); },
    onError: (err) => toast.error(err.message),
  });

  // ── Warning Letters ──────────────────────────────────────────────────────────
  const { data: warningLetters = [] } = useQuery({
    queryKey: ["warning-letters"],
    queryFn: () => base44.entities.WarningLetter.filter({}, "-issued_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  const residentWarnings = useMemo(() =>
    warningLetters.filter(w => w.resident_id === selectedResident?.id),
    [warningLetters, selectedResident]);

  const defaultWarning = {
    issued_date: new Date().toISOString().split("T")[0],
    issued_by_name: "",
    reason: "behaviour",
    reason_detail: "",
    warning_level: "first_written_warning",
    yp_response: "",
    yp_acknowledgement_required: false,
    witness_name: "",
    follow_up_required: false,
    follow_up_date: "",
    follow_up_notes: "",
    outcome: "acknowledged",
    status: "draft",
    workflow_status: "draft",
    notes: "",
    document_url: "",
  };
  const [warningForm, setWarningForm] = useState(defaultWarning);
  const [warningErrors, setWarningErrors] = useState({});
  const setW = (k, v) => setWarningForm(f => ({ ...f, [k]: v }));

  const validateWarningForm = () => {
    const errs = {};
    if (!warningForm.warning_level) errs.warning_level = "Required";
    if (!warningForm.issued_date) errs.issued_date = "Required";
    if (!warningForm.reason) errs.reason = "Required";
    if (!warningForm.issued_by_name) errs.issued_by_name = "Required";
    if (!warningForm.reason_detail?.trim()) errs.reason_detail = "Required";
    if (!warningForm.outcome) errs.outcome = "Required";
    if (!warningForm.status) errs.status = "Required";
    setWarningErrors(errs);
    if (Object.keys(errs).length > 0) toast.error("Please fill in all required fields before saving.");
    return Object.keys(errs).length === 0;
  };

  const warningMutation = useMutation({
    mutationFn: async () => {
      const isNew = !editingWarningId;
      const payload = {
        org_id: selectedResident.org_id || ORG_ID,
        resident_id: selectedResident.id,
        resident_name: selectedResident.display_name,
        home_id: selectedResident.home_id,
        home_name: homeMap[selectedResident.home_id]?.name || "",
        ...warningForm,
        // New letters always start pending manager approval
        ...(isNew ? { status: "pending_manager_approval", workflow_status: "pending_manager_approval" } : {}),
      };

      let warningId = editingWarningId;
      if (editingWarningId) {
        await base44.entities.WarningLetter.update(editingWarningId, payload);
      } else {
        const created = await base44.entities.WarningLetter.create(payload);
        warningId = created.id;

        // Create an ApprovalWorkflow record for the line manager
        const workflow = await secureGateway.create("ApprovalWorkflow", {
          org_id: selectedResident.org_id || ORG_ID,
          entity_type: "incident_report", // closest type available
          entity_id: warningId,
          entity_reference: `Warning Letter — ${selectedResident.display_name}`,
          home_id: selectedResident.home_id || "",
          home_name: homeMap[selectedResident.home_id]?.name || "",
          status: "pending_tl",
          current_step: 1,
          submitted_by: staffProfile?.id || "",
          submitted_by_name: staffProfile?.full_name || warningForm.issued_by_name,
          submitted_at: new Date().toISOString(),
          priority: "high",
          notes: `Warning Letter: ${warningForm.warning_level?.replace(/_/g, " ")} — ${warningForm.reason?.replace(/_/g, " ")}`,
        });

        // Update the warning with the workflow ID
        await base44.entities.WarningLetter.update(warningId, { approval_workflow_id: workflow.id });

        // Find the team leader / line manager for this home to notify
        const homeTL = staff.find(s => s.id === homeMap[selectedResident.home_id]?.team_leader_id);
        if (homeTL?.user_id) {
          await createNotification({
            recipient_user_id: homeTL.user_id,
            org_id: selectedResident.org_id || ORG_ID,
            title: "Warning Letter Awaiting Approval",
            body: `A warning letter for ${selectedResident.display_name} (${warningForm.warning_level?.replace(/_/g, " ")}) requires your approval before being sent.`,
            type: "incident_review",
            priority: "high",
            link: `/residents`,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(editingWarningId
        ? "Warning letter updated"
        : "Warning letter submitted — awaiting line manager approval");
      qc.invalidateQueries({ queryKey: ["warning-letters"] });
      
      if (!editingWarningId) {
        triggerWorkflow({
          workflowType: "records_legal_restrictions_warnings",
          entityId: "",
          entityRef: "",
          title: `Warning Letter — ${selectedResident?.display_name} — ${WARNING_LEVEL_LABELS[/** @type {keyof typeof WARNING_LEVEL_LABELS} */ (warningForm.warning_level)] || warningForm.warning_level}`,
          description: warningForm.reason_detail?.slice(0, 120) || "",
          homeId: selectedResident?.home_id || "",
          homeName: homeMap[selectedResident?.home_id]?.name || "",
          priority: warningForm.warning_level === "notice_to_quit" || warningForm.warning_level === "final_written_warning" ? "urgent" : "routine",
        });
      }

      setShowWarningForm(false);
      setEditingWarningId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteWarningMutation = useMutation({
    mutationFn: (id) => base44.entities.WarningLetter.delete(id),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["warning-letters"] }); },
    onError: (err) => toast.error(err.message),
  });

  const approveWarningMutation = useMutation({
    mutationFn: async (warning) => {
      const nextStatus = warning.yp_acknowledgement_required ? "sent_to_yp" : "posted";
      await base44.entities.WarningLetter.update(warning.id, {
        workflow_status: nextStatus,
        status: nextStatus === "posted" ? "active" : "pending_manager_approval",
        manager_approved_by_name: staffProfile?.full_name || user?.email || "Manager",
        manager_approved_at: new Date().toISOString(),
      });
      // Notify the issuing staff member
      const issuingStaff = staff.find(s => s.full_name === warning.issued_by_name);
      if (issuingStaff?.user_id) {
        await createNotification({
          recipient_user_id: issuingStaff.user_id,
          org_id: warning.org_id || ORG_ID,
          title: "Warning Letter Approved",
          body: `Your warning letter for ${warning.resident_name} has been approved by the line manager.${warning.yp_acknowledgement_required ? " It has been sent to the YP for acknowledgement." : " It is now active."}`,
          type: "incident_review",
          priority: "normal",
        });
      }
    },
    onSuccess: () => {
      toast.success("Warning letter approved");
      qc.invalidateQueries({ queryKey: ["warning-letters"] });
    },
    onError: (err) => toast.error(err.message),
  });

  const warningLevelColors = {
    verbal_warning: "bg-blue-500/10 text-blue-600",
    first_written_warning: "bg-amber-500/10 text-amber-600",
    final_written_warning: "bg-orange-500/10 text-orange-700",
    notice_to_quit: "bg-red-500/10 text-red-700",
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Resident selector */}
      {residents.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground">Resident:</label>
          <select
            value={selectedResidentId || ""}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </div>
      )}

      {/* Section toggle */}
      {!hideTabs && (
        <div className="flex gap-2 border-b border-border pb-1">
          {[
            { key: "legal", label: "Legal / Restrictions" },
            { key: "warnings", label: "Warning Letters" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${activeSection === s.key ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {s.label}
              {s.key === "warnings" && residentWarnings.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-600">{residentWarnings.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── LEGAL / RESTRICTIONS ── */}
      {activeSection === "legal" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm">Legal Restrictions & Orders</h3>
              <p className="text-xs text-muted-foreground mt-1">Deprivation of Liberty orders and restrictions</p>
            </div>
            {isAdminOrTL && (
              <Button onClick={() => { setOrderForm(defaultOrder); setEditingOrderId(null); setOrderErrors({}); setShowOrderForm(true); }} size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Log Order
              </Button>
            )}
          </div>

          {residentOrders.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">No deprivation of liberty orders recorded.</div>
          ) : (
            <div className="space-y-3">
              {residentOrders.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">{order.court_order_reference || "Order"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${order.status === "active" ? "bg-amber-500/10 text-amber-600" : order.status === "expired" ? "bg-red-500/10 text-red-600" : "bg-slate-500/10 text-slate-600"}`}>{order.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.order_type?.replace(/_/g, " ")}</p>
                    </div>
                    {isAdminOrTL && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setOrderForm(order); setEditingOrderId(order.id); setOrderErrors({}); setShowOrderForm(true); }} className="text-xs h-7">Edit</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteOrderMutation.mutate(order.id)} className="text-red-600 hover:text-red-700 h-7"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Start:</span><p className="font-medium">{order.order_start_date ? new Date(order.order_start_date).toLocaleDateString("en-GB") : "—"}</p></div>
                    <div><span className="text-muted-foreground">End:</span><p className="font-medium">{order.order_end_date ? new Date(order.order_end_date).toLocaleDateString("en-GB") : "—"}</p></div>
                    <div><span className="text-muted-foreground">Local Authority:</span><p className="font-medium">{order.responsible_local_authority || "—"}</p></div>
                    <div><span className="text-muted-foreground">Review Due:</span><p className="font-medium">{order.next_review_due ? new Date(order.next_review_due).toLocaleDateString("en-GB") : "—"}</p></div>
                  </div>
                  {order.notes && <p className="mt-2 text-xs text-muted-foreground">{order.notes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Order Form Modal */}
          {showOrderForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold">{editingOrderId ? "Edit Order" : "Log New Order"}</h2>
                  <button onClick={() => setShowOrderForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox checked={orderForm.subject_to_order} onCheckedChange={v => setOrderForm(f => ({ ...f, subject_to_order: v }))} />
                    <label className="text-sm font-medium">Subject to Deprivation of Liberty Order</label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Order Type <span className="text-red-500">*</span></label>
                      <select value={orderForm.order_type} onChange={e => setOrderForm(f => ({ ...f, order_type: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.order_type ? "border-red-400" : "border-border"}`}>
                        <option value="mental_capacity_act">Mental Capacity Act</option>
                        <option value="best_interests_safeguards">Best Interests Safeguards</option>
                        <option value="other">Other</option>
                      </select>
                      {orderErrors.order_type && <p className="text-xs text-red-500 mt-1">{orderErrors.order_type}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status <span className="text-red-500">*</span></label>
                      <select value={orderForm.status} onChange={e => setOrderForm(f => ({ ...f, status: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.status ? "border-red-400" : "border-border"}`}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="expired">Expired</option>
                      </select>
                      {orderErrors.status && <p className="text-xs text-red-500 mt-1">{orderErrors.status}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Court/Order Reference <span className="text-red-500">*</span></label>
                    <Input value={orderForm.court_order_reference} onChange={e => setOrderForm(f => ({ ...f, court_order_reference: e.target.value }))} placeholder="e.g. Case/Order Ref Number" className={orderErrors.court_order_reference ? "border-red-400" : ""} />
                    {orderErrors.court_order_reference && <p className="text-xs text-red-500 mt-1">{orderErrors.court_order_reference}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date <span className="text-red-500">*</span></label>
                      <input type="date" value={orderForm.order_start_date} onChange={e => setOrderForm(f => ({ ...f, order_start_date: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.order_start_date ? "border-red-400" : "border-border"}`} />
                      {orderErrors.order_start_date && <p className="text-xs text-red-500 mt-1">{orderErrors.order_start_date}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">End Date <span className="text-red-500">*</span></label>
                      <input type="date" value={orderForm.order_end_date} onChange={e => setOrderForm(f => ({ ...f, order_end_date: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.order_end_date ? "border-red-400" : "border-border"}`} />
                      {orderErrors.order_end_date && <p className="text-xs text-red-500 mt-1">{orderErrors.order_end_date}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Responsible Local Authority <span className="text-red-500">*</span></label>
                    <Input value={orderForm.responsible_local_authority} onChange={e => setOrderForm(f => ({ ...f, responsible_local_authority: e.target.value }))} placeholder="e.g. Westminster Council" className={orderErrors.responsible_local_authority ? "border-red-400" : ""} />
                    {orderErrors.responsible_local_authority && <p className="text-xs text-red-500 mt-1">{orderErrors.responsible_local_authority}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Address Where Order Applies</label>
                    <Textarea value={orderForm.address_where_order_applies} onChange={e => setOrderForm(f => ({ ...f, address_where_order_applies: e.target.value }))} placeholder="Full address where order applies" className="h-20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Review Date <span className="text-red-500">*</span></label>
                      <input type="date" value={orderForm.review_date} onChange={e => setOrderForm(f => ({ ...f, review_date: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.review_date ? "border-red-400" : "border-border"}`} />
                      {orderErrors.review_date && <p className="text-xs text-red-500 mt-1">{orderErrors.review_date}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Next Review Due <span className="text-red-500">*</span></label>
                      <input type="date" value={orderForm.next_review_due} onChange={e => setOrderForm(f => ({ ...f, next_review_due: e.target.value }))} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${orderErrors.next_review_due ? "border-red-400" : "border-border"}`} />
                      {orderErrors.next_review_due && <p className="text-xs text-red-500 mt-1">{orderErrors.next_review_due}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes</label>
                    <Textarea value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" className="h-20" />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowOrderForm(false)}>Cancel</Button>
                  <Button onClick={() => { if (validateOrderForm()) orderMutation.mutate(); }} disabled={orderMutation.isPending}>Save</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── WARNING LETTERS ── */}
      {activeSection === "warnings" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm">Warning Letters</h3>
              <p className="text-xs text-muted-foreground mt-1">All warning letters issued to {selectedResident?.display_name || "this resident"}</p>
            </div>
            {isAdminOrTL && (
              <Button onClick={() => { setWarningForm(defaultWarning); setEditingWarningId(null); setWarningErrors({}); setShowWarningForm(true); }} size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Issue Warning Letter
              </Button>
            )}
          </div>

          {residentWarnings.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">No warning letters on record.</div>
          ) : (
            <div className="space-y-3">
              {residentWarnings.sort((a, b) => b.issued_date?.localeCompare(a.issued_date)).map(w => (
                <div key={w.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${warningLevelColors[w.warning_level] || "bg-muted text-muted-foreground"}`}>
                          {WARNING_LEVEL_LABELS[w.warning_level] || w.warning_level}
                        </span>
                        <span className="text-xs text-muted-foreground">{w.issued_date ? new Date(w.issued_date).toLocaleDateString("en-GB") : "—"}</span>
                        <span className="text-xs text-muted-foreground">— {REASON_LABELS[w.reason] || w.reason}</span>
                      </div>
                      {w.issued_by_name && <p className="text-xs text-muted-foreground mt-1">Issued by: {w.issued_by_name}</p>}
                    </div>
                    {isAdminOrTL && (
                      <div className="flex items-center gap-1">
                        {w.workflow_status === "pending_manager_approval" && (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => approveWarningMutation.mutate(w)}
                            disabled={approveWarningMutation.isPending}
                          >
                            Approve
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setWarningForm(w); setEditingWarningId(w.id); setWarningErrors({}); setShowWarningForm(true); }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 h-7" onClick={() => deleteWarningMutation.mutate(w.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  {w.reason_detail && <p className="text-sm mt-1">{w.reason_detail}</p>}
                  {/* Workflow status banner */}
                  {w.workflow_status && w.workflow_status !== "posted" && (
                    <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${w.workflow_status === "pending_manager_approval" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                      w.workflow_status === "manager_approved" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        w.workflow_status === "sent_to_yp" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          w.workflow_status === "yp_acknowledged" ? "bg-green-50 text-green-700 border border-green-200" :
                            "bg-muted/30 text-muted-foreground"
                      }`}>
                      {w.workflow_status === "pending_manager_approval" && <><Clock className="w-3.5 h-3.5" /> Awaiting line manager approval</>}
                      {w.workflow_status === "manager_approved" && <><CheckCircle2 className="w-3.5 h-3.5" /> Approved — sending to YP</>}
                      {w.workflow_status === "sent_to_yp" && <><Clock className="w-3.5 h-3.5" /> Sent to YP — awaiting acknowledgement</>}
                      {w.workflow_status === "yp_acknowledged" && <><CheckCircle2 className="w-3.5 h-3.5" /> YP acknowledged on {w.yp_acknowledged_date ? new Date(w.yp_acknowledged_date).toLocaleDateString("en-GB") : "—"}</>}
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">YP Ack. Required:</span> <span className="font-medium">{w.yp_acknowledgement_required ? "Yes" : "No"}</span></div>
                    <div><span className="text-muted-foreground">Outcome:</span> <span className="font-medium capitalize">{w.outcome?.replace(/_/g, " ") || "—"}</span></div>
                    <div><span className="text-muted-foreground">Status:</span> <span className={`font-medium capitalize ${w.status === "active" || w.status === "pending_manager_approval" ? "text-amber-600" : w.status === "resolved" ? "text-green-600" : "text-blue-600"}`}>{w.status?.replace(/_/g, " ")}</span></div>
                  </div>
                  {w.yp_response && (
                    <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                      <span className="font-medium text-muted-foreground">YP Response: </span>{w.yp_response}
                    </div>
                  )}
                  {w.document_url && (
                    <a href={w.document_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileText className="w-3 h-3" /> View Letter
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Warning Form Modal */}
          {showWarningForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h2 className="font-semibold">{editingWarningId ? "Edit Warning Letter" : "Issue Warning Letter"}</h2>
                  </div>
                  <button onClick={() => setShowWarningForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Warning Level <span className="text-red-500">*</span></label>
                      <select value={warningForm.warning_level} onChange={e => setW("warning_level", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.warning_level ? "border-red-400" : "border-border"}`}>
                        <option value="verbal_warning">Verbal Warning</option>
                        <option value="first_written_warning">1st Written Warning</option>
                        <option value="final_written_warning">Final Written Warning</option>
                        <option value="notice_to_quit">Notice to Quit</option>
                      </select>
                      {warningErrors.warning_level && <p className="text-xs text-red-500 mt-1">{warningErrors.warning_level}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date Issued <span className="text-red-500">*</span></label>
                      <input type="date" value={warningForm.issued_date} onChange={e => setW("issued_date", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.issued_date ? "border-red-400" : "border-border"}`} />
                      {warningErrors.issued_date && <p className="text-xs text-red-500 mt-1">{warningErrors.issued_date}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reason <span className="text-red-500">*</span></label>
                      <select value={warningForm.reason} onChange={e => setW("reason", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.reason ? "border-red-400" : "border-border"}`}>
                        <option value="behaviour">Behaviour</option>
                        <option value="property_damage">Property Damage</option>
                        <option value="abusive_language">Abusive Language</option>
                        <option value="non_compliance_house_rules">Non-Compliance with House Rules</option>
                        <option value="threatening_behaviour">Threatening Behaviour</option>
                        <option value="other">Other</option>
                      </select>
                      {warningErrors.reason && <p className="text-xs text-red-500 mt-1">{warningErrors.reason}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Issued By <span className="text-red-500">*</span></label>
                      <select value={warningForm.issued_by_name} onChange={e => setW("issued_by_name", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.issued_by_name ? "border-red-400" : "border-border"}`}>
                        <option value="">Select staff member...</option>
                        {staff.map(s => <option key={s.id} value={s.full_name}>{s.full_name}</option>)}
                      </select>
                      {warningErrors.issued_by_name && <p className="text-xs text-red-500 mt-1">{warningErrors.issued_by_name}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Description of Incident / Behaviour <span className="text-red-500">*</span></label>
                    <Textarea value={warningForm.reason_detail} onChange={e => setW("reason_detail", e.target.value)} placeholder="Describe in detail what happened, when, where and who was involved..." className={`h-28 ${warningErrors.reason_detail ? "border-red-400" : ""}`} />
                    {warningErrors.reason_detail && <p className="text-xs text-red-500 mt-1">{warningErrors.reason_detail}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">YP's Response / Reaction</label>
                    <Textarea value={warningForm.yp_response} onChange={e => setW("yp_response", e.target.value)} placeholder="How did the YP respond to the warning?" className="h-20" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Witness Name</label>
                      <Input value={warningForm.witness_name} onChange={e => setW("witness_name", e.target.value)} placeholder="Staff or other witness" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome <span className="text-red-500">*</span></label>
                      <select value={warningForm.outcome} onChange={e => setW("outcome", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.outcome ? "border-red-400" : "border-border"}`}>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="disputed">Disputed</option>
                        <option value="escalated">Escalated</option>
                        <option value="resolved">Resolved</option>
                        <option value="no_further_action">No Further Action</option>
                      </select>
                      {warningErrors.outcome && <p className="text-xs text-red-500 mt-1">{warningErrors.outcome}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <Checkbox
                      id="yp_ack_required"
                      checked={warningForm.yp_acknowledgement_required}
                      onCheckedChange={v => setW("yp_acknowledgement_required", v)}
                    />
                    <div>
                      <label htmlFor="yp_ack_required" className="text-sm font-medium cursor-pointer">YP Acknowledgement Required</label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        If checked, once approved by the line manager this letter will be sent to the YP's workspace for them to formally acknowledge.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={warningForm.follow_up_required} onCheckedChange={v => setW("follow_up_required", v)} />
                      <label className="text-sm">Follow-up required</label>
                    </div>
                    {warningForm.follow_up_required && (
                      <div className="flex-1">
                        <input type="date" value={warningForm.follow_up_date} onChange={e => setW("follow_up_date", e.target.value)} placeholder="Follow-up date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    )}
                  </div>

                  {warningForm.follow_up_required && (
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Follow-up Notes</label>
                      <Textarea value={warningForm.follow_up_notes} onChange={e => setW("follow_up_notes", e.target.value)} className="h-16" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status <span className="text-red-500">*</span></label>
                    <select value={warningForm.status} onChange={e => setW("status", e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${warningErrors.status ? "border-red-400" : "border-border"}`}>
                      <option value="active">Active</option>
                      <option value="resolved">Resolved</option>
                      <option value="appealed">Appealed</option>
                    </select>
                    {warningErrors.status && <p className="text-xs text-red-500 mt-1">{warningErrors.status}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Additional Notes</label>
                    <Textarea value={warningForm.notes} onChange={e => setW("notes", e.target.value)} placeholder="Any additional context or notes..." className="h-16" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Document URL (optional)</label>
                    <Input value={warningForm.document_url} onChange={e => setW("document_url", e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {!editingWarningId && "This will be sent to the line manager for approval before reaching the YP."}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowWarningForm(false)}>Cancel</Button>
                    <Button onClick={() => { if (validateWarningForm()) warningMutation.mutate(); }} disabled={warningMutation.isPending}>
                      {editingWarningId ? "Update" : "Submit for Approval"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}