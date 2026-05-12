import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronDown } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import DashboardStatCards from "./DashboardStatCards";
import ComplianceTable from "./ComplianceTable";
import DBSTable from "./DBSTable";
import TenancyTable from "./TenancyTable";
import HomesDashboardCharts from "./HomesDashboardCharts";
import StatCardModal from "./StatCardModal";

// Expandable Top 10 wrapper
function ExpandableTable({ title, children, hasMore = false }) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 border-b border-border hover:bg-muted/30 transition-colors select-none"
      >
        <h2 className="font-semibold text-base">{title}</h2>
        <div className="flex items-center gap-2">
          {hasMore && !isExpanded && <span className="text-xs text-muted-foreground">Show all</span>}
          <ChevronDown className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isExpanded && typeof children === 'function' ? children(isExpanded) : isExpanded && children}
    </div>
  );
}

export default function HomesDashboard({ staffProfile }) {
  const [activeModal, setActiveModal] = useState(null);
  const isAdmin = !staffProfile || staffProfile?.role === "admin"; // default to admin view while loading
  const assignedHomeIds = staffProfile?.home_ids || [];
  const { data: allHomes = [], isLoading: homesLoading } = useQuery({
    queryKey: ["homes"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: allStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }, "-created_date", 200),
    staleTime: 5 * 60 * 1000,
  });

  // Role-based scoping — admin sees everything, others filtered by home_ids
  const homes = (isAdmin || !staffProfile)
    ? allHomes
    : allHomes.filter(h => assignedHomeIds.includes(h.id));

  const homeIds = homes.map(h => h.id);
  const staffProfiles = (isAdmin || !staffProfile)
    ? allStaff
    : allStaff.filter(sp => (sp.home_ids || []).some(id => homeIds.includes(id)));

  if (homesLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <DashboardStatCards homes={homes} staffProfiles={staffProfiles} onCardClick={setActiveModal} />
      <HomesDashboardCharts homes={homes} />
      <ExpandableTable title="Compliance Documents — Expiry Status" hasMore={true}>
        {(isExpanded) => <ComplianceTable homes={homes} expandAll={isExpanded} />}
      </ExpandableTable>
      <ExpandableTable title="DBS Expiry Status" hasMore={true}>
        {(isExpanded) => <DBSTable staffProfiles={staffProfiles} homes={homes} expandAll={isExpanded} />}
      </ExpandableTable>
      <ExpandableTable title="Tenancy & Rent Status" hasMore={true}>
        {(isExpanded) => <TenancyTable homes={homes} expandAll={isExpanded} />}
      </ExpandableTable>
      <StatCardModal
        type={activeModal}
        homes={homes}
        staffProfiles={staffProfiles}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}