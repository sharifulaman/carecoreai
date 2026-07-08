import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, UserCheck, Shield, FileText, AlertTriangle, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import StatCard from "../components/dashboard/StatCard";
import AIInsightsPanel from "../components/dashboard/AIInsightsPanel";
import HomeCard from "../components/dashboard/HomeCard";
import { secureGateway } from "@/lib/secureGateway";
import { getMyHomeIds } from "@/lib/managerHomeScope";

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

  // getMyHomeIds covers both home_ids and any active StaffServiceAssignment (the
  // "Assign" button on Staff & HR writes to the latter, not home_ids — see
  // managerHomeScope.js for why both need checking). h.team_leader_id is kept as a
  // further fallback for any home assigned only via that older single-field route.
  const homeIdsFromAssignments = getMyHomeIds(myProfile, homes);
  const myHomes = homeIdsFromAssignments === null
    ? homes
    : homes.filter(h => homeIdsFromAssignments.includes(h.id) || h.team_leader_id === myProfile?.id);

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

  // Pending approvals for this TL
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["tl-approvals", myProfile?.id],
    queryFn: () => secureGateway.filter("ApprovalWorkflow", { status: "pending_tl" }),
    enabled: !!myProfile?.id,
    staleTime: 60 * 1000,
  });
  const myPendingApprovals = pendingApprovals.filter(w => myHomeIds.has(w.home_id));

  // Annex A gaps across my homes
  const { data: allMFH = [] } = useQuery({
    queryKey: ["tl-mfh", [...myHomeIds].join(",")],
    queryFn: () => secureGateway.filter("MissingFromHome", {}, "-reported_missing_datetime", 200),
    enabled: myHomeIds.size > 0,
  });
  const { data: allIncidents = [] } = useQuery({
    queryKey: ["tl-incidents", [...myHomeIds].join(",")],
    queryFn: () => secureGateway.filter("Incident", {}, "-incident_datetime", 200),
    enabled: myHomeIds.size > 0,
  });

  // Compute Annex A gaps
  const mfhMissingRHI = allMFH.filter(
    m => myHomeIds.has(m.home_id) && m.status === "returned" && m.rhi_offered_by_la == null
  );
  const incidentsPendingReview = allIncidents.filter(
    i =>
      myHomeIds.has(i.home_id) &&
      i.manager_review_status === "pending_tl" &&
      new Date(i.incident_datetime) < new Date(Date.now() - 48 * 60 * 60 * 1000)
  );
  const annexAGapCount = mfhMissingRHI.length + incidentsPendingReview.length;

  // Per-resident Annex A field gaps
  const annexaGaps = myResidents
    .map(r => {
      const gaps = [];
      if (!r.accommodation_category) gaps.push("Accommodation category");
      if (!r.placing_local_authority) gaps.push("Placing LA");
      if (r.uasc == null) gaps.push("UASC status");
      const mfhWithNoRHI = allMFH.filter(
        m => m.resident_id === r.id && m.status === "returned" && m.rhi_offered_by_la == null
      );
      if (mfhWithNoRHI.length > 0) gaps.push(`${mfhWithNoRHI.length} MFH episode(s) missing RHI answer`);
      return { resident: r, gaps };
    })
    .filter(item => item.gaps.length > 0);

  const highRiskCount = myResidents.filter(r => r.risk_level === "high" || r.risk_level === "critical").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="My Homes" value={myHomes.length} icon={Building2} color="blue" />
        <StatCard title="My Residents" value={myResidents.length} icon={Users} color="primary" />
        <StatCard title="My Team" value={myTeam.length} icon={UserCheck} color="green" />
        <StatCard title="Open Risk Flags" value={highRiskCount} icon={Shield} color={highRiskCount === 0 ? "green" : "amber"} />
        <StatCard title="Pending Reviews" value={pendingReports.length} icon={FileText} color="purple" />
        <StatCard
          title="Pending Approvals"
          value={myPendingApprovals.length}
          icon={ClipboardCheck}
          color={myPendingApprovals.length > 0 ? "amber" : "green"}
          onClick={() => navigate("/approvals")}
        />
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

      {/* Pending My Approval */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Pending My Approval
            {myPendingApprovals.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {myPendingApprovals.length}
              </span>
            )}
          </h2>
          <button onClick={() => navigate("/approvals")} className="text-xs text-primary hover:underline">
            View all in Approvals →
          </button>
        </div>

        {myPendingApprovals.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <span className="text-green-500">✓</span> Nothing pending your approval.
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            {myPendingApprovals
              .sort((a, b) => {
                const order = { critical: 0, high: 1, normal: 2 };
                return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
              })
              .slice(0, 10)
              .map(wf => (
                <div
                  key={wf.id}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 ${
                    wf.priority === "critical"
                      ? "bg-red-50 border-l-4 border-l-red-500"
                      : wf.priority === "high"
                      ? "bg-amber-50 border-l-4 border-l-amber-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{wf.entity_reference}</p>
                      <p className="text-xs text-muted-foreground">
                        By {wf.submitted_by_name} · {wf.submitted_at ? format(new Date(wf.submitted_at), "dd MMM, HH:mm") : "—"}
                        {wf.deadline_datetime && (
                          <span className="ml-2 text-red-600 font-semibold">
                            ⏱ Deadline: {format(new Date(wf.deadline_datetime), "HH:mm dd MMM")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/approvals")}
                    className="text-xs text-primary font-medium hover:underline whitespace-nowrap"
                  >
                    Review →
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Annex A Data Gaps */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Annex A Data Gaps
            {annexaGaps.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {annexaGaps.length} residents
              </span>
            )}
          </h2>
        </div>

        {annexaGaps.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <span className="text-green-500">✓</span> All Annex A fields complete across your homes.
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Young Person</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Missing Fields</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {annexaGaps.map(({ resident, gaps }) => (
                  <tr key={resident.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{resident.display_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{myHomes.find(h => h.id === resident.home_id)?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {gaps.map(g => (
                          <span key={g} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                            {g}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/residents?tab=yp`)} className="text-xs text-primary font-medium hover:underline">
                        Fix now →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}