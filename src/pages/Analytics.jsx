import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";

export default function Analytics() {
  const { user } = useOutletContext();

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-analytics"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID }),
  });

  const { data: visits = [] } = useQuery({
    queryKey: ["visits-analytics"],
    queryFn: () => base44.entities.VisitReport.filter({ org_id: ORG_ID }, "-date", 500),
  });

  const activeResidents = residents.filter(r => r.status === "active");
  const reportsThisMonth = visits.filter(v => v.date?.startsWith(new Date().toISOString().slice(0, 7)));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics & Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-primary">{activeResidents.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Active Residents</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-green-600">{reportsThisMonth.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Reports This Month</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-3xl font-bold text-blue-600">{visits.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Total Visit Reports</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <p className="text-muted-foreground">Analytics dashboard with charts and KPI trends — coming soon</p>
      </div>
    </div>
  );
}