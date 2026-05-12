import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, UserCheck, Shield, FileText, AlertTriangle } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import HomeCard from "../components/dashboard/HomeCard";
import { secureGateway } from "@/lib/secureGateway";

export default function TLDashboard() {
  const { user, staffProfile } = useOutletContext();
  const navigate = useNavigate();
  // myProfile comes from AppLayout context — has id and home_ids[]
  const myProfile = staffProfile || null;

  // My homes: filter by home_ids on the TL's StaffProfile
  const { data: homes = [] } = useQuery({
    queryKey: ["tl-homes", myProfile?.home_ids],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    enabled: !!myProfile,
  });

  const myHomes = myProfile?.home_ids?.length
    ? homes.filter(h => myProfile.home_ids.includes(h.id))
    : homes.filter(h => h.team_leader_id === myProfile?.id);

  const myHomeIds = new Set(myHomes.map(h => h.id));

  // My residents: active residents in my homes
  const { data: residents = [] } = useQuery({
    queryKey: ["tl-residents", [...myHomeIds].join(",")],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
    enabled: myHomeIds.size > 0,
  });
  const myResidents = residents.filter(r => myHomeIds.has(r.home_id));

  // My team: StaffProfiles where team_leader_id = myProfile.id
  const { data: myTeam = [] } = useQuery({
    queryKey: ["tl-my-team", myProfile?.id],
    queryFn: () => secureGateway.filter("StaffProfile", { team_leader_id: myProfile.id }),
    enabled: !!myProfile?.id,
  });

  // Reports pending review: submitted reports for my homes
  const { data: pendingReports = [] } = useQuery({
    queryKey: ["tl-pending-reports", [...myHomeIds].join(",")],
    queryFn: async () => {
      const all = await secureGateway.filter("VisitReport", { status: "submitted" }, "-created_date", 50);
      return all.filter(r => myHomeIds.has(r.home_id));
    },
    enabled: myHomeIds.size > 0,
  });

  const highRiskCount = myResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="My Homes" value={myHomes.length} icon={Building2} color="blue" />
        <StatCard title="My Residents" value={myResidents.length} icon={Users} color="primary" />
        <StatCard title="My Team" value={myTeam.length} icon={UserCheck} color="green" />
        <StatCard title="Open Risk Flags" value={highRiskCount} icon={Shield} color={highRiskCount === 0 ? "green" : "amber"} />
        <StatCard title="Pending Reviews" value={pendingReports.length} icon={FileText} color="purple" />
        <StatCard title="Compliance Alerts" value={0} icon={AlertTriangle} color="green" />
      </div>

      <AIInsightsPanel residents={myResidents} reports={pendingReports} />

      {/* My Team */}
      <div>
        <h2 className="text-lg font-semibold mb-4">My Team ({myTeam.length})</h2>
        {myTeam.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No team members assigned yet.
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {myTeam.map(sw => (
              <div key={sw.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {sw.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{sw.full_name}</p>
                    <p className="text-xs text-muted-foreground">{sw.job_title || sw.role?.replace(/_/g, " ")}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  sw.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                }`}>{sw.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Homes */}
      <div>
        <h2 className="text-lg font-semibold mb-4">My Homes</h2>
        {myHomes.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
            No homes assigned to your profile yet.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myHomes.map(home => {
              const homeResidents = myResidents.filter(r => r.home_id === home.id);
              const riskFlags = homeResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;
              return <HomeCard key={home.id} home={home} residentCount={homeResidents.length} riskFlags={riskFlags} />;
            })}
          </div>
        )}
      </div>

      {/* Reports Pending Review */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Reports Pending Review</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {pendingReports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <span className="text-green-500">✓</span> All up to date.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingReports.slice(0, 10).map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{r.resident_name || "Resident"}</p>
                    <p className="text-xs text-muted-foreground">By {r.worker_name || r.worker_id} · {r.date}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/visit-reports?report_id=${r.id}`)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}