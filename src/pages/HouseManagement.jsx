import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, PoundSterling, AlertTriangle, FileWarning, Plus, FileText, CalendarClock, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import HouseStatCard from "../components/house/HouseStatCard";
import PropertyList from "../components/house/PropertyList";
import BillList from "../components/house/BillList";
import BillForm from "../components/house/BillForm";
import HouseCharts from "../components/house/HouseCharts";
import BillDetailsModal from "../components/house/BillDetailsModal";
import BillManagementModal from "../components/house/BillManagementModal";
import ExpiringItemsModal from "../components/house/ExpiringItemsModal";
import AddHomeModal from "../components/homes/AddHomeModal";
import ResidentForm from "../components/residents/ResidentForm";

export default function HouseManagement() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = user?.role === "user" ? "support_worker" : (user?.role || "support_worker");
  const canEdit = role === "admin" || role === "admin_officer";

  const [showBillForm, setShowBillForm] = useState(false);
  const [showBillManagement, setShowBillManagement] = useState(false);
  const [showAddHomeModal, setShowAddHomeModal] = useState(false);
  const [showResidentForm, setShowResidentForm] = useState(false);
  const [billModal, setBillModal] = useState(null); // { title, filter }
  const [expiringModal, setExpiringModal] = useState(null); // { title, items }

  const { data: properties = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-house-mgmt"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
  });

  const createResident = useMutation({
    mutationFn: (data) => secureGateway.create("Resident", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-residents"] });
      setShowResidentForm(false);
      toast.success("Young person added successfully");
    },
  });

  // Expiring leases come directly from Home.lease_end

  // FIX 2: Expiring documents from HomeDocument entity
  const { data: homeDocuments = [] } = useQuery({
    queryKey: ["home-documents-expiry"],
    queryFn: () => secureGateway.filter("HomeDocument"),
  });

  const { data: bills = [], isError: billsError } = useQuery({
    queryKey: ["bills-house-management"],
    queryFn: () => secureGateway.filter("Bill"),
    staleTime: 0,
  });

  const createBill = useMutation({
    mutationFn: (data) => secureGateway.create("Bill", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bills-house-management"] }); setShowBillForm(false); toast.success("Bill added"); },
  });

  const updateBill = useMutation({
    mutationFn: ({ id, data }) => secureGateway.update("Bill", id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bills-house-management"] }); toast.success("Bill updated"); },
  });

  // Stats
  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const overdueBills = bills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today));
  const overdueAmount = overdueBills.reduce((s, b) => s + (b.amount || 0), 0);

  const directDebitFailsBills = bills.filter(b => b.is_direct_debit && b.status === "overdue");
  const directDebitFails = directDebitFailsBills.length;

  const monthlyBills = bills.filter(b => b.due_date?.startsWith(currentMonth));
  const monthlyTotal = monthlyBills.reduce((s, b) => s + (b.amount || 0), 0);
  const monthlyOutstanding = monthlyBills.filter(b => b.status !== "paid").reduce((s, b) => s + (b.amount || 0), 0);

  const yearlyBills = bills.filter(b => b.due_date?.startsWith(currentYear));
  const yearlyOverdue = yearlyBills.filter(b => b.status === "overdue" || (b.status === "pending" && b.due_date < today));
  const yearlyOverdueAmount = yearlyOverdue.reduce((s, b) => s + (b.amount || 0), 0);

  // Expiring leases from Home.lease_end
  const in90Days = new Date(); in90Days.setDate(in90Days.getDate() + 90);
  const in90Str = in90Days.toISOString().split("T")[0];
  const expiringLeases = properties.filter(h => h.lease_end && h.lease_end >= today && h.lease_end <= in90Str);
  const expiringLeaseItems = expiringLeases.map(h => {
    const daysLeft = Math.ceil((new Date(h.lease_end) - new Date()) / 86400000);
    return {
      id: h.id,
      primaryLabel: h.name,
      secondaryLabel: h.address,
      badge: `Expires ${new Date(h.lease_end).toLocaleDateString("en-GB")} · ${daysLeft}d left`,
      badgeClass: "bg-amber-500/10 text-amber-600 border-amber-200",
      meta: h.postcode,
      link: `/homes/${h.id}`,
    };
  });

  // Expiring documents from HomeDocument entity — only current versions
  const in60Days = new Date(); in60Days.setDate(in60Days.getDate() + 60);
  const in60Str = in60Days.toISOString().split("T")[0];
  const expiringDocs = homeDocuments.filter(d =>
    d.expiry_date && d.expiry_date >= today && d.expiry_date <= in60Str &&
    !d.superseded_by && !d.deleted_at
  );
  const expiringDocItems = expiringDocs.map(d => {
    const home = properties.find(h => h.id === d.home_id);
    const daysLeft = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
    return {
      id: d.id,
      primaryLabel: d.title,
      secondaryLabel: home?.name || "Unknown Home",
      badge: `Expires ${new Date(d.expiry_date).toLocaleDateString("en-GB")} · ${daysLeft}d left`,
      badgeClass: "bg-purple-500/10 text-purple-600 border-purple-200",
      fileUrl: d.file_url,
    };
  });

  return (
    <div className="space-y-6">

      {billModal && (
        <BillDetailsModal
          title={billModal.title}
          bills={
            billModal.filter === "overdue" ? overdueBills :
            billModal.filter === "direct_debit" ? directDebitFailsBills :
            billModal.filter === "monthly" ? monthlyBills :
            billModal.filter === "yearly" ? yearlyBills :
            []
          }
          onClose={() => setBillModal(null)}
          canEdit={canEdit}
          onMarkPaid={(id) => { updateBill.mutate({ id, data: { status: "paid", paid_date: today } }); }}
        />
      )}
      {showBillManagement && (
        <BillManagementModal
          bills={bills}
          homes={properties}
          onClose={() => setShowBillManagement(false)}
          canEdit={canEdit}
          saving={updateBill.isPending}
          onMarkPaid={(id) => { updateBill.mutate({ id, data: { status: "paid", paid_date: today } }); }}
          onUpdateBill={(id, data, onSuccess) => updateBill.mutate({ id, data }, { onSuccess })}
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
          onClose={() => setShowAddHomeModal(false)}
          onSuccess={() => {
            setShowAddHomeModal(false);
            queryClient.invalidateQueries({ queryKey: ["homes"] });
          }}
        />
      )}
      {showResidentForm && (
        <ResidentForm
          homes={properties}
          staff={staff}
          onSubmit={(data) => createResident.mutate(data)}
          onClose={() => setShowResidentForm(false)}
          saving={createResident.isPending}
        />
      )}
      {showBillForm && (
        <BillForm
          properties={properties}
          onSubmit={(d) => createBill.mutate(d)}
          onClose={() => setShowBillForm(false)}
          saving={createBill.isPending}
        />
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Admin Management</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">
            {new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            {" · "}{properties.length} homes · {bills.length} bills
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowAddHomeModal(true)}>
              <Plus className="w-4 h-4" /> Add Home
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowResidentForm(true)}>
              <Plus className="w-4 h-4" /> Add New YP
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowBillForm(true)}>
              <Plus className="w-4 h-4" /> Add Bill
            </Button>
            <Button className="gap-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700" onClick={() => setShowBillManagement(true)}>
              <ReceiptText className="w-4 h-4" /> Manage Issues
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards — Row 1: 4 small cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <HouseStatCard title="Overdue Bills" value={overdueBills.length} sub={`£${overdueAmount.toLocaleString()} Total`} icon={AlertTriangle} color="red" onClick={() => setBillModal({ title: "Overdue Bills", filter: "overdue" })} />
        <HouseStatCard title="Direct Debit Issues" value={directDebitFails} sub="Requiring attention" icon={FileWarning} color="amber" onClick={() => setBillModal({ title: "Direct Debit Issues", filter: "direct_debit" })} />
        <HouseStatCard title="Expiring Documents" value={expiringDocs.length} sub="Documents expiring within 60 days" icon={FileText} color="purple" onClick={expiringDocs.length ? () => setExpiringModal({ title: "Expiring Documents & Leases", leaseItems: expiringLeaseItems, docItems: expiringDocItems }) : undefined} />
        <HouseStatCard title="Expiring Leases" value={expiringLeases.length} sub="Within 90 days" icon={CalendarClock} color="orange" onClick={expiringLeases.length ? () => setExpiringModal({ title: "Expiring Documents & Leases", leaseItems: expiringLeaseItems, docItems: expiringDocItems }) : undefined} />
      </div>

      {/* KPI Cards — Row 2: 2 wide cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        <HouseStatCard title="Monthly Bills This Month" value={monthlyBills.length} sub={`£${monthlyOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} Outstanding`} icon={PoundSterling} color="blue" onClick={() => setBillModal({ title: "Monthly Bills", filter: "monthly" })} wide />
        <HouseStatCard title="Yearly Bills This Year" value={yearlyBills.length} sub={`£${yearlyOverdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} Overdue`} icon={ReceiptText} color="green" onClick={() => setBillModal({ title: "Yearly Bills", filter: "yearly" })} wide />
      </div>

      {/* Charts */}
      <HouseCharts bills={bills} properties={properties} overdueAmount={overdueAmount} />

      {/* Tabs */}
      <Tabs defaultValue="properties">
        <TabsList className="bg-muted rounded-xl">
          <TabsTrigger value="properties" className="rounded-lg gap-2"><Building2 className="w-4 h-4" /> Homes ({properties.length})</TabsTrigger>
          <TabsTrigger value="bills" className="rounded-lg gap-2"><PoundSterling className="w-4 h-4" /> Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="rounded-lg gap-2"><AlertTriangle className="w-4 h-4" /> Overdue ({overdueBills.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="mt-4">
          <PropertyList properties={properties} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="bills" className="mt-4">
          <BillList bills={bills} canEdit={canEdit} onMarkPaid={(id) => updateBill.mutate({ id, data: { status: "paid", paid_date: today } })} />
        </TabsContent>
        <TabsContent value="overdue" className="mt-4">
          <BillList bills={overdueBills} canEdit={canEdit} onMarkPaid={(id) => updateBill.mutate({ id, data: { status: "paid", paid_date: today } })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}