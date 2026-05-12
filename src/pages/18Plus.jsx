import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";

import EighteenPlusOverview from "../components/eighteen-plus/EighteenPlusOverview";
import EighteenPlusResidents from "../components/eighteen-plus/EighteenPlusResidents";
import ILSTabMain from "../components/eighteen-plus/ILSTab/ILSTabMain";
import MoveOnTabMain from "../components/eighteen-plus/MoveOnTab/MoveOnTabMain";
import PATabMain from "../components/eighteen-plus/PATab/PATabMain";
import EETTabMain from "../components/eighteen-plus/EETTab/EETTabMain";
import BenefitsTabMain from "../components/eighteen-plus/BenefitsTab/BenefitsTabMain";
import PathwayPlansTabMain from "../components/eighteen-plus/PathwayPlans/PathwayPlansTabMain";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "residents", label: "Residents" },
  { key: "pathway", label: "Pathway Plans" },
  { key: "ils", label: "Independent Living Skills" },
  { key: "moveon", label: "Move-On Planning" },
  { key: "pa", label: "PA Management" },
  { key: "benefits", label: "Benefits & Finance" },
  { key: "eet", label: "Education & Employment" },
];

export default function EighteenPlus() {
  const { user, staffProfile } = useOutletContext();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedHomeId, setSelectedHomeId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("active");

  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const canViewBenefits = staffRole === "admin" || staffRole === "admin_officer";

  // Fetch 18+ homes
  const { data: homes = [] } = useQuery({
    queryKey: ["18plus-homes"],
    queryFn: () => secureGateway.filter("Home", { type: "18_plus", status: "active" }),
  });

  // Fetch all 18+ residents
  const { data: allResidents = [] } = useQuery({
    queryKey: ["18plus-residents"],
    queryFn: async () => {
      const residents = await secureGateway.filter("Resident", { status: "active" }, "-created_date", 500);
      const homeIds = new Set(homes.map(h => h.id));
      return residents.filter(r => homeIds.has(r.home_id));
    },
    enabled: homes.length > 0,
  });

  // Filter by home and status
  const filteredResidents = useMemo(() => {
    let result = allResidents;
    if (selectedHomeId !== "all") {
      result = result.filter(r => r.home_id === selectedHomeId);
    }
    if (selectedStatus !== "all") {
      result = result.filter(r => r.status === selectedStatus);
    }
    return result;
  }, [allResidents, selectedHomeId, selectedStatus]);

  const homeIds = useMemo(() => new Set(filteredResidents.map(r => r.home_id)), [filteredResidents]);

  // Fetch supporting data
  const { data: pathwayPlans = [] } = useQuery({
    queryKey: ["18plus-pathway-plans"],
    queryFn: () => secureGateway.filter("PathwayPlan", {}),
  });

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["18plus-ils-plans"],
    queryFn: () => secureGateway.filter("ILSPlan", {}),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["18plus-appointments"],
    queryFn: () => secureGateway.filter("Appointment", {}, "-start_datetime", 500),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["18plus-staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ["18plus-transitions"],
    queryFn: () => secureGateway.filter("Transition", {}),
  });

  const { data: allowances = [] } = useQuery({
    queryKey: ["18plus-allowances"],
    queryFn: () => secureGateway.filter("ResidentAllowance", {}),
  });

  const { data: savings = [] } = useQuery({
    queryKey: ["18plus-savings"],
    queryFn: () => secureGateway.filter("ResidentSavings", {}),
  });

  // Hide benefits tab if user lacks permission
  const visibleTabs = TABS.filter(t => !(t.key === "benefits" && !canViewBenefits));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">18+ Accommodation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pathway planning and move-on preparation</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center gap-3">
        <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Homes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="on_leave">Moving On</SelectItem>
            <SelectItem value="moved_on">Moved Out</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <div className="text-sm text-muted-foreground">
          {filteredResidents.length} resident{filteredResidents.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <EighteenPlusOverview
          residents={filteredResidents}
          homes={homes}
          staff={staff}
          pathwayPlans={pathwayPlans}
          ilsPlans={ilsPlans}
          appointments={appointments}
          transitions={transitions}
          allowances={allowances}
          savings={savings}
          onNavigate={(tabKey) => setActiveTab(tabKey)}
        />
      )}

      {activeTab === "residents" && (
        <EighteenPlusResidents
          residents={filteredResidents}
          homes={homes}
          staff={staff}
          pathwayPlans={pathwayPlans}
          ilsPlans={ilsPlans}
          allowances={allowances}
          savings={savings}
          user={user}
          onTransfer={() => qc.invalidateQueries({ queryKey: ["18plus-residents"] })}
          onMovedOn={() => qc.invalidateQueries({ queryKey: ["18plus-residents"] })}
        />
      )}

      {activeTab === "pathway" && <PathwayPlansTabMain residents={filteredResidents} homes={homes} />}
      {activeTab === "ils" && <ILSTabMain residents={filteredResidents} homes={homes} staff={staff} user={user} />}
      {activeTab === "moveon" && <MoveOnTabMain residents={filteredResidents} homes={homes} staff={staff} user={user} />}
      {activeTab === "pa" && <PATabMain residents={filteredResidents} homes={homes} staff={staff} />}
      {activeTab === "benefits" && canViewBenefits && <BenefitsTabMain residents={filteredResidents} homes={homes} />}
      {activeTab === "eet" && <EETTabMain residents={filteredResidents} homes={homes} />}
    </div>
  );
}