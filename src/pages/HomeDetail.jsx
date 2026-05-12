import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import HomeDetailsTab from "@/components/homes/tabs/HomeDetailsTab";
import HomeChecksTab from "@/components/homes/tabs/HomeChecksTab";
import HomeLogsTab from "@/components/homes/tabs/HomeLogsTab";
import MaintenanceTab from "@/components/homes/tabs/MaintenanceTab";
import HomeTasksTab from "@/components/homes/tabs/HomeTasksTab";
import HomeDocumentsTab from "@/components/homes/tabs/HomeDocumentsTab";
import HomeAssetsTab from "@/components/homes/tabs/HomeAssetsTab";
import MealPlanTab from "@/components/homes/tabs/MealPlanTab";
import AccidentsTab from "@/components/homes/tabs/AccidentsTab";
import ShiftsHandoversTab from "@/components/homes/tabs/ShiftsHandoversTab";
import ShiftTemplatesTab from "@/components/homes/tabs/ShiftTemplatesTab";
import PropertyTenancyTab from "@/components/homes/tabs/PropertyTenancyTab";

const TABS = [
  { key: "details", label: "Home Details" },
  { key: "property", label: "Property & Tenancy" },
  { key: "checks", label: "Checks, Chores & Audits" },
  { key: "home-logs", label: "Home Logs" },
  { key: "maintenance", label: "Maintenance Logs" },
  { key: "tasks", label: "Tasks, Meetings & Appointments" },
  { key: "reg32", label: "Reg 32 Upload" },
  { key: "ofsted", label: "Ofsted" },
  { key: "documents", label: "Home Documents & Policies" },
  { key: "shifts", label: "Shifts & Handovers" },
  { key: "shift-templates", label: "Shift Templates" },
  { key: "insurance", label: "Insurances" },
  { key: "assets", label: "Assets" },
  { key: "meals", label: "Meal Plan" },
  { key: "accidents", label: "Accidents/Illness" },
];

export default function HomeDetail() {
  const { id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("details");

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
      case "property": return <PropertyTenancyTab home={home} user={user} />;
      case "checks": return <HomeChecksTab home={home} user={user} staff={staff} />;
      case "home-logs": return <HomeLogsTab homeId={id} homeName={home.name} user={user} />;
      case "maintenance": return <MaintenanceTab homeId={id} homeName={home.name} user={user} />;
      case "tasks": return <HomeTasksTab homeId={id} homeName={home.name} user={user} staff={staff} />;
      case "reg32": return (
        <HomeDocumentsTab home={home} docCategory="reg32" title="Reg 32 Upload"
          allowedTypes={["reg32_report", "reg32_form", "reg32_response"]} />
      );
      case "ofsted": return (
        <HomeDocumentsTab home={home} docCategory="ofsted" title="Ofsted Documents"
          allowedTypes={["ofsted_report", "ofsted_action_plan", "ofsted_correspondence"]} />
      );
      case "documents": return (
        <HomeDocumentsTab home={home} docCategory="policy" title="Home Documents & Policies"
          allowedTypes={["policy", "procedure", "certificate", "license", "other"]} />
      );
      case "insurance": return (
        <HomeDocumentsTab home={home} docCategory="insurance" title="Insurances"
          allowedTypes={["buildings_insurance", "contents_insurance", "liability_insurance", "vehicle_insurance", "other"]} />
      );
      case "shifts": return <ShiftsHandoversTab homeId={id} homeName={home.name} user={user} />;
      case "shift-templates": return <ShiftTemplatesTab homeId={id} homeName={home.name} />;
      case "assets": return <HomeAssetsTab homeId={id} homeName={home.name} />;
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