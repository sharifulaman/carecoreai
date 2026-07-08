import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { logAudit } from "@/lib/logAudit";
import { createNotification } from "@/lib/createNotification";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, CheckCircle, X, ExternalLink, Car, CreditCard, FileText,
  Filter, PoundSterling
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";
import BillForm from "../../house/BillForm";
import ExpenseSummaryCards from "../expenses/ExpenseSummaryCards";
import RejectExpenseModal from "../expenses/RejectExpenseModal";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-blue-100 text-blue-700",
};

const CATEGORY_LABELS = {
  mileage: "Mileage",
  food: "Food",
  accommodation: "Accommodation",
  equipment: "Equipment",
  training: "Training",
  uniform: "Uniform",
  other: "Other",
};

export default function ExpensesTab({ user, staff = [], homes = [], staffProfile }) {
  const queryClient = useQueryClient();
  const isAdminRole = user?.role === "admin" || user?.role === "admin_officer";
  const isTLRole = user?.role === "team_leader";
  const isSW = !isAdminRole && !isTLRole;

  const { canEdit, canAdd } = useModuleActions("hr", {
    canEdit: isAdminRole,
    canAdd: isTLRole
  });
  const canManageExpenses = canEdit || canAdd;

  const myProfile = staffProfile || staff.find(s => s.email === user?.email);

  const [showForm, setShowForm] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [filterStaff, setFilterStaff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const { data: rawStaffExpenses = [] } = useQuery({
    queryKey: ["staff-expenses"],
    queryFn: () => secureGateway.filter("StaffExpense"),
    staleTime: 0,
  });

  const { data: rawBills = [] } = useQuery({
    queryKey: ["bills-all"],
    queryFn: () => secureGateway.filter("Bill"),
  });

  const allExpenses = useMemo(() => {
    const expenseCategories = ["Expense", "Mileage", "Food_&_Subsistence", "Accommodation", "Equipment", "Training_Materials", "Uniform_/_Clothing"];
    const expenseBills = rawBills
      .filter(b => expenseCategories.includes(b.bill_type))
      .map(b => ({
        id: b.id,
        staff_id: "bill",
        staff_name: b.supplier || "Supplier",
        home_id: b.home_id,
        home_name: b.home_name || homes.find(h => h.id === b.home_id)?.name,
        expense_date: b.due_date,
        category: b.bill_type,
        description: b.notes || b.bill_type,
        amount: b.amount,
        receipt_url: b.image_url,
        status: b.status || "submitted",
        is_bill: true,
      }));
    return [
      ...rawStaffExpenses.map(e => ({ ...e, home_name: e.home_name || homes.find(h => h.id === e.home_id)?.name })),
      ...expenseBills
    ];
  }, [rawStaffExpenses, rawBills, homes]);

  // Scope by role
  const scopedExpenses = (() => {
    const active = allExpenses.filter(e => !e.is_deleted);
    if (isAdminRole) return active;
    if (isTLRole && myProfile) {
      const tlHomes = new Set(myProfile.home_ids || []);
      const tlStaffIds = new Set(
        staff.filter(s => (s.home_ids || []).some(h => tlHomes.has(h))).map(s => s.id)
      );
      return active.filter(e => tlStaffIds.has(e.staff_id));
    }
    return active.filter(e => e.staff_id === myProfile?.id);
  })();

  // Apply filters
  const filtered = scopedExpenses.filter(e => {
    if (filterStaff !== "all" && e.staff_id !== filterStaff) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterDateFrom && e.expense_date < filterDateFrom) return false;
    if (filterDateTo && e.expense_date > filterDateTo) return false;
    return true;
  }).sort((a, b) => b.expense_date?.localeCompare(a.expense_date));

  const submitExpense = useMutation({
    mutationFn: (data) => secureGateway.create("Bill", {
      org_id: data.org_id || "default_org",
      home_id: data.home_id,
      home_name: data.home_name,
      title: data.title,
      bill_type: data.category || "Expense",
      supplier: data.staff_name,
      amount: data.amount,
      due_date: data.expense_date,
      status: data.status || "submitted",
      notes: data.description,
      image_url: data.receipt_url,
    }),
    onSuccess: async (created, data) => {
      queryClient.invalidateQueries({ queryKey: ["staff-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["bills-all"] });
      queryClient.invalidateQueries({ queryKey: ["bills-house-management"] });
      setShowForm(false);
      toast.success("Expense submitted successfully");

      // Notify TL or admin
      const tlId = myProfile?.team_leader_id;
      const recipient = tlId
        ? staff.find(s => s.id === tlId)
        : staff.find(s => s.role === "admin");
      if (recipient?.user_id) {
        createNotification({
          recipient_user_id: recipient.user_id,
          recipient_staff_id: recipient.id,
          title: "Expense Claim Pending Approval",
          body: `${myProfile?.full_name || "A staff member"} has submitted a £${(data.amount || 0).toFixed(2)} expense claim for "${data.description}" on ${data.expense_date}.`,
          type: "alert",
          link: "/staff?tab=expenses",
        });
      }

      await logAudit({
        entity_name: "StaffExpense", entity_id: created?.id, action: "create",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { staff_name: data.staff_name, amount: data.amount, category: data.category, description: data.description },
        org_id: ORG_ID,
        description: `Expense submitted: £${(data.amount || 0).toFixed(2)} (${data.category}) by ${data.staff_name}`,
        retention_category: "payroll",
      });
    },
  });

  const approveExpense = useMutation({
    mutationFn: async (expense) => {
      if (expense.is_bill) {
        await secureGateway.update("Bill", expense.id, {
          status: "approved",
          approval_status: "approved",
          approved_by: myProfile?.id || user?.id,
          reviewed_at: new Date().toISOString(),
        });
      } else {
        await secureGateway.update("StaffExpense", expense.id, {
          status: "approved",
          approved_by: myProfile?.id || user?.id,
          reviewed_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: async (_, expense) => {
      queryClient.invalidateQueries({ queryKey: ["staff-expenses"] });
      toast.success("Expense approved");

      // Notify staff member
      const requester = staff.find(s => s.id === expense.staff_id);
      if (requester?.user_id) {
        createNotification({
          recipient_user_id: requester.user_id,
          recipient_staff_id: requester.id,
          title: "Expense Approved ✓",
          body: `Your expense claim of £${(expense.amount || 0).toFixed(2)} for "${expense.description}" has been approved and will be included in your next payslip.`,
          type: "general",
          link: "/my-hr",
        });
      }

      await logAudit({
        entity_name: "StaffExpense", entity_id: expense.id, action: "update",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: { status: expense.status },
        new_values: { status: "approved", approved_by: user?.full_name },
        org_id: ORG_ID,
        description: `Expense approved: £${(expense.amount || 0).toFixed(2)} for ${expense.staff_name} — "${expense.description}"`,
        retention_category: "payroll",
      });
    },
  });

  const rejectExpense = useMutation({
    mutationFn: ({ expense, reason }) => {
      if (expense.is_bill) {
        return secureGateway.update("Bill", expense.id, {
          status: "rejected",
          approval_status: "rejected",
          approved_by: myProfile?.id || user?.id,
          reviewed_at: new Date().toISOString(),
          notes: reason,
        });
      }
      return secureGateway.update("StaffExpense", expense.id, {
        status: "rejected",
        approved_by: myProfile?.id || user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      });
    },
    onSuccess: async (_, { expense, reason }) => {
      queryClient.invalidateQueries({ queryKey: ["staff-expenses"] });
      setRejectModal(null);
      toast.success("Expense rejected");

      const requester = staff.find(s => s.id === expense.staff_id);
      if (requester?.user_id) {
        createNotification({
          recipient_user_id: requester.user_id,
          recipient_staff_id: requester.id,
          title: "Expense Rejected",
          body: `Your expense claim of £${(expense.amount || 0).toFixed(2)} has been rejected. Reason: ${reason}. Please contact your manager if you have questions.`,
          type: "alert",
          link: "/my-hr",
        });
      }

      await logAudit({
        entity_name: "StaffExpense", entity_id: expense.id, action: "update",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: { status: expense.status },
        new_values: { status: "rejected", rejection_reason: reason, approved_by: user?.full_name },
        org_id: ORG_ID,
        description: `Expense rejected: £${(expense.amount || 0).toFixed(2)} for ${expense.staff_name} — reason: "${reason}"`,
        retention_category: "payroll",
      });
    },
  });

  const markPaid = useMutation({
    mutationFn: async (expense) => {
      if (expense.is_bill) {
        await secureGateway.update("Bill", expense.id, {
          status: "paid",
          paid_date: new Date().toISOString().split("T")[0],
          reviewed_at: new Date().toISOString(),
        });
      } else {
        await secureGateway.update("StaffExpense", expense.id, {
          status: "paid",
          reviewed_at: new Date().toISOString(),
        });
      }
      // Create HomeExpense for finance module
      if (expense.home_id) {
        await secureGateway.create("HomeExpense", {
          org_id: ORG_ID,
          home_id: expense.home_id,
          expense_type: "staff_expense",
          amount: expense.amount || 0,
          date: expense.expense_date,
          description: `${expense.staff_name} — ${CATEGORY_LABELS[expense.category] || expense.category}: ${expense.description}`,
          claimed_by: expense.staff_id,
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        });
      }
      await logAudit({
        entity_name: "StaffExpense", entity_id: expense.id, action: "update",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: { status: "approved" },
        new_values: { status: "paid" },
        org_id: ORG_ID,
        description: `Expense marked as paid: £${(expense.amount || 0).toFixed(2)} for ${expense.staff_name}`,
        retention_category: "payroll",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-expenses"] });
      toast.success("Expense marked as paid & finance record created");
    },
  });

  const scopedStaff = isAdminRole ? staff : staff.filter(s => (myProfile?.home_ids || []).some(h => (s.home_ids || []).includes(h)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold">Expense Claims</h2>
        {(canManageExpenses || isSW) && (
          <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5" /> Submit Expense
          </Button>
        )}
      </div>

      {/* Summary cards — admin/TL only */}
      {canManageExpenses && <ExpenseSummaryCards expenses={scopedExpenses} />}

      {/* Filters — admin/TL only */}
      {canManageExpenses && (
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={filterStaff} onValueChange={setFilterStaff}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {scopedStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 text-xs w-36" placeholder="From" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          <Input type="date" className="h-8 text-xs w-36" placeholder="To" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          {(filterStaff !== "all" || filterStatus !== "all" || filterCategory !== "all" || filterDateFrom || filterDateTo) && (
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
              setFilterStaff("all"); setFilterStatus("all"); setFilterCategory("all");
              setFilterDateFrom(""); setFilterDateTo("");
            }}>Clear</Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {canManageExpenses && <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>}
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Receipt</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No expenses found.
                </td>
              </tr>
            ) : filtered.map(exp => (
              <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                {canManageExpenses && (
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{exp.staff_name}</p>
                    {exp.home_name && <p className="text-[10px] text-muted-foreground">{exp.home_name}</p>}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{exp.expense_date}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    {CATEGORY_LABELS[exp.category] || exp.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm max-w-[180px]">
                  <p className="truncate">{exp.description}</p>
                  {exp.category === "mileage" && exp.mileage_miles && (
                    <p className="text-[10px] text-muted-foreground">{exp.mileage_miles} miles @ {(exp.mileage_rate * 100).toFixed(0)}p</p>
                  )}
                  {exp.rejection_reason && (
                    <p className="text-[10px] text-red-500 mt-0.5">Rejected: {exp.rejection_reason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-semibold">£{(exp.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  {exp.receipt_url ? (
                    <a href={exp.receipt_url} target="_blank" rel="noreferrer" title="View receipt">
                      <ExternalLink className="w-4 h-4 text-primary mx-auto hover:opacity-70" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={`text-xs capitalize ${STATUS_COLORS[exp.status] || ""}`}>
                    {exp.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <BillForm
          title="Add Expense"
          submitLabel="Submit Expense"
          properties={homes}
          staffList={staff.map(s => s.full_name)}
          onClose={() => setShowForm(false)}
          saving={submitExpense.isPending}
          onSubmit={(data) => {
            const home = homes.find(h => h.id === data.home_id);
            const staffMember = staff.find(s => s.full_name === data.staff_name) || myProfile;
            submitExpense.mutate({
              org_id: ORG_ID,
              staff_id: staffMember?.id || myProfile?.id,
              staff_name: staffMember?.full_name || myProfile?.full_name,
              home_id: data.home_id,
              home_name: home?.name || "",
              expense_date: data.due_date || new Date().toISOString().split("T")[0],
              category: data.bill_type || "other",
              description: data.supplier || data.notes || "Expense",
              amount: parseFloat(data.amount) || 0,
              receipt_url: data.image_url,
              notes: data.notes,
              status: "submitted",
              submitted_at: new Date().toISOString(),
            });
          }}
        />
      )}

      {rejectModal && (
        <RejectExpenseModal
          expense={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={(reason) => rejectExpense.mutate({ expense: rejectModal, reason })}
        />
      )}
    </div>
  );
}