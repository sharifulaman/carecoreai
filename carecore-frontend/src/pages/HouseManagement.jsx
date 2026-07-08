import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Plus, ReceiptText, Wrench, Building2, PoundSterling, AlertTriangle, FileText, CalendarClock, FileWarning, Users, TrendingUp, TrendingDown, AlertCircle, Home, DollarSign, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

// Existing modals
import BillForm from "../components/house/BillForm";
import BillDetailsModal from "../components/house/BillDetailsModal";
import BillManagementModal from "../components/house/BillManagementModal";
import ExpiringItemsModal from "../components/house/ExpiringItemsModal";
import AddHomeModal from "../components/homes/AddHomeModal";
import ResidentForm from "../components/residents/ResidentForm";

// New components
import AdminKPICards from "../components/house/AdminKPICards";
import AdminSummaryCards from "../components/house/AdminSummaryCards";
import AdminCharts from "../components/house/AdminCharts";
import AdminHomesTab from "../components/house/AdminHomesTab";
import AdminResidentsTab from "../components/house/AdminResidentsTab";
import AdminBillsTab from "../components/house/AdminBillsTab";
import AdminDirectDebitTab from "../components/house/AdminDirectDebitTab";
import AdminDocumentsTab from "../components/house/AdminDocumentsTab";
import AdminLeasesTab from "../components/house/AdminLeasesTab";
import AdminMaintenanceTab from "../components/house/AdminMaintenanceTab";
import AddMaintenanceModal from "../components/house/AddMaintenanceModal";
import AssetInventoryTab from "../components/house/AssetInventoryTab";
import AgencyBankTab from "../components/staff/tabs/AgencyBankTab";
import { Package } from "lucide-react";

const TABS = ["Homes", "Residents", "Bills", "Overdue", "Direct Debit", "Documents", "Leases", "Maintenance", "Assets", "External Services"];
const TAB_ICONS = [Building2, Users, PoundSterling, AlertTriangle, FileWarning, FileText, CalendarClock, Wrench, Package, Users];

// KPI Card Component
function KPICard({ icon: Icon, label, value, subtext, iconBg, onClick }) {
  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:shadow-md hover:border-slate-300 transition-all text-left">
      <div className={`p-2.5 rounded-lg ${iconBg} flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        {subtext && <p className="text-xs text-slate-600 mt-1">{subtext}</p>}
      </div>
    </button>
  );
}

// Priority Alert Item Component
function PriorityAlertItem({ severity, label, count, detail }) {
  const severityColors = {
    critical: "bg-red-50 text-red-700 border-red-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    good: "bg-green-50 text-green-700 border-green-200"
  };
  const severityIcons = {
    critical: "bg-red-100",
    high: "bg-amber-100",
    medium: "bg-yellow-100",
    good: "bg-green-100"
  };
  const icons = {
    critical: AlertTriangle,
    high: AlertTriangle,
    medium: AlertCircle,
    good: FileCheck
  };
  const Icon = icons[severity];
  
  return (
    <div className={`border rounded-lg p-3 ${severityColors[severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <div className={`p-1.5 rounded ${severityIcons[severity]} flex-shrink-0 mt-0.5`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold">{label}</p>
            {detail && <p className="text-xs opacity-75 mt-0.5">{detail}</p>}
          </div>
        </div>
        {count !== undefined && <Badge className={`text-xs shrink-0 ${severity === 'good' ? 'bg-green-100 text-green-700' : severity === 'critical' ? 'bg-red-100 text-red-700' : severity === 'high' ? 'bg-amber-100 text-amber-700' : 'bg-yellow-100 text-yellow-700'}`}>{count}</Badge>}
      </div>
    </div>
  );
}

export default function HouseManagement() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });
  const role = user?.role === "user" ? "support_worker" : (user?.role || "support_worker");
  const canEdit = role === "admin" || role === "admin_officer";

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("houseManagementActiveTab") || "Homes");

  useEffect(() => {
    localStorage.setItem("houseManagementActiveTab", activeTab);
  }, [activeTab]);

  const [showBillForm, setShowBillForm] = useState(false);
  const [showBillManagement, setShowBillManagement] = useState(false);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [billModal, setBillModal] = useState(null);
  const [expiringModal, setExpiringModal] = useState(null);
  const [kpiModal, setKpiModal] = useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-house-mgmt"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const { data: homeDocuments = [] } = useQuery({
    queryKey: ["home-documents-expiry"],
    queryFn: () => secureGateway.filter("HomeDocument"),
  });

  const { data: rawBills = [] } = useQuery({
    queryKey: ["bills-house-management"],
    queryFn: () => secureGateway.filter("Bill"),
    staleTime: 0,
  });

  const { data: staffExpenses = [] } = useQuery({
    queryKey: ["staff-expenses"],
    queryFn: () => secureGateway.filter("StaffExpense"),
  });

  const bills = [...rawBills.map(b => ({
    ...b,
    home_name: b.home_name || properties.find(h => h.id === b.home_id)?.name
  })), ...staffExpenses.map(e => ({
    id: e.id,
    bill_type: e.category || "Expense",
    supplier: e.staff_name + (e.description ? ` (${e.description})` : ""),
    amount: e.amount,
    due_date: e.expense_date,
    status: e.status,
    home_id: e.home_id,
    home_name: e.home_name || properties.find(h => h.id === e.home_id)?.name,
    is_staff_expense: true
  }))].sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0));

  const { data: maintenanceLogs = [] } = useQuery({
    queryKey: ["maintenance-logs-count"],
    queryFn: () => base44.entities.MaintenanceLog.list(),
  });

  const createBill = useMutation({
    mutationFn: (data) => secureGateway.create("Bill", { ...data, org_id: "default_org", status: data.status || "pending" }),
    onSuccess: (created) => { 
      queryClient.invalidateQueries({ queryKey: ["bills-house-management"] }); 
      setShowBillForm(false); 
      toast.success("Bill submitted successfully"); 
      triggerWorkflow({
        workflowType: "bill",
        entityId: created?.id,
        entityRef: created?.id ? `BILL-${created.id.slice(0, 8)}` : "",
        title: `Bill Submitted — ${created?.supplier || "Unknown"}`,
        description: `Amount: £${created?.amount || 0} — Due: ${created?.due_date || "Unknown"}`,
        priority: "routine",
      });
    },
  });

  const updateBill = useMutation({
    mutationFn: ({ id, data, is_staff_expense }) => {
      if (is_staff_expense) {
        return secureGateway.update("StaffExpense", id, data);
      }
      return secureGateway.update("Bill", id, data);
    },
    onSuccess: (_, { is_staff_expense }) => {
      queryClient.invalidateQueries({ queryKey: is_staff_expense ? ["staff-expenses"] : ["bills-house-management"] });
      toast.success("Updated successfully");
    },
  });

  const createResident = useMutation({
    mutationFn: (data) => secureGateway.create("Resident", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-residents"] }); queryClient.invalidateQueries({ queryKey: ["residents-admin"] }); setShowResidentForm(false); toast.success("Young person added successfully"); },
  });

  const markPaid = (b) => {
    updateBill.mutate({ id: b.id, data: { status: "paid", paid_date: today }, is_staff_expense: b.is_staff_expense });
  };

  // Computed stats
  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const overdueBills = bills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today));
  const overdueAmount = overdueBills.reduce((s, b) => s + Number(b.amount || 0), 0);

  const directDebitFails = bills.filter(b => b.is_direct_debit && (b.status === "overdue" || b.status === "failed" || b.status === "bounced")).length;
  const directDebitCount = bills.filter(b => b.is_direct_debit).length;

  const in60Days = new Date(); in60Days.setDate(in60Days.getDate() + 60);
  const in60Str = in60Days.toISOString().split("T")[0];
  const expiringDocs = homeDocuments.filter(d => d.expiry_date && d.expiry_date >= today && d.expiry_date <= in60Str && !d.superseded_by && !d.deleted_at);

  const in90Days = new Date(); in90Days.setDate(in90Days.getDate() + 90);
  const in90Str = in90Days.toISOString().split("T")[0];
  const expiringLeases = properties.filter(h => h.lease_end && h.lease_end >= today && h.lease_end <= in90Str);

  const monthlyBills = bills.filter(b => b.due_date?.startsWith(currentMonth));
  const monthlyOutstanding = monthlyBills.filter(b => b.status !== "paid").reduce((s, b) => s + Number(b.amount || 0), 0);
  const yearlyBills = bills.filter(b => b.due_date?.startsWith(currentYear));
  const yearlyOverdue = yearlyBills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today));
  const yearlyOverdueAmount = yearlyOverdue.reduce((s, b) => s + Number(b.amount || 0), 0);

  const expiringLeaseItems = expiringLeases.map(h => {
    const daysLeft = Math.ceil((new Date(h.lease_end) - new Date()) / 86400000);
    return { id: h.id, primaryLabel: h.name, secondaryLabel: h.address, badge: `Expires ${new Date(h.lease_end).toLocaleDateString("en-GB")} · ${daysLeft}d left`, badgeClass: "bg-amber-500/10 text-amber-600 border-amber-200", meta: h.postcode, link: `/homes/${h.id}` };
  });
  const expiringDocItems = expiringDocs.map(d => {
    const home = properties.find(h => h.id === d.home_id);
    const daysLeft = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
    return { id: d.id, primaryLabel: d.title, secondaryLabel: home?.name || "Unknown Home", badge: `Expires ${new Date(d.expiry_date).toLocaleDateString("en-GB")} · ${daysLeft}d left`, badgeClass: "bg-purple-500/10 text-purple-600 border-purple-200", fileUrl: d.file_url };
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-admin"],
    queryFn: () => secureGateway.filter("Resident"),
  });

  const activeMaintenance = maintenanceLogs.filter(m => m.status !== "completed" && m.status !== "closed").length;

  const TAB_COUNTS = [
    properties.length,
    residents.length,
    bills.length,
    overdueBills.length,
    directDebitCount,
    expiringDocs.length,
    expiringLeases.length,
    activeMaintenance,
    null,
    null,
  ];


  // Lock body scroll when any modal is open
  const anyModalOpen = showBillForm || showBillManagement || showAddHomeModal || showResidentForm || showAddMaintenance || billModal || expiringModal;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [anyModalOpen]);

  // Priority alerts calculation
  const priorityAlerts = [
    expiringLeases.length > 0 ? { severity: "high", label: "Lease expiring within 90 days", count: expiringLeases.length } : null,
    activeMaintenance > 0 ? { severity: "high", label: "Maintenance jobs require attention", count: activeMaintenance } : null,
    overdueAmount > 0 ? { severity: "critical", label: "Overdue balance exceeds threshold", amount: `£${overdueAmount.toLocaleString()}` } : null,
    expiringDocs.length > 0 ? { severity: "medium", label: "Documents expiring within 60 days", count: expiringDocs.length } : null,
    directDebitFails > 0 ? { severity: "high", label: "Direct debit issues requiring attention", count: directDebitFails } : null,
  ].filter(Boolean);

  // Add good status if no critical alerts
  if (!priorityAlerts.some(a => a.severity === "critical" || a.severity === "high")) {
    priorityAlerts.push({ severity: "good", label: "All systems operational", detail: "No critical issues detected" });
  }

  return (
    <div className="space-y-6">
      {/* Modals */}
      {billModal && (
        <BillDetailsModal
          title={billModal.title}
          bills={billModal.filter === "overdue" ? overdueBills : billModal.filter === "direct_debit" ? bills.filter(b => b.is_direct_debit && b.status === "overdue") : billModal.filter === "monthly" ? monthlyBills : yearlyBills}
          onClose={() => setBillModal(null)}
          canEdit={canEdit}
          onMarkPaid={markPaid}
        />
      )}
      {showBillManagement && (
        <BillManagementModal
          bills={bills} homes={properties}
          onClose={() => setShowBillManagement(false)}
          canEdit={canEdit}
          saving={updateBill.isPending}
          onMarkPaid={markPaid}
          onUpdateBill={(id, data, onSuccess) => {
            const bill = bills.find(b => b.id === id);
            const { is_staff_expense, ...updateData } = data;
            updateBill.mutate({ id, data: updateData, is_staff_expense: is_staff_expense ?? bill?.is_staff_expense }, { onSuccess });
          }}
        />
      )}
      {expiringModal && (
        <ExpiringItemsModal
          title={expiringModal.title}
          items={expiringModal.items}
          leaseItems={expiringModal.leaseItems}
          docItems={expiringModal.docItems}
          onClose={() => setExpiringModal(null)}
        />
      )}
      {showAddHomeModal && (
        <AddHomeModal
          staffProfiles={staff}
          user={user}
          onClose={() => setShowAddHomeModal(false)}
          onSuccess={() => { setShowAddHomeModal(false); queryClient.invalidateQueries({ queryKey: ["homes"] }); }}
        />
      )}
      {showResidentForm && (
        <ResidentForm
          homes={properties} staff={staff}
          onSubmit={(data) => createResident.mutate(data)}
          onClose={() => setShowResidentForm(false)}
          saving={createResident.isPending}
        />
      )}
      {showBillForm && (
        <BillForm
          properties={properties}
          staffList={staff.map(s => s.full_name)}
          onSubmitWorkflow={(d) => {
            const staffMember = staff.find(s => s.full_name === d.staff_name);
            createBill.mutate({ ...d, staff_id: staffMember?.id || null });
          }}
          onClose={() => setShowBillForm(false)}
          saving={createBill.isPending}
        />
      )}
      {showAddMaintenance && (
        <AddMaintenanceModal
          properties={properties}
          staffProfile={staffProfile}
          onClose={() => setShowAddMaintenance(false)}
          onSuccess={() => {
            setShowAddMaintenance(false);
            queryClient.invalidateQueries({ queryKey: ["maintenance-logs-admin"] });
            queryClient.invalidateQueries({ queryKey: ["maintenance-logs-count"] });
            toast.success("Maintenance issue added successfully.");
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Management</h1>
          <p className="text-sm text-slate-600 mt-1">Manage organisation operations, compliance, finance and assets.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={() => setShowAddHomeModal(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Home
          </button>
          <button onClick={() => setShowResidentForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add New YP
          </button>
          <button onClick={() => setShowBillForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Bill
          </button>
          <button onClick={() => setShowAddMaintenance(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Wrench className="w-4 h-4" /> Add Maintenance
          </button>
          <button onClick={() => setShowBillManagement(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
            <ReceiptText className="w-4 h-4" /> Manage Issues
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard 
          icon={AlertTriangle} 
          label="Overdue Bills" 
          value={overdueBills.length} 
          subtext={`£${overdueAmount.toLocaleString()}`}
          iconBg="bg-red-100 text-red-600"
          onClick={() => setBillModal({ title: "Overdue Bills", filter: "overdue" })}
        />
        <KPICard 
          icon={FileWarning} 
          label="Direct Debit Bills" 
          value={directDebitCount} 
          subtext={directDebitFails === 0 ? "No action required" : `${directDebitFails} require attention`}
          iconBg="bg-amber-100 text-amber-600"
          onClick={() => setBillModal({ title: "Direct Debit Bills", filter: "direct_debit" })}
        />
        <KPICard 
          icon={FileText} 
          label="Expiring Documents" 
          value={expiringDocs.length} 
          subtext="Within 60 days"
          iconBg="bg-purple-100 text-purple-600"
          onClick={() => setExpiringModal({ title: "Expiring Documents", leaseItems: [], docItems: expiringDocItems })}
        />
        <KPICard 
          icon={CalendarClock} 
          label="Expiring Leases" 
          value={expiringLeases.length} 
          subtext="Within 90 days"
          iconBg="bg-orange-100 text-orange-600"
          onClick={() => setExpiringModal({ title: "Expiring Leases", leaseItems: expiringLeaseItems, docItems: [] })}
        />
        <KPICard 
          icon={Wrench} 
          label="Open Maintenance" 
          value={activeMaintenance} 
          subtext="Require attention"
          iconBg="bg-blue-100 text-blue-600"
          onClick={() => setActiveTab("Maintenance")}
        />
        <KPICard 
          icon={Home} 
          label="Active Homes" 
          value={properties.length} 
          subtext="Currently live"
          iconBg="bg-green-100 text-green-600"
          onClick={() => setActiveTab("Homes")}
        />
      </div>

      {/* Main Insight Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Charts */}
        <div className="lg:col-span-2">
          <AdminCharts bills={bills} properties={properties} />
        </div>

        {/* Right: Priority Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Priority Alerts</h3>
          <div className="space-y-2">
            {priorityAlerts.map((alert, i) => (
              <PriorityAlertItem 
                key={i} 
                severity={alert.severity} 
                label={alert.label} 
                count={alert.count}
                detail={alert.amount}
              />
            ))}
          </div>
          <button className="w-full mt-4 text-xs font-medium text-blue-600 hover:text-blue-700">View all</button>
        </div>
      </div>

      {/* Finance Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">Monthly Bills</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{monthlyBills.length}</p>
          <p className="text-xs text-slate-600 mt-1">Bills raised</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">Outstanding</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">£{monthlyOutstanding.toLocaleString()}</p>
          <p className="text-xs text-slate-600 mt-1">Across all properties</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">Yearly Bills</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{yearlyBills.length}</p>
          <p className="text-xs text-slate-600 mt-1">Bills raised YTD</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-tight">Total Overdue</p>
          <p className="text-2xl font-bold text-red-600 mt-1">£{yearlyOverdueAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-600 mt-1">Across all properties</p>
        </div>
      </div>

      {/* Operations Workspace */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Operations Workspace</h2>
          <p className="text-sm text-slate-600">Manage homes and related records</p>
        </div>

        {/* Tab Bar */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tab nav */}
          <div className="overflow-x-auto border-b border-slate-200 pb-1">
            <div className="flex min-w-max">
              {TABS.map((tab, i) => {
                const Icon = TAB_ICONS[i];
                const count = TAB_COUNTS[i];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-blue-600 text-blue-600 bg-blue-50/50"
                        : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab}
                    {count !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        activeTab === tab ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === "Homes" && (
              <AdminHomesTab properties={properties} canEdit={canEdit} onAddHome={() => setShowAddHomeModal(true)} />
            )}
            {activeTab === "Residents" && (
              <AdminResidentsTab residents={residents} homes={properties} staff={staff} />
            )}
            {activeTab === "Bills" && (
              <AdminBillsTab bills={bills} homes={properties} canEdit={canEdit} onMarkPaid={markPaid} emptyMessage="No bills found. Add your first bill to start tracking property costs." />
            )}
            {activeTab === "Overdue" && (
              <AdminBillsTab bills={bills} homes={properties} canEdit={canEdit} onMarkPaid={markPaid} filterOverdue emptyMessage="No overdue bills." />
            )}
            {activeTab === "Direct Debit" && (
              <AdminDirectDebitTab bills={bills} homes={properties} canEdit={canEdit} onMarkPaid={markPaid} />
            )}
            {activeTab === "Documents" && (
              <AdminDocumentsTab documents={homeDocuments} properties={properties} />
            )}
            {activeTab === "Leases" && (
              <AdminLeasesTab properties={properties} />
            )}
            {activeTab === "Maintenance" && (
              <AdminMaintenanceTab
                properties={properties}
                canEdit={canEdit}
                onAddMaintenance={() => setShowAddMaintenance(true)}
              />
            )}
            {activeTab === "Assets" && (
              <AssetInventoryTab
                user={user}
                staffProfile={staffProfile}
                homes={properties}
                staff={staff}
              />
            )}
            {activeTab === "External Services" && (
              <AgencyBankTab staff={staff} homes={properties} isAdminOrTL={canEdit} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}