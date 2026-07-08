import { useState } from "react";
import { useParams, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import HomeDetailsTab from "@/components/homes/tabs/HomeDetailsTab";
import HomeChecksChoresMain from "@/components/checks/HomeChecksChoresMain";
import MaintenanceTab from "@/components/homes/tabs/MaintenanceTab";
import HomeMeetingsAppointmentsTab from "@/components/homes/tabs/HomeMeetingsAppointmentsTab";
import AssetInventoryTab from "@/components/house/AssetInventoryTab";
import MealPlanTab from "@/components/homes/tabs/MealPlanTab";
import AccidentsTab from "@/components/homes/tabs/AccidentsTab";
import ShiftsHandoversTab from "@/components/homes/tabs/ShiftsHandoversTab";
import ShiftTemplatesTab from "@/components/homes/tabs/ShiftTemplatesTab";
import PropertyDocumentsTab from "@/components/homes/tabs/PropertyDocumentsTab";

const TABS = [
  { key: "details", label: "Home Details" },
  { key: "property", label: "Property, Tenancy & Documents" },
  { key: "checks", label: "Checks, Chores & Audits" },
  { key: "maintenance", label: "Maintenance Logs" },
  { key: "tasks", label: "Meetings & Appointments" },

  { key: "shifts", label: "Shifts & Handovers" },
  { key: "assets", label: "Assets" },
  { key: "accidents", label: "Accidents/Illness" },
];

export default function HomeDetail() {
  const { id } = useParams();
  const { user, staffProfile } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "details";
  const setActiveTab = (key) => setSearchParams({ tab: key }, { replace: true });

  const { data: home, isLoading } = useQuery({
    queryKey: ["home-detail", id],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }).then(homes => homes.find(h => h.id === id)),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID }),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (!home) return (
    <div className="text-center py-24 text-muted-foreground">
      <Building2 className="w-10 h-10 mx-auto mb-3" />
      <p>Home not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/homes-hub")}>Back to Homes</Button>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case "details": return <HomeDetailsTab home={home} residents={residents} staff={staff} />;
      case "property": return <PropertyDocumentsTab home={home} user={user} staffProfile={staffProfile} />;
      case "checks": return <HomeChecksChoresMain home={home} user={user} staff={staff} staffProfile={staffProfile} />;
      case "maintenance": return <MaintenanceTab homeId={id} homeName={home.name} user={user} staffProfile={staffProfile} />;
      case "tasks": return <HomeMeetingsAppointmentsTab homeId={id} homeName={home.name} user={user} staffProfile={staffProfile} staff={staff} residents={residents} />;

      case "shifts": return <ShiftsHandoversTab homeId={id} homeName={home.name} user={user} staff={staff} staffProfile={staffProfile} />;
      case "shift-templates": return <ShiftTemplatesTab homeId={id} homeName={home.name} staffProfile={staffProfile} />;
      case "assets": return <AssetInventoryTab homeId={id} homeName={home.name} user={user} staffProfile={staffProfile} homes={[home]} staff={staff} />;
      case "meals": return <MealPlanTab homeId={id} homeName={home.name} user={user} />;
      case "accidents": return <AccidentsTab homeId={id} homeName={home.name} user={user} residents={residents} staff={staff} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigate("/homes-hub")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold leading-tight">{home.name}</h1>
          <p className="text-xs text-muted-foreground capitalize">{home.type?.replace(/_/g, " ")} · {home.address}</p>
        </div>
      </div>

      {/* Tab bar — horizontally scrollable */}
      <div className="overflow-x-auto border-b border-border -mx-1 px-1">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
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

      {/* Tab content */}
      <div className="pt-2">
        {renderTab()}
      </div>
    </div>
  );
}